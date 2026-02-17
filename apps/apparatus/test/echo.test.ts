import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Echo Endpoint', () => {
    it('should echo back request details', async () => {
        const response = await request(app)
            .get('/echo?foo=bar')
            .set('X-Test-Header', 'testing');

        expect(response.status).toBe(200);
        expect(response.body.query).toEqual({ foo: 'bar' });
        expect(response.body.headers['x-test-header']).toBe('testing');
        expect(response.body.method).toBe('GET');
    });

    it('should inject status code via query param', async () => {
        const response = await request(app).get('/echo?status=418');
        expect(response.status).toBe(418);
    });

    it('should inject status code via header', async () => {
        const response = await request(app)
            .get('/echo')
            .set('X-Echo-Status', '201');
        expect(response.status).toBe(201);
    });

    it('should inject custom headers', async () => {
        const customHeaders = JSON.stringify({ "X-Custom-Injected": "true" });
        const response = await request(app)
            .get('/echo')
            .set('X-Echo-Set-Header', customHeaders);
        
        expect(response.headers['x-custom-injected']).toBe('true');
    });
});
