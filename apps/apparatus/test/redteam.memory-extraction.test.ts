import { beforeEach, describe, expect, it } from 'vitest';
import {
  captureActionMemoryForTests,
  captureVerificationMemoryForTests,
  resetAutopilotStateForTests,
} from '../src/ai/redteam.js';
import { createSession, getSession } from '../src/ai/report-store.js';

function snapshot(latencyMs: number, errorRate = 0) {
  return {
    capturedAt: new Date().toISOString(),
    rps: 120,
    requestCount: 1000,
    errorCount: Math.floor(errorRate * 1000),
    errorRate,
    avgLatencyMs: latencyMs,
    cpuPercent: 42,
    memPercent: 38,
    healthy: true,
  };
}

describe('RedTeam Memory Extraction', () => {
  beforeEach(() => {
    resetAutopilotStateForTests();
  });

  it('records structured memory for successful action execution', () => {
    const session = createSession({
      objective: 'Find the breaking point of /checkout API',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['cluster.attack', 'delay'],
    });

    captureActionMemoryForTests({
      sessionId: session.id,
      iteration: 1,
      objective: session.objective,
      decision: {
        thought: 'Escalate traffic',
        reason: 'Latency still low',
        tool: 'cluster.attack',
        params: { target: 'http://127.0.0.1:8090/checkout', rate: 600 },
      },
      execution: {
        ok: true,
        action: 'cluster.attack',
        message: 'Broadcasted cluster attack (5 nodes)',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      },
    });

    const context = getSession(session.id)?.sessionContext;
    expect(context?.observations.some((entry) => entry.kind === 'tool-output' && entry.source === 'cluster.attack')).toBe(true);
    expect(context?.assets.some((entry) => entry.type === 'endpoint' && entry.value === '/checkout')).toBe(true);
    expect(context?.relations.some((entry) => entry.type === 'targets')).toBe(true);
    expect(context?.objectiveProgress.openedPaths).toContain('/checkout');
  });

  it('records break signals when tool execution fails', () => {
    const session = createSession({
      objective: 'Find the breaking point of /checkout API',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['chaos.memory', 'delay'],
    });

    captureActionMemoryForTests({
      sessionId: session.id,
      iteration: 2,
      objective: session.objective,
      decision: {
        thought: 'Increase pressure',
        reason: 'Probe memory resilience',
        tool: 'chaos.memory',
        params: { action: 'allocate', amount: 256 },
      },
      execution: {
        ok: false,
        action: 'chaos.memory',
        message: 'Execution cancelled',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        error: 'Execution cancelled',
      },
    });

    const context = getSession(session.id)?.sessionContext;
    expect(context?.observations.some((entry) => entry.summary.includes('Tool failed:'))).toBe(true);
    expect(context?.objectiveProgress.breakSignals).toContain('tool-failure:chaos.memory');
    expect(context?.assets.some((entry) => entry.value === 'tool-failure:chaos.memory')).toBe(true);
  });

  it('captures verification evidence and relation mapping', () => {
    const session = createSession({
      objective: 'Find the breaking point of /checkout API',
      targetBaseUrl: 'http://127.0.0.1:8090',
      maxIterations: 5,
      allowedTools: ['delay'],
    });

    captureVerificationMemoryForTests({
      sessionId: session.id,
      iteration: 3,
      objective: session.objective,
      verification: {
        broken: true,
        crashDetected: true,
        newServerErrors: 4,
        notes: 'Observed 4 new 5xx errors after action.',
      },
      after: snapshot(420, 0.08),
    });

    const context = getSession(session.id)?.sessionContext;
    expect(context?.observations.some((entry) => entry.kind === 'verification')).toBe(true);
    expect(context?.objectiveProgress.breakSignals).toContain('service-health-check-failed');
    expect(context?.objectiveProgress.breakSignals).toContain('new-5xx-errors:4');
    expect(context?.assets.some((entry) => entry.value === 'service-health-check-failed')).toBe(true);
    expect(context?.assets.some((entry) => entry.value === 'new-5xx-errors:4')).toBe(true);
    expect(context?.relations.some((entry) => entry.type === 'confirms')).toBe(true);
    expect(context?.relations.some((entry) => entry.type === 'escalates_to')).toBe(true);
  });
});
