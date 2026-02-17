import { useState, useEffect, useRef, useCallback } from 'react';

type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSSEOptions {
  enabled?: boolean;
  maxRetries?: number;
  onOpen?: () => void;
  onError?: (event: Event) => void;
  onMaxRetriesExceeded?: () => void;
}

interface UseSSEReturn {
  status: SSEStatus;
  retryCount: number;
  subscribe: <T>(eventType: string, callback: (data: T) => void) => () => void;
  close: () => void;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

/**
 * Hook for managing SSE (Server-Sent Events) connections with:
 * - Automatic reconnection with exponential backoff
 * - Proper cleanup on URL change or unmount
 * - Type-safe event subscriptions
 */
export function useSSE(url: string, options: UseSSEOptions = {}): UseSSEReturn {
  const {
    enabled = true,
    maxRetries = 5,
    onOpen,
    onError,
    onMaxRetriesExceeded,
  } = options;

  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  // Clear any pending reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Close current connection
  const closeConnection = useCallback(() => {
    clearReconnectTimeout();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, [clearReconnectTimeout]);

  // Subscribe to an event type
  const subscribe = useCallback(<T,>(eventType: string, callback: (data: T) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());

      // Add listener to EventSource if connected
      if (eventSourceRef.current) {
        eventSourceRef.current.addEventListener(eventType, (event: MessageEvent) => {
          const listeners = listenersRef.current.get(eventType);
          if (listeners) {
            try {
              const data = JSON.parse(event.data);
              listeners.forEach((cb) => cb(data));
            } catch (e) {
              console.error(`Failed to parse SSE event "${eventType}":`, e);
            }
          }
        });
      }
    }

    const typedCallback = callback as (data: unknown) => void;
    listenersRef.current.get(eventType)!.add(typedCallback);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(typedCallback);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Main connection effect
  useEffect(() => {
    if (!url || !enabled) {
      closeConnection();
      setStatus('disconnected');
      setRetryCount(0);
      return;
    }

    // Close any existing connection before opening new one
    closeConnection();
    setStatus('connecting');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
      setRetryCount(0);
      onOpen?.();
    };

    eventSource.onerror = (event) => {
      setStatus('error');
      onError?.(event);
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnection with exponential backoff
      setRetryCount((currentRetry) => {
        if (currentRetry >= maxRetries) {
          onMaxRetriesExceeded?.();
          return currentRetry;
        }

        const delay = Math.min(BASE_DELAY * Math.pow(2, currentRetry), MAX_DELAY);
        reconnectTimeoutRef.current = setTimeout(() => {
          setRetryCount((r) => r + 1);
        }, delay);

        return currentRetry;
      });
    };

    // Re-attach all existing event listeners
    listenersRef.current.forEach((listeners, eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          listeners.forEach((cb) => cb(data));
        } catch (e) {
          console.error(`Failed to parse SSE event "${eventType}":`, e);
        }
      });
    });

    // Cleanup on URL change or unmount
    return () => {
      clearReconnectTimeout();
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, enabled, retryCount, maxRetries, onOpen, onError, onMaxRetriesExceeded, closeConnection, clearReconnectTimeout]);

  return {
    status,
    retryCount,
    subscribe,
    close: closeConnection,
  };
}
