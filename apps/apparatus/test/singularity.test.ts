import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { blockedIps } from '../src/tarpit.js';

const app = createApp();

describe('Round 10: The Singularity', () => {
    beforeEach(() => {
        blockedIps.clear();
        vi.clearAllMocks();
    });

    describe('Deception Engine', () => {
        it('should serve fake admin login page', async () => {
            const response = await request(app).get('/admin');
            expect(response.status).toBe(200);
            expect(response.text).toContain('System Management Console');
            expect(response.header['content-type']).toContain('text/html');
        });

        it('should serve fake .env file', async () => {
            const response = await request(app).get('/.env');
            expect(response.status).toBe(200);
            expect(response.text).toContain('DB_HOST=10.0.0.5');
        });

        it('should return fake DB schema on SQLi probe', async () => {
            const response = await request(app).get('/echo?id=1 UNION SELECT null,null');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.db_version).toBeDefined();
        });
    });

    describe('Autonomous Self-Healing', () => {
        it('should expose pro health status', async () => {
            const response = await request(app).get('/health/pro');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('lag_ms');
        });
    });

    describe('Tarpit Defense', () => {
        it('should trap IPs that hit honeypot paths', async () => {
            // /wp-admin is a TRAP_PATH — the tarpit enters slow-drip mode
            // and the request won't complete normally, so we use a timeout
            try {
                await request(app).get('/wp-admin').timeout(50);
            } catch (e) {}

            // The requesting IP should now be in the blocked set
            expect(blockedIps.size).toBeGreaterThanOrEqual(1);
        });
    });
});
