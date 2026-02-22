import { useState, useCallback } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface LabToolOption {
  name: string;
  path: string;
}

export function useLabTools() {
  const { baseUrl } = useApparatus();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const listK6Scenarios = useCallback(async (): Promise<LabToolOption[]> => {
    try {
      const res = await fetch(`${baseUrl}/api/lab/k6/scenarios`);
      const data = await res.json();
      return data.scenarios || [];
    } catch (err) {
      console.error('Failed to list k6 scenarios:', err);
      return [];
    }
  }, [baseUrl]);

  const listNucleiTemplates = useCallback(async (): Promise<LabToolOption[]> => {
    try {
      const res = await fetch(`${baseUrl}/api/lab/nuclei/templates`);
      const data = await res.json();
      return data.templates || [];
    } catch (err) {
      console.error('Failed to list nuclei templates:', err);
      return [];
    }
  }, [baseUrl]);

  const runK6 = useCallback(async (params: { script: string; vus: number; duration: string; target: string }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${baseUrl}/scenarios/k6-run/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'k6-run',
          name: 'K6 Load Test',
          steps: [
            { id: '1', action: 'k6.run', params }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to start k6 run');
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  const runNuclei = useCallback(async (params: { template: string; target: string }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      // We use the scenario engine to run the tool
      const res = await fetch(`${baseUrl}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Nuclei Scan',
          steps: [
            { id: '1', action: 'nuclei.run', params }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to create nuclei scenario');
      const scenario = await res.json();
      
      const runRes = await fetch(`${baseUrl}/scenarios/${scenario.id}/run`, { method: 'POST' });
      const data = await runRes.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

  return {
    listK6Scenarios,
    listNucleiTemplates,
    runK6,
    runNuclei,
    isLoading,
    result,
    error
  };
}
