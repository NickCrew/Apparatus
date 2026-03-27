import { ApparatusClient } from '@atlascrew/apparatus-sdk';
import { useApparatus } from '../providers/ApparatusProvider';

/**
 * Returns the Apparatus client instance from context.
 *
 * @returns Client instance or null if baseUrl not configured
 * @throws Error if used outside ApparatusProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useClient();
 *
 *   if (!client) {
 *     return <div>Configure server URL first</div>;
 *   }
 *
 *   // Use client...
 * }
 * ```
 */
export function useClient(): ApparatusClient | null {
  const { client } = useApparatus();
  return client;
}
