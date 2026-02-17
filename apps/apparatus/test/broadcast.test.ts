import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Mock SSE Handler to avoid hanging tests
vi.mock('../src/echoHandler.js', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        sseHandler: (req: any, res: any) => res.status(200).send('mock-sse'),
    };
});

import { createApp } from '../src/app.js';
import { sseBroadcaster } from '../src/sse-broadcast.js';

describe('Traffic Broadcast Middleware', () => {
    let app: any;

    beforeEach(() => {
        // Reset broadcaster listeners
        sseBroadcaster.removeAllListeners();
        app = createApp();
    });

    it('should broadcast request details after response finishes', async () => {
        const broadcastSpy = vi.spyOn(sseBroadcaster, 'broadcast');

        // Make a request
        const res = await request(app).get('/healthz');
        expect(res.status).toBe(200);

        // Broadcast happens on 'finish', which might be slightly async relative to supertest return?
        // Supertest waits for the response, so 'finish' should have fired.
        
        expect(broadcastSpy).toHaveBeenCalledWith('request', expect.objectContaining({
            method: 'GET',
            path: '/healthz',
            status: 200,
        }));
    });

    it('should NOT broadcast requests to /sse endpoint', async () => {
        const broadcastSpy = vi.spyOn(sseBroadcaster, 'broadcast');

        // Request /sse but don't wait for it to finish (it won't)
        const req = request(app).get('/sse');
        
        await new Promise<void>((resolve) => {
            req.on('response', (res) => {
                // Once we get headers, the request is "processed" by express
                // But the middleware 'finish' listener fires when response finishes.
                // We need to close the response to trigger 'finish'.
                res.req.abort(); 
                resolve();
            });
            req.end();
        });

        // Wait a tick for event loop
        await new Promise(r => setTimeout(r, 100));

        // Should NOT have broadcasted a request event for /sse
        expect(broadcastSpy).not.toHaveBeenCalledWith('request', expect.objectContaining({
            path: '/sse'
        }));
    });
});
