/**
 * Apparatus SSE Client
 * Server-Sent Events client for real-time Apparatus updates
 */

import { SSEError } from './errors.js';
import type { SSEEvent, SSEEventType, SSEClientOptions } from './types.js';

export type SSEEventHandler<T = unknown> = (event: SSEEvent<T>) => void;
export type SSEErrorHandler = (error: SSEError) => void;
export type SSEStateHandler = (state: SSEConnectionState) => void;

export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface SSEListeners {
  all: Set<SSEEventHandler>;
  byType: Map<SSEEventType, Set<SSEEventHandler>>;
  error: Set<SSEErrorHandler>;
  state: Set<SSEStateHandler>;
}

/**
 * SSE Client for receiving real-time events from Apparatus
 */
export class SSEClient {
  private readonly baseUrl: string;
  private readonly options: Required<SSEClientOptions>;
  private eventSource: EventSource | null = null;
  private state: SSEConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private readonly listeners: SSEListeners = {
    all: new Set(),
    byType: new Map(),
    error: new Set(),
    state: new Set(),
  };

  constructor(baseUrl: string, options: SSEClientOptions = {}) {
    // Normalize base URL
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      return; // Already connected or connecting
    }

    this.setState('connecting');
    const url = `${this.baseUrl}/sse`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
      };

      this.eventSource.onerror = (event: Event) => {
        const error = new SSEError(
          'SSE connection error',
          undefined,
          'message' in event ? new Error(String((event as { message?: string }).message)) : undefined
        );
        this.notifyError(error);

        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleDisconnect();
        }
      };

      // Listen for all event types
      const eventTypes: SSEEventType[] = ['request', 'deception', 'tarpit', 'health', 'threat-intel'];
      for (const type of eventTypes) {
        this.eventSource.addEventListener(type, (event) => {
          this.handleEvent(type, event as MessageEvent);
        });
      }

      // Also listen for generic message events (fallback)
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.handleEvent(data.type, event);
          }
        } catch {
          // Ignore unparseable messages (like heartbeats)
        }
      };
    } catch (error) {
      this.setState('disconnected');
      throw new SSEError(
        'Failed to create SSE connection',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.clearReconnectTimeout();

    if (this.eventSource) {
      // Clean up event listeners to prevent memory leaks
      this.eventSource.onopen = null;
      this.eventSource.onerror = null;
      this.eventSource.onmessage = null;
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
  }

  /**
   * Subscribe to all events
   */
  onEvent<T = unknown>(handler: SSEEventHandler<T>): () => void {
    this.listeners.all.add(handler as SSEEventHandler);
    return () => this.listeners.all.delete(handler as SSEEventHandler);
  }

  /**
   * Subscribe to events of a specific type
   */
  on<T = unknown>(type: SSEEventType, handler: SSEEventHandler<T>): () => void {
    if (!this.listeners.byType.has(type)) {
      this.listeners.byType.set(type, new Set());
    }
    this.listeners.byType.get(type)!.add(handler as SSEEventHandler);
    return () => this.listeners.byType.get(type)?.delete(handler as SSEEventHandler);
  }

  /**
   * Subscribe to request events
   */
  onRequest<T = unknown>(handler: SSEEventHandler<T>): () => void {
    return this.on('request', handler);
  }

  /**
   * Subscribe to deception events
   */
  onDeception<T = unknown>(handler: SSEEventHandler<T>): () => void {
    return this.on('deception', handler);
  }

  /**
   * Subscribe to tarpit events
   */
  onTarpit<T = unknown>(handler: SSEEventHandler<T>): () => void {
    return this.on('tarpit', handler);
  }

  /**
   * Subscribe to health events
   */
  onHealth<T = unknown>(handler: SSEEventHandler<T>): () => void {
    return this.on('health', handler);
  }

  /**
   * Subscribe to threat intelligence events
   */
  onThreatIntel<T = unknown>(handler: SSEEventHandler<T>): () => void {
    return this.on('threat-intel', handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: SSEErrorHandler): () => void {
    this.listeners.error.add(handler);
    return () => this.listeners.error.delete(handler);
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(handler: SSEStateHandler): () => void {
    this.listeners.state.add(handler);
    return () => this.listeners.state.delete(handler);
  }

  /**
   * Get current connection state
   */
  getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected';
  }

  /**
   * Handle incoming SSE event
   */
  private handleEvent(type: SSEEventType, messageEvent: MessageEvent): void {
    try {
      const data = JSON.parse(messageEvent.data);
      const event: SSEEvent = {
        type,
        timestamp: data.timestamp || new Date().toISOString(),
        data: data.data ?? data,
      };

      // Notify all listeners
      for (const handler of this.listeners.all) {
        try {
          handler(event);
        } catch (error) {
          console.error('[Apparatus SSE] Handler error:', error);
        }
      }

      // Notify type-specific listeners
      const typeListeners = this.listeners.byType.get(type);
      if (typeListeners) {
        for (const handler of typeListeners) {
          try {
            handler(event);
          } catch (error) {
            console.error('[Apparatus SSE] Handler error:', error);
          }
        }
      }
    } catch (error) {
      this.notifyError(
        new SSEError(
          'Failed to parse SSE event',
          type,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;

    if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.setState('reconnecting');
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    this.clearReconnectTimeout();

    // Exponential backoff with jitter
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 seconds
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.eventSource = null; // Clear so connect() will create new one
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnect timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Update connection state and notify listeners
   */
  private setState(newState: SSEConnectionState): void {
    if (this.state === newState) return;

    this.state = newState;
    for (const handler of this.listeners.state) {
      try {
        handler(newState);
      } catch (error) {
        console.error('[Apparatus SSE] State handler error:', error);
      }
    }
  }

  /**
   * Notify error listeners
   */
  private notifyError(error: SSEError): void {
    for (const handler of this.listeners.error) {
      try {
        handler(error);
      } catch (err) {
        console.error('[Apparatus SSE] Error handler error:', err);
      }
    }
  }
}
