/**
 * Webhooks API
 * Webhook receiver and inspection endpoints
 *
 * Note: The apparatus server uses a simple webhook store that auto-creates
 * webhooks on first request. There is no explicit create/delete API -
 * webhooks are created implicitly and persist in memory.
 */

import type { HttpClient } from '../http.js';
import type {
  WebhookInfo,
  WebhookInspectResponse,
  WebhookRequest,
} from '../types.js';
// Removed Node.js crypto import for browser compatibility

function randomUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class WebhooksApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Generate a new webhook ID
   * Note: The server doesn't have an explicit create endpoint.
   * Webhooks are created implicitly when a request is sent to /hooks/:id
   */
  create(): WebhookInfo {
    const id = randomUUID();
    return { id };
  }

  /**
   * Get webhook URL for a given ID
   */
  getUrl(id: string): string {
    return `${this.http.baseUrl}/hooks/${id}`;
  }

  /**
   * Generate a new webhook ID and return full URL
   * Note: No server call needed - ID is generated client-side
   */
  createAndGetUrl(): { id: string; url: string } {
    const info = this.create();
    return {
      id: info.id,
      url: this.getUrl(info.id),
    };
  }

  /**
   * Send a request to a webhook (simulate external caller)
   * ALL /hooks/:id
   */
  async receive(id: string, payload?: unknown, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
  }): Promise<{ status: string; id: string }> {
    return this.http.request<{ status: string; id: string }>(`/hooks/${encodeURIComponent(id)}`, {
      method: options?.method ?? 'POST',
      headers: options?.headers,
      body: payload,
    });
  }

  /**
   * Inspect webhook - view received requests
   * GET /hooks/:id/inspect
   *
   * Note: Server returns an array directly, not wrapped in { requests: [...] }
   */
  async inspect(id: string): Promise<WebhookInspectResponse> {
    const requests = await this.http.get<WebhookRequest[]>(`/hooks/${encodeURIComponent(id)}/inspect`);
    // Normalize: server returns array, client expects { requests: [...] }
    if (Array.isArray(requests)) {
      return { requests };
    }
    return requests as unknown as WebhookInspectResponse;
  }

  /**
   * Get all requests received by a webhook
   */
  async getRequests(id: string): Promise<WebhookRequest[]> {
    const response = await this.inspect(id);
    return response.requests;
  }

  /**
   * Get the most recent request to a webhook
   */
  async getLastRequest(id: string): Promise<WebhookRequest | null> {
    const requests = await this.getRequests(id);
    return requests.length > 0 ? requests[0] : null;
  }

  /**
   * Get request count for a webhook
   */
  async getRequestCount(id: string): Promise<number> {
    const response = await this.inspect(id);
    return response.requests.length;
  }

  /**
   * Wait for a request to arrive at the webhook
   */
  async waitForRequest(id: string, timeoutMs = 30000, pollIntervalMs = 500): Promise<WebhookRequest | null> {
    const startTime = Date.now();
    const initialCount = await this.getRequestCount(id);

    while (Date.now() - startTime < timeoutMs) {
      const currentCount = await this.getRequestCount(id);
      if (currentCount > initialCount) {
        return this.getLastRequest(id);
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    return null;
  }

  /**
   * Delete a webhook (no-op on server)
   * Note: Server doesn't support webhook deletion - webhooks persist in memory.
   * This method returns a success message for API compatibility.
   */
  async delete(_id: string): Promise<{ message: string }> {
    // Server doesn't support deletion, return success for compatibility
    return { message: 'Webhook deletion not supported by server (webhooks persist in memory)' };
  }

  /**
   * Clear all requests from a webhook (no-op on server)
   * Note: Server doesn't support clearing requests.
   * This method returns a success message for API compatibility.
   */
  async clearRequests(_id: string): Promise<{ message: string; count: number }> {
    // Server doesn't support clearing, return success for compatibility
    return { message: 'Request clearing not supported by server', count: 0 };
  }
}
