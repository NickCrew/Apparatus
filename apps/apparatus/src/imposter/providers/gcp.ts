import { Router } from "express";
import { logger } from "../../logger.js";

const router = Router();

// GCP requires this header
const HEADER_CHECK = (req: any, res: any, next: any) => {
    if (req.headers["metadata-flavor"] !== "Google") {
        return res.status(403).send("Missing Metadata-Flavor: Google header");
    }
    next();
};

router.use("/computeMetadata/v1", HEADER_CHECK);

router.get("/computeMetadata/v1/project/project-id", (req, res) => res.send("imposter-project-dev"));
router.get("/computeMetadata/v1/instance/id", (req, res) => res.send("1234567890123456789"));
router.get("/computeMetadata/v1/instance/zone", (req, res) => res.send("projects/imposter-project-dev/zones/us-central1-a"));
router.get("/computeMetadata/v1/instance/hostname", (req, res) => res.send("imposter-host.c.imposter-project-dev.internal"));

// Service Account Token (The Honey)
router.get("/computeMetadata/v1/instance/service-accounts/default/token", (req, res) => {
    logger.warn({ ip: req.ip }, "Cloud Imposter: Client requested GCP Service Account Token");
    
    res.json({
        access_token: "ya29.imposter.fake.token.v1." + Date.now(),
        expires_in: 3600,
        token_type: "Bearer"
    });
});

export const gcpRouter = router;
