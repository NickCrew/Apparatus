/**
 * Defense API
 * Tarpit and deception/honeypot endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  TarpitListResponse,
  TarpitReleaseResponse,
  DeceptionHistoryResponse,
} from '../types.js';

export class DefenseApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * List trapped IPs in tarpit
   * GET /tarpit
   */
  async listTrapped(): Promise<TarpitListResponse> {
    return this.http.get<TarpitListResponse>('/tarpit');
  }

  /**
   * Get count of trapped IPs
   */
  async getTrappedCount(): Promise<number> {
    const response = await this.listTrapped();
    return response.count;
  }

  /**
   * Check if an IP is trapped
   */
  async isTrapped(ip: string): Promise<boolean> {
    const response = await this.listTrapped();
    return response.trapped.some(entry => entry.ip === ip);
  }

  /**
   * Release a specific IP from tarpit
   * POST /tarpit/release
   */
  async release(ip: string): Promise<TarpitReleaseResponse> {
    return this.http.post<TarpitReleaseResponse>('/tarpit/release', { ip });
  }

  /**
   * Release all IPs from tarpit
   * POST /tarpit/release (no body)
   */
  async releaseAll(): Promise<TarpitReleaseResponse> {
    return this.http.post<TarpitReleaseResponse>('/tarpit/release', {});
  }

  /**
   * Get trap paths that trigger tarpit
   */
  async getTrapPaths(): Promise<string[]> {
    const response = await this.listTrapped();
    return response.trapPaths;
  }

  /**
   * Get deception/honeypot event history
   * GET /deception/history
   */
  async deceptionHistory(): Promise<DeceptionHistoryResponse> {
    return this.http.get<DeceptionHistoryResponse>('/deception/history');
  }

  /**
   * Get count of deception events
   */
  async getDeceptionEventCount(): Promise<number> {
    const response = await this.deceptionHistory();
    return response.count;
  }

  /**
   * Clear deception history
   * DELETE /deception/history
   */
  async clearDeceptionHistory(): Promise<{ status: string; count: number }> {
    return this.http.delete<{ status: string; count: number }>('/deception/history');
  }

  /**
   * Get recent honeypot hits
   */
  async getRecentHoneypotHits(limit = 10): Promise<DeceptionHistoryResponse['events']> {
    const response = await this.deceptionHistory();
    return response.events
      .filter(e => e.type === 'honeypot_hit')
      .slice(0, limit);
  }

  /**
   * Get shell command history from AI honeypot
   */
  async getShellCommandHistory(): Promise<DeceptionHistoryResponse['events']> {
    const response = await this.deceptionHistory();
    return response.events.filter(e => e.type === 'shell_command');
  }

  /**
   * Get SQLi probe history
   */
  async getSqliProbes(): Promise<DeceptionHistoryResponse['events']> {
    const response = await this.deceptionHistory();
    return response.events.filter(e => e.type === 'sqli_probe');
  }
}
