import { useState, useEffect, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';
import { useSSE } from './useSSE';

export interface DeceptionEvent {
  timestamp: string;
  ip: string;
  type: 'honeypot_hit' | 'shell_command' | 'sqli_probe';
  route: string;
  details: any;
  sessionId?: string;
}

export interface TrappedIP {
  ip: string;
  trappedAt: number;
  duration: number;
}

export function useDeception() {
  const { baseUrl } = useApparatus();
  const [events, setEvents] = useState<DeceptionEvent[]>([]);
  const [trappedIps, setTrappedIps] = useState<TrappedIP[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/deception/history`);
      if (!res.ok) throw new Error('Failed to fetch deception history');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const fetchTarpit = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/tarpit`);
      if (!res.ok) throw new Error('Failed to fetch tarpit status');
      const data = await res.json();
      setTrappedIps(data.trapped || []);
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const releaseIp = useCallback(async (ip?: string) => {
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/tarpit/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      await fetchTarpit();
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl, fetchTarpit]);

  const clearHistory = useCallback(async () => {
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/deception/history`, { method: 'DELETE' });
      setEvents([]);
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  // SSE Real-time Updates
  const { subscribe, status } = useSSE(`${baseUrl}/sse`, { enabled: !!baseUrl });

  useEffect(() => {
    if (status !== 'connected') return;

    const unsubDeception = subscribe<DeceptionEvent>('deception', (event) => {
      setEvents(prev => [event, ...prev].slice(0, 100));
    });

    const unsubTarpit = subscribe<{ action: 'trapped' | 'released', ip: string }>('tarpit', () => {
      fetchTarpit(); // Refresh the list on any tarpit change
    });

    return () => {
      unsubDeception();
      unsubTarpit();
    };
  }, [status, subscribe, fetchTarpit]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchHistory(), fetchTarpit()]).finally(() => setIsLoading(false));
  }, [fetchHistory, fetchTarpit]);

  return {
    events,
    trappedIps,
    releaseIp,
    clearHistory,
    refresh: () => Promise.all([fetchHistory(), fetchTarpit()]),
    isLoading,
    isConnected: status === 'connected'
  };
}
