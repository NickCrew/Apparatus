import { Request, Response } from "express";

export function generatorHandler(req: Request, res: Response) {
    const sizeStr = req.query.size as string || "1mb";
    const chunked = req.query.chunked === "true";
    
    // Parse size
    let bytes = 1024 * 1024; // Default 1MB
    const match = sizeStr.match(/^(\d+)([kmg]b?)?$/i);
    if (match) {
        const val = parseInt(match[1]);
        const unit = (match[2] || "").toLowerCase();
        if (unit.startsWith("k")) bytes = val * 1024;
        else if (unit.startsWith("m")) bytes = val * 1024 * 1024;
        else if (unit.startsWith("g")) bytes = val * 1024 * 1024 * 1024;
        else bytes = val;
    }

    // Cap at 1GB to prevent memory explosions
    if (bytes > 1024 * 1024 * 1024) bytes = 1024 * 1024 * 1024;

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="payload-${sizeStr}.bin"`);

    if (!chunked) {
        // Send a single buffer (careful with memory)
        // Ideally we stream anyway, but for "non-chunked" we need Content-Length
        res.setHeader("Content-Length", bytes);
        
        // Stream it in chunks to avoid allocating huge buffer, but keep response open
        let sent = 0;
        const chunkSize = 64 * 1024;
        const buffer = Buffer.alloc(chunkSize, "A"); // Fast allocation

        const stream = () => {
            while (sent < bytes) {
                const remaining = bytes - sent;
                const toSend = Math.min(chunkSize, remaining);
                const canContinue = res.write(toSend === chunkSize ? buffer : buffer.subarray(0, toSend));
                sent += toSend;
                
                if (!canContinue) {
                    res.once("drain", stream);
                    return;
                }
            }
            res.end();
        };
        stream();
    } else {
        // Chunked encoding (no Content-Length), artificial delay
        // Send 10% every 500ms
        const chunkSize = Math.floor(bytes / 10);
        let sent = 0;
        const buffer = Buffer.alloc(chunkSize, "B");

        const interval = setInterval(() => {
            if (sent >= bytes) {
                clearInterval(interval);
                res.end();
                return;
            }
            const remaining = bytes - sent;
            const toSend = Math.min(chunkSize, remaining);
            res.write(toSend === chunkSize ? buffer : buffer.subarray(0, toSend));
            sent += toSend;
        }, 500);

        res.on("close", () => clearInterval(interval));
    }
}
