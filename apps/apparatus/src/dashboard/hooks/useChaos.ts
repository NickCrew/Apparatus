import { useState, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export function useChaos() {
  const { baseUrl } = useApparatus();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const triggerCpuSpike = useCallback(async (duration: number) => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/chaos/cpu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration })
      });
      
      if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      setResult(text);
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const triggerMemorySpike = useCallback(async (amountMb: number, action: 'allocate' | 'clear' = 'allocate') => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/chaos/memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountMb, action })
      });

      if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      setResult(text);
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const triggerCrash = useCallback(async () => {
    if (!baseUrl) return;
    if (!confirm('Are you sure you want to CRASH the backend?')) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/chaos/crash`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setResult('Server crashing...');
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setIsLoading(false);
    }
  }, [baseUrl]);

  return {
    triggerCpuSpike,
    triggerMemorySpike,
    triggerCrash,
    isLoading,
    result
  };
}
