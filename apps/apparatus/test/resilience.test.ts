import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Resilience & Edge Cases', () => {
    describe('Scripting Sandbox Safety', () => {
        it('should timeout on infinite loops', async () => {
            const response = await request(app)
                .post('/script')
                .send({ code: 'while(true);' });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Script execution timed out');
        });

        it('should block access to process/filesystem', async () => {
            const response = await request(app)
                .post('/script')
                .send({ code: 'result = process.version' });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('process is not defined');
        });
    });

    describe('DLP Error Handling', () => {
        it('should handle invalid types gracefully', async () => {
            const response = await request(app).get('/dlp?type=invalid');
            expect(response.status).toBe(400);
            expect(response.body.available_types).toBeDefined();
        });
    });
});
