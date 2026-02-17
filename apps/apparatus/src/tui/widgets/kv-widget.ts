/**
 * KV Store Widget
 *
 * List, view, edit, and delete key-value pairs with JSON formatting.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import type { ModalManager } from '../core/modal.js';
import type { ActionHandler } from '../core/action-handler.js';
import { colors } from '../theme.js';

export interface KVEntry {
  key: string;
  value: unknown;
  type: string;
}

/**
 * KV Store Widget
 */
export class KVWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private kvData: KVEntry[] = [];
  private selectedIndex = 0;
  private modal: ModalManager | null = null;
  private actionHandler: ActionHandler | null = null;

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' KV Store ',
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.success },
      },
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.success },
      },
    });
  }

  /**
   * Inject modal manager and action handler
   */
  setDependencies(modal: ModalManager, actionHandler: ActionHandler): void {
    this.modal = modal;
    this.actionHandler = actionHandler;
  }

  protected onMount(): void {
    // Fetch KV data on mount
    this.fetchKVData();
  }

  render(state: DashboardState): void {
    const lines: string[] = [];

    // Header
    lines.push(`{bold}Total Keys:{/bold} ${this.kvData.length}`);
    lines.push('');

    // Keys list
    if (this.kvData.length === 0) {
      lines.push('  {gray-fg}No keys found{/gray-fg}');
      lines.push('');
      lines.push('  {gray-fg}Press n to create a new key{/gray-fg}');
    } else {
      lines.push('{bold}Keys:{/bold}');
      lines.push('');

      for (let i = 0; i < this.kvData.length; i++) {
        const entry = this.kvData[i];
        const selected = i === this.selectedIndex;
        const marker = selected ? '{yellow-fg}>{/yellow-fg} ' : '  ';

        lines.push(`${marker}{cyan-fg}${entry.key}{/cyan-fg} {gray-fg}(${entry.type}){/gray-fg}`);

        // Show value preview for selected item
        if (selected) {
          const preview = this.getValuePreview(entry.value);
          lines.push(`    ${preview}`);
        }
      }

      lines.push('');
      lines.push('{gray-fg}↑/↓: navigate, Enter: view, e: edit, d: delete, n: new, r: refresh{/gray-fg}');
    }

    this.element.setContent(lines.join('\n'));
    this.requestRender();
  }

  handleKey(key: string): boolean {
    if (key === 'up' && this.selectedIndex > 0) {
      this.selectedIndex--;
      this.render(this.getState()!);
      return true;
    }

    if (key === 'down' && this.selectedIndex < this.kvData.length - 1) {
      this.selectedIndex++;
      this.render(this.getState()!);
      return true;
    }

    if (key === 'enter' && this.kvData.length > 0) {
      this.viewSelectedEntry();
      return true;
    }

    if (key === 'e' && this.kvData.length > 0) {
      this.editSelectedEntry();
      return true;
    }

    if (key === 'd' && this.kvData.length > 0) {
      this.deleteSelectedEntry();
      return true;
    }

    if (key === 'n') {
      this.createNewEntry();
      return true;
    }

    if (key === 'r') {
      this.fetchKVData();
      return true;
    }

    return false;
  }

  private async fetchKVData(): Promise<void> {
    try {
      // Mock data for now - will be replaced with real API call
      this.kvData = [
        { key: 'config:server', value: { host: '0.0.0.0', port: 8080, ssl: true }, type: 'object' },
        { key: 'cache:user:123', value: 'John Doe', type: 'string' },
        { key: 'counter:requests', value: 42567, type: 'number' },
        { key: 'flag:maintenance', value: false, type: 'boolean' },
        { key: 'list:tags', value: ['production', 'web', 'api'], type: 'array' },
      ];

      // Reset selection if out of bounds
      if (this.selectedIndex >= this.kvData.length) {
        this.selectedIndex = Math.max(0, this.kvData.length - 1);
      }

      this.render(this.getState()!);
    } catch (error) {
      this.element.setContent(`\n  {red-fg}Error loading KV data:{/red-fg}\n  ${error instanceof Error ? error.message : String(error)}`);
      this.requestRender();
    }
  }

  private viewSelectedEntry(): void {
    if (!this.modal || this.kvData.length === 0) return;

    const entry = this.kvData[this.selectedIndex];
    const formatted = JSON.stringify(entry.value, null, 2);

    this.modal.showHelp(
      `{bold}Key:{/bold} ${entry.key}\n{bold}Type:{/bold} ${entry.type}\n\n{bold}Value:{/bold}\n${formatted}`,
      'KV Entry Details'
    );
  }

  private editSelectedEntry(): void {
    if (!this.modal || this.kvData.length === 0) return;

    const entry = this.kvData[this.selectedIndex];
    const currentValue = JSON.stringify(entry.value, null, 2);

    this.modal.showForm(
      'Edit KV Entry',
      [
        { name: 'key', label: 'Key', type: 'text', default: entry.key, required: true },
        { name: 'value', label: 'Value (JSON)', type: 'text', default: currentValue, required: true },
      ],
      async (values) => {
        try {
          const parsedValue = JSON.parse(values.value);

          // Update entry
          entry.key = values.key;
          entry.value = parsedValue;
          entry.type = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;

          this.modal!.showResult({
            title: 'Success',
            content: `Updated key: ${values.key}`,
            type: 'success',
          });

          this.render(this.getState()!);
        } catch (error) {
          this.modal!.showResult({
            title: 'Error',
            content: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private deleteSelectedEntry(): void {
    if (!this.modal || this.kvData.length === 0) return;

    const entry = this.kvData[this.selectedIndex];

    this.modal.showConfirm(
      {
        title: 'Confirm Delete',
        message: `Delete key "${entry.key}"?`,
        danger: true,
      },
      () => {
        // Remove from list
        this.kvData.splice(this.selectedIndex, 1);

        // Adjust selection
        if (this.selectedIndex >= this.kvData.length) {
          this.selectedIndex = Math.max(0, this.kvData.length - 1);
        }

        this.modal!.showResult({
          title: 'Success',
          content: `Deleted key: ${entry.key}`,
          type: 'success',
        });

        this.render(this.getState()!);
      }
    );
  }

  private createNewEntry(): void {
    if (!this.modal) return;

    this.modal.showForm(
      'Create KV Entry',
      [
        { name: 'key', label: 'Key', type: 'text', required: true },
        { name: 'value', label: 'Value (JSON)', type: 'text', default: '""', required: true },
      ],
      async (values) => {
        try {
          const parsedValue = JSON.parse(values.value);

          // Add new entry
          const newEntry: KVEntry = {
            key: values.key,
            value: parsedValue,
            type: Array.isArray(parsedValue) ? 'array' : typeof parsedValue,
          };

          this.kvData.push(newEntry);
          this.selectedIndex = this.kvData.length - 1;

          this.modal!.showResult({
            title: 'Success',
            content: `Created key: ${values.key}`,
            type: 'success',
          });

          this.render(this.getState()!);
        } catch (error) {
          this.modal!.showResult({
            title: 'Error',
            content: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
            type: 'error',
          });
        }
      }
    );
  }

  private getValuePreview(value: unknown): string {
    if (value === null) return '{gray-fg}null{/gray-fg}';
    if (value === undefined) return '{gray-fg}undefined{/gray-fg}';

    const type = Array.isArray(value) ? 'array' : typeof value;

    switch (type) {
      case 'string':
        return `{green-fg}"${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}"{/green-fg}`;
      case 'number':
        return `{cyan-fg}${value}{/cyan-fg}`;
      case 'boolean':
        return value ? '{green-fg}true{/green-fg}' : '{red-fg}false{/red-fg}';
      case 'array':
        return `{yellow-fg}[${(value as unknown[]).length} items]{/yellow-fg}`;
      case 'object':
        return `{yellow-fg}{${Object.keys(value as object).length} keys}{/yellow-fg}`;
      default:
        return String(value).substring(0, 50);
    }
  }
}

/**
 * Factory function for widget registry
 */
export function createKVWidget(id: string, config: WidgetConfig): KVWidget {
  return new KVWidget(id, config);
}
