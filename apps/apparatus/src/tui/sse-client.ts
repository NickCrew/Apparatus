/**
 * SSE Client for TUI Dashboard
 * Handles Server-Sent Events connection with automatic reconnection
 */

/// <reference path="./eventsource.d.ts" />
import EventSource from 'eventsource';
import { EventEmitter } from 'events';
import type { SSEEvent, SSEEventType } from './types.js';

export interface SSEClientOptions {
  baseUrl: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export class SSEClient extends EventEmitter {
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly baseUrl: string;
  private readonly reconnectDelay: number;
  private readonly maxReconnectAttempts: number;
  private intentionalClose = false;

  constructor(options: SSEClientOptions) {
    super();
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.reconnectDelay = options.reconnectDelay ?? 1000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.es) {
      this.es.close();
    }

    this.intentionalClose = false;
    const url = `${this.baseUrl}/sse`;

    try {
      this.es = new EventSource(url);

      this.es.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.es.onerror = (error: Event) => {
        this.emit('error', error);
        if (!this.intentionalClose) {
          this.emit('disconnected');
          this.scheduleReconnect();
        }
      };

      // Listen for typed events
      const eventTypes: SSEEventType[] = ['request', 'deception', 'tarpit', 'health'];

      for (const type of eventTypes) {
        this.es.addEventListener(type, (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data) as SSEEvent;
            this.emit(type, parsed);
            this.emit('event', { ...parsed, eventType: type });
          } catch (err) {
            this.emit('parse_error', { type, error: err, raw: event.data });
          }
        });
      }

      // Handle generic messages (fallback)
      this.es.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          this.emit('message', parsed);
        } catch {
          // Ignore unparseable messages (heartbeats, etc.)
        }
      };

    } catch (err) {
      this.emit('error', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_reached');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    );

    this.emit('reconnecting', { attempt: this.reconnectAttempts + 1, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Force a reconnection
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    this.intentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.es !== null && this.es.readyState === EventSource.OPEN;
  }

  /**
   * Get current reconnect attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}
