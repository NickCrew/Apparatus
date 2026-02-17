import net from "net";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

const EICAR_SIG = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export function startIcapServer(options: { port?: number; host?: string } = {}) {
    const port = options.port ?? cfg.portIcap;
    const host = options.host ?? cfg.host;
    const server = net.createServer((socket) => {
        logger.info("ICAP connection established");
        
        socket.on("data", (data) => {
            const raw = data.toString();
            // Simple parsing to detect EICAR in body (very naive ICAP implementation)
            // Real ICAP is complex, this is a mock to test connectivity and basic RESPMOD
            
            if (raw.includes("OPTIONS")) {
                // Return capabilities
                const response = 
                    "ICAP/1.0 200 OK\r\n" +
                    "Methods: RESPMOD, REQMOD\r\n" +
                    "Service: Apparatus-ICAP/1.0\r\n" +
                    "ISTag: \"12345\"\r\n" +
                    "\r\n";
                socket.write(response);
            } else if (raw.includes(EICAR_SIG)) {
                // BLOCK IT
                const response = 
                    "ICAP/1.0 200 OK\r\n" +
                    "ISTag: \"12345\"\r\n" +
                    "X-Infection-Found: Type=Virus; Resolution=Block; Threat=EICAR-Test-File\r\n" +
                    "\r\n"; // In real ICAP, we'd modify the body to show a block page
                socket.write(response);
                logger.warn("ICAP: Blocked EICAR signature");
            } else {
                // ALLOW (204 No Content means "Not Modified")
                const response = 
                    "ICAP/1.0 204 No Content\r\n" +
                    "ISTag: \"12345\"\r\n" +
                    "\r\n";
                socket.write(response);
            }
        });
    });

    server.listen(port, host, () => {
        logger.info({ port }, "ICAP Server listening");
    });

    return server;
}
