import net from "net";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

const store = new Map<string, string>();
const MAX_BUFFER_SIZE = 64 * 1024; // 64KB - prevent DoS via unbounded buffer

function parseResp(buffer: Buffer): string[] {
    const str = buffer.toString();
    // Very basic RESP parser, assumes simple arrays of bulk strings
    // *2\r\n$4\r\nLLEN\r\n$6\r\nmylist\r\n
    if (!str.startsWith("*")) return str.trim().split(/\s+/); // Fallback to inline command
    
    const lines = str.split("\r\n");
    const args: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("$")) {
            // Next line is data
            if (i + 1 < lines.length) {
                args.push(lines[i+1]);
                i++;
            }
        }
    }
    return args;
}

function encodeBulkString(str: string | null): string {
    if (str === null) return "$-1\r\n";
    return `$${str.length}\r\n${str}\r\n`;
}

function encodeSimpleString(str: string): string {
    return `+${str}\r\n`;
}

function encodeError(str: string): string {
    return `-${str}\r\n`;
}

function encodeInteger(num: number): string {
    return `:${num}\r\n`;
}

export function startRedisServer(options: { port?: number; host?: string } = {}) {
    const port = options.port ?? cfg.portRedis;
    const host = options.host ?? cfg.host;
    
    const server = net.createServer((socket) => {
        const addr = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info({ client: addr }, "Redis client connected");

        let buffer = "";

        socket.on("data", (data) => {
            // DoS protection: limit buffer size before concatenation
            if (buffer.length + data.length > MAX_BUFFER_SIZE) {
                logger.warn({ client: addr }, "Redis buffer overflow - disconnecting client");
                socket.write(encodeError("ERR buffer overflow"));
                socket.destroy();
                return;
            }
            buffer += data.toString();

            // Process complete commands (ending with \r\n)
            if (!buffer.includes("\r\n")) return;

            const args = parseResp(Buffer.from(buffer));
            buffer = ""; // Clear buffer after parsing
            if (args.length === 0) return;

            const cmd = args[0].toUpperCase();
            
            logger.debug({ cmd, args }, "Redis command received");

            try {
                switch (cmd) {
                    case "PING":
                        socket.write(encodeSimpleString(args[1] || "PONG"));
                        break;
                    case "SET":
                        if (args.length < 3) {
                            socket.write(encodeError("ERR wrong number of arguments for 'set' command"));
                        } else {
                            store.set(args[1], args[2]);
                            socket.write(encodeSimpleString("OK"));
                        }
                        break;
                    case "GET":
                        if (args.length < 2) {
                            socket.write(encodeError("ERR wrong number of arguments for 'get' command"));
                        } else {
                            const val = store.get(args[1]) || null;
                            socket.write(encodeBulkString(val));
                        }
                        break;
                    case "INFO":
                        socket.write(encodeBulkString("# Server\r\nredis_version:0.0.1\r\napparatus_mock:1\r\n"));
                        break;
                    case "QUIT":
                        socket.write(encodeSimpleString("OK"));
                        socket.end();
                        break;
                    default:
                        socket.write(encodeSimpleString("OK")); // Fake success for unknown commands to keep clients happy
                        break;
                }
            } catch (e: any) {
                socket.write(encodeError(`ERR ${e.message}`));
            }
        });

        socket.on("error", (err) => {
            logger.error({ err, client: addr }, "Redis client error");
        });
    });

    server.listen(port, host, () => {
        logger.info({ port }, "Redis Mock Server listening");
    });

    return server;
}
