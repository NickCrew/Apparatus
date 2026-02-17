/**
 * DLP Test Generator Widget
 * Generates test data for DLP pattern validation
 */

import blessed from 'blessed';
import { BaseWidget, WidgetConfig, createBoxOptions } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import type { DlpData } from '../types.js';
import { colors } from '../theme.js';

export class DlpWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private outputBox: blessed.Widgets.BoxElement;
  private lastGenerated: DlpData | null = null;
  private onGenerateCallback?: (type: 'cc' | 'ssn' | 'email' | 'sql') => void;
  private onShowOutputCallback?: (data: DlpData) => void;

  constructor(id: string, config: WidgetConfig) {
    super({ id, config, focusable: true });

    // Create container box
    this.element = blessed.box({
      ...createBoxOptions(config),
      label: ' DLP Test Generator (1:CC 2:SSN 3:Email 4:SQL) ',
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.primary },
      },
    });

    // Create output display
    this.outputBox = blessed.box({
      parent: this.element,
      top: 0,
      left: 1,
      width: '100%-2',
      height: '100%-1',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.primary },
      },
    });

    this.setupKeyHandlers();
    this.updateDisplay();
  }

  private setupKeyHandlers(): void {
    this.element.key(['1'], () => {
      this.onGenerateCallback?.('cc');
    });

    this.element.key(['2'], () => {
      this.onGenerateCallback?.('ssn');
    });

    this.element.key(['3'], () => {
      this.onGenerateCallback?.('email');
    });

    this.element.key(['4'], () => {
      this.onGenerateCallback?.('sql');
    });

    this.element.key(['enter', 'space'], () => {
      if (this.lastGenerated) {
        this.onShowOutputCallback?.(this.lastGenerated);
      }
    });

    this.element.key(['c', 'C'], () => {
      if (this.lastGenerated) {
        this.copyToClipboard(this.lastGenerated.value);
      }
    });
  }

  private copyToClipboard(text: string): void {
    // In a real TUI, this would use clipboard integration
    // For now, just show a notification
    if (!this.screen) return;

    const notification = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 5,
      border: { type: 'line' },
      style: {
        border: { fg: colors.success },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
      content: `\n  {green-fg}✓{/green-fg} Value copied to clipboard!\n  {gray-fg}(simulated){/gray-fg}`,
    });

    setTimeout(() => {
      this.screen?.remove(notification);
      this.requestRender();
    }, 1500);

    this.requestRender();
  }

  /**
   * Set the generate callback
   */
  onGenerate(callback: (type: 'cc' | 'ssn' | 'email' | 'sql') => void): void {
    this.onGenerateCallback = callback;
  }

  /**
   * Set the show output callback
   */
  onShowOutput(callback: (data: DlpData) => void): void {
    this.onShowOutputCallback = callback;
  }

  /**
   * Update with newly generated data
   */
  setGeneratedData(data: DlpData): void {
    this.lastGenerated = data;
    this.updateDisplay();
  }

  render(state: DashboardState): void {
    // This widget is updated externally via setGeneratedData
  }

  private updateDisplay(): void {
    const lines: string[] = [];

    lines.push('{bold}Available Generators:{/bold}');
    lines.push('');
    lines.push('  {cyan-fg}1{/cyan-fg} - Credit Card Number (Visa/MC)');
    lines.push('  {cyan-fg}2{/cyan-fg} - Social Security Number (US)');
    lines.push('  {cyan-fg}3{/cyan-fg} - Email Addresses (bulk)');
    lines.push('  {cyan-fg}4{/cyan-fg} - SQL Injection Error');
    lines.push('');

    if (this.lastGenerated) {
      lines.push('{bold}Last Generated:{/bold}');
      lines.push('');
      lines.push(`  {bold}Type:{/bold} {yellow-fg}${this.lastGenerated.type.toUpperCase()}{/yellow-fg}`);
      lines.push(`  {bold}Description:{/bold} ${this.lastGenerated.description}`);
      lines.push('');
      lines.push(`  {bold}Value:{/bold}`);

      // Truncate very long values
      const value = this.lastGenerated.value;
      if (value.length > 200) {
        lines.push(`  {green-fg}${value.substring(0, 200)}...{/green-fg}`);
        lines.push(`  {gray-fg}(truncated, ${value.length} chars total){/gray-fg}`);
      } else {
        lines.push(`  {green-fg}${value}{/green-fg}`);
      }

      lines.push('');
      lines.push('{gray-fg}Press Enter to view full output, C to copy{/gray-fg}');
    } else {
      lines.push('{gray-fg}No data generated yet. Press 1-4 to generate.{/gray-fg}');
    }

    this.outputBox.setContent(lines.join('\n'));
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
