/**
 * PCAP Capture Widget
 *
 * Provides controls for starting/stopping PCAP capture with duration
 * and interface selection.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

interface PcapState {
  capturing: boolean;
  duration: number;
  interface: string;
  startTime?: Date;
}

export class PcapWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusText: blessed.Widgets.TextElement;
  private durationInput: blessed.Widgets.TextboxElement;
  private interfaceInput: blessed.Widgets.TextboxElement;
  private startBtn: blessed.Widgets.ButtonElement;
  private stopBtn: blessed.Widgets.ButtonElement;
  private downloadBtn: blessed.Widgets.ButtonElement;

  private pcapState: PcapState = {
    capturing: false,
    duration: 30,
    interface: 'any',
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
      label: config.label ?? ' PCAP Capture ',
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

    // Duration label
    blessed.text({
      parent: this.element,
      top: 2,
      left: 1,
      content: 'Duration (seconds):',
      style: { fg: 'white' },
    });

    // Duration input
    this.durationInput = blessed.textbox({
      parent: this.element,
      top: 3,
      left: 1,
      width: 20,
      height: 1,
      value: '30',
      style: {
        fg: 'white',
        bg: 'black',
        focus: { bg: colors.primary },
      },
      inputOnFocus: true,
    });

    // Interface label
    blessed.text({
      parent: this.element,
      top: 5,
      left: 1,
      content: 'Interface:',
      style: { fg: 'white' },
    });

    // Interface input
    this.interfaceInput = blessed.textbox({
      parent: this.element,
      top: 6,
      left: 1,
      width: 20,
      height: 1,
      value: 'any',
      style: {
        fg: 'white',
        bg: 'black',
        focus: { bg: colors.primary },
      },
      inputOnFocus: true,
    });

    // Start button
    this.startBtn = blessed.button({
      parent: this.element,
      top: 8,
      left: 1,
      width: 14,
      height: 1,
      content: ' Start ',
      style: {
        fg: 'white',
        bg: colors.success,
        focus: { bg: 'green' },
      },
    });

    // Stop button
    this.stopBtn = blessed.button({
      parent: this.element,
      top: 8,
      left: 16,
      width: 14,
      height: 1,
      content: ' Stop ',
      style: {
        fg: 'white',
        bg: colors.error,
        focus: { bg: 'red' },
      },
      hidden: true,
    });

    // Download button
    this.downloadBtn = blessed.button({
      parent: this.element,
      top: 8,
      left: 31,
      width: 16,
      height: 1,
      content: ' Download ',
      style: {
        fg: 'white',
        bg: colors.accent,
        focus: { bg: 'blue' },
      },
      hidden: true,
    });

    // Button handlers
    this.startBtn.on('press', () => this.handleStart());
    this.stopBtn.on('press', () => this.handleStop());
    this.downloadBtn.on('press', () => this.handleDownload());

    // Input change handlers
    this.durationInput.on('submit', (value: string) => {
      const duration = parseInt(value);
      if (!isNaN(duration) && duration > 0) {
        this.pcapState.duration = duration;
      }
    });

    this.interfaceInput.on('submit', (value: string) => {
      this.pcapState.interface = value || 'any';
    });
  }

  render(_state: DashboardState): void {
    this.updateStatus();
  }

  private updateStatus(): void {
    if (this.pcapState.capturing) {
      const elapsed = this.pcapState.startTime
        ? Math.floor((Date.now() - this.pcapState.startTime.getTime()) / 1000)
        : 0;
      const remaining = Math.max(0, this.pcapState.duration - elapsed);
      this.statusText.setContent(
        `{green-fg}Status: Capturing{/green-fg} (${remaining}s remaining)`
      );
      this.startBtn.hide();
      this.stopBtn.show();
      this.downloadBtn.hide();
    } else {
      this.statusText.setContent('{gray-fg}Status: Idle{/gray-fg}');
      this.startBtn.show();
      this.stopBtn.hide();
      this.downloadBtn.show();
    }
    this.requestRender();
  }

  private async handleStart(): Promise<void> {
    if (this.pcapState.capturing) return;

    const duration = parseInt(this.durationInput.getValue());
    const iface = this.interfaceInput.getValue();

    if (isNaN(duration) || duration <= 0) {
      this.statusText.setContent('{red-fg}Error: Invalid duration{/red-fg}');
      this.requestRender();
      return;
    }

    this.pcapState.capturing = true;
    this.pcapState.duration = duration;
    this.pcapState.interface = iface;
    this.pcapState.startTime = new Date();

    this.updateStatus();

    // Auto-stop after duration
    setTimeout(() => {
      this.handleStop();
    }, duration * 1000);
  }

  private handleStop(): void {
    if (!this.pcapState.capturing) return;

    this.pcapState.capturing = false;
    this.pcapState.startTime = undefined;
    this.statusText.setContent('{yellow-fg}Status: Capture complete - Ready to download{/yellow-fg}');
    this.updateStatus();
  }

  private handleDownload(): void {
    // Emit event to trigger download via action handler
    this.emit('download-pcap', {
      duration: this.pcapState.duration,
      interface: this.pcapState.interface,
    });
  }

  handleKey(key: string): boolean {
    if (key === 'f5') {
      this.handleStart();
      return true;
    }
    if (key === 's' && this.pcapState.capturing) {
      this.handleStop();
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
 * Factory function for creating PCAP widgets
 */
export function createPcapWidget(id: string, config: WidgetConfig): PcapWidget {
  return new PcapWidget(id, config);
}
