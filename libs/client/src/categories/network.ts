/**
 * Network API
 * DNS, ping, sysinfo, and rate limit endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  DnsResponse,
  PingResponse,
  SysInfoResponse,
  RateLimitResponse,
} from '../types.js';

export class NetworkApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * DNS lookup
   * GET /dns?hostname=<hostname>
   */
  async dns(hostname: string): Promise<DnsResponse> {
    return this.http.get<DnsResponse>(`/dns?hostname=${encodeURIComponent(hostname)}`);
  }

  /**
   * Ping a host and port
   * GET /ping?host=<host>&port=<port>
   */
  async ping(host: string, port = 80): Promise<PingResponse> {
    return this.http.get<PingResponse>(
      `/ping?host=${encodeURIComponent(host)}&port=${port}`
    );
  }

  /**
   * Get system information
   * GET /sysinfo
   */
  async sysinfo(): Promise<SysInfoResponse> {
    return this.http.get<SysInfoResponse>('/sysinfo');
  }

  /**
   * Get rate limit status
   * GET /ratelimit
   */
  async rateLimit(): Promise<RateLimitResponse> {
    return this.http.get<RateLimitResponse>('/ratelimit');
  }

  /**
   * Check if a host is reachable
   */
  async isReachable(host: string, port = 80): Promise<boolean> {
    try {
      const response = await this.ping(host, port);
      return response.status === 'open';
    } catch {
      return false;
    }
  }

  /**
   * Resolve hostname to all addresses
   */
  async resolve(hostname: string): Promise<string[]> {
    const response = await this.dns(hostname);
    return response.addresses;
  }
}
