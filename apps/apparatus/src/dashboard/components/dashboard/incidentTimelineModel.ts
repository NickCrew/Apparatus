export type FeedEventType = 'request' | 'deception' | 'tarpit' | 'health' | 'webhook';
export type TimelineSeverity = 'info' | 'warn' | 'error';
export type TimelineModule = 'traffic' | 'defense' | 'deception' | 'integrations' | 'system';

export interface TimelineEvent {
  id: string;
  type: FeedEventType;
  module: TimelineModule;
  severity: TimelineSeverity;
  title: string;
  summary: string;
  timestamp: string;
  sourceIp?: string;
  data: Record<string, unknown>;
}

export const MODULE_FILTERS: TimelineModule[] = ['traffic', 'defense', 'deception', 'integrations', 'system'];
export const SEVERITY_FILTERS: TimelineSeverity[] = ['info', 'warn', 'error'];

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function normalizeEvent(
  type: FeedEventType,
  raw: Record<string, unknown>,
  sequence: number
): TimelineEvent {
  const timestamp = getString(raw.timestamp) ?? new Date().toISOString();

  if (type === 'request') {
    const method = getString(raw.method) ?? 'REQUEST';
    const path = getString(raw.path) ?? getString(raw.originalUrl) ?? '/';
    const status = getNumber(raw.status);
    const latencyMs = getNumber(raw.latencyMs);
    const severity: TimelineSeverity = status !== undefined && status >= 500
      ? 'error'
      : status !== undefined && status >= 400
        ? 'warn'
        : 'info';

    return {
      id: `${type}:${getString(raw.id) ?? timestamp}:${sequence}`,
      type,
      module: 'traffic',
      severity,
      title: `${method.toUpperCase()} ${path}`,
      summary: `${status ?? 'n/a'}${latencyMs !== undefined ? ` • ${latencyMs}ms` : ''}`,
      timestamp,
      sourceIp: getString(raw.ip),
      data: raw,
    };
  }

  if (type === 'deception') {
    const eventType = getString(raw.type) ?? 'deception_event';
    const route = getString(raw.route) ?? '/';
    const sourceIp = getString(raw.ip);
    const severity: TimelineSeverity =
      eventType === 'shell_command' ? 'error' : 'warn';

    return {
      id: `${type}:${timestamp}:${sequence}`,
      type,
      module: 'deception',
      severity,
      title: eventType.replace(/_/g, ' ').toUpperCase(),
      summary: `${route}${sourceIp ? ` • ${sourceIp}` : ''}`,
      timestamp,
      sourceIp,
      data: raw,
    };
  }

  if (type === 'tarpit') {
    const action = getString(raw.action) ?? 'trapped';
    const sourceIp = getString(raw.ip);

    return {
      id: `${type}:${timestamp}:${sequence}`,
      type,
      module: 'defense',
      severity: action === 'trapped' ? 'warn' : 'info',
      title: `TARPIT ${action.toUpperCase()}`,
      summary: sourceIp ?? 'Unknown IP',
      timestamp,
      sourceIp,
      data: raw,
    };
  }

  if (type === 'health') {
    const health = getString(raw.status) ?? 'unknown';
    const severity: TimelineSeverity =
      health === 'critical' || health === 'unhealthy'
        ? 'error'
        : health === 'degraded'
          ? 'warn'
          : 'info';

    return {
      id: `${type}:${timestamp}:${sequence}`,
      type,
      module: 'system',
      severity,
      title: `SYSTEM ${health.toUpperCase()}`,
      summary: `Clients: ${getNumber(raw.clients) ?? 0}`,
      timestamp,
      data: raw,
    };
  }

  const sourceIp = getString(raw.ip);
  const method = getString(raw.method) ?? 'WEBHOOK';
  const hookId = getString(raw.hookId) ?? 'unknown';

  return {
    id: `${type}:${timestamp}:${sequence}`,
    type,
    module: 'integrations',
    severity: 'info',
    title: `${method.toUpperCase()} hook:${hookId}`,
    summary: sourceIp ?? 'Incoming callback',
    timestamp,
    sourceIp,
    data: raw,
  };
}
