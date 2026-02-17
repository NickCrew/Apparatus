import dgram from "dgram";
import { logger } from "./logger.js";
import { cfg } from "./config.js";

// Note: Redis and SMTP have dedicated servers in server-redis.ts and server-smtp.ts
export function startProtocolServers() {
    const servers: any[] = [];

    // --- Syslog Mock (configurable UDP port, default 5140) ---
    const syslogServer = dgram.createSocket("udp4");
    syslogServer.bind(cfg.portSyslogAlt, cfg.host);
    logger.info({ port: cfg.portSyslogAlt, protocol: "udp" }, "Syslog Alt server listening");
    servers.push(syslogServer);

    return {
        close: () => {
            syslogServer.close();
        }
    };
}