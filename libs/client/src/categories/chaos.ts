/**
 * Chaos API
 * CPU spike, memory spike, crash, and EICAR endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  CpuSpikeRequest,
  CpuSpikeResponse,
  MemorySpikeRequest,
  MemorySpikeResponse,
  MemoryClearResponse,
  CrashResponse,
  EicarResponse,
} from '../types.js';

export class ChaosApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Trigger CPU spike
   * GET /chaos/cpu?duration=<ms>
   */
  async cpuSpike(options?: CpuSpikeRequest): Promise<CpuSpikeResponse> {
    const params = new URLSearchParams();
    if (options?.duration !== undefined) {
      params.set('duration', String(options.duration));
    }
    if (options?.intensity !== undefined) {
      params.set('intensity', String(options.intensity));
    }

    const query = params.toString();
    return this.http.get<CpuSpikeResponse>(`/chaos/cpu${query ? `?${query}` : ''}`);
  }

  /**
   * Trigger memory spike
   * GET /chaos/memory?size=<bytes>&duration=<ms>
   */
  async memorySpike(options?: MemorySpikeRequest): Promise<MemorySpikeResponse> {
    const params = new URLSearchParams();
    if (options?.size !== undefined) {
      params.set('size', String(options.size));
    }
    if (options?.duration !== undefined) {
      params.set('duration', String(options.duration));
    }

    const query = params.toString();
    return this.http.get<MemorySpikeResponse>(`/chaos/memory${query ? `?${query}` : ''}`);
  }

  /**
   * Clear allocated memory
   * GET /chaos/memory?action=clear
   */
  async memoryClear(): Promise<MemoryClearResponse> {
    return this.http.get<MemoryClearResponse>('/chaos/memory?action=clear');
  }

  /**
   * Trigger server crash
   * POST /chaos/crash
   */
  async crash(): Promise<CrashResponse> {
    return this.http.post<CrashResponse>('/chaos/crash');
  }

  /**
   * Get EICAR test file (antivirus test)
   * GET /malicious/eicar
   */
  async eicar(): Promise<EicarResponse> {
    return this.http.get<EicarResponse>('/malicious/eicar');
  }

  /**
   * Stress test with CPU spike for specified duration
   */
  async stressCpu(durationMs: number): Promise<CpuSpikeResponse> {
    return this.cpuSpike({ duration: durationMs });
  }

  /**
   * Stress test with memory allocation
   */
  async stressMemory(sizeBytes: number, durationMs?: number): Promise<MemorySpikeResponse> {
    return this.memorySpike({ size: sizeBytes, duration: durationMs });
  }

  /**
   * Run a quick chaos test (5 second CPU spike)
   */
  async quickTest(): Promise<CpuSpikeResponse> {
    return this.cpuSpike({ duration: 5000 });
  }
}
