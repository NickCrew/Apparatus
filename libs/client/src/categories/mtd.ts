/**
 * MTD (Moving Target Defense) API
 * Profile rotation and defense configuration endpoints
 */

import type { HttpClient } from '../http.js';
import type { MtdStatus, MtdRotateResponse } from '../types.js';

export class MtdApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get MTD status
   * GET /mtd
   */
  async status(): Promise<MtdStatus> {
    return this.http.get<MtdStatus>('/mtd');
  }

  /**
   * Check if MTD is enabled
   */
  async isEnabled(): Promise<boolean> {
    const status = await this.status();
    return status.enabled;
  }

  /**
   * Get current defense profile
   */
  async getCurrentProfile(): Promise<string> {
    const status = await this.status();
    return status.currentProfile;
  }

  /**
   * Get next rotation time
   */
  async getNextRotation(): Promise<Date> {
    const status = await this.status();
    return new Date(status.nextRotation);
  }

  /**
   * Get time until next rotation in milliseconds
   */
  async getTimeUntilRotation(): Promise<number> {
    const nextRotation = await this.getNextRotation();
    return Math.max(0, nextRotation.getTime() - Date.now());
  }

  /**
   * Manually rotate to a new defense profile
   * POST /mtd/rotate
   */
  async rotate(): Promise<MtdRotateResponse> {
    return this.http.post<MtdRotateResponse>('/mtd/rotate');
  }

  /**
   * Enable MTD
   * POST /mtd/enable
   */
  async enable(): Promise<MtdStatus> {
    return this.http.post<MtdStatus>('/mtd/enable');
  }

  /**
   * Disable MTD
   * POST /mtd/disable
   */
  async disable(): Promise<MtdStatus> {
    return this.http.post<MtdStatus>('/mtd/disable');
  }

  /**
   * Set rotation interval
   * PUT /mtd/interval
   */
  async setInterval(intervalMs: number): Promise<MtdStatus> {
    return this.http.put<MtdStatus>('/mtd/interval', { interval: intervalMs });
  }

  /**
   * Toggle MTD on/off
   */
  async toggle(): Promise<MtdStatus> {
    const status = await this.status();
    return status.enabled ? this.disable() : this.enable();
  }
}
