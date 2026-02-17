/**
 * Traffic Screen
 *
 * Combines RPS gauge, sparklines, and traffic chart widgets
 * into a unified traffic visualization dashboard
 */

import type { ScreenDefinition } from '../core/screen-manager.js';
import { createRPSGaugeWidget } from '../widgets/rps-gauge-widget.js';
import { createSparklinesWidget } from '../widgets/sparklines-widget.js';
import { createTrafficChartWidget } from '../widgets/traffic-chart-widget.js';

/**
 * Create the Traffic Screen definition
 */
export function createTrafficScreen(): ScreenDefinition {
  // Grid layout (12x12):
  // Row 0: Tab bar (handled by ScreenManager)
  // Rows 1-4: RPS Gauge (left) + Sparklines (right)
  // Rows 5-11: Traffic Chart (full width)

  const rpsGauge = createRPSGaugeWidget(
    'rps-gauge',
    {
      row: 1,
      col: 0,
      rowSpan: 4,
      colSpan: 6,
      label: 'Requests/Second',
      style: {
        border: { fg: 'green' },
        label: { fg: 'white' },
      },
    },
    {
      thresholds: {
        warning: 20,
        critical: 50,
      },
    }
  );

  const sparklines = createSparklinesWidget(
    'sparklines',
    {
      row: 1,
      col: 6,
      rowSpan: 4,
      colSpan: 6,
      label: 'Traffic Trends',
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'white' },
      },
    },
    {
      metrics: ['RPS', 'Blocks', 'Latency'],
      timeWindow: 50,
    }
  );

  const trafficChart = createTrafficChartWidget(
    'traffic-chart',
    {
      row: 5,
      col: 0,
      rowSpan: 7,
      colSpan: 12,
      label: 'Traffic Volume Over Time',
      style: {
        border: { fg: 'yellow' },
        label: { fg: 'white' },
      },
    },
    {
      series: [
        { name: 'Requests', color: 'green' },
        { name: 'Blocks', color: 'red' },
      ],
      maxDataPoints: 30,
    }
  );

  return {
    id: 'traffic',
    name: 'Traffic',
    shortcut: '2',
    widgets: [
      { widget: rpsGauge, config: rpsGauge.config },
      { widget: sparklines, config: sparklines.config },
      { widget: trafficChart, config: trafficChart.config },
    ],
  };
}
