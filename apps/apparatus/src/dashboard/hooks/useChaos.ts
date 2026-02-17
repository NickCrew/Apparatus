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
      // ApparatusClient doesn't have chaos methods typed yet, using raw fetch for now
      // or extending client if possible. Let's use fetch relative to baseUrl for now.
      const res = await fetch(`${baseUrl}/chaos/cpu?duration=${duration}`);
      const text = await res.text();
      setResult(text);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const triggerMemorySpike = useCallback(async (amountMb: number, action: 'allocate' | 'clear' = 'allocate') => {
    if (!baseUrl) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/chaos/memory?amount=${amountMb}&action=${action}`);
      const text = await res.text();
      setResult(text);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const triggerCrash = useCallback(async () => {
    if (!baseUrl) return;
    if (!confirm('Are you sure you want to CRASH the backend?')) return;
    
    try {
      await fetch(`${baseUrl}/chaos/crash`, { method: 'POST' });
      setResult('Server crashing...');
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
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
