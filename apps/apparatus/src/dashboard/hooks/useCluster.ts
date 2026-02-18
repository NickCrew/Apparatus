import { useState, useCallback, useEffect, useRef } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface ClusterNode {
  ip: string;
  role: 'self' | 'peer';
  status: 'active' | 'dead';
  lastSeen: number;
}

export function useCluster() {
  const { baseUrl } = useApparatus();
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
  }, []);

  const fetchNodes = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/cluster/members`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNodes(data);
      }
    } catch (e) {
      console.error('Failed to fetch cluster nodes', e);
    }
  }, [baseUrl]);

  const triggerAttack = useCallback(async (target: string, rate: number) => {
    if (!baseUrl) return;
    setIsLoading(true);
    setIsAttacking(true);
    try {
      const res = await fetch(`${baseUrl}/cluster/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, rate })
      });
      
      if (!res.ok) throw new Error(res.statusText);
      
      // Auto-reset attack state after 30s (server duration)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsAttacking(false), 30000);
    } catch (e) {
      console.error('Failed to trigger attack', e);
      setIsAttacking(false);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  // Poll for nodes
  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, [fetchNodes]);

  return {
    nodes,
    triggerAttack,
    isLoading,
    isAttacking
  };
}
