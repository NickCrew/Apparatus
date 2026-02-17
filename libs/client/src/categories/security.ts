/**
 * Security API
 * Red team validation, Sentinel rules, and proxy endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  RedTeamRequest,
  RedTeamResponse,
  SentinelRule,
  SentinelRuleRequest,
  ProxyRequest,
  ProxyResponse,
} from '../types.js';

export class SecurityApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Run red team security validation
   * POST /redteam/validate
   */
  async redteam(request: RedTeamRequest): Promise<RedTeamResponse> {
    return this.http.post<RedTeamResponse>('/redteam/validate', request);
  }

  /**
   * Get all Sentinel rules
   * GET /sentinel/rules
   */
  async listRules(): Promise<SentinelRule[]> {
    const response = await this.http.get<{ rules: SentinelRule[] }>('/sentinel/rules');
    return response.rules;
  }

  /**
   * Get a specific Sentinel rule
   * GET /sentinel/rules/:id
   */
  async getRule(id: string): Promise<SentinelRule> {
    return this.http.get<SentinelRule>(`/sentinel/rules/${encodeURIComponent(id)}`);
  }

  /**
   * Add a new Sentinel rule
   * POST /sentinel/rules
   */
  async addRule(rule: SentinelRuleRequest): Promise<SentinelRule> {
    return this.http.post<SentinelRule>('/sentinel/rules', rule);
  }

  /**
   * Update a Sentinel rule
   * PUT /sentinel/rules/:id
   */
  async updateRule(id: string, rule: Partial<SentinelRuleRequest>): Promise<SentinelRule> {
    return this.http.put<SentinelRule>(`/sentinel/rules/${encodeURIComponent(id)}`, rule);
  }

  /**
   * Delete a Sentinel rule
   * DELETE /sentinel/rules/:id
   */
  async deleteRule(id: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/sentinel/rules/${encodeURIComponent(id)}`);
  }

  /**
   * Enable a Sentinel rule
   */
  async enableRule(id: string): Promise<SentinelRule> {
    return this.updateRule(id, { enabled: true });
  }

  /**
   * Disable a Sentinel rule
   */
  async disableRule(id: string): Promise<SentinelRule> {
    return this.updateRule(id, { enabled: false });
  }

  /**
   * Proxy a request through Apparatus
   * POST /proxy
   */
  async proxy(request: ProxyRequest): Promise<ProxyResponse> {
    return this.http.post<ProxyResponse>('/proxy', request);
  }

  /**
   * Quick security scan with default tests
   */
  async quickScan(target: string): Promise<RedTeamResponse> {
    return this.redteam({ target });
  }

  /**
   * Full security scan with all tests
   */
  async fullScan(target: string, timeout = 60000): Promise<RedTeamResponse> {
    return this.redteam({
      target,
      tests: ['headers', 'cors', 'tls', 'csrf', 'cookies', 'xss', 'sqli'],
      timeout,
    });
  }
}
