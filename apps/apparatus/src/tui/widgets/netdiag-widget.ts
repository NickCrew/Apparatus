/**
 * Network Diagnostics Widget
 * DNS resolver and TCP ping with results display
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface NetDiagWidgetState {
  lastDns: {
    target: string;
    type: string;
    records: string[];
    timestamp: string;
  } | null;
  lastPing: {
    target: string;
    reachable: boolean;
    latencyMs?: number;
    error?: string;
    timestamp: string;
  } | null;
}

export class NetDiagWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private resultsBox: blessed.Widgets.BoxElement;
  private state: NetDiagWidgetState = {
    lastDns: null,
    lastPing: null,
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
        border: { fg: 'blue' },
      },
    });

    // Results display
    this.resultsBox = blessed.box({
      parent: this.element,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      tags: true,
      scrollable: true,
      keys: true,
      vi: true,
      style: {
        fg: 'white',
      },
    });

    this.renderControls();
  }

  render(state: DashboardState): void {
    this.renderResults();
    this.requestRender();
  }

  private renderControls(): void {
    const controls = `
{bold}Network Diagnostics:{/bold}

{cyan-fg}[D]{/cyan-fg} DNS Lookup - Resolve DNS records (A, AAAA, MX, TXT, etc.)
{cyan-fg}[P]{/cyan-fg} TCP Ping   - Test TCP connectivity to host:port

{gray-fg}Results will appear below{/gray-fg}
    `;

    blessed.text({
      parent: this.resultsBox,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 7,
      content: controls,
      tags: true,
    });
  }

  private renderResults(): void {
    const resultsY = 8;
    let results = '';

    if (this.state.lastDns) {
      results += `
{bold}Last DNS Lookup:{/bold}
Target:  ${this.state.lastDns.target}
Type:    ${this.state.lastDns.type}
Records: ${this.state.lastDns.records.length > 0 ? '\n         ' + this.state.lastDns.records.join('\n         ') : '{gray-fg}None{/gray-fg}'}
Time:    ${this.state.lastDns.timestamp}

`;
    }

    if (this.state.lastPing) {
      results += `
{bold}Last TCP Ping:{/bold}
Target:   ${this.state.lastPing.target}
Status:   ${this.state.lastPing.reachable ? '{green-fg}Reachable{/green-fg}' : '{red-fg}Unreachable{/red-fg}'}
Latency:  ${this.state.lastPing.latencyMs !== undefined ? `${this.state.lastPing.latencyMs}ms` : '{gray-fg}N/A{/gray-fg}'}
${this.state.lastPing.error ? `Error:    {red-fg}${this.state.lastPing.error}{/red-fg}` : ''}
Time:     ${this.state.lastPing.timestamp}
`;
    }

    if (!results) {
      results = '\n{gray-fg}No results yet. Press D for DNS lookup or P for TCP ping.{/gray-fg}';
    }

    blessed.text({
      parent: this.resultsBox,
      top: resultsY,
      left: 0,
      width: '100%-2',
      height: '100%',
      content: results,
      tags: true,
    });
  }

  handleKey(key: string): boolean {
    const keyLower = key.toLowerCase();

    if (keyLower === 'd') {
      this.openDnsForm();
      return true;
    }
    if (keyLower === 'p') {
      this.openPingForm();
      return true;
    }
    return false;
  }

  private openDnsForm(): void {
    this.emit('netdiag:dns');
  }

  private openPingForm(): void {
    this.emit('netdiag:ping');
  }

  /**
   * Update DNS result
   */
  setDnsResult(result: {
    target: string;
    type: string;
    records: string[];
  }): void {
    this.state.lastDns = {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.render(this.getState()!);
  }

  /**
   * Update ping result
   */
  setPingResult(result: {
    target: string;
    reachable: boolean;
    latencyMs?: number;
    error?: string;
  }): void {
    this.state.lastPing = {
      ...result,
      timestamp: new Date().toLocaleTimeString(),
    };
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
export function createNetDiagWidget(id: string, config: WidgetConfig): NetDiagWidget {
  return new NetDiagWidget(id, config);
}
