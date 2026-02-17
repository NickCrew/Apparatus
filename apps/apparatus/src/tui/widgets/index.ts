/**
 * Widget Registry
 *
 * Central registry for all TUI widgets with factory functions
 * and type-safe widget creation.
 */

import { widgetRegistry } from '../core/widget.js';
import { createRPSGaugeWidget } from './rps-gauge-widget.js';
import { createSparklinesWidget } from './sparklines-widget.js';
import { createTrafficChartWidget } from './traffic-chart-widget.js';
import { createRedTeamWidget } from './redteam-widget.js';
import { createChaosWidget } from './chaos-widget.js';
import { createGhostWidget } from './ghost-widget.js';
import { createNetDiagWidget } from './netdiag-widget.js';
import { createClusterWidget } from './cluster-widget.js';
import { createSysInfoWidget } from './sysinfo-widget.js';
import { createKVWidget } from './kv-widget.js';
import { createWebhookWidget } from './webhook-widget.js';
import { createPcapWidget } from './pcap-widget.js';
import { createHarWidget } from './har-widget.js';
import { createJwtWidget } from './jwt-widget.js';
import { createOidcWidget } from './oidc-widget.js';

// Re-export core widget types
export { widgetRegistry } from '../core/widget.js';
export type { Widget, WidgetConfig, WidgetFactory } from '../core/widget.js';

// Re-export widgets
export { RPSGaugeWidget, createRPSGaugeWidget } from './rps-gauge-widget.js';
export { SparklinesWidget, createSparklinesWidget } from './sparklines-widget.js';
export { TrafficChartWidget, createTrafficChartWidget } from './traffic-chart-widget.js';
export { RedTeamWidget, createRedTeamWidget } from './redteam-widget.js';
export { ChaosWidget, createChaosWidget } from './chaos-widget.js';
export { GhostWidget, createGhostWidget } from './ghost-widget.js';
export { NetDiagWidget, createNetDiagWidget } from './netdiag-widget.js';
export { ClusterWidget, createClusterWidget } from './cluster-widget.js';
export { SysInfoWidget, createSysInfoWidget } from './sysinfo-widget.js';
export { KVWidget, createKVWidget } from './kv-widget.js';
export { WebhookWidget, createWebhookWidget } from './webhook-widget.js';
export { PcapWidget, createPcapWidget } from './pcap-widget.js';
export { HarWidget, createHarWidget } from './har-widget.js';
export { JwtWidget, createJwtWidget } from './jwt-widget.js';
export { OidcWidget, createOidcWidget } from './oidc-widget.js';

/**
 * Widget type constants
 */
export const WIDGET_TYPES = {
  // Core widgets (from MVP)
  HEADER: 'header',
  HEALTH: 'health',
  TOTALS: 'totals',
  DECEPTION: 'deception',
  TARPIT: 'tarpit',
  SIGNALS: 'signals',
  INFO: 'info',
  REQUESTS: 'requests',

  // Traffic widgets (Workstream 1)
  RPS_GAUGE: 'rps-gauge',
  SPARKLINES: 'sparklines',
  TRAFFIC_CHART: 'traffic-chart',

  // Testing widgets (Workstream 2)
  REDTEAM: 'redteam',
  CHAOS: 'chaos',
  GHOST: 'ghost',
  NETDIAG: 'netdiag',

  // Defense widgets (Workstream 3)
  SENTINEL: 'sentinel',
  MTD: 'mtd',
  DLP: 'dlp',

  // System widgets (Workstream 4)
  CLUSTER: 'cluster',
  SYSINFO: 'sysinfo',
  KV_STORE: 'kv-store',
  WEBHOOKS: 'webhooks',

  // Forensics widgets (Workstream 5)
  PCAP: 'pcap',
  HAR: 'har',
  JWT: 'jwt',
  OIDC: 'oidc',
} as const;

export type WidgetType = (typeof WIDGET_TYPES)[keyof typeof WIDGET_TYPES];

/**
 * Initialize all widget factories
 * This is called during dashboard startup to register all widgets
 */
export function initializeWidgets(): void {
  // Traffic Visualization Widgets (Workstream 1)
  widgetRegistry.register(WIDGET_TYPES.RPS_GAUGE, createRPSGaugeWidget);
  widgetRegistry.register(WIDGET_TYPES.SPARKLINES, createSparklinesWidget);
  widgetRegistry.register(WIDGET_TYPES.TRAFFIC_CHART, createTrafficChartWidget);

  // Testing & Control Widgets (Workstream 2)
  widgetRegistry.register(WIDGET_TYPES.REDTEAM, createRedTeamWidget);
  widgetRegistry.register(WIDGET_TYPES.CHAOS, createChaosWidget);
  widgetRegistry.register(WIDGET_TYPES.GHOST, createGhostWidget);
  widgetRegistry.register(WIDGET_TYPES.NETDIAG, createNetDiagWidget);

  // System & Cluster Widgets (Workstream 4)
  widgetRegistry.register(WIDGET_TYPES.CLUSTER, createClusterWidget);
  widgetRegistry.register(WIDGET_TYPES.SYSINFO, createSysInfoWidget);
  widgetRegistry.register(WIDGET_TYPES.KV_STORE, createKVWidget);
  widgetRegistry.register(WIDGET_TYPES.WEBHOOKS, createWebhookWidget);

  // Forensics & Identity Widgets (Workstream 5)
  widgetRegistry.register(WIDGET_TYPES.PCAP, createPcapWidget);
  widgetRegistry.register(WIDGET_TYPES.HAR, createHarWidget);
  widgetRegistry.register(WIDGET_TYPES.JWT, createJwtWidget);
  widgetRegistry.register(WIDGET_TYPES.OIDC, createOidcWidget);

  // Additional widgets will be registered here as they are implemented
}

/**
 * Check if all required widgets are registered
 */
export function validateWidgetRegistry(requiredTypes: WidgetType[]): string[] {
  const missing: string[] = [];
  for (const type of requiredTypes) {
    if (!widgetRegistry.has(type)) {
      missing.push(type);
    }
  }
  return missing;
}

/**
 * Get registered widget count
 */
export function getRegisteredWidgetCount(): number {
  return widgetRegistry.types().length;
}
