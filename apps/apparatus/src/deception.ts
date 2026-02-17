import { Request, Response } from "express";
import { logger } from "./logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { chat } from "./ai/client.js";
import { PERSONAS } from "./ai/personas.js";
import { broadcastDeception } from "./sse-broadcast.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory store for honeypot activity
interface DeceptionEvent {
    timestamp: string;
    ip: string;
    type: 'honeypot_hit' | 'shell_command' | 'sqli_probe';
    route: string;
    details: any;
    sessionId?: string;
}

const deceptionHistory: DeceptionEvent[] = [];
const MAX_HISTORY = 100;

function recordDeception(event: DeceptionEvent) {
    deceptionHistory.unshift(event);
    if (deceptionHistory.length > MAX_HISTORY) {
        deceptionHistory.length = MAX_HISTORY;
    }
    // Broadcast to SSE clients
    broadcastDeception(event);
}

export function deceptionHistoryHandler(_req: Request, res: Response) {
    res.json({
        count: deceptionHistory.length,
        events: deceptionHistory
    });
}

export function deceptionClearHandler(_req: Request, res: Response) {
    const count = deceptionHistory.length;
    deceptionHistory.length = 0;
    res.json({ status: "cleared", count });
}

const DECEPTION_ROUTES: Record<string, (req: Request, res: Response) => void> = {
    "/admin": (req, res) => {
        const ip = req.ip || "unknown";
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'honeypot_hit',
            route: '/admin',
            details: { method: req.method }
        });
        res.setHeader("Content-Type", "text/html");
        res.send(`
            <html>
                <head><title>Admin Login</title></head>
                <body style="font-family: sans-serif; padding: 50px;">
                    <h2>System Management Console</h2>
                    <form method="POST" action="/console/login">
                        <label>Username:</label><br><input type="text" name="user"><br>
                        <label>Password:</label><br><input type="password" name="pass"><br><br>
                        <button type="submit">Login</button>
                    </form>
                </body>
            </html>
        `);
    },
    "/console/login": (req, res) => {
        // Always allow login to trap them in the shell
        res.redirect("/console");
    },
    "/console": (req, res) => {
        res.sendFile(path.join(__dirname, "terminal.html"));
    },
    "/phpmyadmin": (req, res) => {
        const ip = req.ip || "unknown";
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'honeypot_hit',
            route: '/phpmyadmin',
            details: { method: req.method }
        });
        res.status(200).send("phpMyAdmin - Error: Authentication required.");
    },
    "/.env": (req, res) => {
        const ip = req.ip || "unknown";
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'honeypot_hit',
            route: '/.env',
            details: { method: req.method, severity: 'critical' }
        });
        res.send("APP_ENV=production\nDB_HOST=10.0.0.5\nDB_USER=root\nDB_PASS=REDACTED_BY_SEC_POLICY\nJWT_SECRET=super-secret-key-123");
    },
    "/etc/passwd": (req, res) => {
        const ip = req.ip || "unknown";
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'honeypot_hit',
            route: '/etc/passwd',
            details: { method: req.method, severity: 'critical' }
        });
        res.send("root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin\ndaemon:x:2:2:daemon:/sbin:/sbin/nologin\nadm:x:3:4:adm:/var/adm:/sbin/nologin\nlp:x:4:7:lp:/var/spool/lpd:/sbin/nologin");
    }
};

export async function deceptionHandler(req: Request, res: Response): Promise<boolean> {
    const path = req.path;
    
    // AI Console API
    if (path === "/console/api" && req.method === "POST") {
        const { command, sessionId } = req.body;
        const ip = req.ip || "unknown";
        logger.info({ ip, command, sessionId }, "AI Honeypot: Executing command");

        // Record shell command
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'shell_command',
            route: '/console/api',
            details: { command },
            sessionId
        });

        const output = await chat(sessionId, PERSONAS.linux_terminal, command);
        res.json({ output });
        return true;
    }

    // Check for exact matches or prefix matches for deception
    for (const [route, handler] of Object.entries(DECEPTION_ROUTES)) {
        if (path === route || path.startsWith(route + "/")) {
            logger.info({ path, ip: req.ip }, "Deception active: serving fake response");
            handler(req, res);
            return true;
        }
    }

    // Generic deception for SQLi-like probes in query
    if (JSON.stringify(req.query).match(/UNION|SELECT|DROP|--/i)) {
        const ip = req.ip || "unknown";
        logger.info({ ip }, "SQLi detected: serving fake DB schema");
        recordDeception({
            timestamp: new Date().toISOString(),
            ip,
            type: 'sqli_probe',
            route: req.path,
            details: { query: req.query }
        });
        res.json({
            status: "success",
            data: [
                { id: 1, username: "admin", role: "superuser" },
                { id: 2, username: "guest", role: "read-only" }
            ],
            db_version: "MySQL 8.0.32-debug"
        });
        return true;
    }

    return false;
}
