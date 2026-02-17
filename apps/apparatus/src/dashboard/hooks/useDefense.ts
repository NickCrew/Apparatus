import { useState, useEffect, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface SentinelRule {
  id: string;
  pattern: string;
  action: 'block' | 'log';
  source: 'auto' | 'manual';
}

export function useDefense() {
  const { baseUrl } = useApparatus();
  const [rules, setRules] = useState<SentinelRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/sentinel/rules`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (e) {
      console.error('Failed to fetch rules', e);
    }
  }, [baseUrl]);

  const addRule = useCallback(async (pattern: string, action: 'block' | 'log') => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      await fetch(`${baseUrl}/sentinel/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, action })
      });
      await fetchRules();
    } catch (e) {
      console.error('Failed to add rule', e);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, fetchRules]);

  const deleteRule = useCallback(async (id: string) => {
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/sentinel/rules?id=${id}`, {
        method: 'DELETE'
      });
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error('Failed to delete rule', e);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    addRule,
    deleteRule,
    refresh: fetchRules,
    isLoading
  };
}
