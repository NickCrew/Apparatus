import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

interface Rule {
    id: string;
    pattern: RegExp;
    action: "block" | "log";
    source: "auto" | "manual";
}

const rules: Rule[] = [];

export function activeShieldMiddleware(req: Request, res: Response, next: NextFunction) {
    const rawUrl = req.url;
    // req.body is already parsed by express.json() if placed correctly
    const body = JSON.stringify(req.body); 
    
    for (const rule of rules) {
        if (rule.pattern.test(rawUrl) || rule.pattern.test(body)) {
            logger.warn({ ruleId: rule.id, action: rule.action, ip: req.ip }, "Active Shield Triggered");
            
            if (rule.action === "block") {
                return res.status(403).json({ error: "Request blocked by Active Shield", rule_id: rule.id });
            }
        }
    }
    
    next();
}

export function sentinelHandler(req: Request, res: Response) {
    if (req.method === "POST") {
        const { pattern, action } = req.body;
        if (!pattern) return res.status(400).json({ error: "Missing pattern" });

        try {
            const regex = new RegExp(pattern); // Validate regex
            const rule: Rule = {
                id: `rule-${Date.now()}`,
                pattern: regex,
                action: action || "block",
                source: "manual"
            };
            rules.push(rule);
            return res.json({ status: "added", rule: { ...rule, pattern: rule.pattern.toString() } });
        } catch (e: any) {
            return res.status(400).json({ error: "Invalid Regex", details: e.message });
        }
    } else if (req.method === "GET") {
        return res.json(rules.map(r => ({ ...r, pattern: r.pattern.toString() })));
    } else if (req.method === "DELETE") {
        const id = req.query.id as string;
        const idx = rules.findIndex(r => r.id === id);
        if (idx !== -1) {
            rules.splice(idx, 1);
            return res.json({ status: "deleted", id });
        }
        return res.status(404).json({ error: "Rule not found" });
    }
}