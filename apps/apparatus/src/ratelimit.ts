import { Request, Response } from "express";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;
const ipHits = new Map<string, { count: number; resetAt: number }>();

export function rateLimitHandler(req: Request, res: Response) {
    const ip = req.ip || "unknown";
    const now = Date.now();
    
    let record = ipHits.get(ip);

    // Clean up expired or create new
    if (!record || now > record.resetAt) {
        record = { count: 0, resetAt: now + WINDOW_MS };
        ipHits.set(ip, record);
    }

    record.count++;

    const remaining = Math.max(0, MAX_REQUESTS - record.count);
    const resetInSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetInSeconds);

    if (record.count > MAX_REQUESTS) {
        return res.status(429).json({
            error: "Too Many Requests",
            message: `Rate limit of ${MAX_REQUESTS} requests per minute exceeded. Try again in ${resetInSeconds} seconds.`
        });
    }

    res.json({
        message: "Request accepted",
        limit: MAX_REQUESTS,
        remaining,
        resetInSeconds
    });
}
