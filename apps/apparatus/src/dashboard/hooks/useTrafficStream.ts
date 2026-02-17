import { useState, useEffect, useRef } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface TrafficEvent {
  method: string;
  path: string;
  status: number;
  ip: string;
  timestamp: string;
  latencyMs: number;
}

export function useTrafficStream(bufferSize = 50) {
  const { baseUrl } = useApparatus();
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!baseUrl) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `${baseUrl}/sse`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      // Simple reconnect strategy handled by browser or could be manual here
    };

    eventSource.addEventListener('request', (e) => {
      try {
        const data = JSON.parse(e.data);
        const newEvent: TrafficEvent = {
            method: data.method,
            path: data.path,
            status: data.status,
            ip: data.ip,
            timestamp: data.timestamp,
            latencyMs: data.latencyMs
        };

        setEvents((prev) => {
          const updated = [newEvent, ...prev];
          return updated.slice(0, bufferSize);
        });
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    });

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [baseUrl, bufferSize]);

  return { events, isConnected };
}
