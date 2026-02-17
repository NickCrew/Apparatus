/**
 * Chaos Engineering Widget
 * CPU/memory/crash trigger buttons with status indicators
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

export interface ChaosWidgetState {
  cpuActive: boolean;
  memoryAllocated: number;
  lastAction: string | null;
}

export class ChaosWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private state: ChaosWidgetState = {
    cpuActive: false,
    memoryAllocated: 0,
    lastAction: null,
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
        border: { fg: 'red' },
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
    this.renderStatus();
    this.requestRender();
  }

  private renderControls(): void {
    const controls = `
{bold}Chaos Controls:{/bold}

{cyan-fg}[C]{/cyan-fg} CPU Spike     - Spike CPU for 5 seconds
{cyan-fg}[M]{/cyan-fg} Memory Spike  - Allocate 100MB memory
{cyan-fg}[X]{/cyan-fg} Crash Server  - Force server crash (DANGEROUS!)
{cyan-fg}[R]{/cyan-fg} Clear Memory  - Release allocated memory

{yellow-fg}⚠ Warning: These actions are destructive!{/yellow-fg}
    `;

    blessed.text({
      parent: this.statusBox,
      top: 0,
      left: 0,
      width: '100%-2',
      height: 8,
      content: controls,
      tags: true,
    });
  }

  private renderStatus(): void {
    const statusY = 9;
    const status = `
{bold}Current Status:{/bold}

CPU Spike:   ${this.state.cpuActive ? '{red-fg}ACTIVE{/red-fg}' : '{green-fg}Idle{/green-fg}'}
Memory:      ${this.state.memoryAllocated > 0 ? `{yellow-fg}${this.state.memoryAllocated}MB allocated{/yellow-fg}` : '{green-fg}Normal{/green-fg}'}
Last Action: ${this.state.lastAction || '{gray-fg}None{/gray-fg}'}
    `;

    const statusText = blessed.text({
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

    if (keyLower === 'c') {
      this.triggerCpuSpike();
      return true;
    }
    if (keyLower === 'm') {
      this.triggerMemorySpike();
      return true;
    }
    if (keyLower === 'x') {
      this.triggerCrash();
      return true;
    }
    if (keyLower === 'r') {
      this.clearMemory();
      return true;
    }
    return false;
  }

  private triggerCpuSpike(): void {
    this.emit('chaos:cpu');
  }

  private triggerMemorySpike(): void {
    this.emit('chaos:memory');
  }

  private triggerCrash(): void {
    this.emit('chaos:crash');
  }

  private clearMemory(): void {
    this.emit('chaos:clear');
  }

  /**
   * Update chaos status
   */
  setCpuActive(active: boolean): void {
    this.state.cpuActive = active;
    this.state.lastAction = active ? 'CPU spike started' : 'CPU spike ended';
    this.render(this.getState()!);
  }

  setMemoryAllocated(mb: number): void {
    this.state.memoryAllocated = mb;
    this.state.lastAction = mb > 0 ? `Allocated ${mb}MB` : 'Memory cleared';
    this.render(this.getState()!);
  }

  setLastAction(action: string): void {
    this.state.lastAction = action;
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
export function createChaosWidget(id: string, config: WidgetConfig): ChaosWidget {
  return new ChaosWidget(id, config);
}
