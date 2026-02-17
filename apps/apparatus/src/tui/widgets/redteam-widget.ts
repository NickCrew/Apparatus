/**
 * Red Team Scanner Widget
 * WAF bypass testing UI with results table
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface RedTeamWidgetState {
  scanning: boolean;
  lastScan: {
    target: string;
    total: number;
    blocked: number;
    passed: number;
    timestamp: string;
  } | null;
}

export class RedTeamWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private table: blessed.Widgets.TableElement;
  private state: RedTeamWidgetState = {
    scanning: false,
    lastScan: null,
  };

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    // Create container box
    this.element = blessed.box({
      ...createBoxOptions(config),
      style: {
        ...config.style,
        border: { fg: 'magenta' },
      },
    });

    // Create results table
    this.table = blessed.table({
      parent: this.element,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-4',
      align: 'left',
      pad: 1,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      style: {
        header: { fg: 'cyan', bold: true },
        cell: { fg: 'white' },
        border: { fg: 'gray' },
      },
      border: { type: 'line' },
    });

    // Status bar at bottom
    this.renderStatus();
  }

  render(state: DashboardState): void {
    if (this.state.scanning) {
      this.renderScanning();
    } else if (this.state.lastScan) {
      this.renderResults();
    } else {
      this.renderIdle();
    }
    this.requestRender();
  }

  private renderIdle(): void {
    this.table.setData([
      ['Category', 'Payload', 'Status', 'Result'],
      ['', '', '', '{gray-fg}No scan results yet{/gray-fg}'],
    ]);
  }

  private renderScanning(): void {
    this.table.setData([
      ['Category', 'Payload', 'Status', 'Result'],
      ['', '', '', '{cyan-fg}Scanning...{/cyan-fg}'],
    ]);
  }

  private renderResults(): void {
    if (!this.state.lastScan) return;

    const rows: string[][] = [
      ['Category', 'Passed', 'Blocked', 'Total'],
      [
        'Summary',
        `{green-fg}${this.state.lastScan.passed}{/green-fg}`,
        `{red-fg}${this.state.lastScan.blocked}{/red-fg}`,
        String(this.state.lastScan.total),
      ],
    ];

    this.table.setData(rows);
  }

  private renderStatus(): void {
    blessed.text({
      parent: this.element,
      bottom: 1,
      left: 1,
      width: '100%-2',
      height: 1,
      content: this.state.scanning
        ? '{cyan-fg}Status: Scanning...{/cyan-fg}'
        : this.state.lastScan
        ? `{gray-fg}Last scan: ${this.state.lastScan.target} at ${this.state.lastScan.timestamp}{/gray-fg}`
        : '{gray-fg}Press S to start scan{/gray-fg}',
      tags: true,
    });
  }

  handleKey(key: string): boolean {
    if (key === 's' || key === 'S') {
      this.openScanForm();
      return true;
    }
    if (key === 'enter' && this.state.lastScan) {
      this.showDetailedResults();
      return true;
    }
    return false;
  }

  private openScanForm(): void {
    // This will be called by keyboard handler - implementation in modal
    this.emit('scan:start');
  }

  private showDetailedResults(): void {
    this.emit('results:view');
  }

  /**
   * Update scan status
   */
  setScanning(scanning: boolean): void {
    this.state.scanning = scanning;
    this.renderStatus();
    this.render(this.getState()!);
  }

  /**
   * Update last scan results
   */
  setLastScan(result: {
    target: string;
    total: number;
    blocked: number;
    passed: number;
  }): void {
    this.state.lastScan = {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.state.scanning = false;
    this.renderStatus();
    this.render(this.getState()!);
  }

  private emitToStore(event: string, data?: unknown): void {
    if (this.store) {
      this.store.emit(event, data);
    }
  }
}

/**
 * Factory function for widget registry
 */
export function createRedTeamWidget(id: string, config: WidgetConfig): RedTeamWidget {
  return new RedTeamWidget(id, config);
}
