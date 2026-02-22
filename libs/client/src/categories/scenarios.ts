/**
 * Scenarios API
 * Create, list, run, and monitor multi-step attack scenarios
 */

import type { HttpClient } from '../http.js';
import type {
  Scenario,
  ScenarioSaveRequest,
  ScenarioRunResponse,
  ScenarioRunStatus,
} from '../types.js';

export class ScenariosApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all saved scenarios
   * GET /scenarios
   */
  async list(): Promise<Scenario[]> {
    return this.http.get<Scenario[]>('/scenarios');
  }

  /**
   * Save (create or update) a scenario
   * POST /scenarios
   */
  async save(scenario: ScenarioSaveRequest): Promise<Scenario> {
    return this.http.post<Scenario>('/scenarios', scenario);
  }

  /**
   * Run a scenario by ID (async — returns immediately with executionId)
   * POST /scenarios/:id/run
   */
  async run(id: string): Promise<ScenarioRunResponse> {
    return this.http.post<ScenarioRunResponse>(`/scenarios/${encodeURIComponent(id)}/run`);
  }

  /**
   * Get the run status for a scenario
   * GET /scenarios/:id/status
   */
  async status(id: string, executionId?: string): Promise<ScenarioRunStatus> {
    const query = executionId ? `?executionId=${encodeURIComponent(executionId)}` : '';
    return this.http.get<ScenarioRunStatus>(`/scenarios/${encodeURIComponent(id)}/status${query}`);
  }

  /**
   * Get a scenario by ID from the list
   */
  async get(id: string): Promise<Scenario | undefined> {
    const all = await this.list();
    return all.find((s) => s.id === id);
  }

  /**
   * Run a scenario and poll until completion
   */
  async runAndWait(id: string, pollIntervalMs = 1000, timeoutMs = 300000): Promise<ScenarioRunStatus> {
    const { executionId } = await this.run(id);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.status(id, executionId);
      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    return this.status(id, executionId);
  }
}
