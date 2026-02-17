import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Chaos & Security', () => {
    it('should return EICAR test string', async () => {
        const response = await request(app).get('/malicious');
        expect(response.status).toBe(200);
        expect(response.text).toContain('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
    });

    it('should allocate memory', async () => {
        const response = await request(app).get('/chaos/memory?amount=1');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Allocated 1MB');
    });
});