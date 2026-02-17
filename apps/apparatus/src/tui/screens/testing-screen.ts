/**
 * Testing Screen
 * Combines all testing and control widgets in a grid layout
 */

import blessed from 'blessed';
import type { Store } from '../core/store.js';
import type { ModalManager } from '../core/modal.js';
import type { ActionHandler } from '../core/action-handler.js';
import type { ApiClient } from '../api-client.js';
import { RedTeamWidget } from '../widgets/redteam-widget.js';
import { ChaosWidget } from '../widgets/chaos-widget.js';
import { GhostWidget } from '../widgets/ghost-widget.js';
import { NetDiagWidget } from '../widgets/netdiag-widget.js';
import {
  showRedTeamResultsModal,
  showDnsFormModal,
  showPingFormModal,
  showScanFormModal,
  showGhostConfigModal,
} from '../modals/index.js';
import type { RedTeamResult } from '../types.js';

export interface TestingScreenOptions {
  screen: blessed.Widgets.Screen;
  store: Store;
  modal: ModalManager;
  actionHandler: ActionHandler;
  client: ApiClient;
}

export class TestingScreen {
  private screen: blessed.Widgets.Screen;
  private store: Store;
  private modal: ModalManager;
  private actionHandler: ActionHandler;
  private client: ApiClient;
  private container: blessed.Widgets.BoxElement;
  private grid: blessed.Widgets.LayoutElement;
  private widgets: {
    redteam: RedTeamWidget;
    chaos: ChaosWidget;
    ghost: GhostWidget;
    netdiag: NetDiagWidget;
  };

