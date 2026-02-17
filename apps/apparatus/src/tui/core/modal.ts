/**
 * Modal Factory for TUI Dashboard
 *
 * Creates standardized modals for help, forms, confirmations,
 * and result displays with consistent styling.
 */

import blessed from 'blessed';
import { colors } from '../theme.js';

/**
 * Modal configuration options
 */
export interface ModalOptions {
  title: string;
  width?: string | number;
  height?: string | number;
  content?: string;
  style?: {
    border?: { fg: string };
    label?: { fg: string };
    fg?: string;
    bg?: string;
  };
}

/**
 * Form field definition
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'checkbox' | 'select';
  default?: string | boolean;
  options?: string[]; // For select type
  required?: boolean;
}

/**
 * Confirmation options
 */
export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

/**
 * Result display options
 */
export interface ResultOptions {
  title: string;
  content: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/**
 * Modal Manager for creating and managing modals
 */
export class ModalManager {
  private screen: blessed.Widgets.Screen;
  private activeModal: blessed.Widgets.BoxElement | null = null;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
  }

  /**
   * Check if a modal is currently open
   */
  isOpen(): boolean {
    return this.activeModal !== null;
  }

  /**
   * Close the active modal
   */
  close(): void {
    if (this.activeModal) {
      this.screen.remove(this.activeModal);
      this.activeModal = null;
      this.screen.render();
    }
  }

