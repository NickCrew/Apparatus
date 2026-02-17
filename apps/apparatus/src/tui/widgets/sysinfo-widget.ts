/**
 * System Info Widget
 *
 * Displays memory usage, CPU usage, environment variables, and network interfaces.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface SystemInfo {
  memory: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage: number; // Percentage
  };
  environment: Record<string, string>;
  network: Array<{
    name: string;
    address: string;
    family: string;
    internal: boolean;
  }>;
  uptime: number; // Seconds
  platform: string;
  nodeVersion: string;
}

/**
 * System Info Widget
 */
export class SysInfoWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private systemData: SystemInfo | null = null;
  private envExpanded = false;

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' System Information ',
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.accent },
      },
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.accent },
      },
    });
  }

  protected onMount(): void {
    // Fetch system data on mount
    this.fetchSystemData();
  }

  render(state: DashboardState): void {
    if (!this.systemData) {
      this.element.setContent('\n  {gray-fg}Loading system data...{/gray-fg}');
      this.requestRender();
      return;
    }

    const lines: string[] = [];
    const sys = this.systemData;

    // Platform info
    lines.push(`{bold}Platform:{/bold} ${sys.platform}`);
    lines.push(`{bold}Node Version:{/bold} ${sys.nodeVersion}`);
    lines.push(`{bold}Uptime:{/bold} ${this.formatUptime(sys.uptime)}`);
    lines.push('');

    // Memory
    const memBar = this.createProgressBar(sys.memory.percentUsed, 30);
    const memColor = this.getUsageColor(sys.memory.percentUsed);
    lines.push(`{bold}Memory:{/bold} {${memColor}}${sys.memory.percentUsed.toFixed(1)}%{/${memColor}}`);
    lines.push(`  ${memBar}`);
    lines.push(`  ${this.formatBytes(sys.memory.used)} / ${this.formatBytes(sys.memory.total)} (${this.formatBytes(sys.memory.free)} free)`);
    lines.push('');

    // CPU
    const cpuBar = this.createProgressBar(sys.cpu.usage, 30);
    const cpuColor = this.getUsageColor(sys.cpu.usage);
    lines.push(`{bold}CPU:{/bold} {${cpuColor}}${sys.cpu.usage.toFixed(1)}%{/${cpuColor}}`);
    lines.push(`  ${cpuBar}`);
    lines.push(`  ${sys.cpu.model} (${sys.cpu.cores} cores)`);
    lines.push('');

    // Network interfaces
    lines.push(`{bold}Network Interfaces:{/bold}`);
    const externalIfaces = sys.network.filter((iface) => !iface.internal);
    if (externalIfaces.length === 0) {
      lines.push('  {gray-fg}No external interfaces{/gray-fg}');
    } else {
      for (const iface of externalIfaces) {
        lines.push(`  {cyan-fg}${iface.name}{/cyan-fg}: ${iface.address} (${iface.family})`);
      }
    }
    lines.push('');

    // Environment variables (collapsed by default)
    const envCount = Object.keys(sys.environment).length;
    lines.push(`{bold}Environment Variables:{/bold} (${envCount}) ${this.envExpanded ? '{yellow-fg}[EXPANDED]{/yellow-fg}' : '{gray-fg}[COLLAPSED]{/gray-fg}'}`);
    if (this.envExpanded) {
      const envEntries = Object.entries(sys.environment).sort(([a], [b]) => a.localeCompare(b));
      for (const [key, value] of envEntries) {
        lines.push(`  {cyan-fg}${key}{/cyan-fg} = ${value}`);
      }
    } else {
      lines.push('  {gray-fg}Press e to expand{/gray-fg}');
    }

    lines.push('');
    lines.push('{gray-fg}Press r to refresh, e to toggle environment{/gray-fg}');

    this.element.setContent(lines.join('\n'));
    this.requestRender();
  }

  handleKey(key: string): boolean {
    if (key === 'r') {
      this.fetchSystemData();
      return true;
    }
    if (key === 'e') {
      this.envExpanded = !this.envExpanded;
      this.render(this.getState()!);
      return true;
    }
    return false;
  }

  private async fetchSystemData(): Promise<void> {
    try {
      // Mock data for now - will be replaced with real API call
      this.systemData = {
        memory: {
          total: 16 * 1024 * 1024 * 1024, // 16GB
          free: 4 * 1024 * 1024 * 1024, // 4GB
          used: 12 * 1024 * 1024 * 1024, // 12GB
          percentUsed: 75,
        },
        cpu: {
          model: 'Intel Core i7-9750H',
          cores: 12,
          usage: 32.5,
        },
        environment: {
          NODE_ENV: 'production',
          PORT_HTTP1: '8080',
          PORT_HTTP2: '8443',
          RISK_SERVER_URL: 'http://localhost:4100',
          SENSOR_ID: 'apparatus-prod-1',
          LOG_LEVEL: 'info',
          H2C: 'false',
          CORS: 'true',
        },
        network: [
          { name: 'eth0', address: '10.0.1.5', family: 'IPv4', internal: false },
          { name: 'eth0', address: 'fe80::1', family: 'IPv6', internal: false },
          { name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true },
        ],
        uptime: 345678, // ~4 days
        platform: 'linux',
        nodeVersion: 'v20.11.0',
      };

      this.render(this.getState()!);
    } catch (error) {
      this.element.setContent(`\n  {red-fg}Error loading system data:{/red-fg}\n  ${error instanceof Error ? error.message : String(error)}`);
      this.requestRender();
    }
  }

  private createProgressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const color = this.getUsageColor(percent);
    return `{${color}}${'█'.repeat(filled)}{/${color}}${'░'.repeat(empty)}`;
  }

  private getUsageColor(percent: number): string {
    if (percent >= 90) return 'red-fg';
    if (percent >= 75) return 'yellow-fg';
    return 'green-fg';
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  }
}

/**
 * Factory function for widget registry
 */
export function createSysInfoWidget(id: string, config: WidgetConfig): SysInfoWidget {
  return new SysInfoWidget(id, config);
}
