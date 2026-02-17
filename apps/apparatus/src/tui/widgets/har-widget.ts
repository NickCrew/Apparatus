/**
 * HAR Replay Widget
 *
 * Provides interface for replaying HAR (HTTP Archive) files
 * and displaying results.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

interface HarReplayState {
  filePath: string;
  replaying: boolean;
  lastResultCount?: number;
  lastError?: string;
}

export class HarWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusText: blessed.Widgets.TextElement;
  private fileInput: blessed.Widgets.TextboxElement;
  private replayBtn: blessed.Widgets.ButtonElement;
  private resultsText: blessed.Widgets.TextElement;

  private harState: HarReplayState = {
    filePath: '',
    replaying: false,
  };

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' HAR Replay ',
      style: {
        border: { fg: colors.accent },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
    });

    // Status indicator
    this.statusText = blessed.text({
      parent: this.element,
      top: 0,
      left: 1,
      width: '100%-2',
      height: 1,
      content: '{gray-fg}Status: Idle{/gray-fg}',
      tags: true,
      style: { fg: 'white' },
    });

    // File path label
    blessed.text({
      parent: this.element,
      top: 2,
      left: 1,
      content: 'HAR File Path:',
      style: { fg: 'white' },
    });

    // File path input
    this.fileInput = blessed.textbox({
      parent: this.element,
      top: 3,
      left: 1,
      width: '100%-4',
      height: 1,
      value: '/path/to/file.har',
      style: {
        fg: 'white',
        bg: 'black',
        focus: { bg: colors.primary },
      },
      inputOnFocus: true,
    });

    // Replay button
    this.replayBtn = blessed.button({
      parent: this.element,
      top: 5,
      left: 1,
      width: 16,
      height: 1,
      content: ' Replay HAR ',
      style: {
        fg: 'white',
        bg: colors.success,
        focus: { bg: 'green' },
      },
    });

    // Results summary
    this.resultsText = blessed.text({
      parent: this.element,
      top: 7,
      left: 1,
      width: '100%-2',
      height: 3,
      content: '{gray-fg}No results yet{/gray-fg}',
      tags: true,
      style: { fg: 'white' },
    });

    // Button handler
    this.replayBtn.on('press', () => this.handleReplay());

    // Input change handler
    this.fileInput.on('submit', (value: string) => {
      this.harState.filePath = value;
    });
  }

  render(_state: DashboardState): void {
    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.harState.replaying) {
      this.statusText.setContent('{yellow-fg}Status: Replaying...{/yellow-fg}');
    } else if (this.harState.lastError) {
      this.statusText.setContent(`{red-fg}Error: ${this.harState.lastError}{/red-fg}`);
    } else if (this.harState.lastResultCount !== undefined) {
      this.statusText.setContent('{green-fg}Status: Replay complete{/green-fg}');
      this.resultsText.setContent(
        `{green-fg}✓{/green-fg} Replayed ${this.harState.lastResultCount} requests\n\n{gray-fg}Press Enter to view details{/gray-fg}`
      );
    } else {
      this.statusText.setContent('{gray-fg}Status: Idle{/gray-fg}');
    }
    this.requestRender();
  }

  private async handleReplay(): Promise<void> {
    if (this.harState.replaying) return;

    const filePath = this.fileInput.getValue().trim();
    if (!filePath || filePath === '/path/to/file.har') {
      this.harState.lastError = 'Please provide a valid file path';
      this.updateStatus();
      return;
    }

    this.harState.filePath = filePath;
    this.harState.replaying = true;
    this.harState.lastError = undefined;
    this.updateStatus();

    // Emit event to trigger replay via action handler
    this.emit('replay-har', { filePath });
  }

  /**
   * Update with replay results
   */
  public setResults(count: number, error?: string): void {
    this.harState.replaying = false;
    this.harState.lastResultCount = count;
    this.harState.lastError = error;
    this.updateStatus();
  }

  handleKey(key: string): boolean {
    if (key === 'f6') {
      this.handleReplay();
      return true;
    }
    if (key === 'enter' && this.harState.lastResultCount !== undefined) {
      this.emit('show-har-results');
      return true;
    }
    return false;
  }

  onFocus(): void {
    this.element.style.border = { fg: colors.primary };
    this.requestRender();
  }

  onBlur(): void {
    this.element.style.border = { fg: colors.accent };
    this.requestRender();
  }
}

/**
 * Factory function for creating HAR widgets
 */
export function createHarWidget(id: string, config: WidgetConfig): HarWidget {
  return new HarWidget(id, config);
}
