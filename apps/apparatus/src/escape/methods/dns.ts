import { resolve4, resolveTxt } from "node:dns/promises";
import { logger } from "../../logger.js";

export async function checkDNS(target: string, data?: string): Promise<any> {
    const results: any = {
        protocol: "dns",
        checks: []
    };

    // 1. Basic Public Resolution
    try {
        const start = Date.now();
        await resolve4("google.com");
        results.checks.push({
            name: "public_resolution_a",
            status: "success",
            duration: Date.now() - start,
            details: "Resolved google.com (A)"
        });
    } catch (e: any) {
        results.checks.push({
            name: "public_resolution_a",
            status: "failed",
            error: e.message
        });
    }

    // 2. TXT Record Resolution (often used for C2)
    try {
        const start = Date.now();
        await resolveTxt("google.com");
        results.checks.push({
            name: "public_resolution_txt",
            status: "success",
            duration: Date.now() - start,
            details: "Resolved google.com (TXT)"
        });
    } catch (e: any) {
        results.checks.push({
            name: "public_resolution_txt",
            status: "failed",
            error: e.message
        });
    }

    // 3. Exfiltration Simulation (if target provided)
    // We try to resolve a subdomain containing the data: <base64>.target.com
    if (target && data) {
        const encoded = Buffer.from(data).toString("base64").replace(/=/g, "");
        const exfilDomain = `${encoded}.${target}`;
        
        try {
            const start = Date.now();
            // We expect this might fail to resolve (NXDOMAIN), but if it DOESN'T timeout, 
            // it means the query got out to an upstream server.
            await resolve4(exfilDomain);
            results.checks.push({
                name: "exfil_a_record",
                status: "success", // Ideally this means we got an IP, but even NXDOMAIN proves egress
                duration: Date.now() - start,
                details: `Query sent for ${exfilDomain}`
            });
        } catch (e: any) {
             // ENOTFOUND is actually a "success" for egress (the query went out and came back with "Doesn't exist")
             // ETIMEOUT means blocked.
             const isBlocked = e.code === "ETIMEOUT" || e.code === "EREFUSED";
             results.checks.push({
                name: "exfil_a_record",
                status: isBlocked ? "blocked" : "likely_success", 
                details: isBlocked ? "Request timed out (Firewall?)" : `DNS Server replied: ${e.code}`,
                error: e.code
            });
        }
    }

    return results;
}
