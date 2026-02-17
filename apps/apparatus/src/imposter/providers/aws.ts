import { Router, Request, Response } from "express";
import { generateAwsCreds } from "../creds.js";
import { logger } from "../../logger.js";

const router = Router();
const START_TIME = new Date().toISOString();

// Simulated State
let instanceId = `i-${Math.random().toString(16).substring(2, 10)}`;
let region = process.env.IMPOSTER_REGION || "us-east-1";
let az = `${region}a`;
let privateIp = "10.0.0.50";
let instanceType = "t3.micro";

// Honey Creds are generated once per session usually, or rotated
const currentCreds = generateAwsCreds("imposter-role");

// IMDSv2 Token (Mock)
const activeTokens = new Set<string>();

router.put("/latest/api/token", (req, res) => {
    const ttl = req.headers["x-aws-ec2-metadata-token-ttl-seconds"];
    const token = Buffer.from(`imposterv2-${Date.now()}`).toString("base64");
    activeTokens.add(token);
    logger.info({ ip: req.ip, ttl }, "Cloud Imposter: Minted IMDSv2 Token");
    res.send(token);
});

// Middleware to check IMDSv2 Token if strict mode is simulated
// (Skipping strict enforcement to be compatible with v1 apps, but logging usage)

// Metadata Categories
router.get("/latest/meta-data/", (req, res) => {
    res.send(`ami-id
ami-launch-index
ami-manifest-path
block-device-mapping/
events/
hostname
iam/
instance-action
instance-id
instance-type
local-hostname
local-ipv4
mac
metrics/
network/
placement/
profile
public-hostname
public-ipv4
public-keys/
reservation-id
security-groups
services/
spot/`);
});

router.get("/latest/meta-data/instance-id", (req, res) => res.send(instanceId));
router.get("/latest/meta-data/instance-type", (req, res) => res.send(instanceType));
router.get("/latest/meta-data/local-ipv4", (req, res) => res.send(privateIp));
router.get("/latest/meta-data/placement/availability-zone", (req, res) => res.send(az));
router.get("/latest/meta-data/placement/region", (req, res) => res.send(region));

// IAM Credentials (The Honey)
router.get("/latest/meta-data/iam/security-credentials", (req, res) => {
    res.send("imposter-role");
});

router.get("/latest/meta-data/iam/security-credentials/:role", (req, res) => {
    const role = req.params.role;
    logger.warn({ ip: req.ip, role }, "Cloud Imposter: Client requested IAM Credentials (Honey-Creds served)");
    
    res.json({
        Code: "Success",
        LastUpdated: START_TIME,
        Type: "AWS-HMAC",
        AccessKeyId: currentCreds.AccessKeyId,
        SecretAccessKey: currentCreds.SecretAccessKey,
        Token: currentCreds.Token,
        Expiration: currentCreds.Expiration
    });
});

// Spot Termination Simulation
// To simulate termination, the user can call a control endpoint, or we just randomly return it?
// Let's implement a control mechanism later. For now, it returns 404 (no action) unless toggled.
let terminationTime: string | null = null;

router.get("/latest/meta-data/spot/instance-action", (req, res) => {
    if (terminationTime) {
        res.json({
            action: "terminate",
            time: terminationTime
        });
    } else {
        res.status(404).send();
    }
});

// Admin Control for Simulation
router.post("/_imposter/aws/terminate", (req, res) => {
    // Simulate a spot termination notice 2 minutes from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    terminationTime = now.toISOString();
    logger.info("Cloud Imposter: Scheduled Spot Termination");
    res.json({ status: "scheduled", time: terminationTime });
});

router.post("/_imposter/aws/reset", (req, res) => {
    terminationTime = null;
    res.json({ status: "cleared" });
});

export const awsRouter = router;
