import { Request, Response } from "express";
import { spawn } from "child_process";
import { request } from "undici";
import { logger } from "./logger.js";

export function pcapHandler(req: Request, res: Response) {
    const duration = parseInt(req.query.duration as string) || 30;
    const iface = req.query.iface as string || "eth0";

    res.setHeader("Content-Type", "application/vnd.tcpdump.pcap");
    res.setHeader("Content-Disposition", `attachment; filename="capture-${Date.now()}.pcap"`);

    // Requires 'tcpdump' installed in image and NET_ADMIN capability
    const tcpdump = spawn("tcpdump", ["-i", iface, "-w", "-", "-U"], {
        stdio: ["ignore", "pipe", "pipe"]
    });

    tcpdump.stdout.pipe(res);
    
    // Stop after duration
    setTimeout(() => {
        tcpdump.kill();
        if (!res.writableEnded) res.end();
    }, duration * 1000);

    tcpdump.on("error", (err) => {
        if (!res.headersSent) res.status(500).send(`tcpdump failed: ${err.message}`);
    });
}

export async function harReplayHandler(req: Request, res: Response) {
    const har = req.body; // Expecting parsed JSON body
    
    if (!har || !har.log || !har.log.entries) {
        return res.status(400).json({ error: "Invalid HAR JSON" });
    }

    const results = [];
    
    for (const entry of har.log.entries) {
        try {
            const { request: reqData } = entry;
            // Replay logic
            const { statusCode } = await request(reqData.url, {
                method: reqData.method,
                headers: reqData.headers.reduce((acc: any, h: any) => {
                    acc[h.name] = h.value;
                    return acc;
                }, {}),
                body: reqData.postData?.text
            });
            results.push({ url: reqData.url, status: statusCode });
        } catch (e: any) {
            results.push({ url: entry.request.url, error: e.message });
        }
    }
    
    res.json({ results });
}

const MAX_LIVE_CAPTURES = 4;
let activeCaptures = 0;

export function livePacketHandler(req: Request, res: Response) {
    if (activeCaptures >= MAX_LIVE_CAPTURES) {
        return res.status(429).json({ error: "Too many active captures" });
    }

    // Strict allowlist for interfaces to prevent arbitrary capture
    const ALLOWED_INTERFACES = new Set(["eth0", "lo", "docker0", "any"]);
    const rawIface = req.query.iface as string;
    const iface = ALLOWED_INTERFACES.has(rawIface) ? rawIface : "eth0";
    
    // Validate BPF filter - only allow alphanumeric and common symbols
    const rawFilter = req.query.filter as string || "";
    const filter = rawFilter.replace(/[^a-zA-Z0-9\s.:\/\-]/g, "");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(":ok\n\n"); // Flush buffer

    activeCaptures++;

    // Spawn tcpdump in line-buffered text mode
    // -l: line-buffered, -nn: don't resolve names, -t: don't print timestamp (we'll add our own)
    const args = ["-i", iface, "-l", "-nn", "-q"];
    
    // Split filter into individual tokens for safe spawning
    if (filter) {
        const tokens = filter.split(/\s+/).filter(Boolean);
        args.push(...tokens);
    }

    const tcpdump = spawn("tcpdump", args, {
        stdio: ["ignore", "pipe", "pipe"] // We will consume stderr
    });

    tcpdump.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (line.trim()) {
                res.write(`data: ${JSON.stringify({ 
                    timestamp: new Date().toISOString(),
                    raw: line.trim() 
                })}\n\n`);
            }
        }
    });

    // Consume stderr to prevent hanging
    tcpdump.stderr.on("data", (data) => {
        logger.warn({ stderr: data.toString().trim() }, "tcpdump live stderr");
    });

    const cleanup = () => {
        if (!tcpdump.killed) {
            tcpdump.kill();
            activeCaptures--;
        }
    };

    req.on("close", cleanup);
    
    // Auto-kill after 5 minutes
    setTimeout(cleanup, 5 * 60 * 1000);

    tcpdump.on("error", (err) => {
        logger.error({ err }, "tcpdump live failed");
        if (!res.writableEnded) res.end();
        cleanup();
    });
}
