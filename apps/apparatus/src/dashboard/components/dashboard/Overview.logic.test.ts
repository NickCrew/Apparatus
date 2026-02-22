import { describe, expect, it } from 'vitest';
import type { TrafficEvent } from '../../hooks/useTrafficStream';
import type { TimelineEvent } from './incidentTimelineModel';
import {
  computeDefenseSignalsLast10m,
  computeIncidentPressure,
  computeIncidentSnapshot,
  computeTrafficSnapshot,
  formatTime,
  getNumber,
  isActionableIncident,
  LATENCY_ALERT_MS,
  ONE_HOUR_MS,
  parseTimestampMs,
  severityBadgeVariant,
  severityDotClass,
  sourceBadgeVariant,
  sourceLabel,
  TEN_MINUTES_MS,
} from './Overview.logic';

function createEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 'evt-1',
    type: 'request',
    module: 'traffic',
    severity: 'info',
    title: 'event',
    summary: 'summary',
    timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    data: {},
    ...overrides,
  };
}

function createTrafficEvent(overrides: Partial<TrafficEvent> = {}): TrafficEvent {
  return {
    id: 'req-1',
    method: 'GET',
    path: '/health',
    status: 200,
    ip: '10.0.0.1',
    timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    latencyMs: 100,
    ...overrides,
  };
}

