/**
 * Apparatus HTTP Layer
 * Fetch wrapper with timeout, retry, and error handling
 */

import { ApiError, NetworkError, TimeoutError, ValidationError } from './errors.js';
import type { ApparatusClientOptions } from './types.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  /** Return raw response instead of parsed JSON */
  raw?: boolean;
  /** Expected response type for non-JSON responses */
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
  debug: boolean;
}

/**
 * HTTP client for making requests to Apparatus
 */
export class HttpClient {
  private readonly config: HttpClientConfig;

  constructor(options: ApparatusClientOptions) {
    // Validate and normalize base URL
    if (!options.baseUrl) {
      throw new ValidationError('baseUrl is required');
    }

    let baseUrl = options.baseUrl.trim();
    // Remove trailing slash for consistent path joining
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    this.config = {
      baseUrl,
      timeout: options.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      debug: options.debug ?? false,
    };
  }

  /**
   * Make an HTTP request
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path);
    const method = options.method ?? 'GET';
    const timeout = options.timeout ?? this.config.timeout;

    // Merge headers
    const headers: Record<string, string> = {
      ...this.config.headers,
      ...options.headers,
    };

    // Prepare body
    let body: string | undefined;
    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        body = JSON.stringify(options.body);
      }
    }

    if (this.config.debug) {
      console.log(`[Apparatus] ${method} ${url}`, { headers, body });
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (this.config.debug) {
        console.log(`[Apparatus] Response: ${response.status} ${response.statusText}`);
      }

      // Handle non-OK responses
      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        throw ApiError.fromResponse(response, errorBody);
      }

      // Return raw response if requested
      if (options.raw) {
        return response as unknown as T;
      }

      // Parse response based on type
      const responseType = options.responseType ?? 'json';
      switch (responseType) {
        case 'text':
          return (await response.text()) as unknown as T;
        case 'blob':
          return (await response.blob()) as unknown as T;
        case 'arrayBuffer':
          return (await response.arrayBuffer()) as unknown as T;
        case 'json':
        default:
          {
            // Handle empty responses
            const text = await response.text();
            if (!text) {
              return undefined as unknown as T;
            }
            return JSON.parse(text) as T;
          }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(timeout, url);
      }

      // Re-throw Apparatus errors
      if (error instanceof ApiError || error instanceof TimeoutError) {
        throw error;
      }

      // Wrap network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(
          `Failed to connect to ${url}: ${error.message}`,
          url,
          error
        );
      }

      // Wrap unknown errors
      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        url,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.baseUrl}${normalizedPath}`;
  }

  /**
   * Get the base URL
   */
  get baseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Update default headers
   */
  setHeader(key: string, value: string): void {
    this.config.headers[key] = value;
  }

  /**
   * Remove a default header
   */
  removeHeader(key: string): void {
    delete this.config.headers[key];
  }
}
