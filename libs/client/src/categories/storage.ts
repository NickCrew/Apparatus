/**
 * Storage API
 * Key-value store and script execution endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  KvEntry,
  KvSetRequest,
  ScriptRequest,
  ScriptResponse,
} from '../types.js';

export class StorageApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get a key-value entry
   * GET /kv/:key
   */
  async kvGet(key: string): Promise<KvEntry | null> {
    try {
      return await this.http.get<KvEntry>(`/kv/${encodeURIComponent(key)}`);
    } catch (error) {
      // Return null for 404
      if ((error as { status?: number }).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get the value of a key
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = await this.kvGet(key);
    return entry?.value as T | null;
  }

  /**
   * Set a key-value entry
   * PUT /kv/:key
   */
  async kvSet(key: string, request: KvSetRequest): Promise<KvEntry> {
    return this.http.put<KvEntry>(`/kv/${encodeURIComponent(key)}`, request);
  }

  /**
   * Set a value
   */
  async set(key: string, value: unknown, ttl?: number): Promise<KvEntry> {
    return this.kvSet(key, { value, ttl });
  }

  /**
   * Delete a key-value entry
   * DELETE /kv/:key
   */
  async kvDelete(key: string): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/kv/${encodeURIComponent(key)}`);
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    try {
      await this.kvDelete(key);
      return true;
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * List all keys
   * GET /kv
   */
  async kvList(): Promise<string[]> {
    const response = await this.http.get<{ keys: string[] }>('/kv');
    return response.keys;
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.kvGet(key);
    return entry !== null;
  }

  /**
   * Execute a script
   * POST /script
   */
  async script(request: ScriptRequest): Promise<ScriptResponse> {
    return this.http.post<ScriptResponse>('/script', request);
  }

  /**
   * Run a script with code string
   */
  async runScript(code: string, args?: unknown[], timeout?: number): Promise<ScriptResponse> {
    return this.script({ code, args, timeout });
  }

  /**
   * Execute code and return just the result
   */
  async exec<T = unknown>(code: string, args?: unknown[]): Promise<T> {
    const response = await this.runScript(code, args);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.result as T;
  }
}
