import type { TrafficEvent } from '../../hooks/useTrafficStream';
import type { TimelineEvent, TimelineModule, TimelineSeverity } from './incidentTimelineModel';

export const TEN_MINUTES_MS = 10 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const LATENCY_ALERT_MS = 750;
export const LATENCY_WARN_MS = 350;

export interface TrafficSnapshot {
  throughputRps: number;
  errorRate: number;
  activeSources: number;
  avgLatencyMs: number | null;
}

export interface IncidentSnapshot {
  last10m: number;
  lastHour: number;
  critical: number;
  warning: number;
  activeEntities: number;
  topSources: Array<{ label: string; count: number }>;
}

export interface IncidentPressure {
  label: 'CRITICAL' | 'ELEVATED' | 'STABLE';
  toneClass: 'text-danger' | 'text-warning' | 'text-success-500';
}

export function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function parseTimestampMs(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString([], { hour12: false });
}

export function severityBadgeVariant(severity: TimelineSeverity): 'danger' | 'warning' | 'info' {
  if (severity === 'error') return 'danger';
  if (severity === 'warn') return 'warning';
  return 'info';
}

export function sourceBadgeVariant(
  module: TimelineModule
): 'danger' | 'warning' | 'info' | 'neutral' {
  if (module === 'deception') return 'danger';
  if (module === 'defense') return 'warning';
  if (module === 'traffic') return 'info';
  return 'neutral';
}

export function sourceLabel(module: TimelineModule): string {
  if (module === 'traffic') return 'TRAFFIC';
  if (module === 'defense') return 'DEFENSE';
  if (module === 'deception') return 'DECEPTION';
  if (module === 'integrations') return 'INTEGRATION';
  return 'SYSTEM';
}

export function severityDotClass(severity: TimelineSeverity): 'bg-danger' | 'bg-warning' | 'bg-info' {
  if (severity === 'error') return 'bg-danger';
  if (severity === 'warn') return 'bg-warning';
  return 'bg-info';
}

export function isActionableIncident(event: TimelineEvent): boolean {
  if (event.module === 'defense' || event.module === 'deception') return true;

  if (event.type === 'health') {
    return event.severity !== 'info';
  }

  if (event.type === 'request') {
    const status = getNumber(event.data.status);
    const latencyMs = getNumber(event.data.latencyMs);
    const path = typeof event.data.path === 'string' ? event.data.path : '';

    if (status !== null && status >= 400) return true;
    if (latencyMs !== null && latencyMs >= LATENCY_ALERT_MS) return true;
    if (path.startsWith('/chaos/')) return true;
  }

  return event.severity !== 'info';
}

export function computeTrafficSnapshot(trafficEvents: readonly TrafficEvent[]): TrafficSnapshot {
  if (trafficEvents.length === 0) {
    return {
      throughputRps: 0,
      errorRate: 0,
      activeSources: 0,
      avgLatencyMs: null,
    };
  }

  const newest = parseTimestampMs(trafficEvents[0].timestamp);
  const oldest = parseTimestampMs(trafficEvents[trafficEvents.length - 1].timestamp);
  const durationSec =
    newest !== null && oldest !== null ? Math.max((newest - oldest) / 1000, 1) : 1;

  const errors = trafficEvents.filter((event) => event.status >= 400).length;
  const latencyEvents = trafficEvents
    .map((event) => event.latencyMs)
    .filter((value): value is number => Number.isFinite(value));

  const avgLatencyMs =
    latencyEvents.length > 0
      ? Math.round(
          latencyEvents.reduce((total, latencyMs) => total + latencyMs, 0) / latencyEvents.length
        )
      : null;

  const sourceCount = new Set(
    trafficEvents
      .map((event) => event.ip)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  ).size;

  return {
    throughputRps: Math.round(trafficEvents.length / durationSec),
    errorRate: Math.round((errors / trafficEvents.length) * 100),
    activeSources: sourceCount,
    avgLatencyMs,
  };
}

export function computeIncidentSnapshot(
  incidentEvents: readonly TimelineEvent[],
  now = Date.now()
): IncidentSnapshot {
  let last10m = 0;
  let lastHour = 0;
  let critical = 0;
  let warning = 0;
  const sourceCounts = new Map<string, number>();

  for (const event of incidentEvents) {
    const timestampMs = parseTimestampMs(event.timestamp);
    const ageMs = timestampMs !== null ? now - timestampMs : null;

    if (ageMs !== null && ageMs <= TEN_MINUTES_MS) last10m += 1;
    if (ageMs !== null && ageMs <= ONE_HOUR_MS) lastHour += 1;
    if (event.severity === 'error') critical += 1;
    if (event.severity === 'warn') warning += 1;

    if (ageMs !== null && ageMs <= ONE_HOUR_MS && (event.severity === 'error' || event.severity === 'warn')) {
      const key = event.sourceIp ?? sourceLabel(event.module);
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }
  }

  const topSources = [...sourceCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([label, count]) => ({ label, count }));

  return {
    last10m,
    lastHour,
    critical,
    warning,
    activeEntities: sourceCounts.size,
    topSources,
  };
}

export function computeIncidentPressure(snapshot: Pick<IncidentSnapshot, 'critical' | 'warning' | 'last10m'>): IncidentPressure {
  if (snapshot.critical > 0) {
    return {
      label: 'CRITICAL',
      toneClass: 'text-danger',
    };
  }

  if (snapshot.warning > 0 || snapshot.last10m > 0) {
    return {
      label: 'ELEVATED',
      toneClass: 'text-warning',
    };
  }

  return {
    label: 'STABLE',
    toneClass: 'text-success-500',
  };
}

export function computeDefenseSignalsLast10m(
  incidentEvents: readonly TimelineEvent[],
  now = Date.now()
): number {
  return incidentEvents.filter((event) => {
    if (event.module !== 'defense') return false;
    const timestampMs = parseTimestampMs(event.timestamp);
    return timestampMs !== null && now - timestampMs <= TEN_MINUTES_MS;
  }).length;
}
