import { Request, Response } from "express";
import { request } from "undici";
import { logger } from "./logger.js";

let ghostInterval: NodeJS.Timeout | null = null;

const USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1"
];

const PATHS = [
    "/echo",
    "/healthz",
    "/docs",
    "/",
    "/history"
];

export function ghostHandler(req: Request, res: Response) {
    const action = req.query.action as string;

    if (action === "start") {
        if (ghostInterval) return res.json({ status: "already_running" });

        const targetBase = req.query.target as string || `http://localhost:${process.env.PORT || 8080}`;
        const delay = parseInt(req.query.delay as string) || 1000;

        logger.info({ target: targetBase, delay }, "Starting Ghost Traffic");

        ghostInterval = setInterval(async () => {
            const path = PATHS[Math.floor(Math.random() * PATHS.length)];
            const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
            
            try {
                await request(`${targetBase}${path}`, {
                    headers: { "User-Agent": ua }
                });
            } catch (e) {
                // Ignore errors, ghosts don't care
            }
        }, delay);

        return res.json({ status: "started", target: targetBase });
    } else if (action === "stop") {
        if (ghostInterval) {
            clearInterval(ghostInterval);
            ghostInterval = null;
        }
        return res.json({ status: "stopped" });
    }

    res.json({ status: ghostInterval ? "running" : "stopped" });
}