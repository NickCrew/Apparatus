import net from "net";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

export function startSmtpServer(options: { port?: number; host?: string } = {}) {
    const port = options.port ?? cfg.portSmtp; // 25 is usually privileged
    const host = options.host ?? cfg.host;
    
    const server = net.createServer((socket) => {
        const addr = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info({ client: addr }, "SMTP client connected");

        let state = "CONNECT";
        let dataBuffer = "";

        // Send greeting
        socket.write("220 apparatus-smtp ESMTP Postfix\r\n");

        socket.on("data", (chunk) => {
            const data = chunk.toString();
            
            if (state === "DATA") {
                dataBuffer += data;
                if (dataBuffer.includes("\r\n.\r\n")) {
                    logger.info({ size: dataBuffer.length }, "SMTP Email received");
                    socket.write("250 2.0.0 Ok: queued as 12345\r\n");
                    state = "COMMAND";
                    dataBuffer = "";
                }
                return;
            }

            const lines = data.split("\r\n").filter(l => l);
            
            for (const line of lines) {
                const upper = line.toUpperCase();
                logger.debug({ line }, "SMTP command");

                if (upper.startsWith("HELO") || upper.startsWith("EHLO")) {
                    socket.write("250-apparatus-smtp\r\n250-PIPELINING\r\n250-SIZE 10240000\r\n250-VRFY\r\n250-ETRN\r\n250-ENHANCEDSTATUSCODES\r\n250-8BITMIME\r\n250 DSN\r\n");
                } else if (upper.startsWith("MAIL FROM:")) {
                    socket.write("250 2.1.0 Ok\r\n");
                } else if (upper.startsWith("RCPT TO:")) {
                    socket.write("250 2.1.5 Ok\r\n");
                } else if (upper.startsWith("DATA")) {
                    state = "DATA";
                    socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
                } else if (upper.startsWith("QUIT")) {
                    socket.write("221 2.0.0 Bye\r\n");
                    socket.end();
                } else if (upper.startsWith("RSET")) {
                    state = "COMMAND";
                    socket.write("250 2.0.0 Ok\r\n");
                } else {
                    // Generic success for other commands to avoid breaking flow
                    socket.write("250 2.0.0 Ok\r\n");
                }
            }
        });

        socket.on("error", (err) => {
            logger.error({ err, client: addr }, "SMTP client error");
        });
    });

    server.listen(port, host, () => {
        logger.info({ port }, "SMTP Sink Server listening");
    });

    return server;
}
