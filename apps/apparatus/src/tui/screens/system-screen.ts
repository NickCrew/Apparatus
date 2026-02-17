/**
 * System Screen
 *
 * Combines cluster topology, system info, KV store, and webhook inspector
 * widgets in a grid layout.
 */

import type { ScreenDefinition } from '../core/screen-manager.js';
import { createClusterWidget } from '../widgets/cluster-widget.js';
import { createSysInfoWidget } from '../widgets/sysinfo-widget.js';
import { createKVWidget } from '../widgets/kv-widget.js';
import { createWebhookWidget } from '../widgets/webhook-widget.js';

/**
 * Create System Screen
 *
 * Layout (12x12 grid):
 * ┌─────────────────────────────────────┐
 * │ Cluster (6 cols) │ SysInfo (6 cols) │
 * │                  │                  │
 * ├─────────────────────────────────────┤
 * │ KV Store (6 cols)│ Webhooks (6 cols)│
 * │                  │                  │
 * └─────────────────────────────────────┘
 */
export function createSystemScreen(): ScreenDefinition {
  // Create widget instances
  const clusterWidget = createClusterWidget('cluster-topology', {
    row: 1,
    col: 0,
    rowSpan: 6,
    colSpan: 6,
    label: 'Cluster Topology',
    style: {
      border: { fg: 'blue' },
      label: { fg: 'white' },
    },
  });

  const sysinfoWidget = createSysInfoWidget('system-info', {
    row: 1,
    col: 6,
    rowSpan: 6,
    colSpan: 6,
    label: 'System Information',
    style: {
      border: { fg: 'cyan' },
      label: { fg: 'white' },
    },
  });

  const kvWidget = createKVWidget('kv-store', {
    row: 7,
    col: 0,
    rowSpan: 5,
    colSpan: 6,
    label: 'KV Store',
    style: {
      border: { fg: 'green' },
      label: { fg: 'white' },
    },
  });

  const webhookWidget = createWebhookWidget('webhook-inspector', {
    row: 7,
    col: 6,
    rowSpan: 5,
    colSpan: 6,
    label: 'Webhook Inspector',
    style: {
      border: { fg: 'yellow' },
      label: { fg: 'white' },
    },
  });

  return {
    id: 'system',
    name: 'System',
    shortcut: '5',
    widgets: [
      { widget: clusterWidget, config: clusterWidget.config },
      { widget: sysinfoWidget, config: sysinfoWidget.config },
      { widget: kvWidget, config: kvWidget.config },
      { widget: webhookWidget, config: webhookWidget.config },
    ],
  };
}
