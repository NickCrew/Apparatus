/**
 * Traffic API
 * Ghost (background) traffic generator endpoints
 */

import type { HttpClient } from '../http.js';
import type { GhostStatus, GhostConfig } from '../types.js';

export class TrafficApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get ghost traffic status
   * GET /ghosts
   */
  async status(): Promise<GhostStatus> {
    return this.http.get<GhostStatus>('/ghosts');
  }

  /**
   * Start ghost traffic
   * POST /ghosts/start
   */
  async start(config?: GhostConfig): Promise<GhostStatus> {
    return this.http.post<GhostStatus>('/ghosts/start', config);
  }

  /**
   * Stop ghost traffic
   * POST /ghosts/stop
   */
  async stop(): Promise<GhostStatus> {
    return this.http.post<GhostStatus>('/ghosts/stop');
  }

  /**
   * Check if ghost traffic is running
   */
  async isRunning(): Promise<boolean> {
    const status = await this.status();
    return status.running;
  }

  /**
   * Start ghost traffic with specified RPS
   */
  async startWithRps(rps: number): Promise<GhostStatus> {
    return this.start({ rps });
  }

  /**
   * Start ghost traffic for specified duration
   */
  async startForDuration(rps: number, durationMs: number): Promise<GhostStatus> {
    return this.start({ rps, duration: durationMs });
  }

  /**
   * Start ghost traffic targeting specific endpoints
   */
  async startTargeted(rps: number, endpoints: string[]): Promise<GhostStatus> {
    return this.start({ rps, endpoints });
  }

  /**
   * Get traffic statistics
   */
  async getStats(): Promise<GhostStatus['stats'] | null> {
    const status = await this.status();
    return status.stats ?? null;
  }

  /**
   * Toggle ghost traffic on/off
   */
  async toggle(): Promise<GhostStatus> {
    const status = await this.status();
    return status.running ? this.stop() : this.start();
  }
}
