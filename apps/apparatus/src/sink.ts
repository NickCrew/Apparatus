import { Request, Response } from "express";

export function sinkHandler(req: Request, res: Response) {
    let bytesReceived = 0;
    const start = Date.now();

    req.on("data", (chunk) => {
        bytesReceived += chunk.length;
    });

    req.on("end", () => {
        const durationMs = Date.now() - start;
        const seconds = durationMs / 1000;
        const mb = bytesReceived / (1024 * 1024);
        const mbps = seconds > 0 ? (mb * 8) / seconds : 0;

        res.json({
            message: "Data consumed and discarded",
            bytesReceived,
            durationMs,
            megabytes: Number(mb.toFixed(2)),
            mbps: Number(mbps.toFixed(2))
        });
    });

    req.on("error", (err) => {
        res.status(500).json({ error: "Stream error", details: err.message });
    });
}
