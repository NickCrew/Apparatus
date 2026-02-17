/**
 * API Client for TUI Dashboard
 * Handles polling for non-SSE endpoints
 */

import type {
  HealthStatus,
  TarpitStatus,
  DeceptionHistory,
  RequestEntry,
  SentinelRule,
  MtdStatus,
  DlpData,
  DlpBulkData,
  RedTeamResult,
} from './types.js';

export interface ApiClientOptions {
  baseUrl: string;
  timeout?: number;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeout = options.timeout ?? 5000;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthStatus> {
    return this.fetchWithTimeout<HealthStatus>('/health/pro');
  }

  /**
   * Get tarpit status
   */
  async getTarpitStatus(): Promise<TarpitStatus> {
    return this.fetchWithTimeout<TarpitStatus>('/tarpit');
  }

  /**
   * Get deception history
   */
  async getDeceptionHistory(): Promise<DeceptionHistory> {
    return this.fetchWithTimeout<DeceptionHistory>('/deception/history');
  }

  /**
   * Get request history
   */
  async getRequestHistory(): Promise<RequestEntry[]> {
    return this.fetchWithTimeout<RequestEntry[]>('/history');
  }

  /**
   * Release a specific IP from tarpit
   */
  async releaseTarpitIp(ip: string): Promise<{ status: string; ip: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/tarpit/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ ip }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<{ status: string; ip: string }>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Release all IPs from tarpit
   */
  async releaseAllTarpit(): Promise<{ status: string; count: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/tarpit/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<{ status: string; count: number }>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Ping the server (basic health check)
   */
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================
  // Sentinel (Active Shield) endpoints
  // ============================================

  /**
   * Get all Sentinel rules
   */
  async getSentinelRules(): Promise<SentinelRule[]> {
    return this.fetchWithTimeout<SentinelRule[]>('/sentinel/rules');
  }

  /**
   * Add a new Sentinel rule
   */
  async addSentinelRule(pattern: string, action: string): Promise<SentinelRule> {
    return this.postJson<SentinelRule>('/sentinel/rules', { pattern, action });
  }

  /**
   * Delete a Sentinel rule
   */
  async deleteSentinelRule(id: string): Promise<{ status: string }> {
    return this.deleteResource(`/sentinel/rules/${id}`);
  }

  // ============================================
  // MTD (Moving Target Defense) endpoints
  // ============================================

  /**
   * Get MTD status
   */
  async getMtdStatus(): Promise<MtdStatus> {
    return this.fetchWithTimeout<MtdStatus>('/mtd/status');
  }

  /**
   * Rotate MTD prefix
   */
  async rotateMtdPrefix(prefix?: string): Promise<MtdStatus> {
    return this.postJson<MtdStatus>('/mtd/rotate', prefix ? { prefix } : {});
  }

  // ============================================
  // DLP (Data Loss Prevention) endpoints
  // ============================================

  /**
   * Generate DLP test data
   */
  async generateDlpData(type?: 'cc' | 'ssn' | 'email' | 'sql'): Promise<DlpData> {
    const path = type ? `/dlp?type=${type}` : '/dlp';
    return this.fetchWithTimeout<DlpData>(path);
  }

  // ============================================
  // Red Team / WAF Validation endpoints
  // ============================================

  /**
   * Run a red team scan against a target
   */
  async runRedTeamScan(target: string, path?: string): Promise<RedTeamResult> {
    return this.postJson<RedTeamResult>('/redteam/scan', { target, path });
  }

  // ============================================
  // Chaos Engineering endpoints
  // ============================================

  /**
   * Trigger CPU spike
   */
  async triggerCpuSpike(duration?: number): Promise<{ status: string }> {
    return this.postJson<{ status: string }>('/chaos/cpu', { duration: duration ?? 5000 });
  }

  /**
   * Trigger memory spike
   */
  async triggerMemorySpike(mb?: number): Promise<{ status: string; allocated: number }> {
    return this.postJson<{ status: string; allocated: number }>('/chaos/memory', { mb: mb ?? 100 });
  }

  /**
   * Trigger server crash
   */
  async triggerCrash(): Promise<{ status: string }> {
    return this.postJson<{ status: string }>('/chaos/crash', {});
  }

  /**
   * Clear allocated memory
   */
  async clearMemory(): Promise<{ status: string; freed: number }> {
    return this.postJson<{ status: string; freed: number }>('/chaos/clear', {});
  }

  // ============================================
  // Ghost Traffic endpoints
  // ============================================

  /**
   * Start ghost traffic generation
   */
  async startGhostTraffic(target: string, delay?: number): Promise<{ status: string }> {
    return this.postJson<{ status: string }>('/ghost/start', { target, delay: delay ?? 1000 });
  }

  /**
   * Stop ghost traffic generation
   */
  async stopGhostTraffic(): Promise<{ status: string }> {
    return this.postJson<{ status: string }>('/ghost/stop', {});
  }

  // ============================================
  // Network Diagnostics endpoints
  // ============================================

  /**
   * Perform DNS lookup
   */
  async dnsLookup(target: string, type?: string): Promise<{ target: string; type: string; records: string[] }> {
    const path = `/dns?target=${encodeURIComponent(target)}${type ? `&type=${type}` : ''}`;
    return this.fetchWithTimeout<{ target: string; type: string; records: string[] }>(path);
  }

  /**
   * Perform TCP ping
   */
  async tcpPing(target: string): Promise<{ target: string; reachable: boolean; latencyMs?: number; error?: string }> {
    return this.fetchWithTimeout<{ target: string; reachable: boolean; latencyMs?: number; error?: string }>(
      `/ping?target=${encodeURIComponent(target)}`
    );
  }

  // ============================================
  // Helper methods for POST/DELETE
  // ============================================

  /**
   * POST JSON data
   */
  private async postJson<T>(path: string, data: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * DELETE a resource
   */
  private async deleteResource<T = { status: string }>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Poller class for periodic API calls
 */
export class ApiPoller {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Start polling an endpoint
   */
  start<T>(
    name: string,
    fetcher: () => Promise<T>,
    interval: number,
    onData: (data: T) => void,
    onError: (error: Error) => void
  ): void {
    // Stop existing timer if any
    this.stop(name);

    const poll = async () => {
      try {
        const data = await fetcher();
        onData(data);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // Initial fetch
    poll();

    // Schedule periodic fetches
    const timer = setInterval(poll, interval);
    this.timers.set(name, timer);
  }

  /**
   * Stop polling an endpoint
   */
  stop(name: string): void {
    const timer = this.timers.get(name);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  /**
   * Stop all polling
   */
  stopAll(): void {
    this.timers.forEach((timer) => {
      clearInterval(timer);
    });
    this.timers.clear();
  }

  /**
   * Get the API client
   */
  getClient(): ApiClient {
    return this.client;
  }
}
