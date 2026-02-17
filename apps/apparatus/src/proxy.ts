import { Request, Response } from "express";
import axios from "axios";
import { logger } from "./logger.js";

export async function proxyHandler(req: Request, res: Response) {
    const targetUrl = req.query.url as string;
    
    if (!targetUrl) {
        return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: req.headers as any,
            data: req.body,
            validateStatus: () => true, // Accept all status codes
            timeout: 5000 // 5s timeout to prevent hanging
        });

        res.status(response.status).set(response.headers).send(response.data);
    } catch (error: any) {
        logger.error({ err: error.message, url: targetUrl }, "Proxy request failed");
        res.status(502).json({
            error: "Proxy request failed",
            message: error.message,
            code: error.code
        });
    }
}
