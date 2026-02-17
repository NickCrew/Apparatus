import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { blockedIps } from '../src/tarpit.js';
import * as undici from 'undici';

// Mock undici for Threat Intel reporting
vi.mock('undici', () => ({
    request: vi.fn().mockResolvedValue({ 
        statusCode: 200,
        body: { json: () => Promise.resolve([]) }
    })
}));

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

    describe('Threat Intel Integration', () => {
        it('should report threats to Threat Intel on trap trigger', async () => {
            process.env.THREAT_INTEL_ADMIN_KEY = 'a'.repeat(32);

            // Trigger a tarpit trap
            try {
                await request(app).get('/wp-admin').timeout(50);
            } catch (e) {}

            // Verify reporting was attempted
            expect(undici.request).toHaveBeenCalledWith(
                expect.stringContaining('/_sensor/report'),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });
});