  /**
   * Show a help modal with scrollable content
   */
  showHelp(content: string, title = 'Help'): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      label: ` ${title} `,
      border: { type: 'line' },
      style: {
        border: { fg: colors.accent },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.primary },
      },
      content: `${content}\n\n{gray-fg}Press Esc or q to close{/gray-fg}`,
    });

    // Close on escape or q
    modal.key(['escape', 'q', 'enter'], () => {
      this.close();
    });

    modal.focus();
    this.activeModal = modal;
    this.screen.render();
  }

  /**
   * Show a form modal and return filled values
   */
  showForm(
    title: string,
    fields: FormField[],
    onSubmit: (values: Record<string, string>) => void,
    onCancel?: () => void
  ): void {
    this.close();

    const formHeight = Math.min(fields.length * 3 + 6, 20);

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: formHeight,
      label: ` ${title} `,
      border: { type: 'line' },
      style: {
        border: { fg: colors.accent },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
    });

    const form = blessed.form({
      parent: modal,
      keys: true,
      vi: true,
      top: 0,
      left: 1,
      width: '100%-4',
      height: '100%-2',
    });

    const inputs: Map<string, blessed.Widgets.TextboxElement> = new Map();
    let currentTop = 0;

    // Create form fields
    for (const field of fields) {
      // Label
      blessed.text({
        parent: form,
        top: currentTop,
        left: 0,
        content: `${field.label}:`,
        style: { fg: 'white' },
      });

      currentTop += 1;

      // Input
      const input = blessed.textbox({
        parent: form,
        top: currentTop,
        left: 0,
        width: '100%-2',
        height: 1,
        style: {
          fg: 'white',
          bg: 'black',
          focus: { bg: colors.primary },
        },
        inputOnFocus: true,
        value: field.default?.toString() ?? '',
      });

      inputs.set(field.name, input);
      currentTop += 2;
    }

    // Buttons
    const buttonRow = blessed.box({
      parent: form,
      top: currentTop,
      left: 0,
      width: '100%',
      height: 1,
    });

    const submitBtn = blessed.button({
      parent: buttonRow,
      left: 0,
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
      parent: buttonRow,
      left: 14,
      width: 12,
      height: 1,
      content: ' Cancel ',
      style: {
        fg: 'white',
        bg: 'gray',
        focus: { bg: 'red' },
      },
    });

    // Handle submit
    const handleSubmit = () => {
      const values: Record<string, string> = {};
      inputs.forEach((input, name) => {
        values[name] = input.getValue();
      });
      this.close();
      onSubmit(values);
    };

    // Handle cancel
    const handleCancel = () => {
      this.close();
      onCancel?.();
    };

    submitBtn.on('press', handleSubmit);
    cancelBtn.on('press', handleCancel);

    // Keyboard shortcuts
    modal.key(['escape'], handleCancel);
    form.key(['enter'], handleSubmit);

    // Focus first input
    const firstInput = inputs.values().next().value;
    if (firstInput) {
      firstInput.focus();
    }

    this.activeModal = modal;
    this.screen.render();
  }

  /**
   * Show a confirmation dialog
   */
  showConfirm(
    options: ConfirmOptions,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 9,
      label: ` ${options.title} `,
      border: { type: 'line' },
      style: {
        border: { fg: options.danger ? colors.error : colors.accent },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
    });

    // Message
    blessed.text({
      parent: modal,
      top: 1,
      left: 2,
      width: '100%-6',
      content: options.message,
      style: { fg: 'white' },
    });

    // Buttons
    const confirmLabel = options.confirmLabel ?? 'Confirm';
    const cancelLabel = options.cancelLabel ?? 'Cancel';

    const confirmBtn = blessed.button({
      parent: modal,
      top: 4,
      left: 2,
      width: confirmLabel.length + 4,
      height: 1,
      content: ` ${confirmLabel} `,
      style: {
        fg: 'white',
        bg: options.danger ? colors.error : colors.success,
        focus: { bg: options.danger ? 'red' : 'green' },
      },
    });

    const cancelBtn = blessed.button({
      parent: modal,
      top: 4,
      left: confirmLabel.length + 8,
      width: cancelLabel.length + 4,
      height: 1,
      content: ` ${cancelLabel} `,
      style: {
        fg: 'white',
        bg: 'gray',
        focus: { bg: 'gray' },
      },
    });

    // Handle confirm
    const handleConfirm = () => {
      this.close();
      onConfirm();
    };

    // Handle cancel
    const handleCancel = () => {
      this.close();
      onCancel?.();
    };

    confirmBtn.on('press', handleConfirm);
    cancelBtn.on('press', handleCancel);

    // Keyboard shortcuts
    modal.key(['escape', 'n', 'N'], handleCancel);
    modal.key(['enter', 'y', 'Y'], handleConfirm);

    confirmBtn.focus();
    this.activeModal = modal;
    this.screen.render();
  }

  /**
   * Show a result/status modal
   */
  showResult(options: ResultOptions): void {
    this.close();

    const colorMap: Record<string, string> = {
      success: colors.success,
      error: colors.error,
      info: colors.accent,
      warning: colors.warning,
    };

    const iconMap: Record<string, string> = {
      success: '✓',
      error: '✗',
      info: 'ℹ',
      warning: '⚠',
    };

    const borderColor = colorMap[options.type] ?? colors.accent;
    const icon = iconMap[options.type] ?? '';

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '50%',
      label: ` ${icon} ${options.title} `,
      border: { type: 'line' },
      style: {
        border: { fg: borderColor },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: borderColor },
      },
      content: `${options.content}\n\n{gray-fg}Press Esc or Enter to close{/gray-fg}`,
    });

    modal.key(['escape', 'enter', 'q'], () => {
      this.close();
    });

    modal.focus();
    this.activeModal = modal;
    this.screen.render();
  }

  /**
   * Show request details modal
   */
  showRequestDetails(request: {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    body?: unknown;
    ip?: string;
    timestamp?: string;
    latencyMs?: number;
  }): void {
    const lines: string[] = [];

    lines.push(`{bold}Method:{/bold} {cyan-fg}${request.method}{/cyan-fg}`);
    lines.push(`{bold}Path:{/bold} ${request.path}`);
    lines.push(`{bold}IP:{/bold} ${request.ip ?? 'unknown'}`);
    lines.push(`{bold}Time:{/bold} ${request.timestamp ?? 'unknown'}`);
    if (request.latencyMs !== undefined) {
      lines.push(`{bold}Latency:{/bold} ${request.latencyMs}ms`);
    }

    if (request.query && Object.keys(request.query).length > 0) {
      lines.push('');
      lines.push('{bold}Query:{/bold}');
      lines.push(JSON.stringify(request.query, null, 2));
    }

    if (request.headers && Object.keys(request.headers).length > 0) {
      lines.push('');
      lines.push('{bold}Headers:{/bold}');
      lines.push(JSON.stringify(request.headers, null, 2));
    }

    if (request.body) {
      lines.push('');
      lines.push('{bold}Body:{/bold}');
      lines.push(typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body, null, 2));
    }

    this.showHelp(lines.join('\n'), 'Request Details');
  }

  /**
   * Show loading indicator
   */
  showLoading(message = 'Loading...'): void {
    this.close();

    const modal = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 5,
      border: { type: 'line' },
      style: {
        border: { fg: colors.accent },
        fg: 'white',
        bg: 'black',
      },
      tags: true,
      content: `\n  {cyan-fg}⠋{/cyan-fg} ${message}`,
    });

    // Animate spinner
    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    const interval = setInterval(() => {
      if (!this.activeModal) {
        clearInterval(interval);
        return;
      }
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
      modal.setContent(`\n  {cyan-fg}${spinnerFrames[frameIndex]}{/cyan-fg} ${message}`);
      this.screen.render();
    }, 80);

    this.activeModal = modal;
    this.screen.render();
  }
}

/**
 * Create a modal manager instance
 */
export function createModalManager(screen: blessed.Widgets.Screen): ModalManager {
  return new ModalManager(screen);
}
