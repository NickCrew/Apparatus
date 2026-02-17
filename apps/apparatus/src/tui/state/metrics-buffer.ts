/**
 * Metrics Buffer for TUI Dashboard
 *
 * Ring buffer for storing historical metric data points
 * for sparklines and trend charts.
 */

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface MetricsSnapshot {
  rps: number;
  blocks: number;
  latencyMs: number;
  errorRate: number;
}

/**
 * Ring buffer for time-series metrics data
 */
export class MetricsBuffer {
  private buffer: MetricDataPoint[] = [];
  private readonly maxSize: number;
  private readonly retentionMs: number;

  constructor(options?: { maxSize?: number; retentionMs?: number }) {
    this.maxSize = options?.maxSize ?? 100;
    this.retentionMs = options?.retentionMs ?? 60000; // 1 minute default
  }

  /**
   * Add a data point to the buffer
   */
  add(value: number, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    this.buffer.push({ timestamp: ts, value });

    // Trim to max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }

    // Remove expired entries
    this.pruneExpired();
  }

  /**
   * Get all data points in the buffer
   */
  getAll(): MetricDataPoint[] {
    this.pruneExpired();
    return [...this.buffer];
  }

  /**
   * Get values only (without timestamps)
   */
  getValues(): number[] {
    this.pruneExpired();
    return this.buffer.map((point) => point.value);
  }

  /**
   * Get the most recent N data points
   */
  getRecent(count: number): MetricDataPoint[] {
    this.pruneExpired();
    return this.buffer.slice(-count);
  }

  /**
   * Get the most recent value
   */
  getLatest(): number | null {
    if (this.buffer.length === 0) return null;
    return this.buffer[this.buffer.length - 1].value;
  }

  /**
   * Get average value over all data points
   */
  getAverage(): number {
    if (this.buffer.length === 0) return 0;
    const sum = this.buffer.reduce((acc, point) => acc + point.value, 0);
    return sum / this.buffer.length;
  }

  /**
   * Get maximum value in buffer
   */
  getMax(): number {
    if (this.buffer.length === 0) return 0;
    return Math.max(...this.buffer.map((p) => p.value));
  }

  /**
   * Get minimum value in buffer
   */
  getMin(): number {
    if (this.buffer.length === 0) return 0;
    return Math.min(...this.buffer.map((p) => p.value));
  }

  /**
   * Clear all data points
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Remove expired data points based on retention policy
   */
  private pruneExpired(): void {
    const cutoff = Date.now() - this.retentionMs;
    this.buffer = this.buffer.filter((point) => point.timestamp >= cutoff);
  }
}

/**
 * Multi-metric buffer for tracking multiple time series
 */
export class MultiMetricsBuffer {
  private buffers: Map<string, MetricsBuffer> = new Map();
  private readonly defaultOptions: { maxSize: number; retentionMs: number };

  constructor(options?: { maxSize?: number; retentionMs?: number }) {
    this.defaultOptions = {
      maxSize: options?.maxSize ?? 100,
      retentionMs: options?.retentionMs ?? 60000,
    };
  }

  /**
   * Get or create a buffer for a metric
   */
  private getOrCreateBuffer(metric: string): MetricsBuffer {
    if (!this.buffers.has(metric)) {
      this.buffers.set(metric, new MetricsBuffer(this.defaultOptions));
    }
    return this.buffers.get(metric)!;
  }

  /**
   * Add a data point to a specific metric
   */
  add(metric: string, value: number, timestamp?: number): void {
    this.getOrCreateBuffer(metric).add(value, timestamp);
  }

  /**
   * Add a complete metrics snapshot
   */
  addSnapshot(snapshot: MetricsSnapshot, timestamp?: number): void {
    const ts = timestamp ?? Date.now();
    this.add('rps', snapshot.rps, ts);
    this.add('blocks', snapshot.blocks, ts);
    this.add('latency', snapshot.latencyMs, ts);
    this.add('errorRate', snapshot.errorRate, ts);
  }

  /**
   * Get buffer for a specific metric
   */
  getBuffer(metric: string): MetricsBuffer {
    return this.getOrCreateBuffer(metric);
  }

  /**
   * Get values for a specific metric
   */
  getValues(metric: string): number[] {
    return this.getOrCreateBuffer(metric).getValues();
  }

  /**
   * Get latest value for a metric
   */
  getLatest(metric: string): number | null {
    return this.getOrCreateBuffer(metric).getLatest();
  }

  /**
   * Get all metric names
   */
  getMetrics(): string[] {
    return Array.from(this.buffers.keys());
  }

  /**
   * Clear all buffers
   */
  clear(): void {
    this.buffers.forEach((buffer) => buffer.clear());
  }

  /**
   * Clear a specific metric buffer
   */
  clearMetric(metric: string): void {
    this.buffers.get(metric)?.clear();
  }
}

/**
 * Calculate RPS from request count over time window
 */
export function calculateRPS(
  currentCount: number,
  previousCount: number,
  intervalMs: number
): number {
  const delta = currentCount - previousCount;
  const seconds = intervalMs / 1000;
  return delta / seconds;
}

/**
 * Calculate error rate percentage
 */
export function calculateErrorRate(errorCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return (errorCount / totalCount) * 100;
}
