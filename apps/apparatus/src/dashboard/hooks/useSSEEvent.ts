import { useState, useEffect } from 'react';
import { useSSE } from './useSSE';

type SSEEventData = Record<string, unknown>;

interface UseSSEEventOptions {
  enabled?: boolean;
}

interface UseSSEEventReturn<T> {
  data: T | null;
  error: Error | null;
  isConnected: boolean;
}

/**
 * Hook to subscribe to a specific SSE event type.
 *
 * @param url - SSE endpoint URL
 * @param eventType - The event type to subscribe to
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * interface TrafficEvent {
 *   method: string;
 *   path: string;
 *   status: number;
 * }
 *
 * function TrafficMonitor() {
 *   const { data, isConnected } = useSSEEvent<TrafficEvent>(
 *     '/events',
 *     'request'
 *   );
 *
 *   if (!isConnected) return <div>Connecting...</div>;
 *   if (!data) return <div>Waiting for events...</div>;
 *
 *   return <div>{data.method} {data.path}</div>;
 * }
 * ```
 */
export function useSSEEvent<T extends SSEEventData>(
  url: string,
  eventType: string,
  options: UseSSEEventOptions = {}
): UseSSEEventReturn<T> {
  const { enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { status, subscribe } = useSSE(url, {
    enabled,
    onError: () => setError(new Error('SSE connection error')),
  });

  useEffect(() => {
    if (status !== 'connected') return;

    const unsubscribe = subscribe<T>(eventType, (eventData) => {
      setData(eventData);
      setError(null);
    });

    return unsubscribe;
  }, [status, eventType, subscribe]);

  return {
    data,
    error,
    isConnected: status === 'connected',
  };
}

/**
 * Hook to subscribe to multiple SSE event types.
 * Returns the most recent event of any subscribed type.
 */
export function useSSEEvents<T extends SSEEventData>(
  url: string,
  eventTypes: string[],
  options: UseSSEEventOptions = {}
): UseSSEEventReturn<T & { _eventType: string }> {
  const { enabled = true } = options;

  const [data, setData] = useState<(T & { _eventType: string }) | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { status, subscribe } = useSSE(url, {
    enabled,
    onError: () => setError(new Error('SSE connection error')),
  });

  useEffect(() => {
    if (status !== 'connected') return;

    const unsubscribes = eventTypes.map((eventType) =>
      subscribe<T>(eventType, (eventData) => {
        setData({ ...eventData, _eventType: eventType });
        setError(null);
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [status, eventTypes, subscribe]);

  return {
    data,
    error,
    isConnected: status === 'connected',
  };
}
