import { Request, Response } from "express";
import os from "os";

export function sysInfoHandler(req: Request, res: Response) {
    const memory = process.memoryUsage();
    
    // Filter sensitive env vars
    const safeEnv: Record<string, string> = {};
    const sensitiveKeys = ["KEY", "SECRET", "PASSWORD", "TOKEN", "AUTH", "CERT"];
    
    for (const [key, val] of Object.entries(process.env)) {
        if (!sensitiveKeys.some(s => key.toUpperCase().includes(s))) {
            safeEnv[key] = val || "";
        } else {
            safeEnv[key] = "[REDACTED]";
        }
    }

    res.json({
        hostname: os.hostname(),
        platform: `${os.platform()} ${os.release()} (${os.arch()})`,
        uptime: os.uptime(),
        cpus: os.cpus().length,
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            process: {
                rss: memory.rss,
                heapTotal: memory.heapTotal,
                heapUsed: memory.heapUsed
            }
        },
        loadavg: os.loadavg(),
        networkInterfaces: os.networkInterfaces(),
        env: safeEnv,
        pid: process.pid,
        nodeVersion: process.version
    });
}
