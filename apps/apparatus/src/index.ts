import { cfg } from "./config.js";
import { logger } from "./logger.js";
import { createHttp1Server } from "./server-http1.js";
import { createHttp2Server, createH2CServerIfEnabled } from "./server-http2.js";
import { setupWebSocket } from "./server-ws.js";
import { startL4Servers } from "./server-l4.js";
import { startGrpcServer } from "./server-grpc.js";
import { startBadSslServer } from "./server-bad-ssl.js";
import { startProtocolServers } from "./server-protocols.js";
import { startMqttServer } from "./server-mqtt.js";
import { startIcapServer } from "./server-icap.js";
import { startClusterNode } from "./cluster.js";

import { startRedisServer } from "./server-redis.js";
import { startSmtpServer } from "./server-smtp.js";
import { startSyslogServer } from "./server-syslog.js";

async function main() {
    const app1 = createHttp1Server();
    const server1 = app1.listen(cfg.portHttp1, cfg.host, () =>
        logger.info({ port: cfg.portHttp1 }, "HTTP/1.1 server listening")
    );
    
    // Attach WebSocket server to HTTP/1.1 server
    setupWebSocket(server1);
    logger.info({ path: "/ws" }, "WebSocket server attached");

    const h2 = createHttp2Server();
    h2.listen(cfg.portHttp2, cfg.host, () =>
        logger.info({ port: cfg.portHttp2 }, "HTTP/2 TLS server listening")
    );

    const h2c = createH2CServerIfEnabled();
    if (h2c) {
        const h2cPort = (cfg.portHttp1 || 8080) + 1;
        h2c.listen(h2cPort, cfg.host, () =>
            logger.info({ port: h2cPort }, "HTTP/2 cleartext (h2c) server listening")
        );
    }

    // Start additional protocols
    startL4Servers();
    startGrpcServer();
    startBadSslServer();
    startProtocolServers();
    startMqttServer();
    startIcapServer();
    startClusterNode();

    startRedisServer();
    startSmtpServer();
    startSyslogServer();

    // Graceful shutdown
    const shutdown = (signal: string) => {
        logger.info({ signal }, "Shutdown signal received, cleaning up...");

        // Allow some time for other processes to cleanup if they have listeners
        setTimeout(() => process.exit(0), 500);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
