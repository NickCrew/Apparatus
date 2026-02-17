import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('General API', () => {
    it('should pass health check', async () => {
        const response = await request(app).get('/healthz');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });

    it('should expose sysinfo', async () => {
        const response = await request(app).get('/sysinfo');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('hostname');
        expect(response.body).toHaveProperty('cpus');
        expect(response.body).toHaveProperty('env');
    });

    it('should record request history', async () => {
        // Clear history first
        await request(app).delete('/history');

        // Make a request
        await request(app).get('/echo?test=history');

        // Check history
        const histRes = await request(app).get('/history');
        expect(histRes.status).toBe(200);
        expect(Array.isArray(histRes.body)).toBe(true);
        expect(histRes.body.length).toBeGreaterThan(0);
        expect(histRes.body[0].query).toEqual({ test: 'history' });
    });
});
