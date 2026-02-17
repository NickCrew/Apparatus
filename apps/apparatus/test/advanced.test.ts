import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as jose from 'jose';

const app = createApp();

describe('Advanced Features', () => {
    describe('JWT Debugger', () => {
        it('should decode a valid JWT', async () => {
            // Create a dummy JWT (unsigned/dummy is fine for decode-only handler)
            const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
            const response = await request(app)
                .get('/debug/jwt')
                .set('Authorization', `Bearer ${token}`);
            
            expect(response.status).toBe(200);
            expect(response.body.payload.name).toBe('John Doe');
        });

        it('should fail with missing header', async () => {
            const response = await request(app).get('/debug/jwt');
            expect(response.status).toBe(400);
        });
    });

    describe('Rate Limiter', () => {
        it('should allow requests within limit', async () => {
            const response = await request(app).get('/ratelimit');
            expect(response.status).toBe(200);
            expect(response.body.remaining).toBeLessThan(10);
        });
    });

    describe('Bandwidth Sink', () => {
        it('should consume uploaded data', async () => {
            const data = Buffer.alloc(1024, 'X');
            const response = await request(app)
                .post('/sink')
                .send(data);
            
            expect(response.status).toBe(200);
            expect(response.body.bytesReceived).toBe(1024);
        });
    });

    describe('Payload Generator', () => {
        it('should generate requested size', async () => {
            const response = await request(app).get('/generate?size=10k');
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Buffer);
            expect((response.body as Buffer).length).toBe(10240);
        });
    });

    describe('OIDC Mock', () => {
        it('should provide JWKS', async () => {
            const response = await request(app).get('/.well-known/jwks.json');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('keys');
        });

        it('should mint a token', async () => {
            const response = await request(app).post('/auth/token').send({ user: "test" });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('access_token');
        });
    });
});
