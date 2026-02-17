/**
 * RPS Gauge Widget
 *
 * Displays requests per second using a blessed-contrib gauge
 * with color-coded thresholds (green/yellow/red)
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { BaseWidget, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';

export interface RPSGaugeOptions {
  id: string;
  config: WidgetConfig;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

/**
 * RPS Gauge Widget showing real-time requests per second
 */
export class RPSGaugeWidget extends BaseWidget<DashboardState> {
  private gauge: contrib.Widgets.GaugeElement;
  private readonly thresholds: { warning: number; critical: number };
  private rpsHistory: number[] = [];
  private lastRequestCount = 0;
  private lastUpdateTime = Date.now();

  readonly element: blessed.Widgets.BoxElement;

  constructor(options: RPSGaugeOptions) {
    super({
      id: options.id,
      config: options.config,
      subscriptions: ['requestCount'],
    });

    this.thresholds = options.thresholds ?? {
      warning: 20,
      critical: 50,
    };

    // Create the gauge element
    // Note: blessed-contrib types are incomplete, using type casts through unknown
    this.gauge = contrib.gauge({
      label: options.config.label ?? ' RPS ',
      stroke: 'green',
      fill: 'white',
      border: {
        type: 'line',
        fg: options.config.style?.border?.fg ?? 'cyan',
      } as unknown as blessed.Widgets.Border,
      style: {
        fg: options.config.style?.fg ?? 'white',
        bg: options.config.style?.bg,
      } as unknown as Record<string, unknown>,
      tags: true,
      showLabel: true,
    } as contrib.Widgets.GaugeOptions);

    this.element = this.gauge as unknown as blessed.Widgets.BoxElement;
  }

  render(state: DashboardState): void {
    if (!this.mounted) return;

    // Calculate RPS from request count delta
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000; // seconds
    const requestDelta = state.requestCount - this.lastRequestCount;

    let currentRPS = 0;
    if (timeDelta > 0 && requestDelta >= 0) {
      currentRPS = requestDelta / timeDelta;
    }

    // Update history
    this.rpsHistory.push(currentRPS);
    if (this.rpsHistory.length > 10) {
      this.rpsHistory.shift();
    }

    // Calculate smoothed RPS (average of last 3 samples)
    const recentSamples = this.rpsHistory.slice(-3);
    const smoothedRPS =
      recentSamples.reduce((sum, val) => sum + val, 0) / recentSamples.length;

    // Update last values
    this.lastRequestCount = state.requestCount;
    this.lastUpdateTime = now;

    // Determine color based on thresholds
    let stroke = 'green';
    if (smoothedRPS >= this.thresholds.critical) {
      stroke = 'red';
    } else if (smoothedRPS >= this.thresholds.warning) {
      stroke = 'yellow';
    }

    // Calculate percentage (0-100 based on critical threshold as max)
    const maxValue = this.thresholds.critical * 2; // Show up to 2x critical
    const percent = Math.min(100, (smoothedRPS / maxValue) * 100);

    // Update gauge - cast to any due to incomplete blessed-contrib types
    (this.gauge as unknown as { setData: (data: unknown) => void }).setData([
      {
        percent: Math.round(percent),
        stroke,
      },
    ]);

    // Update label with current RPS
    this.gauge.setLabel(` RPS: ${smoothedRPS.toFixed(1)} `);

    this.requestRender();
  }

  /**
   * Get current RPS value
   */
  getCurrentRPS(): number {
    if (this.rpsHistory.length === 0) return 0;
    const recent = this.rpsHistory.slice(-3);
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  }

  /**
   * Reset the gauge
   */
  reset(): void {
    this.rpsHistory = [];
    this.lastRequestCount = 0;
    this.lastUpdateTime = Date.now();
    (this.gauge as unknown as { setData: (data: unknown) => void }).setData([{ percent: 0, stroke: 'green' }]);
  }

  protected onUnmount(): void {
    this.reset();
  }
}

/**
 * Create RPS gauge widget
 */
export function createRPSGaugeWidget(
  id: string,
  config: WidgetConfig,
  options?: { thresholds?: { warning: number; critical: number } }
): RPSGaugeWidget {
  return new RPSGaugeWidget({
    id,
    config,
    thresholds: options?.thresholds,
  });
}
