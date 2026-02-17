import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Advanced Defense & Offense', () => {
    
    describe('Red Team', () => {
        it('should run validation scan', async () => {
            // Scan itself (echo endpoint)
            const response = await request(app).get('/redteam/validate?path=/echo&method=GET');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.total).toBeGreaterThan(0);
        });
    });

    describe('Sentinel (Active Shield)', () => {
        it('should allow requests by default', async () => {
            const response = await request(app).get('/echo');
            expect(response.status).toBe(200);
        });

        it('should block after adding a rule', async () => {
            // Add rule to block "bad-agent"
            await request(app).post('/sentinel/rules').send({
                pattern: "bad-agent",
                action: "block"
            });

            // Request with bad agent in body (since middleware checks url and body string)
            // Note: Middleware stringifies body.
            const response = await request(app).post('/echo').send({ agent: "bad-agent" });
            expect(response.status).toBe(403);
            expect(response.body.error).toContain("Active Shield");
        });
    });

    describe('Ghosting', () => {
        it('should start and stop ghosts', async () => {
            const startRes = await request(app).get('/ghosts?action=start&delay=100');
            expect(startRes.status).toBe(200);
            expect(startRes.body.status).toBe("started");

            const stopRes = await request(app).get('/ghosts?action=stop');
            expect(stopRes.status).toBe(200);
            expect(stopRes.body.status).toBe("stopped");
        });
    });

    describe('Moving Target Defense (MTD)', () => {
        it('should not block when inactive', async () => {
            const response = await request(app).get('/echo');
            expect(response.status).toBe(200);
        });

        it('should require prefix when active', async () => {
            // Activate MTD
            const rotateRes = await request(app).post('/mtd').send({ prefix: "secret123" });
            expect(rotateRes.body.prefix).toBe("secret123");

            // Direct access should fail
            const directRes = await request(app).get('/echo');
            expect(directRes.status).toBe(404);

            // Prefixed access should succeed
            const prefixedRes = await request(app).get('/secret123/echo');
            expect(prefixedRes.status).toBe(200);

            // Reset (disable) MTD for other tests? 
            // In a real app we might not have a disable switch easily, but here sending empty prefix might work if implemented, 
            // otherwise subsequent tests in this suite (if any) would fail.
            // Our middleware: if (!currentPrefix) return next();
            // So let's disable it by setting empty prefix if the handler allows it.
            // Handler: currentPrefix = req.body.prefix || ...
            // If we send prefix: "", it might default to random if we used ||.
            // In src/mtd.ts: req.body.prefix || Math.random()...
            // So empty string becomes random. We can't easily disable it via API without changing code.
            // But since this is the last test, it's fine.
        });
    });
});