  constructor(options: TestingScreenOptions) {
    this.screen = options.screen;
    this.store = options.store;
    this.modal = options.modal;
    this.actionHandler = options.actionHandler;
    this.client = options.client;

    // Create container
    this.container = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      hidden: true,
    });

    // Create grid layout (2x2)
    this.grid = blessed.layout({
      parent: this.container,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      layout: 'grid',
    });

    // Create widgets
    this.widgets = {
      redteam: new RedTeamWidget('redteam', {
        row: 0,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
        label: 'Red Team Scanner',
      }),
      chaos: new ChaosWidget('chaos', {
        row: 0,
        col: 1,
        rowSpan: 1,
        colSpan: 1,
        label: 'Chaos Engineering',
      }),
      ghost: new GhostWidget('ghost', {
        row: 1,
        col: 0,
        rowSpan: 1,
        colSpan: 1,
        label: 'Ghost Traffic',
      }),
      netdiag: new NetDiagWidget('netdiag', {
        row: 1,
        col: 1,
        rowSpan: 1,
        colSpan: 1,
        label: 'Network Diagnostics',
      }),
    };

    // Mount widgets in grid
    this.grid.append(this.widgets.redteam.element);
    this.grid.append(this.widgets.chaos.element);
    this.grid.append(this.widgets.ghost.element);
    this.grid.append(this.widgets.netdiag.element);

    // Mount widgets to store
    this.widgets.redteam.mount(this.screen, this.store);
    this.widgets.chaos.mount(this.screen, this.store);
    this.widgets.ghost.mount(this.screen, this.store);
    this.widgets.netdiag.mount(this.screen, this.store);

    // Set up event handlers
    this.setupEventHandlers();

    // Set up keyboard bindings
    this.setupKeyBindings();
  }

  private setupEventHandlers(): void {
    // Red Team events
    this.store.on('scan:start', () => this.handleScanStart());
    this.store.on('results:view', () => this.handleResultsView());

    // Chaos events
    this.store.on('chaos:cpu', () => this.handleChaosCpu());
    this.store.on('chaos:memory', () => this.handleChaosMemory());
    this.store.on('chaos:crash', () => this.handleChaosCrash());
    this.store.on('chaos:clear', () => this.handleChaosClear());

    // Ghost events
    this.store.on('ghost:start', () => this.handleGhostStart());
    this.store.on('ghost:stop', () => this.handleGhostStop());
    this.store.on('ghost:setTarget', () => this.handleGhostSetTarget());
    this.store.on('ghost:setDelay', () => this.handleGhostSetDelay());

    // Network diagnostics events
    this.store.on('netdiag:dns', () => this.handleDnsLookup());
    this.store.on('netdiag:ping', () => this.handleTcpPing());
  }

  private setupKeyBindings(): void {
    // Global screen keys
    this.screen.key(['escape', 'q'], () => {
      this.hide();
    });

    // Focus navigation
    this.screen.key(['tab'], () => {
      this.screen.focusNext();
    });

    this.screen.key(['S-tab'], () => {
      this.screen.focusPrevious();
    });
  }

  // Red Team handlers
  private handleScanStart(): void {
    showScanFormModal(this.modal, async (target, path) => {
      this.widgets.redteam.setScanning(true);
      try {
        const result = await this.client.runRedTeamScan(target, path);
        this.widgets.redteam.setLastScan({
          target,
          total: result.summary?.total ?? result.total,
          blocked: result.summary?.blocked ?? result.blocked,
          passed: result.summary?.passed ?? result.passed,
        });
        // Store result for viewing
        (this.widgets.redteam as any).lastFullResult = result;
      } catch (err) {
        this.modal.showResult({
          title: 'Error',
          content: `Scan failed: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        });
        this.widgets.redteam.setScanning(false);
      }
    });
  }

  private handleResultsView(): void {
    const result = (this.widgets.redteam as any).lastFullResult as RedTeamResult | undefined;
    if (result) {
      showRedTeamResultsModal(this.modal, result);
    }
  }

  // Chaos handlers
  private handleChaosCpu(): void {
    this.modal.showConfirm(
      {
        title: 'Chaos: CPU Spike',
        message: 'Trigger CPU spike for 5 seconds?',
        danger: true,
      },
      async () => {
        try {
          this.widgets.chaos.setCpuActive(true);
          await this.client.triggerCpuSpike(5000);
          setTimeout(() => {
            this.widgets.chaos.setCpuActive(false);
          }, 5000);
          this.modal.showResult({
            title: 'Success',
            content: 'CPU spike triggered for 5 seconds',
            type: 'success',
          });
        } catch (err) {
          this.modal.showResult({
            title: 'Error',
            content: `Failed to trigger CPU spike: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
          this.widgets.chaos.setCpuActive(false);
        }
      }
    );
  }

  private handleChaosMemory(): void {
    this.modal.showConfirm(
      {
        title: 'Chaos: Memory Spike',
        message: 'Allocate 100MB of memory?',
        danger: true,
      },
      async () => {
        try {
          await this.client.triggerMemorySpike(100);
          this.widgets.chaos.setMemoryAllocated(100);
          this.modal.showResult({
            title: 'Success',
            content: 'Allocated 100MB of memory',
            type: 'success',
          });
        } catch (err) {
          this.modal.showResult({
            title: 'Error',
            content: `Failed to allocate memory: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private handleChaosCrash(): void {
    this.modal.showConfirm(
      {
        title: 'Chaos: Crash Server',
        message: 'DANGER: This will crash the server! Continue?',
        danger: true,
        confirmLabel: 'CRASH',
      },
      async () => {
        try {
          await this.client.triggerCrash();
          this.modal.showResult({
            title: 'Server Crashed',
            content: 'Server crash triggered. Reconnection may be required.',
            type: 'warning',
          });
        } catch (err) {
          // Expected - server will disconnect
          this.modal.showResult({
            title: 'Server Crashed',
            content: 'Server has been terminated. Reconnection required.',
            type: 'warning',
          });
        }
      }
    );
  }

  private handleChaosClear(): void {
    this.modal.showConfirm(
      {
        title: 'Clear Memory',
        message: 'Clear all allocated memory?',
      },
      async () => {
        try {
          await this.client.clearMemory();
          this.widgets.chaos.setMemoryAllocated(0);
          this.modal.showResult({
            title: 'Success',
            content: 'Memory cleared',
            type: 'success',
          });
        } catch (err) {
          this.modal.showResult({
            title: 'Error',
            content: `Failed to clear memory: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
        }
      }
    );
  }

  // Ghost traffic handlers
  private handleGhostStart(): void {
    const currentTarget = (this.widgets.ghost as any).state.target;
    const currentDelay = (this.widgets.ghost as any).state.delay;

    if (!currentTarget) {
      this.modal.showResult({
        title: 'Error',
        content: 'Please set a target URL first (press T)',
        type: 'error',
      });
      return;
    }

    this.modal.showConfirm(
      {
        title: 'Start Ghost Traffic',
        message: `Start traffic to ${currentTarget} with ${currentDelay}ms delay?`,
      },
      async () => {
        try {
          await this.client.startGhostTraffic(currentTarget, currentDelay);
          this.widgets.ghost.setActive(true, currentTarget);
          this.modal.showResult({
            title: 'Success',
            content: 'Ghost traffic started',
            type: 'success',
          });
        } catch (err) {
          this.modal.showResult({
            title: 'Error',
            content: `Failed to start ghost traffic: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private handleGhostStop(): void {
    this.modal.showConfirm(
      {
        title: 'Stop Ghost Traffic',
        message: 'Stop ghost traffic generation?',
      },
      async () => {
        try {
          await this.client.stopGhostTraffic();
          this.widgets.ghost.setActive(false);
          this.modal.showResult({
            title: 'Success',
            content: 'Ghost traffic stopped',
            type: 'success',
          });
        } catch (err) {
          this.modal.showResult({
            title: 'Error',
            content: `Failed to stop ghost traffic: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private handleGhostSetTarget(): void {
    const currentTarget = (this.widgets.ghost as any).state.target || 'http://localhost:8080';
    showGhostConfigModal(this.modal, 'target', currentTarget, (value) => {
      this.widgets.ghost.setTarget(String(value));
      this.modal.showResult({
        title: 'Success',
        content: `Target set to ${value}`,
        type: 'success',
      });
    });
  }

  private handleGhostSetDelay(): void {
    const currentDelay = (this.widgets.ghost as any).state.delay || 1000;
    showGhostConfigModal(this.modal, 'delay', currentDelay, (value) => {
      this.widgets.ghost.setDelay(Number(value));
      this.modal.showResult({
        title: 'Success',
        content: `Delay set to ${value}ms`,
        type: 'success',
      });
    });
  }

  // Network diagnostics handlers
  private handleDnsLookup(): void {
    showDnsFormModal(this.modal, async (target, type) => {
      this.modal.showLoading('Resolving DNS...');
      try {
        const result = await this.client.dnsLookup(target, type);
        this.modal.close();
        this.widgets.netdiag.setDnsResult({
          target: result.target,
          type: result.type,
          records: result.records,
        });
        this.modal.showResult({
          title: 'DNS Lookup Success',
          content: `Found ${result.records.length} record(s) for ${target}`,
          type: 'success',
        });
      } catch (err) {
        this.modal.close();
        this.modal.showResult({
          title: 'DNS Lookup Failed',
          content: err instanceof Error ? err.message : String(err),
          type: 'error',
        });
      }
    });
  }

  private handleTcpPing(): void {
    showPingFormModal(this.modal, async (target) => {
      this.modal.showLoading('Pinging...');
      try {
        const result = await this.client.tcpPing(target);
        this.modal.close();
        this.widgets.netdiag.setPingResult({
          target: result.target,
          reachable: result.reachable,
          latencyMs: result.latencyMs,
          error: result.error,
        });
        if (result.reachable) {
          this.modal.showResult({
            title: 'TCP Ping Success',
            content: `${target} is reachable (${result.latencyMs}ms)`,
            type: 'success',
          });
        } else {
          this.modal.showResult({
            title: 'TCP Ping Failed',
            content: result.error || 'Target is unreachable',
            type: 'error',
          });
        }
      } catch (err) {
        this.modal.close();
        this.modal.showResult({
          title: 'TCP Ping Failed',
          content: err instanceof Error ? err.message : String(err),
          type: 'error',
        });
      }
    });
  }

  /**
   * Show the testing screen
   */
  show(): void {
    this.container.show();
    this.widgets.redteam.element.focus();
    this.screen.render();
  }

  /**
   * Hide the testing screen
   */
  hide(): void {
    this.container.hide();
    this.screen.render();
  }

  /**
   * Destroy the testing screen
   */
  destroy(): void {
    this.widgets.redteam.destroy();
    this.widgets.chaos.destroy();
    this.widgets.ghost.destroy();
    this.widgets.netdiag.destroy();
    this.screen.remove(this.container);
  }
}

/**
 * Create a testing screen instance
 */
export function createTestingScreen(options: TestingScreenOptions): TestingScreen {
  return new TestingScreen(options);
}
