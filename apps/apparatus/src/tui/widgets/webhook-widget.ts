/**
 * Webhook Inspector Widget
 *
 * View received webhooks by ID with body display and metadata.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import type { ModalManager } from '../core/modal.js';
import { colors, formatRelativeTime } from '../theme.js';

export interface Webhook {
  id: string;
  timestamp: string;
  source: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  queryParams?: Record<string, string>;
}

/**
 * Webhook Inspector Widget
 */
export class WebhookWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private webhooks: Webhook[] = [];
  private selectedIndex = 0;
  private modal: ModalManager | null = null;

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' Webhook Inspector ',
      keys: true,
      vi: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.warning },
      },
      style: {
        ...createBoxOptions(config).style,
        border: { fg: colors.warning },
      },
    });
  }

  /**
   * Inject modal manager
   */
  setModal(modal: ModalManager): void {
    this.modal = modal;
  }

  protected onMount(): void {
    // Fetch webhook data on mount
    this.fetchWebhooks();
  }

  render(state: DashboardState): void {
    const lines: string[] = [];

    // Header
    lines.push(`{bold}Total Webhooks:{/bold} ${this.webhooks.length}`);
    lines.push('');

    // Webhooks list
    if (this.webhooks.length === 0) {
      lines.push('  {gray-fg}No webhooks received{/gray-fg}');
      lines.push('');
      lines.push('  {gray-fg}Send a webhook to /webhook/:id to see it here{/gray-fg}');
    } else {
      lines.push('{bold}Recent Webhooks:{/bold}');
      lines.push('');

      for (let i = 0; i < this.webhooks.length; i++) {
        const webhook = this.webhooks[i];
        const selected = i === this.selectedIndex;
        const marker = selected ? '{yellow-fg}>{/yellow-fg} ' : '  ';
        const timestamp = formatRelativeTime(webhook.timestamp);

        lines.push(`${marker}{cyan-fg}${webhook.id}{/cyan-fg} {gray-fg}(${timestamp}){/gray-fg}`);
        lines.push(`    {bold}${webhook.method}{/bold} ${webhook.path} from {magenta-fg}${webhook.source}{/magenta-fg}`);

        // Show body preview for selected item
        if (selected) {
          const preview = this.getBodyPreview(webhook.body);
          lines.push(`    {bold}Body:{/bold} ${preview}`);
        }

        lines.push('');
      }

      lines.push('{gray-fg}↑/↓: navigate, Enter: view details, c: clear all, r: refresh{/gray-fg}');
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

    if (key === 'down' && this.selectedIndex < this.webhooks.length - 1) {
      this.selectedIndex++;
      this.render(this.getState()!);
      return true;
    }

    if (key === 'enter' && this.webhooks.length > 0) {
      this.viewSelectedWebhook();
      return true;
    }

    if (key === 'c') {
      this.clearWebhooks();
      return true;
    }

    if (key === 'r') {
      this.fetchWebhooks();
      return true;
    }

    return false;
  }

  private async fetchWebhooks(): Promise<void> {
    try {
      // Mock data for now - will be replaced with real API call
      this.webhooks = [
        {
          id: 'github-push-1',
          timestamp: new Date(Date.now() - 30000).toISOString(), // 30s ago
          source: 'github.com',
          method: 'POST',
          path: '/webhook/github',
          headers: {
            'x-github-event': 'push',
            'x-github-delivery': 'abc123',
            'content-type': 'application/json',
          },
          body: {
            ref: 'refs/heads/main',
            commits: [
              { message: 'feat: add new feature', author: 'John Doe' },
            ],
          },
          queryParams: {},
        },
        {
          id: 'stripe-payment-1',
          timestamp: new Date(Date.now() - 120000).toISOString(), // 2m ago
          source: 'stripe.com',
          method: 'POST',
          path: '/webhook/stripe',
          headers: {
            'stripe-signature': 'sig_abc123',
            'content-type': 'application/json',
          },
          body: {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                amount: 2000,
                currency: 'usd',
                status: 'succeeded',
              },
            },
          },
        },
        {
          id: 'slack-message-1',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5m ago
          source: 'slack.com',
          method: 'POST',
          path: '/webhook/slack',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: {
            text: 'Hello from Slack!',
            user_name: 'alice',
            channel_name: '#general',
          },
        },
      ];

      // Reset selection if out of bounds
      if (this.selectedIndex >= this.webhooks.length) {
        this.selectedIndex = Math.max(0, this.webhooks.length - 1);
      }

      this.render(this.getState()!);
    } catch (error) {
      this.element.setContent(`\n  {red-fg}Error loading webhooks:{/red-fg}\n  ${error instanceof Error ? error.message : String(error)}`);
      this.requestRender();
    }
  }

  private viewSelectedWebhook(): void {
    if (!this.modal || this.webhooks.length === 0) return;

    const webhook = this.webhooks[this.selectedIndex];
    const lines: string[] = [];

    lines.push(`{bold}ID:{/bold} ${webhook.id}`);
    lines.push(`{bold}Timestamp:{/bold} ${webhook.timestamp}`);
    lines.push(`{bold}Source:{/bold} ${webhook.source}`);
    lines.push(`{bold}Method:{/bold} ${webhook.method}`);
    lines.push(`{bold}Path:{/bold} ${webhook.path}`);
    lines.push('');

    // Query params
    if (webhook.queryParams && Object.keys(webhook.queryParams).length > 0) {
      lines.push('{bold}Query Parameters:{/bold}');
      lines.push(JSON.stringify(webhook.queryParams, null, 2));
      lines.push('');
    }

    // Headers
    lines.push('{bold}Headers:{/bold}');
    lines.push(JSON.stringify(webhook.headers, null, 2));
    lines.push('');

    // Body
    lines.push('{bold}Body:{/bold}');
    const bodyStr = typeof webhook.body === 'string'
      ? webhook.body
      : JSON.stringify(webhook.body, null, 2);
    lines.push(bodyStr);

    this.modal.showHelp(lines.join('\n'), 'Webhook Details');
  }

  private clearWebhooks(): void {
    if (!this.modal) return;

    if (this.webhooks.length === 0) {
      this.modal.showResult({
        title: 'Info',
        content: 'No webhooks to clear',
        type: 'info',
      });
      return;
    }

    this.modal.showConfirm(
      {
        title: 'Confirm Clear',
        message: `Clear all ${this.webhooks.length} webhooks?`,
        danger: true,
      },
      () => {
        const count = this.webhooks.length;
        this.webhooks = [];
        this.selectedIndex = 0;

        this.modal!.showResult({
          title: 'Success',
          content: `Cleared ${count} webhooks`,
          type: 'success',
        });

        this.render(this.getState()!);
      }
    );
  }

  private getBodyPreview(body: unknown): string {
    if (body === null) return '{gray-fg}null{/gray-fg}';
    if (body === undefined) return '{gray-fg}undefined{/gray-fg}';

    if (typeof body === 'string') {
      const preview = body.substring(0, 60);
      return `{green-fg}"${preview}${body.length > 60 ? '...' : ''}"{/green-fg}`;
    }

    if (typeof body === 'object') {
      const keys = Object.keys(body as object);
      return `{yellow-fg}{${keys.length} keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}{/yellow-fg}`;
    }

    return String(body).substring(0, 60);
  }
}

/**
 * Factory function for widget registry
 */
export function createWebhookWidget(id: string, config: WidgetConfig): WebhookWidget {
  return new WebhookWidget(id, config);
}
