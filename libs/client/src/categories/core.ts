/**
 * Core API
 * Health, echo, metrics, and history endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  HealthResponse,
  HealthProResponse,
  EchoResponse,
  HistoryResponse,
  MetricsResponse,
  ThreatIntelStatus,
} from '../types.js';

export class CoreApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Basic health check
   * GET /healthz
   */
  async health(): Promise<HealthResponse> {
    return this.http.get<HealthResponse>('/healthz');
  }

  /**
   * Detailed health check with component status
   * GET /health/pro
   */
  async healthPro(): Promise<HealthProResponse> {
    return this.http.get<HealthProResponse>('/health/pro');
  }

  /**
   * Check if server is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.health();
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Echo back request details (catch-all)
   * ANY /*
   */
  async echo(path = '/', options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    delay?: number;
    status?: number;
  }): Promise<EchoResponse> {
    const headers: Record<string, string> = { ...options?.headers };

    // Add delay injection header if specified
    if (options?.delay !== undefined) {
      headers['x-echo-delay'] = String(options.delay);
    }

    // Add status injection header if specified
    if (options?.status !== undefined) {
      headers['x-echo-status'] = String(options.status);
    }

    return this.http.request<EchoResponse>(path, {
      method: options?.method ?? 'GET',
      headers,
      body: options?.body,
    });
  }

  /**
   * Get Prometheus metrics
   * GET /metrics
   */
  async metrics(options?: { parse?: boolean }): Promise<MetricsResponse> {
    const raw = await this.http.get<string>('/metrics', { responseType: 'text' });

    const result: MetricsResponse = { raw };

    if (options?.parse) {
      result.parsed = this.parsePrometheusMetrics(raw);
    }

    return result;
  }

  /**
   * Get request history
   * GET /history
   */
  async history(): Promise<HistoryResponse> {
    return this.http.get<HistoryResponse>('/history');
  }

  /**
   * Clear request history
   * DELETE /history
   */
  async clearHistory(): Promise<{ message: string; count: number }> {
    return this.http.delete<{ message: string; count: number }>('/history');
  }

  /**
   * Get Threat Intel (Risk Server) connection status
   * GET /threat-intel/status
   */
  async threatIntelStatus(): Promise<ThreatIntelStatus> {
    return this.http.get<ThreatIntelStatus>('/threat-intel/status');
  }

  /**
   * Parse Prometheus metrics format into key-value pairs
   */
  private parsePrometheusMetrics(raw: string): Record<string, number> {
    const parsed: Record<string, number> = {};
    const lines = raw.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('#') || !line.trim()) {
        continue;
      }

      // Parse metric line: metric_name{labels} value
      const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*(?:\{[^}]*\})?)\s+([0-9.eE+-]+)/);
      if (match) {
        const [, name, value] = match;
        parsed[name] = parseFloat(value);
      }
    }

    return parsed;
  }
}
