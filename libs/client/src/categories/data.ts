/**
 * Data API
 * Generate, sink, and DLP scanning endpoints
 */

import type { HttpClient } from '../http.js';
import type {
  GenerateRequest,
  SinkResponse,
  DlpScanRequest,
  DlpScanResponse,
} from '../types.js';

export class DataApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Generate random data
   * POST /generate
   */
  async generate(request: GenerateRequest): Promise<unknown> {
    const responseType = request.type === 'binary' ? 'arrayBuffer' :
                         request.type === 'json' ? 'json' : 'text';

    return this.http.post<unknown>('/generate', request, { responseType });
  }

  /**
   * Generate JSON data
   */
  async generateJson(count = 10, schema?: Record<string, unknown>): Promise<unknown[]> {
    const result = await this.generate({ type: 'json', count, schema });
    return result as unknown[];
  }

  /**
   * Generate CSV data
   */
  async generateCsv(count = 10): Promise<string> {
    const result = await this.generate({ type: 'csv', count });
    return result as string;
  }

  /**
   * Generate XML data
   */
  async generateXml(count = 10): Promise<string> {
    const result = await this.generate({ type: 'xml', count });
    return result as string;
  }

  /**
   * Generate binary data
   */
  async generateBinary(size = 1024): Promise<ArrayBuffer> {
    const result = await this.generate({ type: 'binary', size });
    return result as ArrayBuffer;
  }

  /**
   * Data sink - accepts any data
   * POST /sink
   */
  async sink(data: unknown): Promise<SinkResponse> {
    return this.http.post<SinkResponse>('/sink', data);
  }

  /**
   * Upload file to sink
   */
  async upload(content: string | Blob, contentType = 'application/octet-stream'): Promise<SinkResponse> {
    return this.http.post<SinkResponse>('/sink', content, {
      headers: { 'Content-Type': contentType },
    });
  }

  /**
   * DLP (Data Loss Prevention) scan
   * POST /dlp
   */
  async dlpScan(request: DlpScanRequest): Promise<DlpScanResponse> {
    return this.http.post<DlpScanResponse>('/dlp', request);
  }

  /**
   * Quick DLP scan for common sensitive data patterns
   */
  async scanForSensitiveData(content: string): Promise<DlpScanResponse> {
    return this.dlpScan({ content });
  }

  /**
   * Scan for specific types of sensitive data
   */
  async scanForTypes(content: string, types: string[]): Promise<DlpScanResponse> {
    return this.dlpScan({ content, rules: types });
  }

  /**
   * Check if content contains sensitive data
   */
  async containsSensitiveData(content: string): Promise<boolean> {
    const result = await this.scanForSensitiveData(content);
    return result.matches.length > 0;
  }
}
