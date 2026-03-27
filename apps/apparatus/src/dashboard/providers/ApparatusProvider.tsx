import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { ApparatusClient } from '@atlascrew/apparatus-client';

interface HealthState {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'critical' | 'checking' | 'unknown';
  message?: string;
  latencyMs?: number;
  version?: string;
}

interface ApparatusContextValue {
  client: ApparatusClient | null;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  health: HealthState;
  isConnected: boolean;
  hasCompletedInitialHealthCheck: boolean;
}

const ApparatusContext = createContext<ApparatusContextValue | undefined>(undefined);

const STORAGE_KEY = 'apparatus-base-url';
const DEFAULT_URL = 'http://localhost:8090';

function getStoredUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

function saveUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // localStorage unavailable
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

interface ApparatusProviderProps {
  children: ReactNode;
  defaultUrl?: string;
}

export function ApparatusProvider({ children, defaultUrl }: ApparatusProviderProps) {
  const [baseUrl, setBaseUrlState] = useState<string>(() => defaultUrl ?? getStoredUrl());
  const [health, setHealth] = useState<HealthState>({ status: 'unknown' });
  const [hasCompletedInitialHealthCheck, setHasCompletedInitialHealthCheck] = useState(false);

  // Create client when baseUrl changes (with validation)
  const client = useMemo(() => {
    if (!baseUrl || !isValidUrl(baseUrl)) return null;
    return new ApparatusClient({ baseUrl });
  }, [baseUrl]);

  // Validated URL setter
  const setBaseUrl = useCallback((newUrl: string) => {
    if (!isValidUrl(newUrl)) {
      console.warn('Invalid URL rejected:', newUrl);
      return;
    }
    setBaseUrlState(newUrl);
    saveUrl(newUrl);
  }, []);

  // Health check with proper cleanup
  useEffect(() => {
    // Re-arm boot readiness whenever the client endpoint changes.
    setHasCompletedInitialHealthCheck(false);

    if (!client) {
      setHealth({ status: 'unknown', message: 'No client configured' });
      setHasCompletedInitialHealthCheck(true);
      return;
    }

    const abortController = new AbortController();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isInitialCheck = true; // Ensure readiness flips only once per effect lifecycle.

    const checkHealth = async () => {
      if (abortController.signal.aborted) return;

      setHealth((prev) => ({ ...prev, status: 'checking' }));
      const start = performance.now();

      try {
        const response = await client.core.health();
        if (abortController.signal.aborted) return;

        setHealth({
          status: 'healthy',
          message: 'Connected',
          latencyMs: Math.round(performance.now() - start),
          version: response.version,
        });
      } catch (error) {
        if (abortController.signal.aborted) return;
        setHealth({
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Connection failed',
        });
      } finally {
        if (!abortController.signal.aborted && isInitialCheck) {
          isInitialCheck = false;
          setHasCompletedInitialHealthCheck(true);
        }
      }
    };

    // Initial check
    checkHealth();

    // Poll every 30 seconds
    intervalId = setInterval(checkHealth, 30000);

    return () => {
      abortController.abort();
      if (intervalId) clearInterval(intervalId);
    };
  }, [client]);

  // Memoize context value
  const isConnected = health.status === 'healthy';
  const contextValue = useMemo<ApparatusContextValue>(
    () => ({
      client,
      baseUrl,
      setBaseUrl,
      health,
      isConnected,
      hasCompletedInitialHealthCheck,
    }),
    [client, baseUrl, setBaseUrl, health, isConnected, hasCompletedInitialHealthCheck]
  );

  return (
    <ApparatusContext.Provider value={contextValue}>
      {children}
    </ApparatusContext.Provider>
  );
}

/**
 * Hook to access Apparatus client context.
 * @throws Error if used outside of ApparatusProvider
 */
export function useApparatus(): ApparatusContextValue {
  const context = useContext(ApparatusContext);
  if (context === undefined) {
    throw new Error('useApparatus must be used within a ApparatusProvider');
  }
  return context;
}
