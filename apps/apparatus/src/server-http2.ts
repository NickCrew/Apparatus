import fs from "fs";
import http2 from "http2";
import { cfg } from "./config.js";
import { logger } from "./logger.js";
import { createApp } from "./app.js";

export function createHttp2Server() {
    const app = createApp();

    const server = http2.createSecureServer(
        {
            key: fs.readFileSync(cfg.tlsKeyPath),
            cert: fs.readFileSync(cfg.tlsCertPath),
            allowHTTP1: true,
            requestCert: true, 
            rejectUnauthorized: false 
        },
        app as any
    );

    server.on("session", (session) => {
        logger.debug({ type: "http2-session", alpnProtocol: (session as any).alpnProtocol }, "HTTP/2 session started");
    });

    return server;
}

export function createH2CServerIfEnabled() {
    if (!cfg.enableH2C) return null;

    const app = createApp();
    const server = http2.createServer({}, app as any);
    return server;
}