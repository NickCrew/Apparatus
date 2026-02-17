import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('DLP Simulator', () => {
    it('should generate valid Credit Card numbers (Luhn check)', async () => {
        const response = await request(app).get('/dlp?type=cc');
        expect(response.status).toBe(200);
        expect(response.body.type).toBe('Credit Card');
        
        const cc = response.body.value;
        expect(cc).toMatch(/^\d{16}$/);
        
        // Verify Luhn (manual check)
        const digits = cc.split('').map(Number);
        let sum = 0;
        let isSecond = false;
        // Iterate from right to left
        for (let i = digits.length - 1; i >= 0; i--) {
            let d = digits[i];
            if (isSecond) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            isSecond = !isSecond;
        }
        expect(sum % 10).toBe(0);
    });

    it('should generate SSN', async () => {
        const response = await request(app).get('/dlp?type=ssn');
        expect(response.status).toBe(200);
        expect(response.body.type).toBe('SSN');
        expect(response.body.value).toMatch(/^\d{3}-\d{2}-\d{4}$/);
    });

    it('should return fake SQL error', async () => {
        const response = await request(app).get('/dlp?type=sql');
        expect(response.status).toBe(500);
        expect(response.text).toContain('SQL syntax');
    });
});
