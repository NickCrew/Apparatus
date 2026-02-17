import { Request, Response } from "express";
import { request } from "undici";

const PAYLOADS = {
    xss: [
        "<script>alert(1)</script>",
        "javascript:alert(1)",
        "<img src=x onerror=alert(1)>",
    ],
    sqli: [
        "' OR '1'='1",
        "UNION SELECT 1,2,3--",
        "admin' --",
    ],
    pathtraversal: [
        "../../etc/passwd",
        "..\\windows\\win.ini",
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    ],
    cmdinjection: [
        "; cat /etc/passwd",
        "| whoami",
        "$(whoami)",
    ],
    nosqli: [
        '{"$$gt": ""}',
        '{"$$ne": null}'
    ]
};

export async function redTeamValidateHandler(req: Request, res: Response) {
    const targetBase = req.query.target as string || `${req.protocol}://${req.get("host")}`;
    const targetPath = req.query.path as string || "/echo"; // Default to hitting the echo endpoint
    const method = req.query.method as string || "GET";

    const results: any[] = [];

    // Helper to test a payload
    const testPayload = async (category: string, payload: string) => {
        const url = new URL(targetPath, targetBase);
        
        // Inject into Query Param "q"
        url.searchParams.set("q", payload);
        
        try {
            const start = Date.now();
            const { statusCode } = await request(url.toString(), {
                method: method as any,
                // Also inject into headers for good measure
                headers: {
                    "X-Payload": payload,
                    "User-Agent": `RedTeam/1.0 (${category})`
                }
            });
            const duration = Date.now() - start;
            
            return {
                category,
                payload,
                status: statusCode,
                blocked: statusCode === 403 || statusCode === 406 || statusCode === 500, // 500 might mean WAF blocked badly or app crashed (which is a finding)
                duration
            };
        } catch (e: any) {
            return {
                category,
                payload,
                error: e.message,
                blocked: true // Connection reset/timeout usually counts as "blocked" by network/WAF
            };
        }
    };

    // Run tests
    for (const [category, payloads] of Object.entries(PAYLOADS)) {
        for (const payload of payloads) {
            results.push(await testPayload(category, payload));
        }
    }

    res.json({
        target: targetBase + targetPath,
        summary: {
            total: results.length,
            blocked: results.filter(r => r.blocked).length,
            passed: results.filter(r => !r.blocked).length
        },
        details: results
    });
}