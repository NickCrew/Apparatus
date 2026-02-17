import { Request, Response } from "express";

const store = new Map<string, any>();

export function kvHandler(req: Request, res: Response) {
    const key = req.params.key;

    if (req.method === "GET") {
        if (store.has(key)) {
            return res.json({ key, value: store.get(key) });
        } else {
            return res.status(404).json({ error: "Key not found" });
        }
    }

    if (req.method === "POST" || req.method === "PUT") {
        const value = req.body;
        store.set(key, value);
        return res.json({ message: "Set", key, value });
    }

    if (req.method === "DELETE") {
        store.delete(key);
        return res.sendStatus(204);
    }
}
