import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { Response } from 'express';
import { sseBroadcaster, SSEBroadcaster, SSEEvent, SSEEventType } from '../src/sse-broadcast.js';

// Helper to create a mock Express Response object for SSE
function createMockSSEResponse() {
    const res = new EventEmitter() as unknown as Response & { write: ReturnType<typeof vi.fn>, end: ReturnType<typeof vi.fn> };
    res.write = vi.fn();
    res.end = vi.fn();
    res.writableEnded = false;
    
    // Simulate express behavior where end() sets writableEnded
    res.end.mockImplementation(() => {
        res.writableEnded = true;
        res.emit('finish');
        return res;
    });

    return res;
}

describe('SSEBroadcaster', () => {
    let broadcaster: SSEBroadcaster;

    beforeEach(() => {
        // Create a fresh instance for each test to avoid singleton contamination
        broadcaster = new SSEBroadcaster();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('addClient', () => {
        it('registers a new client and returns a UUID', () => {
            const res = createMockSSEResponse();
            const clientId = broadcaster.addClient(res);

            expect(clientId).toBeDefined();
            expect(typeof clientId).toBe('string');
            expect(broadcaster.getClientCount()).toBe(1);
        });

        it('returns null when MAX_SSE_CLIENTS (100) is reached', () => {
            // Fill up the broadcaster
            for (let i = 0; i < 100; i++) {
                broadcaster.addClient(createMockSSEResponse());
            }

            expect(broadcaster.getClientCount()).toBe(100);

            // Try to add 101st client
            const res = createMockSSEResponse();
            const clientId = broadcaster.addClient(res);

            expect(clientId).toBeNull();
            expect(broadcaster.getClientCount()).toBe(100);
        });

        it('sends an initial health/connected event', () => {
            const res = createMockSSEResponse();
            const clientId = broadcaster.addClient(res);

            expect(res.write).toHaveBeenCalledWith(expect.stringMatching(/^event: health\n/));
            expect(res.write).toHaveBeenCalledWith(expect.stringMatching(/^data: \{.*"status":"connected".*\}\n\n/));
        });

        it('sets up a heartbeat interval', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);

            // Fast-forward 30 seconds
            vi.advanceTimersByTime(30000);

            expect(res.write).toHaveBeenCalledWith(expect.stringMatching(/^: heartbeat/));
        });

        it('skips heartbeat if response is ended', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);

            res.writableEnded = true;
            vi.advanceTimersByTime(30000);

            // Should NOT have called write for heartbeat
            // (Initial write was for health event, so we check call count or specific content)
            const writeCalls = res.write.mock.calls.map(c => c[0]);
            const heartbeatCalls = writeCalls.filter(c => typeof c === 'string' && c.startsWith(': heartbeat'));
            expect(heartbeatCalls.length).toBe(0);
        });
    });

    describe('Client Cleanup', () => {
        it('cleans up on "close" event', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            expect(broadcaster.getClientCount()).toBe(1);

            res.emit('close');
            expect(broadcaster.getClientCount()).toBe(0);
        });

        it('cleans up on "error" event', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            expect(broadcaster.getClientCount()).toBe(1);

            res.emit('error', new Error('socket hang up'));
            expect(broadcaster.getClientCount()).toBe(0);
        });

        it('cleans up on "finish" event', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            expect(broadcaster.getClientCount()).toBe(1);

            res.emit('finish');
            expect(broadcaster.getClientCount()).toBe(0);
        });

        it('stops heartbeat after cleanup', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            res.emit('close');

            vi.advanceTimersByTime(30000);
            
            // Check no heartbeats were sent (initial health event is fine)
            const writeCalls = res.write.mock.calls.map(c => c[0]);
            const heartbeatCalls = writeCalls.filter(c => typeof c === 'string' && c.startsWith(': heartbeat'));
            expect(heartbeatCalls.length).toBe(0);
        });

        it('is idempotent (multiple events don\'t crash)', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            
            res.emit('close');
            res.emit('finish'); // Should not throw
            res.emit('error', new Error()); // Should not throw

            expect(broadcaster.getClientCount()).toBe(0);
        });
    });

    describe('broadcast', () => {
        it('sends event to all connected clients', () => {
            const client1 = createMockSSEResponse();
            const client2 = createMockSSEResponse();
            broadcaster.addClient(client1);
            broadcaster.addClient(client2);

            const data = { foo: 'bar' };
            broadcaster.broadcast('request', data);

            // Verify Client 1
            expect(client1.write).toHaveBeenCalledWith('event: request\n');
            expect(client1.write).toHaveBeenCalledWith(expect.stringContaining('"foo":"bar"'));

            // Verify Client 2
            expect(client2.write).toHaveBeenCalledWith('event: request\n');
            expect(client2.write).toHaveBeenCalledWith(expect.stringContaining('"foo":"bar"'));
        });

        it('skips clients that are writableEnded', () => {
            const client1 = createMockSSEResponse();
            const client2 = createMockSSEResponse();
            broadcaster.addClient(client1);
            broadcaster.addClient(client2);

            client1.writableEnded = true;

            broadcaster.broadcast('request', { foo: 'bar' });

            // Client 1 should NOT receive event (initial health event excluded from check)
            const client1Calls = client1.write.mock.calls.map(c => c[0]);
            expect(client1Calls).not.toContain('event: request\n');

            // Client 2 SHOULD receive event
            expect(client2.write).toHaveBeenCalledWith('event: request\n');
        });

        it('silently handles write errors from disconnected clients', () => {
            const client1 = createMockSSEResponse();
            const client2 = createMockSSEResponse();
            broadcaster.addClient(client1);
            broadcaster.addClient(client2);

            // Mock client1 to throw on write
            client1.write.mockImplementation(() => {
                throw new Error('Write failed');
            });

            // Should not throw
            expect(() => {
                broadcaster.broadcast('request', { foo: 'bar' });
            }).not.toThrow();

            // Client 2 should still receive event
            expect(client2.write).toHaveBeenCalledWith('event: request\n');
        });

        it('formats SSE wire protocol correctly', () => {
            const res = createMockSSEResponse();
            broadcaster.addClient(res);
            res.write.mockClear(); // Clear initial health event

            const timestamp = new Date('2024-01-01T12:00:00Z');
            vi.setSystemTime(timestamp);

            broadcaster.broadcast('request', { id: 123 });

            expect(res.write).toHaveBeenNthCalledWith(1, 'event: request\n');
            // sendToClient injects timestamp directly into the data object
            const expectedJson = JSON.stringify({
                id: 123,
                timestamp: timestamp.toISOString(),
            });
            expect(res.write).toHaveBeenNthCalledWith(2, `data: ${expectedJson}\n\n`);
        });
        
        it('emits event locally via EventEmitter', () => {
            const listener = vi.fn();
            broadcaster.on('request', listener);
            
            broadcaster.broadcast('request', { id: 123 });
            
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({
                type: 'request',
                data: { id: 123 }
            }));
        });
    });
});
