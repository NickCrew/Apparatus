import { useApparatus } from '../providers/ApparatusProvider';

export interface HealthState {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'critical' | 'checking' | 'unknown';
  message?: string;
  latencyMs?: number;
  version?: string;
}

/**
 * Hook to access the health state from ApparatusProvider.
 * Health is automatically polled by the provider.
 *
 * @example
 * ```tsx
 * function HealthIndicator() {
 *   const health = useHealth();
 *
 *   return (
 *     <div>
 *       Status: {health.status}
 *       {health.latencyMs && <span>({health.latencyMs}ms)</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHealth(): HealthState {
  const { health } = useApparatus();
  return health;
}
