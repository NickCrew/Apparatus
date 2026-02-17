/**
 * Cluster Topology Widget
 *
 * Displays cluster member list, gossip status, and health indicators.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface ClusterMember {
  id: string;
  status: 'online' | 'offline' | 'degraded';
  role: string;
  address: string;
  lastSeen: string;
}

export interface ClusterStatus {
  leader: string | null;
  members: ClusterMember[];
  gossipEnabled: boolean;
  quorum: boolean;
}

/**
 * Cluster Topology Widget
 */
export class ClusterWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private clusterData: ClusterStatus | null = null;

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' Cluster Topology ',
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.primary },
      },
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.primary },
      },
    });
  }

  protected onMount(): void {
    // Fetch cluster data on mount
    this.fetchClusterData();
  }

  render(state: DashboardState): void {
    if (!this.clusterData) {
      this.element.setContent('\n  {gray-fg}Loading cluster data...{/gray-fg}');
      this.requestRender();
      return;
    }

    const lines: string[] = [];

    // Header
    lines.push(`{bold}Cluster Status:{/bold} ${this.clusterData.quorum ? '{green-fg}Quorum OK{/green-fg}' : '{red-fg}No Quorum{/red-fg}'}`);
    lines.push(`{bold}Gossip:{/bold} ${this.clusterData.gossipEnabled ? '{green-fg}Enabled{/green-fg}' : '{red-fg}Disabled{/red-fg}'}`);
    lines.push(`{bold}Leader:{/bold} ${this.clusterData.leader ?? '{gray-fg}None{/gray-fg}'}`);
    lines.push('');
    lines.push('{bold}Members:{/bold}');
    lines.push('');

    // Members list
    if (this.clusterData.members.length === 0) {
      lines.push('  {gray-fg}No members found{/gray-fg}');
    } else {
      for (const member of this.clusterData.members) {
        const statusColor = this.getStatusColor(member.status);
        const statusIcon = this.getStatusIcon(member.status);
        const leaderFlag = member.id === this.clusterData.leader ? ' {yellow-fg}★{/yellow-fg}' : '';

        lines.push(`  ${statusIcon} {${statusColor}}${member.status.toUpperCase()}{/${statusColor}}${leaderFlag}`);
        lines.push(`    {bold}ID:{/bold} ${member.id}`);
        lines.push(`    {bold}Role:{/bold} ${member.role}`);
        lines.push(`    {bold}Address:{/bold} ${member.address}`);
        lines.push(`    {bold}Last Seen:{/bold} ${member.lastSeen}`);
        lines.push('');
      }
    }

    lines.push('');
    lines.push('{gray-fg}Press r to refresh{/gray-fg}');

    this.element.setContent(lines.join('\n'));
    this.requestRender();
  }

  handleKey(key: string): boolean {
    if (key === 'r') {
      this.fetchClusterData();
      return true;
    }
    return false;
  }

  private async fetchClusterData(): Promise<void> {
    try {
      // Mock data for now - will be replaced with real API call
      this.clusterData = {
        leader: 'apparatus-01',
        members: [
          {
            id: 'apparatus-01',
            status: 'online',
            role: 'leader',
            address: '10.0.1.5:8080',
            lastSeen: 'now',
          },
          {
            id: 'apparatus-02',
            status: 'online',
            role: 'follower',
            address: '10.0.1.6:8080',
            lastSeen: '2s ago',
          },
          {
            id: 'apparatus-03',
            status: 'degraded',
            role: 'follower',
            address: '10.0.1.7:8080',
            lastSeen: '45s ago',
          },
        ],
        gossipEnabled: true,
        quorum: true,
      };

      this.render(this.getState()!);
    } catch (error) {
      this.element.setContent(`\n  {red-fg}Error loading cluster data:{/red-fg}\n  ${error instanceof Error ? error.message : String(error)}`);
      this.requestRender();
    }
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'online':
        return 'green-fg';
      case 'degraded':
        return 'yellow-fg';
      case 'offline':
        return 'red-fg';
      default:
        return 'gray-fg';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'online':
        return '{green-fg}●{/green-fg}';
      case 'degraded':
        return '{yellow-fg}◐{/yellow-fg}';
      case 'offline':
        return '{red-fg}○{/red-fg}';
      default:
        return '{gray-fg}?{/gray-fg}';
    }
  }
}

/**
 * Factory function for widget registry
 */
export function createClusterWidget(id: string, config: WidgetConfig): ClusterWidget {
  return new ClusterWidget(id, config);
}
