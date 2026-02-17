import http from "http";
import { URL } from "url";
import { request as undiciRequest } from "undici";
import { pipeline } from "stream/promises";
import { logger } from "../logger.js";
import { ToxicStream, ToxicAction } from "./chaos/engine.js";
import { fileURLToPath } from 'url';

export const SIDECAR_PORT = parseInt(process.env.SIDECAR_PORT || "8081");
const TARGET = process.env.TARGET_URL || "http://localhost:8080"; // Default to apparatus
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit for buffering

export function createSidecarServer() {
    return http.createServer(async (req, res) => {
        const targetUrl = new URL(req.url!, TARGET);
        const method = req.method || "GET";
        
        // 1. Toxicity Determination
        let toxicMode: ToxicAction = "none";
        if (req.headers["x-toxic-mode"]) {
            toxicMode = req.headers["x-toxic-mode"] as ToxicAction;
        } else if (Math.random() < 0.05) {
            const modes: ToxicAction[] = ["latency", "error_500", "slow_drip"];
            toxicMode = modes[Math.floor(Math.random() * modes.length)];
        }

        logger.info({ method, url: req.url, toxic: toxicMode }, "Sidecar: Proxying Request");

        // 2. Toxic Effects: Request Side
        if (toxicMode === "latency") {
            const delay = Math.floor(Math.random() * 2000) + 500;
            await new Promise(r => setTimeout(r, delay));
        }

        if (toxicMode === "error_500") {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Toxic Sidecar: Injected 500 Error" }));
            return;
        }

        // 3. Upstream Request with Memory Protection
        try {
            const buffers: Buffer[] = [];
            let totalSize = 0;

            for await (const chunk of req) {
                totalSize += chunk.length;
                if (totalSize > MAX_BODY_SIZE) {
                    logger.warn({ ip: req.socket?.remoteAddress }, "Sidecar: Request too large, rejecting");
                    res.writeHead(413);
                    res.end("Payload Too Large (Toxic Sidecar Limit: 10MB)");
                    return;
                }
                buffers.push(chunk);
            }
            const body = Buffer.concat(buffers);

            // Forward to Target
            const { statusCode, headers, body: responseBody } = await undiciRequest(targetUrl.toString(), {
                method: method as any,
                headers: req.headers as any,
                body: body.length > 0 ? body : undefined
            });

            // 4. Toxic Effects: Response Side
            res.writeHead(statusCode, headers);

            if (toxicMode === "slow_drip" || toxicMode === "corrupt_body") {
                const toxicStream = new ToxicStream({ rate: 1.0, action: toxicMode });
                
                // Use pipeline for proper backpressure and error handling
                await pipeline(
                    responseBody, 
                    toxicStream,
                    res
                );
            } else {
                // Standard proxy streaming
                await pipeline(
                    responseBody,
                    res
                );
            }

        } catch (e: any) {
            logger.error({ error: e.message }, "Sidecar: Upstream Failed or Stream Pipe Error");
            if (!res.headersSent) {
                res.writeHead(502);
                res.end("Bad Gateway (Toxic Sidecar)");
            } else {
                // If headers already sent, we just end the response to signal error
                res.end();
            }
        }
    });
}

export function startSidecar() {
    const server = createSidecarServer();
    server.listen(SIDECAR_PORT, "0.0.0.0", () => {
        console.log(`
☢️  Toxic Sidecar Active on port ${SIDECAR_PORT}
   -----------------------------------
   Target:  ${TARGET}
   Limit:   10MB
   
   To use:  Send requests to http://localhost:${SIDECAR_PORT}
   Control: X-Toxic-Mode: [latency, slow_drip, error_500, corrupt_body]
        `);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    startSidecar();
}