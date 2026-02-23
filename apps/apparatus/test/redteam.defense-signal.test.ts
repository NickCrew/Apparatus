import { describe, expect, it } from 'vitest';
import { classifyDefenseSignalForTests } from '../src/ai/redteam.js';

describe('RedTeam Defense Signal Classification', () => {
  it('prioritizes HTTP 429 over latency when both are present', () => {
    const classified = classifyDefenseSignalForTests({
      statusCode: 429,
      latencyMs: 2000,
    });

    expect(classified.signal).toBe('rate_limited');
  });

  it('prioritizes probe errors over status and latency inputs', () => {
    const classified = classifyDefenseSignalForTests({
      statusCode: 429,
      latencyMs: 3000,
      probeError: 'ECONNRESET',
    });

    expect(classified.signal).toBe('probe_failed');
  });

  it('classifies 404 as possible MTD route hiding with caveat text', () => {
    const classified = classifyDefenseSignalForTests({
      statusCode: 404,
    });

    expect(classified.signal).toBe('mtd_hidden_route');
    expect(classified.reason).toContain('verify prior reachability');
  });

  it('uses tarpit_suspected at and above latency threshold', () => {
    const belowThreshold = classifyDefenseSignalForTests({ latencyMs: 1199 });
    const atThreshold = classifyDefenseSignalForTests({ latencyMs: 1200 });

    expect(belowThreshold.signal).toBe('none');
    expect(atThreshold.signal).toBe('tarpit_suspected');
  });

  it('classifies 404 over high latency for possible MTD signals', () => {
    const classified = classifyDefenseSignalForTests({
      statusCode: 404,
      latencyMs: 2500,
    });

    expect(classified.signal).toBe('mtd_hidden_route');
  });

  it('classifies 5xx before tarpit when both occur', () => {
    const classified = classifyDefenseSignalForTests({
      statusCode: 503,
      latencyMs: 2500,
    });

    expect(classified.signal).toBe('server_error');
  });

  it('returns probe_failed when probe error is present', () => {
    const classified = classifyDefenseSignalForTests({
      probeError: 'socket hang up',
    });

    expect(classified.signal).toBe('probe_failed');
    expect(classified.reason).toContain('Defense probe failed');
  });

  it('returns none for empty input', () => {
    const classified = classifyDefenseSignalForTests({});
    expect(classified.signal).toBe('none');
  });
});
