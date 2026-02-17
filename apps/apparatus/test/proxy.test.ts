import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Mock axios BEFORE importing app/proxy
vi.mock('axios', () => ({
    default: vi.fn().mockResolvedValue({
        status: 200,
        headers: { 'x-proxy-header': 'mocked' },
        data: { success: true }
    })
}));

const app = createApp();

describe('Proxy Endpoint', () => {
    it('should forward request and return response', async () => {
        const response = await request(app).get('/proxy?url=http://example.com');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.headers['x-proxy-header']).toBe('mocked');
    });

    it('should fail if url is missing', async () => {
        const response = await request(app).get('/proxy');
        expect(response.status).toBe(400);
    });
});
