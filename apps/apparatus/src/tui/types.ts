/**
 * TUI Dashboard Type Definitions
 * Interfaces for data structures used across the TUI components
 */

// Health endpoint response
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  lag_ms: number;
}

// Tarpit status response
export interface TarpitStatus {
  count: number;
  trapPaths: string[];
  trapped: TarpitEntry[];
}

export interface TarpitEntry {
  ip: string;
  trappedAt: number;
  duration: number;
}

// Deception history response
export interface DeceptionHistory {
  count: number;
  events: DeceptionEvent[];
}

export interface DeceptionEvent {
  timestamp: string;
  ip: string;
  type: 'honeypot_hit' | 'shell_command' | 'sqli_probe';
  route: string;
  details: Record<string, unknown>;
  sessionId?: string;
}

// Request history entry (from /history and SSE)
export interface RequestEntry {
  method: string;
  originalUrl: string;
  path: string;
  query: Record<string, string>;
  httpVersion: string;
  headers: Record<string, string | string[]>;
  ip: string;
  ips: string[];
  body: unknown;
  files?: FileEntry[];
  tls?: TlsInfo;
  timestamp: string;
  latencyMs?: number;
}

export interface FileEntry {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
}

export interface TlsInfo {
  alpnProtocol?: string;
  authorized?: boolean;
  cipher?: Record<string, unknown>;
  protocol?: string;
}

// SSE event types
export type SSEEventType = 'request' | 'deception' | 'tarpit' | 'health';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  timestamp: string;
  data: T;
}

// Dashboard state
export interface DashboardState {
  connected: boolean;
  health?: HealthStatus;
  tarpit?: TarpitStatus;
  deception?: DeceptionHistory;
  requests: RequestEntry[];
  lastUpdated?: number;
  error?: string;
}

// Log filter options
export interface LogFilter {
  method?: string;
  statusMin?: number;
  statusMax?: number;
  pathContains?: string;
  ipContains?: string;
}

// TUI configuration
export interface TuiConfig {
  target: string;
  refreshInterval: number;
  maxRequests: number;
  sseReconnectDelay: number;
  sseMaxReconnectAttempts: number;
}

// Sentinel (Active Shield) rule
export interface SentinelRule {
  id: string;
  pattern: string;
  action: 'block' | 'log' | 'redirect';
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
  matchCount?: number;
}

// MTD (Moving Target Defense) status
export interface MtdStatus {
  enabled: boolean;
  currentPrefix: string;
  rotationInterval?: number;
  lastRotation?: string | null;
  lastRotatedAt?: string | null;
  routeCount?: number;
  rotationCount?: number;
}

// DLP (Data Loss Prevention) generated data (single item)
export interface DlpData {
  type: 'cc' | 'ssn' | 'email' | 'sql' | 'phone' | 'ip';
  value: string;
  description: string;
}

// DLP bulk generation response
export interface DlpBulkData {
  creditCards: string[];
  ssns: string[];
  emails: string[];
  phones: string[];
  ips: string[];
  timestamp: string;
}

// Red Team scan result
export interface RedTeamResult {
  target: string;
  path?: string;
  total: number;
  passed: number;
  blocked: number;
  results: RedTeamTestResult[];
  timestamp: string;
  summary?: {
    total: number;
    passed: number;
    blocked: number;
    error?: number;
    failed?: number;
  };
}

export interface RedTeamTestResult {
  category: string;
  payload: string;
  status: 'passed' | 'blocked' | 'error';
  blocked?: boolean;
  statusCode: number;
  latencyMs: number;
  response?: string;
}
