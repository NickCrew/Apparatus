import { checkDNS } from "./methods/dns.js";
import { checkHTTP } from "./methods/http.js";
import { checkICMP } from "./methods/icmp.js";
import { checkTCP } from "./methods/tcp.js";
import { checkUDP } from "./methods/udp.js";
import { checkWebSocket } from "./methods/websocket.js";
import { request } from "undici";
import { fileURLToPath } from "url";

// --- DLP Generators (Inlined for standalone portability) ---
function generateLuhn(prefix: string, length: number): string {
    let payload = prefix;
    while (payload.length < length - 1) {
        payload += Math.floor(Math.random() * 10);
    }
    const digits = payload.split("").map(Number);
    let sum = 0;
    let shouldDouble = true;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = digits[i];
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return payload + checkDigit;
}

const generators = {
    cc: () => generateLuhn("4", 16),
    ssn: () => `${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(1000 + Math.random() * 8999)}`,
    email: () => "ceo@example.com,admin@internal.corp,secret@company.net"
};
// -----------------------------------------------------------

async function reportToRiskServer(url: string, results: any) {
    // Calculate total successful checks (potential breaches)
    let breaches = 0;
    const details: any = {};

    results.checks.forEach((group: any) => {
        const items = group.checks ? group.checks : [group];
        items.forEach((check: any) => {
            if (check.status === "success" || check.status === "likely_success") {
                breaches++;
                // Ignore "public_http_google" as a breach if we are just testing connectivity, 
                // but strictly speaking, if we are in a locked down env, even google is a breach.
                details[group.protocol] = (details[group.protocol] || 0) + 1;
            }
        });
    });

    if (breaches === 0) return; // No need to report if we are safe? Or maybe report "all clear"?
    // For now, only report bad news.

    const payload = {
        sensorId: `escape-artist-${process.env.HOSTNAME || "cli"}`,
        timestamp: new Date().toISOString(),
        actor: {
            ip: "0.0.0.0", // Self
            fingerprint: "escape-artist-v1"
        },
        signal: {
            type: "dlp_match", // Using DLP match as a catch-all for "Egress Success"
            severity: "critical",
            details: {
                breach_count: breaches,
                protocols: details,
                target_checks: results.checks
            }
        },
        request: {
            method: "EGRESS",
            path: "/"
        }
    };

    try {
        console.log(`\n[!] Reporting ${breaches} findings to Risk Server at ${url}...`);
        const { statusCode } = await request(`${url}/_sensor/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (statusCode >= 200 && statusCode < 300) console.log("    ✅ Report accepted.");
        else console.log(`    ❌ Report failed: ${statusCode}`);
    } catch (e: any) {
        console.log(`    ❌ Report error: ${e.message}`);
    }
}

export interface EscapeOptions {
    target?: string;
    data?: string;
    dlpType?: string;
    ports?: number[];
    report?: boolean;
    riskServerUrl?: string;
}

export async function runEscapeScan(options: EscapeOptions = {}) {
    const {
        target = "",
        data: manualData = "secret-123",
        dlpType,
        ports = [80, 443, 8080, 22, 21, 53, 1883],
        report = false,
        riskServerUrl = process.env.RISK_SERVER_URL || "http://localhost:4100"
    } = options;

    let data = manualData;
    if (dlpType) {
        if (dlpType === "cc") data = `cc:${generators.cc()}`;
        else if (dlpType === "ssn") data = `ssn:${generators.ssn()}`;
        else if (dlpType === "email") data = `email:${generators.email()}`;
    }

    const results: any = {
        timestamp: new Date().toISOString(),
        payload_type: dlpType || "manual",
        checks: []
    };

    // Helper to add results
    const addResult = (proto: string, res: any) => {
        results.checks.push({ protocol: proto, ...res });
    };

    // 1. ICMP
    addResult("icmp", await checkICMP("8.8.8.8"));

    // 2. DNS
    const dnsTarget = target && !target.startsWith("http") ? target : "google.com";
    addResult("dns", await checkDNS(dnsTarget, target ? data : undefined));

    // 3. HTTP
    const httpTarget = target && target.startsWith("http") ? target : "";
    addResult("http", await checkHTTP(httpTarget, data));

    // 4. TCP Port Scan / Egress
    const tcpTarget = target ? target.replace("http://", "").replace("https://", "").split(":")[0] : "google.com";
    const tcpResults = { protocol: "tcp", checks: [] as any[] };
    for (const port of ports) {
        tcpResults.checks.push(await checkTCP(tcpTarget, port, data));
    }
    results.checks.push(tcpResults);

    // 5. UDP Egress
    const udpResults = { protocol: "udp", checks: [] as any[] };
    for (const port of ports) {
        udpResults.checks.push(await checkUDP(tcpTarget, port, data));
    }
    results.checks.push(udpResults);

    // 6. WebSocket
    if (target && target.startsWith("http")) {
        const wsTarget = target.replace("http", "ws");
        addResult("websocket", await checkWebSocket(wsTarget, data));
    }

    // Reporting
    if (report) {
        await reportToRiskServer(riskServerUrl, results);
    }

    return results;
}

async function main() {
    const args = process.argv.slice(2);
    const help = args.includes("--help") || args.includes("-h");
    
    if (help) {
        console.log(`
  The Escape Artist - Egress Validator (Steroids Edition)
  Usage: npm run escape -- [options]

  Options:
    --target <host>       Target C2 server or Domain (e.g., my-c2.com)
    --data <string>       Data to try and exfiltrate (default: "secret-123")
    --dlp <type>          Generate FAKE sensitive data: "cc" (Credit Card), "ssn", "email"
    --ports <list>        Comma-separated list of ports for TCP/UDP check (default: 80,443,8080)
    --protocols <list>    Comma-separated list of protocols to test (default: all)
                          Options: icmp,dns,http,tcp,udp,ws
    --report              Report critical findings to Risk Server
    --risk-server <url>   Risk Server URL (default: http://localhost:4100)
    --json                Output results as JSON
        `);
        process.exit(0);
    }
    
    // Parse Flags
    const targetIndex = args.indexOf("--target");
    const target = targetIndex !== -1 ? args[targetIndex + 1] : undefined;

    const report = args.includes("--report");
    const riskServerIndex = args.indexOf("--risk-server");
    const riskServerUrl = riskServerIndex !== -1 ? args[riskServerIndex + 1] : undefined;
    
    const dataIndex = args.indexOf("--data");
    const dlpIndex = args.indexOf("--dlp");
    
    let data = undefined;
    let dlpType = undefined;

    if (dlpIndex !== -1) {
        dlpType = args[dlpIndex + 1];
    } else if (dataIndex !== -1) {
        data = args[dataIndex + 1];
    }

    const portsIndex = args.indexOf("--ports");
    const ports = portsIndex !== -1 ? args[portsIndex + 1].split(",").map(Number) : undefined;

    const json = args.includes("--json");
    if (!json) console.log(`🕵️  Starting Escape Artist scan...\n`);

    try {
        const results = await runEscapeScan({
            target,
            data,
            dlpType,
            ports,
            report,
            riskServerUrl
        });

        if (json) {
            console.log(JSON.stringify(results, null, 2));
        } else {
            console.log("\nScan Complete. Summary:");
            results.checks.forEach((group: any) => {
                console.log(`\n[${group.protocol.toUpperCase()}]`);
                // Handle nested checks vs flat checks
                const items = group.checks ? group.checks : [group];
                
                items.forEach((check: any) => {
                    const icon = check.status === "success" || check.status === "likely_success" ? "✅" : "❌";
                    console.log(`  ${icon} ${check.name || check.target}: ${check.status} ${check.error ? `(${check.error})` : ""}`);
                    if (check.details) console.log(`      ${check.details}`);
                });
            });
        }
    } catch (err: any) {
        console.error("CRITICAL ERROR:");
        console.error(err);
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
