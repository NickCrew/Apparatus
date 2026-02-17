/**
 * Sparklines Widget
 *
 * Displays historical trends for RPS, blocks, and latency
 * using blessed-contrib sparkline charts
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { BaseWidget, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { MetricsBuffer } from '../state/metrics-buffer.js';

export interface SparklinesOptions {
  id: string;
  config: WidgetConfig;
  metrics?: string[];
  timeWindow?: number;
}

/**
 * Sparklines Widget showing multiple metric trends
 */
export class SparklinesWidget extends BaseWidget<DashboardState> {
  private sparkline: contrib.Widgets.SparklineElement;
  private readonly buffers: Map<string, MetricsBuffer> = new Map();
  private readonly metrics: string[];
  private lastRequestCount = 0;
  private lastDeceptionCount = 0;
  private lastUpdateTime = Date.now();

  readonly element: blessed.Widgets.BoxElement;

  constructor(options: SparklinesOptions) {
    super({
      id: options.id,
      config: options.config,
      subscriptions: ['requestCount', 'deceptionCount', 'health'],
    });

    this.metrics = options.metrics ?? ['RPS', 'Blocks', 'Latency'];

    // Initialize metric buffers
    const bufferSize = Math.min(50, options.timeWindow ?? 50);
    for (const metric of this.metrics) {
      this.buffers.set(metric, new MetricsBuffer({ maxSize: bufferSize }));
    }

    // Create the sparkline element
    // Note: blessed-contrib types are incomplete, using type casts through unknown
    this.sparkline = contrib.sparkline({
      label: options.config.label ?? ' Traffic Trends ',
      tags: true,
      border: {
        type: 'line',
        fg: options.config.style?.border?.fg ?? 'cyan',
      } as unknown as blessed.Widgets.Border,
      style: {
        fg: 'green',
        bg: options.config.style?.bg,
      } as unknown as Record<string, unknown>,
    } as contrib.Widgets.SparklineOptions);

    this.element = this.sparkline as unknown as blessed.Widgets.BoxElement;
  }

  render(state: DashboardState): void {
    if (!this.mounted) return;

    // Calculate current metrics
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000;

    // Calculate RPS
    let rps = 0;
    if (timeDelta > 0) {
      const requestDelta = state.requestCount - this.lastRequestCount;
      rps = requestDelta / timeDelta;
    }

    // Calculate blocks per second (deception events)
    let blocks = 0;
    if (timeDelta > 0) {
      const deceptionDelta = state.deceptionCount - this.lastDeceptionCount;
      blocks = deceptionDelta / timeDelta;
    }

    // Get latency from health
    const latency = state.health?.lag_ms ?? 0;

    // Update buffers
    this.buffers.get('RPS')?.add(rps);
    this.buffers.get('Blocks')?.add(blocks);
    this.buffers.get('Latency')?.add(latency);

    // Update last values
    this.lastRequestCount = state.requestCount;
    this.lastDeceptionCount = state.deceptionCount;
    this.lastUpdateTime = now;

    // Get the first metric for display (typically RPS)
    const primaryMetric = this.buffers.get(this.metrics[0]);
    if (primaryMetric) {
      const data = primaryMetric.getValues();
      this.sparkline.setData(
        [this.metrics[0]],
        [data.length > 0 ? data : [0]]
      );
    }

    this.requestRender();
  }

  /**
   * Get values for a specific metric
   */
  getMetricValues(metric: string): number[] {
    return this.buffers.get(metric)?.getValues() ?? [];
  }

  /**
   * Get latest value for a metric
   */
  getLatestValue(metric: string): number {
    return this.buffers.get(metric)?.getLatest() ?? 0;
  }

  /**
   * Get average value for a metric
   */
  getAverageValue(metric: string): number {
    return this.buffers.get(metric)?.getAverage() ?? 0;
  }

  /**
   * Clear all metric buffers
   */
  clear(): void {
    this.buffers.forEach((buffer) => buffer.clear());
    this.lastRequestCount = 0;
    this.lastDeceptionCount = 0;
    this.lastUpdateTime = Date.now();
  }

  protected onUnmount(): void {
    this.clear();
  }
}

/**
 * Create sparklines widget
 */
export function createSparklinesWidget(
  id: string,
  config: WidgetConfig,
  options?: { metrics?: string[]; timeWindow?: number }
): SparklinesWidget {
  return new SparklinesWidget({
    id,
    config,
    metrics: options?.metrics,
    timeWindow: options?.timeWindow,
  });
}
