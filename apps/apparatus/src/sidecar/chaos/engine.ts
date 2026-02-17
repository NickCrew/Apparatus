import { Transform } from "stream";
import { logger } from "../../logger.js";

export type ToxicAction = "none" | "latency" | "slow_drip" | "corrupt_body" | "error_500";

interface ToxicConfig {
    rate: number; // 0.0 to 1.0 (probability)
    action: ToxicAction;
    latencyMs?: number;
}

export class ToxicStream extends Transform {
    private config: ToxicConfig;
    private hasInjected = false;

    constructor(config: ToxicConfig) {
        super();
        this.config = config;
    }

    _transform(chunk: any, encoding: string, callback: Function) {
        // Roll the dice only once per stream if we want per-request decision, 
        // but here we might want per-chunk corruption? 
        // Let's assume the decision was made before creating this stream or we check random here.
        
        // For simple bit-flip corruption on body
        if (this.config.action === "corrupt_body" && !this.hasInjected) {
            if (Math.random() < 0.1) { // 10% chance per chunk to corrupt
                logger.debug("Toxic Sidecar: Corrupting chunk");
                // Flip a byte
                const buf = Buffer.from(chunk);
                if (buf.length > 0) {
                    buf[0] = ~buf[0]; 
                    this.push(buf);
                    this.hasInjected = true;
                    return callback();
                }
            }
        }

        // Slow Drip
        if (this.config.action === "slow_drip") {
            const delay = 100; // 100ms per chunk
            setTimeout(() => {
                this.push(chunk);
                callback();
            }, delay);
            return;
        }

        this.push(chunk);
        callback();
    }
}
