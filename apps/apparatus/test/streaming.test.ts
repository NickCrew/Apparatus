import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import request from 'supertest';
import { createHttp1Server } from '../src/server-http1.js';
import { setupWebSocket } from '../src/server-ws.js';
import { Server } from 'http';

describe('Streaming Protocols', () => {
    let server: Server;
    let port: number;

    beforeAll(async () => {
        const app = createHttp1Server();
        server = app.listen(0); // Random port
        setupWebSocket(server);
        port = (server.address() as any).port;
    });

    afterAll(() => {
        server.close();
    });

    it('should echo messages over WebSocket', async () => {
        const ws = new WebSocket(`ws://localhost:${port}/ws`);
        
        await new Promise<void>((resolve, reject) => {
            ws.on('open', () => {
                ws.send('test-message');
            });
            ws.on('message', (data) => {
                expect(data.toString()).toBe('test-message');
                ws.close();
                resolve();
            });
            ws.on('error', reject);
            setTimeout(() => { ws.terminate(); reject(new Error('WS Timeout')); }, 1000);
        });
    });

    it('should stream events over SSE', async () => {
        const res = await request(`http://localhost:${port}`)
            .get('/sse')
            .buffer(false) // Don't buffer, stream it
            .parse((res, cb) => {
                res.on('data', (chunk) => {
                    const str = chunk.toString();
                    if (str.includes('data:')) {
                        expect(str).toContain('time');
                        // End after first chunk to avoid hanging
                        res.destroy(); 
                        cb(null, null);
                    }
                });
            });
    });
});