describe('Overview.logic', () => {
  describe('number and timestamp helpers', () => {
    it('parses numeric values safely', () => {
      expect(getNumber(42)).toBe(42);
      expect(getNumber('3.14')).toBe(3.14);
      expect(getNumber(' 42 ')).toBe(42);
      expect(getNumber(0)).toBe(0);
      expect(getNumber('0')).toBe(0);
      expect(getNumber('')).toBeNull();
      expect(getNumber('abc')).toBeNull();
      expect(getNumber(Number.NaN)).toBeNull();
      expect(getNumber(Number.POSITIVE_INFINITY)).toBeNull();
      expect(getNumber(null)).toBeNull();
      expect(getNumber(undefined)).toBeNull();
      expect(getNumber(true)).toBeNull();
      expect(getNumber({})).toBeNull();
    });

    it('parses timestamps and falls back for invalid time strings', () => {
      expect(parseTimestampMs(1700000000000)).toBe(1700000000000);
      expect(parseTimestampMs('2026-01-01T00:00:00.000Z')).not.toBeNull();
      expect(parseTimestampMs('not-a-date')).toBeNull();
      expect(parseTimestampMs(Number.NaN)).toBeNull();
      expect(parseTimestampMs(Number.POSITIVE_INFINITY)).toBeNull();
      expect(formatTime('not-a-date')).toBe('not-a-date');
      expect(formatTime('2026-01-01T00:00:00.000Z')).not.toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('severity and source mappers', () => {
    it('maps variants and labels consistently', () => {
      expect(severityBadgeVariant('error')).toBe('danger');
      expect(severityBadgeVariant('warn')).toBe('warning');
      expect(severityBadgeVariant('info')).toBe('info');

      expect(sourceBadgeVariant('deception')).toBe('danger');
      expect(sourceBadgeVariant('defense')).toBe('warning');
      expect(sourceBadgeVariant('traffic')).toBe('info');
      expect(sourceBadgeVariant('system')).toBe('neutral');

      expect(sourceLabel('traffic')).toBe('TRAFFIC');
      expect(sourceLabel('defense')).toBe('DEFENSE');
      expect(sourceLabel('deception')).toBe('DECEPTION');
      expect(sourceLabel('integrations')).toBe('INTEGRATION');
      expect(sourceLabel('system')).toBe('SYSTEM');

      expect(severityDotClass('error')).toBe('bg-danger');
      expect(severityDotClass('warn')).toBe('bg-warning');
      expect(severityDotClass('info')).toBe('bg-info');
    });
  });

  describe('incident actionability', () => {
    it('flags security-relevant conditions and ignores noise', () => {
      expect(
        isActionableIncident(createEvent({ module: 'defense', severity: 'info' }))
      ).toBe(true);
      expect(
        isActionableIncident(createEvent({ module: 'deception', severity: 'info' }))
      ).toBe(true);
      expect(
        isActionableIncident(createEvent({ type: 'health', module: 'system', severity: 'info' }))
      ).toBe(false);
      expect(
        isActionableIncident(createEvent({ type: 'health', module: 'system', severity: 'warn' }))
      ).toBe(true);

      expect(
        isActionableIncident(
          createEvent({ data: { status: 400 }, severity: 'info', module: 'traffic' })
        )
      ).toBe(true);
      expect(
        isActionableIncident(
          createEvent({ data: { status: 399 }, severity: 'info', module: 'traffic' })
        )
      ).toBe(false);
      expect(
        isActionableIncident(
          createEvent({ data: { latencyMs: LATENCY_ALERT_MS }, severity: 'info', module: 'traffic' })
        )
      ).toBe(true);
      expect(
        isActionableIncident(
          createEvent({ data: { latencyMs: LATENCY_ALERT_MS - 1 }, severity: 'info', module: 'traffic' })
        )
      ).toBe(false);
      expect(
        isActionableIncident(
          createEvent({ data: { status: '500' }, severity: 'info', module: 'traffic' })
        )
      ).toBe(true);
      expect(
        isActionableIncident(
          createEvent({ data: { latencyMs: '800' }, severity: 'info', module: 'traffic' })
        )
      ).toBe(true);
      expect(
        isActionableIncident(
          createEvent({ data: { path: '/chaos/cpu' }, severity: 'info', module: 'traffic' })
        )
      ).toBe(true);
      expect(isActionableIncident(createEvent({ severity: 'info' }))).toBe(false);
    });
  });

  describe('snapshot calculations', () => {
    it('computes traffic snapshot metrics with expected rounding', () => {
      const events: TrafficEvent[] = [
        createTrafficEvent({
          id: 'a',
          status: 500,
          ip: '10.0.0.1',
          timestamp: '2026-01-01T00:00:04.000Z',
          latencyMs: 300,
        }),
        createTrafficEvent({
          id: 'b',
          status: 200,
          ip: '10.0.0.2',
          timestamp: '2026-01-01T00:00:02.000Z',
          latencyMs: 100,
        }),
        createTrafficEvent({
          id: 'c',
          status: 404,
          ip: '10.0.0.1',
          timestamp: '2026-01-01T00:00:00.000Z',
          latencyMs: 200,
        }),
      ];

      expect(computeTrafficSnapshot([])).toEqual({
        throughputRps: 0,
        errorRate: 0,
        activeSources: 0,
        avgLatencyMs: null,
      });

      expect(computeTrafficSnapshot(events)).toEqual({
        throughputRps: 1,
        errorRate: 67,
        activeSources: 2,
        avgLatencyMs: 200,
      });

      expect(computeTrafficSnapshot([createTrafficEvent({ timestamp: '2026-01-01T00:00:00.000Z' })])).toEqual({
        throughputRps: 1,
        errorRate: 0,
        activeSources: 1,
        avgLatencyMs: 100,
      });

      expect(
        computeTrafficSnapshot([
          createTrafficEvent({ id: 'x', ip: '', latencyMs: Number.NaN }),
          createTrafficEvent({ id: 'y', ip: '', latencyMs: Number.NaN }),
        ])
      ).toEqual({
        throughputRps: 2,
        errorRate: 0,
        activeSources: 0,
        avgLatencyMs: null,
      });
    });

    it('computes incident snapshot, pressure, and defense signal window', () => {
      const now = Date.parse('2026-01-01T01:00:00.000Z');

      const events: TimelineEvent[] = [
        createEvent({
          id: 'critical',
          module: 'defense',
          severity: 'error',
          sourceIp: '10.10.10.1',
          timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
        }),
        createEvent({
          id: 'warning',
          module: 'deception',
          severity: 'warn',
          sourceIp: '10.10.10.2',
          timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
        }),
        createEvent({
          id: 'older',
          module: 'traffic',
          severity: 'warn',
          sourceIp: '10.10.10.3',
          timestamp: new Date(now - (ONE_HOUR_MS + 1000)).toISOString(),
        }),
      ];

      const snapshot = computeIncidentSnapshot(events, now);
      expect(snapshot.last10m).toBe(1);
      expect(snapshot.lastHour).toBe(2);
      expect(snapshot.critical).toBe(1);
      expect(snapshot.warning).toBe(2);
      expect(snapshot.activeEntities).toBe(2);
      expect(snapshot.topSources).toEqual([
        { label: '10.10.10.1', count: 1 },
        { label: '10.10.10.2', count: 1 },
      ]);

      expect(computeIncidentPressure(snapshot)).toEqual({
        label: 'CRITICAL',
        toneClass: 'text-danger',
      });

      expect(computeDefenseSignalsLast10m(events, now)).toBe(1);

      const stableSnapshot = computeIncidentSnapshot(
        [createEvent({ severity: 'info', timestamp: new Date(now - (TEN_MINUTES_MS + 1000)).toISOString() })],
        now
      );
      expect(computeIncidentPressure(stableSnapshot)).toEqual({
        label: 'STABLE',
        toneClass: 'text-success-500',
      });

      const elevatedSnapshot = computeIncidentSnapshot(
        [createEvent({ severity: 'warn', timestamp: new Date(now - 2 * 60 * 1000).toISOString() })],
        now
      );
      expect(computeIncidentPressure(elevatedSnapshot)).toEqual({
        label: 'ELEVATED',
        toneClass: 'text-warning',
      });

      const fallbackSourceSnapshot = computeIncidentSnapshot(
        [
          createEvent({
            module: 'defense',
            severity: 'warn',
            sourceIp: undefined,
            timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
          }),
          createEvent({
            module: 'defense',
            severity: 'warn',
            sourceIp: undefined,
            timestamp: new Date(now - 3 * 60 * 1000).toISOString(),
          }),
        ],
        now
      );
      expect(fallbackSourceSnapshot.topSources[0]).toEqual({ label: 'DEFENSE', count: 2 });

      expect(computeDefenseSignalsLast10m([], now)).toBe(0);
    });
  });
});
