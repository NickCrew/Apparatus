import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Infra Debugging & Webhooks', () => {
    it('should resolve DNS (google.com)', async () => {
        const response = await request(app).get('/dns?target=google.com');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('result');
        expect(Array.isArray(response.body.result)).toBe(true);
    });

    it('should fail DNS with missing target', async () => {
        const response = await request(app).get('/dns');
        expect(response.status).toBe(400);
    });

    // Ping might fail in CI/environments without network access or if target doesn't exist, 
    // but we can test the validation logic at least.
    it('should validate ping target', async () => {
        const response = await request(app).get('/ping?target=invalid');
        expect(response.status).toBe(400); // Invalid format
    });

    it('should handle webhooks', async () => {
        const hookId = 'test-hook';
        const payload = { event: 'test', data: 123 };

        // Send webhook
        const postRes = await request(app)
            .post(`/hooks/${hookId}`)
            .send(payload);
        
        expect(postRes.status).toBe(200);
        expect(postRes.body).toHaveProperty('status', 'received');

        // Inspect webhook
        const getRes = await request(app).get(`/hooks/${hookId}/inspect`);
        expect(getRes.status).toBe(200);
        expect(Array.isArray(getRes.body)).toBe(true);
        expect(getRes.body.length).toBeGreaterThan(0);
        expect(getRes.body[0].body).toEqual(payload);
    });
});
