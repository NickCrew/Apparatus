/**
 * Victim API
 * Intentionally vulnerable endpoints for security testing
 *
 * WARNING: These endpoints are intentionally vulnerable for educational
 * and testing purposes. Never use in production!
 */

import type { HttpClient } from '../http.js';
import type { SqliResponse, RceResponse, XssResponse } from '../types.js';

export class VictimApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * SQL injection vulnerable login
   * GET /victim/login?user=X&pass=Y
   *
   * This endpoint is intentionally vulnerable to SQL injection.
   * Use for testing WAF, SAST/DAST tools, and security monitoring.
   */
  async sqli(username: string, password: string): Promise<SqliResponse> {
    const params = new URLSearchParams({ user: username, pass: password });
    const response = await this.http.get<{ status: string; msg?: string; role?: string; flag?: string; error?: string }>(
      `/victim/login?${params.toString()}`
    );

    // Transform server response to expected SqliResponse format
    const vulnerable = response.status === 'success' && username.includes("' OR ");
    return {
      vulnerable,
      query: `SELECT * FROM users WHERE user = '${username}' AND pass = '${password}'`,
      message: response.msg || response.error || '',
      ...response,
    };
  }

  /**
   * Test SQL injection with a malicious payload
   */
  async testSqli(payload: string): Promise<SqliResponse> {
    return this.sqli(payload, 'test');
  }

  /**
   * Classic SQL injection bypass
   */
  async sqliBypass(): Promise<SqliResponse> {
    return this.sqli("' OR '1'='1", "' OR '1'='1");
  }

  /**
   * Remote Code Execution vulnerable calculator
   * GET /victim/calc?eq=X
   *
   * This endpoint is intentionally vulnerable to command injection.
   * Use for testing WAF, SAST/DAST tools, and security monitoring.
   */
  async rce(expression: string): Promise<RceResponse> {
    const params = new URLSearchParams({ eq: expression });
    // Server returns text/html, not JSON - use responseType: 'text'
    const response = await this.http.request<string>(`/victim/calc?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' },
      responseType: 'text',
    });

    // Parse the text response "Result: X" or "Error: X"
    const resultText = typeof response === 'string' ? response : String(response);
    const isError = resultText.startsWith('Error:');
    const result = resultText.replace(/^(Result|Error):\s*/, '');

    // Check if it looks like command output (RCE success)
    const vulnerable = expression.includes(';') || expression.includes('require(');

    return {
      vulnerable,
      expression,
      result,
      output: isError ? undefined : result,
    };
  }

  /**
   * Test RCE with a command injection payload
   */
  async testRce(payload: string): Promise<RceResponse> {
    return this.rce(payload);
  }

  /**
   * Execute a system command (command injection)
   */
  async execCommand(command: string): Promise<RceResponse> {
    // Use Node.js require to execute command via child_process
    return this.rce(`require('child_process').execSync('${command}').toString()`);
  }

  /**
   * Cross-Site Scripting vulnerable guestbook
   * GET /victim/guestbook?msg=X
   *
   * This endpoint is intentionally vulnerable to reflected XSS.
   * Use for testing WAF, SAST/DAST tools, and security monitoring.
   */
  async xss(message: string): Promise<XssResponse> {
    const params = new URLSearchParams({ msg: message });
    // Server returns HTML, not JSON - use responseType: 'text'
    const response = await this.http.request<string>(`/victim/guestbook?${params.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      responseType: 'text',
    });

    const html = typeof response === 'string' ? response : String(response);

    // Check if the input appears unescaped in the response (XSS vulnerable)
    const vulnerable = html.includes(message) && (message.includes('<') || message.includes('>'));

    return {
      vulnerable,
      input: message,
      rendered: html,
    };
  }

  /**
   * Test XSS with a script injection payload
   */
  async testXss(payload: string): Promise<XssResponse> {
    return this.xss(payload);
  }

  /**
   * Classic XSS alert payload
   */
  async xssAlert(): Promise<XssResponse> {
    return this.xss('<script>alert("XSS")</script>');
  }

  /**
   * Run all vulnerability tests
   */
  async runAllTests(): Promise<{
    sqli: SqliResponse;
    rce: RceResponse;
    xss: XssResponse;
  }> {
    const [sqli, rce, xss] = await Promise.all([
      this.sqliBypass(),
      this.testRce('1+1'),
      this.xssAlert(),
    ]);

    return { sqli, rce, xss };
  }

  /**
   * Check if endpoints are vulnerable
   */
  async checkVulnerabilities(): Promise<{
    sqli: boolean;
    rce: boolean;
    xss: boolean;
  }> {
    try {
      const results = await this.runAllTests();
      return {
        sqli: results.sqli.vulnerable,
        rce: results.rce.vulnerable,
        xss: results.xss.vulnerable,
      };
    } catch {
      return { sqli: false, rce: false, xss: false };
    }
  }
}
