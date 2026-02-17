import { Server as HttpServer } from "http";
import { Server as HttpsServer } from "https";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "./logger.js";

export function setupWebSocket(server: HttpServer | HttpsServer) {
    const wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws, req) => {
        const ip = req.socket.remoteAddress;
        logger.info({ ip }, "WebSocket connection established");

        ws.on("message", (message) => {
            // Echo the message back
            ws.send(message.toString());
        });

        ws.on("error", (err) => {
            logger.error({ err }, "WebSocket error");
        });
    });

    return wss;
}
