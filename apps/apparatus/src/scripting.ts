import { Request, Response } from "express";
import vm from "vm";

export function scriptHandler(req: Request, res: Response) {
    const code = req.body.code || req.query.code;
    
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Missing 'code' parameter (string)" });
    }

    const sandbox = {
        console: { log: (...args: any[]) => logs.push(args) },
        input: req.body.input || {},
        result: null
    };

    const logs: any[] = [];
    
    try {
        vm.createContext(sandbox);
        // Timeout 100ms to prevent infinite loops
        vm.runInContext(code, sandbox, { timeout: 100 });
        
        res.json({
            status: "success",
            result: sandbox.result,
            logs
        });
    } catch (e: any) {
        res.status(400).json({
            status: "error",
            error: e.message
        });
    }
}
