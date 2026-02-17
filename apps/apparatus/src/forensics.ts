import { Request, Response } from "express";
import { spawn } from "child_process";
import { request } from "undici";

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
