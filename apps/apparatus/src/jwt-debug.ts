import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export function jwtDebugHandler(req: Request, res: Response) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(400).json({ error: "Missing or invalid Authorization header (Bearer token required)" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.decode(token, { complete: true });
        
        if (!decoded) {
             return res.status(400).json({ error: "Invalid JWT token structure" });
        }

        res.json({
            token: token,
            header: decoded.header,
            payload: decoded.payload,
            signature: decoded.signature
        });
    } catch (error: any) {
        res.status(400).json({ error: "Failed to decode JWT", details: error.message });
    }
}
