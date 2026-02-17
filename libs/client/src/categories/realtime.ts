/**
 * Realtime API
 * SSE (Server-Sent Events) streaming wrapper
 */

import { SSEClient, type SSEEventHandler, type SSEErrorHandler, type SSEStateHandler } from '../sse.js';
import type { SSEEvent, SSEEventType, SSEClientOptions } from '../types.js';

export class RealtimeApi {
  private client: SSEClient | null = null;
  private readonly baseUrl: string;
  private readonly options: SSEClientOptions;

  constructor(baseUrl: string, options: SSEClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.options = options;
  }

  /**
   * Connect to the SSE stream
   */
  connect(): void {
    if (!this.client) {
      this.client = new SSEClient(this.baseUrl, this.options);
    }
    this.client.connect();
  }

  /**
   * Disconnect from the SSE stream
   */
  disconnect(): void {
    this.client?.disconnect();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  /**
   * Get connection state
   */
  getState(): string {
    return this.client?.getState() ?? 'disconnected';
  }

  /**
   * Subscribe to all events
   */
  subscribe<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onEvent(handler);
  }

  /**
   * Subscribe to events of a specific type
   */
  on<T = unknown>(type: SSEEventType, handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.on(type, handler);
  }

  /**
   * Subscribe to request events
   */
  onRequest<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onRequest(handler);
  }

  /**
   * Subscribe to deception events
   */
  onDeception<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onDeception(handler);
  }

  /**
   * Subscribe to tarpit events
   */
  onTarpit<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onTarpit(handler);
  }

  /**
   * Subscribe to health events
   */
  onHealth<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onHealth(handler);
  }

  /**
   * Subscribe to threat intelligence events
   */
  onThreatIntel<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.ensureClient();
    return this.client!.onThreatIntel(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: SSEErrorHandler): () => void {
    this.ensureClient();
    return this.client!.onError(handler);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(handler: SSEStateHandler): () => void {
    this.ensureClient();
    return this.client!.onStateChange(handler);
  }

  /**
   * Wait for next event of any type
   */
  async waitForEvent(timeoutMs = 30000): Promise<SSEEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event after ${timeoutMs}ms`));
      }, timeoutMs);

      const unsubscribe = this.subscribe((event) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(event);
      });
    });
  }

  /**
   * Wait for next event of a specific type
   */
  async waitFor(type: SSEEventType, timeoutMs = 30000): Promise<SSEEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for ${type} event after ${timeoutMs}ms`));
      }, timeoutMs);

      const unsubscribe = this.on(type, (event) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(event);
      });
    });
  }

  /**
   * Collect events for a duration
   */
  async collectEvents(durationMs: number): Promise<SSEEvent[]> {
    const events: SSEEvent[] = [];

    const unsubscribe = this.subscribe((event) => {
      events.push(event);
    });

    await new Promise(resolve => setTimeout(resolve, durationMs));
    unsubscribe();

    return events;
  }

  /**
   * Collect events of a specific type for a duration
   */
  async collectEventsOfType(type: SSEEventType, durationMs: number): Promise<SSEEvent[]> {
    const events: SSEEvent[] = [];

    const unsubscribe = this.on(type, (event) => {
      events.push(event);
    });

    await new Promise(resolve => setTimeout(resolve, durationMs));
    unsubscribe();

    return events;
  }

  /**
   * Ensure client is created
   */
  private ensureClient(): void {
    if (!this.client) {
      this.client = new SSEClient(this.baseUrl, this.options);
    }
  }
}
