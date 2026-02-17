import express from "express";
import { logger } from "../logger.js";
import { awsRouter } from "./providers/aws.js";
import { gcpRouter } from "./providers/gcp.js";
import { fileURLToPath } from 'url';

export const IMPOSTER_PORT = parseInt(process.env.IMPOSTER_PORT || "16925");

export function createImposterApp() {
    const app = express();
    app.use(express.json());

    // Log all requests
    app.use((req, res, next) => {
        logger.debug({ method: req.method, path: req.path, ip: req.ip }, "Cloud Imposter Request");
        next();
    });

    // AWS Router (Default, root based)
    app.use(awsRouter);

    // GCP Router
    app.use(gcpRouter);

    // Health
    app.get("/health", (req, res) => res.json({ status: "ok", role: "Cloud Imposter" }));

    return app;
}

async function main() {
    const app = createImposterApp();
    app.listen(IMPOSTER_PORT, "0.0.0.0", () => {
        console.log(`
☁️  Cloud Imposter Active on port ${IMPOSTER_PORT}
   -----------------------------------
   AWS Mock: http://localhost:${IMPOSTER_PORT}/latest/meta-data/
   GCP Mock: http://localhost:${IMPOSTER_PORT}/computeMetadata/v1/

   👉 To test an app, set env var:
      AWS_EC2_METADATA_SERVICE_ENDPOINT=http://localhost:${IMPOSTER_PORT}
      GCE_METADATA_HOST=localhost:${IMPOSTER_PORT}
        `);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}