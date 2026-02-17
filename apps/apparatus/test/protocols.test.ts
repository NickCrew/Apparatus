import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import net from 'net';
import { startRedisServer } from '../src/server-redis.js';
import { startSmtpServer } from '../src/server-smtp.js';

describe('Protocol Zoo Mocks (Hardened)', () => {
    let redisServer: net.Server;
    let smtpServer: net.Server;
    let redisPort: number;
    let smtpPort: number;
    
    beforeAll(async () => {
        redisServer = startRedisServer({ port: 0, host: '127.0.0.1' });
        smtpServer = startSmtpServer({ port: 0, host: '127.0.0.1' });

        await Promise.all([
            new Promise<void>((resolve) => redisServer.once('listening', resolve)),
            new Promise<void>((resolve) => smtpServer.once('listening', resolve)),
        ]);

        redisPort = (redisServer.address() as net.AddressInfo).port;
        smtpPort = (smtpServer.address() as net.AddressInfo).port;
    });

    afterAll(async () => {
        await Promise.all([
            new Promise<void>((resolve) => redisServer.close(() => resolve())),
            new Promise<void>((resolve) => smtpServer.close(() => resolve())),
        ]);
    });

    it('should respond to Redis PING', async () => {
        const client = new net.Socket();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { client.destroy(); reject(new Error('Redis Timeout')); }, 1000);
            client.connect(redisPort, '127.0.0.1', () => {
                client.write('PING\r\n');
            });
            client.on('data', (data) => {
                clearTimeout(timeout);
                expect(data.toString()).toContain('PONG');
                client.destroy();
                resolve();
            });
            client.on('error', reject);
        });
    });

    it('should respond to SMTP HELO', async () => {
        const client = new net.Socket();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { client.destroy(); reject(new Error('SMTP Timeout')); }, 1000);
            client.connect(smtpPort, '127.0.0.1');
            client.on('data', (data) => {
                const msg = data.toString();
                if (msg.includes('220')) {
                    client.write('HELO localhost\r\n');
                } else if (msg.includes('250')) {
                    clearTimeout(timeout);
                    expect(msg).toContain('250');
                    client.destroy();
                    resolve();
                }
            });
            client.on('error', reject);
        });
    });
});
