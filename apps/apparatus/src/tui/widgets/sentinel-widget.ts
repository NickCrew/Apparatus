/**
 * Active Shield (Sentinel) Widget
 * Displays and manages virtual patching rules
 */

import blessed from 'blessed';
import { BaseWidget, WidgetConfig, createBoxOptions } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import type { SentinelRule } from '../types.js';
import { colors } from '../theme.js';

interface SentinelWidgetState {
  rules: SentinelRule[];
  selectedIndex: number;
}

export class SentinelWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private rulesTable: blessed.Widgets.TableElement;
  private rules: SentinelRule[] = [];
  private selectedIndex = 0;
  private onAddRuleCallback?: () => void;
  private onDeleteRuleCallback?: (ruleId: string) => void;

  constructor(id: string, config: WidgetConfig) {
    super({ id, config, focusable: true });

    // Create container box
    this.element = blessed.box({
      ...createBoxOptions(config),
      label: ' Active Shield Rules (A:add D:delete) ',
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.primary },
      },
    });

    // Create table for rules
    this.rulesTable = blessed.table({
      parent: this.element,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        header: { fg: colors.accent, bold: true },
        cell: { fg: 'white' },
        selected: { bg: colors.primary, fg: 'black', bold: true },
      },
      columnSpacing: 2,
      columnWidth: [20, 40, 10, 8],
    });

    this.setupKeyHandlers();
  }

  private setupKeyHandlers(): void {
    this.rulesTable.key(['up', 'k'], () => {
      if (this.rules.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateDisplay();
      }
    });

    this.rulesTable.key(['down', 'j'], () => {
      if (this.rules.length > 0) {
        this.selectedIndex = Math.min(this.rules.length - 1, this.selectedIndex + 1);
        this.updateDisplay();
      }
    });

    this.rulesTable.key(['a', 'A'], () => {
      this.onAddRuleCallback?.();
    });

    this.rulesTable.key(['d', 'D'], () => {
      if (this.rules.length > 0 && this.rules[this.selectedIndex]) {
        this.onDeleteRuleCallback?.(this.rules[this.selectedIndex].id);
      }
    });

    this.rulesTable.key(['enter'], () => {
      if (this.rules.length > 0 && this.rules[this.selectedIndex]) {
        this.showRuleDetails(this.rules[this.selectedIndex]);
      }
    });
  }

  private showRuleDetails(rule: SentinelRule): void {
    if (!this.screen || !this.store) return;

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '60%',
      label: ` Rule Details: ${rule.id} `,
      border: { type: 'line' },
      style: {
        border: { fg: colors.accent },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
      keys: true,
      scrollable: true,
      alwaysScroll: true,
    });

    const content = [
      `{bold}ID:{/bold} ${rule.id}`,
      `{bold}Pattern:{/bold} ${rule.pattern}`,
      `{bold}Action:{/bold} {${rule.action === 'block' ? 'red' : 'yellow'}-fg}${rule.action.toUpperCase()}{/${rule.action === 'block' ? 'red' : 'yellow'}-fg}`,
      `{bold}Enabled:{/bold} ${rule.enabled ? '{green-fg}YES{/green-fg}' : '{red-fg}NO{/red-fg}'}`,
      `{bold}Created At:{/bold} ${rule.createdAt || 'Unknown'}`,
      `{bold}Match Count:{/bold} ${rule.matchCount || 0}`,
      '',
      '{gray-fg}Press Esc to close{/gray-fg}',
    ].join('\n');

    modal.setContent(content);

    modal.key(['escape', 'q'], () => {
      this.screen?.remove(modal);
      this.requestRender();
    });

    modal.focus();
    this.requestRender();
  }

  /**
   * Set the add rule callback
   */
  onAddRule(callback: () => void): void {
    this.onAddRuleCallback = callback;
  }

  /**
   * Set the delete rule callback
   */
  onDeleteRule(callback: (ruleId: string) => void): void {
    this.onDeleteRuleCallback = callback;
  }

  /**
   * Update rules from external source
   */
  setRules(rules: SentinelRule[]): void {
    this.rules = rules;
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, rules.length - 1));
    this.updateDisplay();
  }

  render(state: DashboardState): void {
    // This widget is updated externally via setRules
    // No state subscription needed for now
  }

  private updateDisplay(): void {
    const headers = ['ID', 'Pattern', 'Action', 'Enabled'];
    const rows: string[][] = [headers];

    if (this.rules.length === 0) {
      rows.push(['{gray-fg}No rules configured{/gray-fg}', '', '', '']);
    } else {
      this.rules.forEach((rule, index) => {
        const isSelected = index === this.selectedIndex;
        const prefix = isSelected ? '{bold}' : '';
        const suffix = isSelected ? '{/bold}' : '';

        const actionColor = rule.action === 'block' ? 'red' : 'yellow';
        const enabledColor = rule.enabled ? 'green' : 'gray';

        rows.push([
          `${prefix}${rule.id.substring(0, 18)}${suffix}`,
          `${prefix}${rule.pattern.substring(0, 38)}${suffix}`,
          `${prefix}{${actionColor}-fg}${rule.action}{/${actionColor}-fg}${suffix}`,
          `${prefix}{${enabledColor}-fg}${rule.enabled ? '✓' : '✗'}{/${enabledColor}-fg}${suffix}`,
        ]);
      });
    }

    this.rulesTable.setData(rows);
    this.requestRender();
  }

  onFocus(): void {
    this.element.style.border = { fg: colors.accent };
    this.rulesTable.focus();
    this.requestRender();
  }

  onBlur(): void {
    this.element.style.border = { fg: colors.primary };
    this.requestRender();
  }
}
