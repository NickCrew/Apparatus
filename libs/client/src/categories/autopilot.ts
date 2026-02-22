/**
 * Autopilot API
 * AI-driven red team autopilot — config, start, stop, kill, status, reports
 */

import type { HttpClient } from '../http.js';
import type {
  AutopilotConfig,
  AutopilotStartRequest,
  AutopilotStartResponse,
  AutopilotStopResponse,
  AutopilotKillResponse,
  AutopilotStatusResponse,
  AutopilotReportsResponse,
} from '../types.js';

export class AutopilotApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get autopilot configuration (available tools, defaults)
   * GET /api/redteam/autopilot/config
   */
  async config(): Promise<AutopilotConfig> {
    return this.http.get<AutopilotConfig>('/api/redteam/autopilot/config');
  }

  /**
   * Start an autopilot red team session
   * POST /api/redteam/autopilot/start
   */
  async start(request: AutopilotStartRequest): Promise<AutopilotStartResponse> {
    return this.http.post<AutopilotStartResponse>('/api/redteam/autopilot/start', request);
  }

  /**
   * Gracefully stop the active autopilot session
   * POST /api/redteam/autopilot/stop
   */
  async stop(): Promise<AutopilotStopResponse> {
    return this.http.post<AutopilotStopResponse>('/api/redteam/autopilot/stop');
  }

  /**
   * Force-kill the active autopilot session and stop all active experiments
   * POST /api/redteam/autopilot/kill
   */
  async kill(): Promise<AutopilotKillResponse> {
    return this.http.post<AutopilotKillResponse>('/api/redteam/autopilot/kill');
  }

  /**
   * Get current autopilot status
   * GET /api/redteam/autopilot/status
   */
  async status(sessionId?: string): Promise<AutopilotStatusResponse> {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return this.http.get<AutopilotStatusResponse>(`/api/redteam/autopilot/status${query}`);
  }

  /**
   * Get autopilot session reports
   * GET /api/redteam/autopilot/reports
   */
  async reports(sessionId?: string): Promise<AutopilotReportsResponse> {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    return this.http.get<AutopilotReportsResponse>(`/api/redteam/autopilot/reports${query}`);
  }

  /**
   * Check if autopilot is currently running
   */
  async isRunning(): Promise<boolean> {
    const { active } = await this.status();
    return active;
  }

  /**
   * Start autopilot with a simple objective string
   */
  async launch(objective: string, maxIterations?: number): Promise<AutopilotStartResponse> {
    return this.start({ objective, maxIterations });
  }
}
