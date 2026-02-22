/**
 * Drills API
 * Breach protocol drills — list, run, monitor, mark-detected, cancel, debrief
 */

import type { HttpClient } from '../http.js';
import type {
  DrillDefinition,
  DrillRunResponse,
  DrillRun,
  DrillMarkDetectedResponse,
  DrillDebrief,
} from '../types.js';

export class DrillsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all available drill definitions
   * GET /drills
   */
  async list(): Promise<DrillDefinition[]> {
    return this.http.get<DrillDefinition[]>('/drills');
  }

  /**
   * Start a drill run (async — returns immediately with runId)
   * POST /drills/:id/run
   */
  async run(drillId: string): Promise<DrillRunResponse> {
    return this.http.post<DrillRunResponse>(`/drills/${encodeURIComponent(drillId)}/run`);
  }

  /**
   * Get the current status of a drill run
   * GET /drills/:id/status
   */
  async status(drillId: string, runId?: string): Promise<DrillRun> {
    const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<DrillRun>(`/drills/${encodeURIComponent(drillId)}/status${query}`);
  }

  /**
   * Mark a drill's incident as detected by the operator
   * POST /drills/:id/mark-detected
   */
  async markDetected(drillId: string, runId?: string): Promise<DrillMarkDetectedResponse> {
    return this.http.post<DrillMarkDetectedResponse>(
      `/drills/${encodeURIComponent(drillId)}/mark-detected`,
      runId ? { runId } : undefined,
    );
  }

  /**
   * Cancel an active drill run
   * POST /drills/:id/cancel
   */
  async cancel(drillId: string, runId?: string): Promise<{ status: string; run: DrillRun }> {
    return this.http.post<{ status: string; run: DrillRun }>(
      `/drills/${encodeURIComponent(drillId)}/cancel`,
      runId ? { runId } : undefined,
    );
  }

  /**
   * Get the post-drill debrief (only available after terminal state)
   * GET /drills/:id/debrief
   */
  async debrief(drillId: string, runId?: string): Promise<DrillDebrief> {
    const query = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return this.http.get<DrillDebrief>(`/drills/${encodeURIComponent(drillId)}/debrief${query}`);
  }

  /**
   * Get a drill definition by ID from the list
   */
  async get(drillId: string): Promise<DrillDefinition | undefined> {
    const all = await this.list();
    return all.find((d) => d.id === drillId);
  }

  /**
   * Check if a drill run is still active (non-terminal)
   */
  async isActive(drillId: string, runId?: string): Promise<boolean> {
    const run = await this.status(drillId, runId);
    const terminal = new Set(['won', 'failed', 'cancelled']);
    return !terminal.has(run.status);
  }

  /**
   * Run a drill and poll until terminal state
   */
  async runAndWait(drillId: string, pollIntervalMs = 2000, timeoutMs = 600000): Promise<DrillRun> {
    const { runId } = await this.run(drillId);
    const terminal = new Set(['won', 'failed', 'cancelled']);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const run = await this.status(drillId, runId);
      if (terminal.has(run.status)) {
        return run;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    return this.status(drillId, runId);
  }
}
