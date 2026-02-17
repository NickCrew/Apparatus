import { Request, Response, NextFunction } from "express";
import { monitorEventLoopDelay } from "perf_hooks";
import { logger } from "./logger.js";

const histogram = monitorEventLoopDelay();
histogram.enable();

let currentLag = 0;
const LAG_THRESHOLD_MS = 50; // Threshold for "Heavy" traffic shedding
const CRITICAL_LAG_MS = 200; // Threshold for critical health

// Update lag every second
setInterval(() => {
    currentLag = histogram.mean / 1e6; // Convert ns to ms
    histogram.reset();
}, 1000);

export function selfHealingMiddleware(req: Request, res: Response, next: NextFunction) {
    // 1. Check for Critical Health
    if (currentLag > CRITICAL_LAG_MS) {
        logger.error({ lag: currentLag }, "CRITICAL HEALTH: Shedding all traffic");
        res.setHeader("Retry-After", "5");
        return res.status(503).json({
            error: "Service Overloaded",
            message: "Autonomous self-healing active. Load shedding in progress.",
            current_lag_ms: Number(currentLag.toFixed(2))
        });
    }

    // 2. Check for Heavy Traffic (QoS)
    const isHeavyRoute = req.path.startsWith("/generate") || req.path.startsWith("/chaos");
    if (currentLag > LAG_THRESHOLD_MS && isHeavyRoute) {
        logger.warn({ lag: currentLag, path: req.path }, "HIGH LOAD: Shedding heavy traffic");
        return res.status(429).json({
            error: "Too Busy",
            message: "QoS active. Heavy features temporarily disabled due to load.",
            current_lag_ms: Number(currentLag.toFixed(2))
        });
    }

    next();
}

export function getHealthStatus() {
    return {
        status: currentLag > CRITICAL_LAG_MS ? "critical" : (currentLag > LAG_THRESHOLD_MS ? "degraded" : "healthy"),
        lag_ms: Number(currentLag.toFixed(2))
    };
}
