import { describe, expect, it } from 'vitest';
import { normalizeEvent } from '../src/dashboard/components/dashboard/incidentTimelineModel.js';

describe('incidentTimelineModel.normalizeEvent', () => {
  it('maps request events to traffic module with severity from status code', () => {
    const event = normalizeEvent(
      'request',
      {
        id: 'req-1',
        method: 'GET',
        path: '/api/orders',
        status: 503,
        ip: '10.0.0.4',
        latencyMs: 182,
        timestamp: '2026-02-21T00:00:00.000Z',
      },
      1
    );

    expect(event.module).toBe('traffic');
    expect(event.severity).toBe('error');
    expect(event.title).toBe('GET /api/orders');
    expect(event.summary).toContain('503');
    expect(event.sourceIp).toBe('10.0.0.4');
  });

  it('handles missing and malformed request fields safely', () => {
    const event = normalizeEvent(
      'request',
      {
        method: 42,
        status: null,
        latencyMs: 'not-a-number',
      },
      9
    );

    expect(event.module).toBe('traffic');
    expect(event.severity).toBe('info');
    expect(event.title).toBe('REQUEST /');
    expect(event.summary).toBe('n/a');
    expect(event.id).toContain(':9');
    expect(event.timestamp).toBeTruthy();
  });

  it('maps deception shell command to high severity', () => {
    const event = normalizeEvent(
      'deception',
      {
        type: 'shell_command',
        route: '/admin',
        ip: '198.51.100.10',
        timestamp: '2026-02-21T00:00:01.000Z',
      },
      2
    );

    expect(event.module).toBe('deception');
    expect(event.severity).toBe('error');
    expect(event.title).toBe('SHELL COMMAND');
  });

  it('maps 4xx request statuses to warn severity', () => {
    const event = normalizeEvent(
      'request',
      {
        method: 'GET',
        path: '/missing',
        status: 404,
      },
      11
    );

    expect(event.module).toBe('traffic');
    expect(event.severity).toBe('warn');
  });

  it('maps tarpit actions to defense severities', () => {
    const trapped = normalizeEvent(
      'tarpit',
      { action: 'trapped', ip: '203.0.113.55', timestamp: '2026-02-21T00:00:02.000Z' },
      3
    );
    const released = normalizeEvent(
      'tarpit',
      { action: 'released', ip: '203.0.113.55', timestamp: '2026-02-21T00:00:03.000Z' },
      4
    );

    expect(trapped.module).toBe('defense');
    expect(trapped.severity).toBe('warn');
    expect(released.severity).toBe('info');
  });

  it('maps health statuses to expected severity', () => {
    const degraded = normalizeEvent('health', { status: 'degraded', clients: 3 }, 5);
    const unhealthy = normalizeEvent('health', { status: 'unhealthy', clients: 1 }, 6);
    const healthy = normalizeEvent('health', { status: 'healthy', clients: 4 }, 7);

    expect(degraded.module).toBe('system');
    expect(degraded.severity).toBe('warn');
    expect(unhealthy.severity).toBe('error');
    expect(healthy.severity).toBe('info');
  });

  it('defaults to info severity for unknown health status values', () => {
    const event = normalizeEvent('health', { status: 'checking' }, 10);
    expect(event.module).toBe('system');
    expect(event.severity).toBe('info');
  });

  it('falls back to an ISO timestamp when payload timestamp is missing', () => {
    const event = normalizeEvent('webhook', { hookId: 'x', method: 'POST' }, 12);
    expect(() => new Date(event.timestamp).toISOString()).not.toThrow();
  });

  it('maps webhook events to integrations module', () => {
    const event = normalizeEvent(
      'webhook',
      {
        hookId: 'hook-abc',
        method: 'POST',
        ip: '127.0.0.1',
        timestamp: '2026-02-21T00:00:10.000Z',
      },
      8
    );

    expect(event.module).toBe('integrations');
    expect(event.severity).toBe('info');
    expect(event.title).toContain('hook:hook-abc');
  });
});
