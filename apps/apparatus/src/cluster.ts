import dgram from "dgram";
import { logger } from "./logger.js";
import { request } from "undici";
import { Request, Response } from "express";
import os from "os";

const DEFAULT_GOSSIP_PORT = 7946;
let gossipPort = DEFAULT_GOSSIP_PORT;
const members = new Map<string, number>(); // IP -> LastSeen Timestamp
const myIp = getLocalIp();

function getLocalIp() {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name] || []) {
            if (!iface.internal && iface.family === "IPv4") {
                return iface.address;
            }
        }
    }
    return "127.0.0.1";
}

export function startClusterNode(options: { port?: number; host?: string } = {}) {
    const host = options.host;
    gossipPort = options.port ?? gossipPort;
    const socket = dgram.createSocket("udp4");
    
    // Listen for beacons
    socket.on("message", (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.type === "BEACON" && data.ip !== myIp) {
                if (!members.has(data.ip)) {
                    logger.info({ newMember: data.ip }, "Cluster: New Node Discovered");
                }
                members.set(data.ip, Date.now());
            }
            if (data.type === "ATTACK") {
                executeAttack(data.target, data.rate);
            }
        } catch (e) {}
    });

    socket.bind(gossipPort, host, () => {
        socket.setBroadcast(true);
    });

    const beaconInterval = setInterval(() => {
        const beacon = JSON.stringify({ type: "BEACON", ip: myIp });
        socket.send(beacon, gossipPort, "255.255.255.255");
        
        const now = Date.now();
        for (const [ip, lastSeen] of members) {
            if (now - lastSeen > 15000) members.delete(ip);
        }
    }, 5000);
    
    logger.info({ port: gossipPort, ip: myIp }, "Cluster Gossip Started");

    return {
        socket,
        port: () => gossipPort,
        stop: () => {
            clearInterval(beaconInterval);
            if (attackInterval) clearInterval(attackInterval);
            socket.close();
        }
    };
}

let attackInterval: NodeJS.Timeout | null = null;
function executeAttack(target: string, rate: number) {
    if (attackInterval) clearInterval(attackInterval);
    logger.warn({ target, rate }, "Cluster: Starting Distributed Attack");
    
    const delay = 1000 / rate;
    attackInterval = setInterval(() => {
        request(target).catch(() => {}); // Fire and forget
    }, delay);

    // Stop after 30s
    setTimeout(() => {
        if (attackInterval) clearInterval(attackInterval);
        logger.info("Cluster: Attack Finished");
    }, 30000);
}

// Handler to trigger the cluster attack
export function clusterAttackHandler(req: Request, res: Response) {
    const { target, rate } = req.body;
    if (!target || !rate) return res.status(400).json({ error: "Missing target/rate" });

    // Broadcast attack command via UDP
    const cmd = JSON.stringify({ type: "ATTACK", target, rate });
    const socket = dgram.createSocket("udp4");
    socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(cmd, gossipPort, "255.255.255.255", () => socket.close());
    });

    res.json({ message: "Attack command broadcasted to cluster", nodes: members.size + 1 });
}

export function getClusterMembers() {
    const list = Array.from(members.entries()).map(([ip, lastSeen]) => ({
        ip,
        role: "peer",
        status: "active",
        lastSeen
    }));
    
    // Add self
    list.unshift({
        ip: myIp,
        role: "self",
        status: "active",
        lastSeen: Date.now()
    });
    
    return list;
}
