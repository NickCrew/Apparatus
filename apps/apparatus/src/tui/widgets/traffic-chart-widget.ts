/**
 * Traffic Chart Widget
 *
 * Displays traffic volume over time using a blessed-contrib line chart
 * with multiple data series and auto-scaling Y-axis
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { BaseWidget, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { MetricsBuffer } from '../state/metrics-buffer.js';

export interface TrafficChartOptions {
  id: string;
  config: WidgetConfig;
  series?: Array<{
    name: string;
    color: string;
  }>;
  maxDataPoints?: number;
}

/**
 * Traffic Chart Widget showing traffic volume trends
 */
export class TrafficChartWidget extends BaseWidget<DashboardState> {
  private chart: contrib.Widgets.LineElement;
  private readonly buffers: Map<string, MetricsBuffer> = new Map();
  private readonly series: Array<{ name: string; color: string }>;
  private readonly maxDataPoints: number;
  private lastRequestCount = 0;
  private lastDeceptionCount = 0;
  private lastUpdateTime = Date.now();

  readonly element: blessed.Widgets.BoxElement;

  constructor(options: TrafficChartOptions) {
    super({
      id: options.id,
      config: options.config,
      subscriptions: ['requestCount', 'deceptionCount'],
    });

    this.series = options.series ?? [
      { name: 'Requests', color: 'green' },
      { name: 'Blocks', color: 'red' },
    ];

    this.maxDataPoints = options.maxDataPoints ?? 30;

    // Initialize metric buffers
    for (const s of this.series) {
      this.buffers.set(s.name, new MetricsBuffer({ maxSize: this.maxDataPoints }));
    }

    // Create the line chart
    // Note: blessed-contrib types are incomplete, using type casts through unknown
    this.chart = contrib.line({
      label: options.config.label ?? ' Traffic Volume ',
      showNthLabel: 5,
      showLegend: true,
      legend: { width: 12 },
      border: {
        type: 'line',
        fg: options.config.style?.border?.fg ?? 'cyan',
      } as unknown as blessed.Widgets.Border,
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black',
      } as unknown as Record<string, unknown>,
      xLabelPadding: 3,
      xPadding: 5,
      wholeNumbersOnly: false,
    } as unknown as contrib.Widgets.LineOptions);

    this.element = this.chart as unknown as blessed.Widgets.BoxElement;
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

    // Calculate blocks per second
    let blocks = 0;
    if (timeDelta > 0) {
      const deceptionDelta = state.deceptionCount - this.lastDeceptionCount;
      blocks = deceptionDelta / timeDelta;
    }

    // Update buffers
    this.buffers.get('Requests')?.add(rps);
    this.buffers.get('Blocks')?.add(blocks);

    // Update last values
    this.lastRequestCount = state.requestCount;
    this.lastDeceptionCount = state.deceptionCount;
    this.lastUpdateTime = now;

    // Prepare chart data
    const seriesData = this.series.map((s) => {
      const buffer = this.buffers.get(s.name);
      const values = buffer?.getValues() ?? [];

      return {
        title: s.name,
        x: values.map((_, i) => String(i)),
        y: values.length > 0 ? values : [0],
        style: {
          line: s.color,
        },
      };
    });

    // Calculate auto-scaled Y-axis range
    const allValues = seriesData.flatMap((s) => s.y);
    const maxY = Math.max(...allValues, 1);
    const minY = Math.min(...allValues, 0);

    // Set chart data
    this.chart.setData(seriesData);

    this.requestRender();
  }

  /**
   * Get values for a specific series
   */
  getSeriesValues(seriesName: string): number[] {
    return this.buffers.get(seriesName)?.getValues() ?? [];
  }

  /**
   * Get latest value for a series
   */
  getLatestValue(seriesName: string): number {
    return this.buffers.get(seriesName)?.getLatest() ?? 0;
  }

  /**
   * Get average value for a series
   */
  getAverageValue(seriesName: string): number {
    return this.buffers.get(seriesName)?.getAverage() ?? 0;
  }

  /**
   * Get maximum value for a series
   */
  getMaxValue(seriesName: string): number {
    return this.buffers.get(seriesName)?.getMax() ?? 0;
  }

  /**
   * Clear all series buffers
   */
  clear(): void {
    this.buffers.forEach((buffer) => buffer.clear());
    this.lastRequestCount = 0;
    this.lastDeceptionCount = 0;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Add a new data series
   */
  addSeries(name: string, color: string): void {
    this.series.push({ name, color });
    this.buffers.set(name, new MetricsBuffer({ maxSize: this.maxDataPoints }));
  }

  /**
   * Remove a data series
   */
  removeSeries(name: string): void {
    const index = this.series.findIndex((s) => s.name === name);
    if (index !== -1) {
      this.series.splice(index, 1);
      this.buffers.delete(name);
    }
  }

  protected onUnmount(): void {
    this.clear();
  }
}

/**
 * Create traffic chart widget
 */
export function createTrafficChartWidget(
  id: string,
  config: WidgetConfig,
  options?: {
    series?: Array<{ name: string; color: string }>;
    maxDataPoints?: number;
  }
): TrafficChartWidget {
  return new TrafficChartWidget({
    id,
    config,
    series: options?.series,
    maxDataPoints: options?.maxDataPoints,
  });
}
