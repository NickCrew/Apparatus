/**
 * Ghost Traffic Widget
 * Start/stop background traffic generation with configuration
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface GhostWidgetState {
  active: boolean;
  target: string | null;
  delay: number;
  requestsSent: number;
  startedAt: string | null;
}

export class GhostWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private state: GhostWidgetState = {
    active: false,
    target: null,
    delay: 1000,
    requestsSent: 0,
    startedAt: null,
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
        border: { fg: 'cyan' },
      },
    });

    // Status display
    this.statusBox = blessed.box({
      parent: this.element,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      tags: true,
      scrollable: false,
      style: {
        fg: 'white',
      },
    });

    this.renderControls();
  }

  render(state: DashboardState): void {
    this.renderStatus();
    this.requestRender();
  }

  private renderControls(): void {
    const controls = `
{bold}Ghost Traffic Generator:{/bold}

Generate background HTTP traffic to simulate benign users.

{cyan-fg}[G]{/cyan-fg} Start/Stop - Toggle traffic generation
{cyan-fg}[T]{/cyan-fg} Set Target - Configure target URL
{cyan-fg}[D]{/cyan-fg} Set Delay  - Configure request delay

{gray-fg}Ghost traffic uses random User-Agents and paths{/gray-fg}
    `;

    blessed.text({
      parent: this.statusBox,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 9,
      content: controls,
      tags: true,
    });
  }

  private renderStatus(): void {
    const statusY = 10;
    const uptime = this.state.startedAt
      ? Math.floor((Date.now() - new Date(this.state.startedAt).getTime()) / 1000)
      : 0;

    const status = `
{bold}Current Status:{/bold}

State:    ${this.state.active ? '{green-fg}RUNNING{/green-fg}' : '{gray-fg}Stopped{/gray-fg}'}
Target:   ${this.state.target || '{gray-fg}Not set{/gray-fg}'}
Delay:    ${this.state.delay}ms
Uptime:   ${uptime > 0 ? `${uptime}s` : '{gray-fg}N/A{/gray-fg}'}
    `;

    blessed.text({
      parent: this.statusBox,
      top: statusY,
      left: 0,
      width: '100%-2',
      height: 6,
      content: status,
      tags: true,
    });
  }

  handleKey(key: string): boolean {
    const keyLower = key.toLowerCase();

    if (keyLower === 'g') {
      this.toggleGhost();
      return true;
    }
    if (keyLower === 't') {
      this.openTargetForm();
      return true;
    }
    if (keyLower === 'd') {
      this.openDelayForm();
      return true;
    }
    return false;
  }

  private toggleGhost(): void {
    if (this.state.active) {
      this.emit('ghost:stop');
    } else {
      this.emit('ghost:start');
    }
  }

  private openTargetForm(): void {
    this.emit('ghost:setTarget');
  }

  private openDelayForm(): void {
    this.emit('ghost:setDelay');
  }

  /**
   * Update ghost traffic status
   */
  setActive(active: boolean, target?: string): void {
    this.state.active = active;
    if (target) {
      this.state.target = target;
    }
    if (active && !this.state.startedAt) {
      this.state.startedAt = new Date().toISOString();
    } else if (!active) {
      this.state.startedAt = null;
      this.state.requestsSent = 0;
    }
    this.render(this.getState()!);
  }

  /**
   * Update target URL
   */
  setTarget(target: string): void {
    this.state.target = target;
    this.render(this.getState()!);
  }

  /**
   * Update request delay
   */
  setDelay(delay: number): void {
    this.state.delay = delay;
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
export function createGhostWidget(id: string, config: WidgetConfig): GhostWidget {
  return new GhostWidget(id, config);
}
