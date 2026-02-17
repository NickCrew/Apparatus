/**
 * MTD (Moving Target Defense) Configuration Widget
 * Displays and controls route prefix rotation
 */

import blessed from 'blessed';
import { BaseWidget, WidgetConfig, createBoxOptions } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import type { MtdStatus } from '../types.js';
import { colors } from '../theme.js';

export class MtdWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private mtdStatus: MtdStatus | null = null;
  private onRotateCallback?: (prefix?: string) => void;

  constructor(id: string, config: WidgetConfig) {
    super({ id, config, focusable: true });

    // Create container box
    this.element = blessed.box({
      ...createBoxOptions(config),
      label: ' MTD Configuration (R:rotate M:manual) ',
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.primary },
      },
    });

    // Create status display
    this.statusBox = blessed.box({
      parent: this.element,
      top: 0,
      left: 1,
      width: '100%-2',
      height: '100%-1',
      tags: true,
      content: '{gray-fg}Loading MTD status...{/gray-fg}',
    });

    this.setupKeyHandlers();
  }

  private setupKeyHandlers(): void {
    this.element.key(['r', 'R'], () => {
      // Auto-rotate with random prefix
      this.onRotateCallback?.();
    });

    this.element.key(['m', 'M'], () => {
      // Manual prefix entry
      this.promptForPrefix();
    });
  }

  private promptForPrefix(): void {
    if (!this.screen) return;

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 9,
      label: ' Set MTD Prefix ',
      border: { type: 'line' },
      style: {
        border: { fg: colors.accent },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
    });

    blessed.text({
      parent: modal,
      top: 0,
      left: 2,
      content: 'Enter new prefix (or leave empty for random):',
      style: { fg: 'white' },
    });

    const input = blessed.textbox({
      parent: modal,
      top: 2,
      left: 2,
      width: '100%-6',
      height: 1,
      style: {
        fg: 'white',
        bg: 'black',
        focus: { bg: colors.primary },
      },
      inputOnFocus: true,
    });

    const submitBtn = blessed.button({
      parent: modal,
      top: 4,
      left: 2,
      width: 12,
      height: 1,
      content: ' Submit ',
      style: {
        fg: 'white',
        bg: colors.success,
        focus: { bg: 'green' },
      },
    });

    const cancelBtn = blessed.button({
      parent: modal,
      top: 4,
      left: 16,
      width: 12,
      height: 1,
      content: ' Cancel ',
      style: {
        fg: 'white',
        bg: 'gray',
        focus: { bg: 'red' },
      },
    });

    const cleanup = () => {
      this.screen?.remove(modal);
      this.element.focus();
      this.requestRender();
    };

    submitBtn.on('press', () => {
      const prefix = input.getValue().trim();
      cleanup();
      this.onRotateCallback?.(prefix || undefined);
    });

    cancelBtn.on('press', cleanup);
    modal.key(['escape'], cleanup);
    input.key(['enter'], () => {
      const prefix = input.getValue().trim();
      cleanup();
      this.onRotateCallback?.(prefix || undefined);
    });

    input.focus();
    this.requestRender();
  }

  /**
   * Set the rotate callback
   */
  onRotate(callback: (prefix?: string) => void): void {
    this.onRotateCallback = callback;
  }

  /**
   * Update MTD status from external source
   */
  setStatus(status: MtdStatus): void {
    this.mtdStatus = status;
    this.updateDisplay();
  }

  render(state: DashboardState): void {
    // This widget is updated externally via setStatus
  }

  private updateDisplay(): void {
    if (!this.mtdStatus) {
      this.statusBox.setContent('{gray-fg}No MTD status available{/gray-fg}');
      this.requestRender();
      return;
    }

    const status = this.mtdStatus;
    const lines: string[] = [];

    lines.push(`{bold}Status:{/bold} ${status.enabled ? '{green-fg}ENABLED{/green-fg}' : '{gray-fg}DISABLED{/gray-fg}'}`);
    lines.push('');
    lines.push(`{bold}Current Prefix:{/bold} ${status.currentPrefix ? `{cyan-fg}/${status.currentPrefix}{/cyan-fg}` : '{gray-fg}(none){/gray-fg}'}`);
    lines.push('');

    if (status.currentPrefix) {
      lines.push(`{bold}Example URL:{/bold}`);
      lines.push(`  {yellow-fg}http://target/${status.currentPrefix}/api/endpoint{/yellow-fg}`);
      lines.push('');
    }

    lines.push(`{bold}Rotation Count:{/bold} ${status.rotationCount || 0}`);
    if (status.lastRotatedAt) {
      lines.push(`{bold}Last Rotated:{/bold} ${new Date(status.lastRotatedAt).toLocaleString()}`);
    }

    lines.push('');
    lines.push('{gray-fg}Press R for random rotation, M for manual prefix{/gray-fg}');

    this.statusBox.setContent(lines.join('\n'));
    this.requestRender();
  }

  onFocus(): void {
    this.element.style.border = { fg: colors.accent };
    this.requestRender();
  }

  onBlur(): void {
    this.element.style.border = { fg: colors.primary };
    this.requestRender();
  }
}
