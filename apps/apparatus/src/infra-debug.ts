import { Request, Response } from "express";
import dns from "dns/promises";
import net from "net";

export async function dnsHandler(req: Request, res: Response) {
    const target = req.query.target as string;
    const type = (req.query.type as string || "A").toUpperCase();

    if (!target) {
        return res.status(400).json({ error: "Missing 'target' query parameter" });
    }

    try {
        let result;
        switch (type) {
            case "A":
                result = await dns.resolve4(target);
                break;
            case "AAAA":
                result = await dns.resolve6(target);
                break;
            case "MX":
                result = await dns.resolveMx(target);
                break;
            case "TXT":
                result = await dns.resolveTxt(target);
                break;
            case "SRV":
                result = await dns.resolveSrv(target);
                break;
            case "NS":
                result = await dns.resolveNs(target);
                break;
            case "CNAME":
                result = await dns.resolveCname(target);
                break;
            default:
                return res.status(400).json({ error: `Unsupported record type: ${type}` });
        }
        res.json({ target, type, result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}

export function pingHandler(req: Request, res: Response) {
    const target = req.query.target as string;
    
    if (!target) {
        return res.status(400).json({ error: "Missing 'target' query parameter (host:port)" });
    }

    const [host, portStr] = target.split(":");
    const port = parseInt(portStr);

    if (!host || isNaN(port)) {
        return res.status(400).json({ error: "Invalid format. Use host:port" });
    }

    const start = Date.now();
    const socket = new net.Socket();
    
    socket.setTimeout(2000); // 2s timeout

    socket.connect(port, host, () => {
        const duration = Date.now() - start;
        res.json({ status: "success", target, duration_ms: duration });
        socket.destroy();
    });

    socket.on("error", (err) => {
        res.status(500).json({ status: "failed", target, error: err.message });
    });

    socket.on("timeout", () => {
        res.status(504).json({ status: "timeout", target });
        socket.destroy();
    });
}
