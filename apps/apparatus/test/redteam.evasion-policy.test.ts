import { describe, expect, it } from 'vitest';
import { selectPolicyDecisionForTests } from '../src/ai/redteam.js';

describe('RedTeam Evasion Policy', () => {
  const context = {
    baseUrl: 'http://127.0.0.1:8090',
    objective: 'Find break on /checkout',
  };

  it('applies anti-rate-limit backoff policy on 429 signals', () => {
    const decision = selectPolicyDecisionForTests({
      iteration: 2,
      recentDefenseFeedback: {
        capturedAt: new Date().toISOString(),
        targetPath: '/checkout',
        statusCode: 429,
        signal: 'rate_limited',
        reason: 'Received HTTP 429 from objective endpoint.',
        basedOnTool: 'cluster.attack',
        toolFailed: false,
      },
      context: {
        ...context,
        allowedTools: ['delay', 'cluster.attack'],
        intervalMs: 500,
      },
    });

    expect(decision?.tool).toBe('delay');
    expect(decision?.rawModelOutput).toBe('policy:rate_limited');
    expect((decision?.params.duration as number) >= 1500).toBe(true);
    expect(decision?.maneuver?.triggerSignal).toBe('rate_limited');
    expect(decision?.maneuver?.countermeasure).toBe('delay');
  });

  it('uses mtd.rotate for block signals when available', () => {
    const decision = selectPolicyDecisionForTests({
      iteration: 3,
      recentDefenseFeedback: {
        capturedAt: new Date().toISOString(),
        targetPath: '/checkout',
        statusCode: 403,
        signal: 'waf_blocked',
        reason: 'Received HTTP 403 from objective endpoint.',
        basedOnTool: 'cluster.attack',
        toolFailed: false,
      },
      context: {
        ...context,
        allowedTools: ['mtd.rotate', 'delay'],
      },
    });

    expect(decision?.tool).toBe('mtd.rotate');
    expect(String(decision?.params.prefix || '')).toContain('rt');
    expect(decision?.maneuver?.triggerSignal).toBe('waf_blocked');
    expect(decision?.maneuver?.countermeasure).toBe('mtd.rotate');
  });

  it('falls back to delay when mtd.rotate is disallowed or recently used', () => {
    const decision = selectPolicyDecisionForTests({
      iteration: 4,
      recentDefenseFeedback: {
        capturedAt: new Date().toISOString(),
        targetPath: '/checkout',
        statusCode: 404,
        signal: 'mtd_hidden_route',
        reason: 'Received HTTP 404 from objective endpoint.',
        basedOnTool: 'mtd.rotate',
        toolFailed: false,
      },
      context: {
        ...context,
        allowedTools: ['delay'],
      },
    });

    expect(decision?.tool).toBe('delay');
    expect(String(decision?.rawModelOutput || '')).toContain('mtd_hidden_route');
    expect(decision?.maneuver?.triggerSignal).toBe('mtd_hidden_route');
    expect(decision?.maneuver?.countermeasure).toBe('delay');
  });

  it('applies delay policy for tarpit_suspected high-latency signals', () => {
    const decision = selectPolicyDecisionForTests({
      iteration: 5,
      recentDefenseFeedback: {
        capturedAt: new Date().toISOString(),
        targetPath: '/checkout',
        latencyMs: 1800,
        signal: 'tarpit_suspected',
        reason: 'Observed elevated latency (1800ms).',
        basedOnTool: 'cluster.attack',
        toolFailed: false,
      },
      context: {
        ...context,
        allowedTools: ['delay', 'cluster.attack'],
        intervalMs: 300,
      },
    });

    expect(decision?.tool).toBe('delay');
    expect(decision?.rawModelOutput).toBe('policy:tarpit_suspected');
    expect(decision?.maneuver?.triggerSignal).toBe('tarpit_suspected');
    expect(decision?.maneuver?.countermeasure).toBe('delay');
  });

  it('returns null when no prior defense feedback exists', () => {
    const decision = selectPolicyDecisionForTests({
      iteration: 1,
      recentDefenseFeedback: null,
      context: {
        ...context,
        allowedTools: ['delay'],
      },
    });

    expect(decision).toBeNull();
  });
});
