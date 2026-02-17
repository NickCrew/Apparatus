/**
 * Forensics API
 * PCAP capture and HAR replay endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  PcapOptions,
  HarReplayRequest,
  HarReplayResponse,
} from '../types.js';

export class ForensicsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Capture network traffic as PCAP
   * GET /capture.pcap
   */
  async pcap(options?: PcapOptions): Promise<ArrayBuffer> {
    const params = new URLSearchParams();
    if (options?.duration !== undefined) {
      params.set('duration', String(options.duration));
    }
    if (options?.filter !== undefined) {
      params.set('filter', options.filter);
    }
    if (options?.maxPackets !== undefined) {
      params.set('maxPackets', String(options.maxPackets));
    }

    const query = params.toString();
    return this.http.get<ArrayBuffer>(
      `/capture.pcap${query ? `?${query}` : ''}`,
      { responseType: 'arrayBuffer' }
    );
  }

  /**
   * Download PCAP file
   */
  async downloadPcap(options?: PcapOptions): Promise<Blob> {
    const buffer = await this.pcap(options);
    return new Blob([buffer], { type: 'application/vnd.tcpdump.pcap' });
  }

  /**
   * Capture traffic for specified duration
   */
  async captureDuration(durationMs: number): Promise<ArrayBuffer> {
    return this.pcap({ duration: durationMs });
  }

  /**
   * Capture traffic with BPF filter
   */
  async captureFiltered(filter: string, durationMs?: number): Promise<ArrayBuffer> {
    return this.pcap({ filter, duration: durationMs });
  }

  /**
   * Replay HAR file
   * POST /replay
   */
  async replay(request: HarReplayRequest): Promise<HarReplayResponse> {
    return this.http.post<HarReplayResponse>('/replay', request);
  }

  /**
   * Replay HAR content
   */
  async replayHar(har: unknown, baseUrl?: string): Promise<HarReplayResponse> {
    return this.replay({ har, baseUrl });
  }

  /**
   * Replay HAR with delay between requests
   */
  async replayWithDelay(har: unknown, delayMs: number, baseUrl?: string): Promise<HarReplayResponse> {
    return this.replay({ har, baseUrl, delay: delayMs });
  }

  /**
   * Replay HAR to a different base URL
   */
  async replayToTarget(har: unknown, targetBaseUrl: string): Promise<HarReplayResponse> {
    return this.replay({ har, baseUrl: targetBaseUrl });
  }
}
