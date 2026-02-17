import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Advanced Logic', () => {
    describe('KV Store', () => {
        it('should set and get a value', async () => {
            await request(app).put('/kv/mykey').send({ data: 'hello' });
            const response = await request(app).get('/kv/mykey');
            expect(response.status).toBe(200);
            expect(response.body.value).toEqual({ data: 'hello' });
        });

        it('should delete a value', async () => {
            await request(app).delete('/kv/mykey');
            const response = await request(app).get('/kv/mykey');
            expect(response.status).toBe(404);
        });
    });

    describe('Scripting', () => {
        it('should execute a simple script', async () => {
            const response = await request(app)
                .post('/script')
                .send({ 
                    code: 'result = input.a + input.b',
                    input: { a: 5, b: 10 }
                });
            expect(response.status).toBe(200);
            expect(response.body.result).toBe(15);
        });

        it('should handle script errors', async () => {
            const response = await request(app)
                .post('/script')
                .send({ code: 'syntax error' });
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
        });
    });
});
