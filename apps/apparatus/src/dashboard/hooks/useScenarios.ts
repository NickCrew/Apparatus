import { useState, useCallback, useEffect } from 'react';
import { useApparatus } from '../providers/ApparatusProvider';

export interface ScenarioStep {
    id: string;
    action: 'chaos.cpu' | 'chaos.memory' | 'cluster.attack' | 'mtd.rotate' | 'delay';
    params: any;
    delayMs?: number;
}

export interface Scenario {
    id: string;
    name: string;
    description?: string;
    steps: ScenarioStep[];
    createdAt: string;
}

export type ScenarioRunState = 'running' | 'completed' | 'failed';

export interface ScenarioRunStartResponse {
  status: 'started';
  executionId: string;
  message: string;
}

export interface ScenarioRunStatus {
  executionId: string;
  scenarioId: string;
  scenarioName: string;
  status: ScenarioRunState;
  startedAt: string;
  finishedAt?: string;
  currentStepId?: string;
  error?: string;
}

export function useScenarios() {
  const { baseUrl } = useApparatus();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScenarios = useCallback(async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}/scenarios`);
      if (res.ok) {
        const data = await res.json();
        setScenarios(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [baseUrl]);

  const saveScenario = useCallback(async (scenario: Partial<Scenario>) => {
    if (!baseUrl) {
      throw new Error('Scenario API base URL is unavailable.');
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });
      if (!res.ok) {
        throw new Error(`Failed to save scenario (${res.status})`);
      }
      const saved = (await res.json()) as Scenario;
      await fetchScenarios();
      return saved;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
        setIsLoading(false);
    }
  }, [baseUrl, fetchScenarios]);

  const runScenario = useCallback(async (id: string) => {
    if (!baseUrl) {
      throw new Error('Scenario API base URL is unavailable.');
    }
    const res = await fetch(`${baseUrl}/scenarios/${id}/run`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to run scenario (${res.status})`);
    }
    return (await res.json()) as ScenarioRunStartResponse;
  }, [baseUrl]);

  const getScenarioRunStatus = useCallback(
    async (scenarioId: string, executionId?: string) => {
      if (!baseUrl) {
        throw new Error('Scenario API base URL is unavailable.');
      }
      const query = executionId ? `?executionId=${encodeURIComponent(executionId)}` : '';
      const res = await fetch(`${baseUrl}/scenarios/${scenarioId}/status${query}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch scenario status (${res.status})`);
      }
      return (await res.json()) as ScenarioRunStatus;
    },
    [baseUrl]
  );

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  return {
    scenarios,
    saveScenario,
    runScenario,
    getScenarioRunStatus,
    isLoading
  };
}
