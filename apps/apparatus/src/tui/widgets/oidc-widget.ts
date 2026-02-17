/**
 * OIDC/JWKS Display Widget
 *
 * Shows OIDC configuration and JWKS endpoint information
 * for testing authentication flows.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

interface OidcData {
  config?: {
    issuer: string;
    jwks_uri: string;
    authorization_endpoint: string;
    token_endpoint: string;
  };
  jwks?: {
    keys: Array<{
      kid: string;
      kty: string;
      use: string;
      alg: string;
    }>;
  };
  error?: string;
}

export class OidcWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private contentBox: blessed.Widgets.TextElement;
  private refreshBtn: blessed.Widgets.ButtonElement;

  private oidcData: OidcData = {};

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' OIDC Configuration ',
      style: {
        border: { fg: colors.accent },
        label: { fg: 'white' },
        fg: 'white',
        bg: 'black',
      },
    });

    // Content display
    this.contentBox = blessed.text({
      parent: this.element,
      top: 0,
      left: 1,
      width: '100%-2',
      height: '100%-3',
      content: '{gray-fg}Loading OIDC configuration...{/gray-fg}',
      tags: true,
      style: { fg: 'white' },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: { bg: 'gray' },
        style: { bg: colors.primary },
      },
    });

    // Refresh button
    this.refreshBtn = blessed.button({
      parent: this.element,
      bottom: 1,
      left: 1,
      width: 16,
      height: 1,
      content: ' Refresh ',
      style: {
        fg: 'white',
        bg: colors.accent,
        focus: { bg: 'blue' },
      },
    });

    // Button handler
    this.refreshBtn.on('press', () => this.handleRefresh());
  }

  render(_state: DashboardState): void {
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (this.oidcData.error) {
      this.contentBox.setContent(`{red-fg}Error: ${this.oidcData.error}{/red-fg}`);
    } else if (this.oidcData.config || this.oidcData.jwks) {
      const lines: string[] = [];

      if (this.oidcData.config) {
        lines.push('{bold}{cyan-fg}OIDC Discovery Configuration:{/cyan-fg}{/bold}');
        lines.push('');
        lines.push(`{bold}Issuer:{/bold} ${this.oidcData.config.issuer}`);
        lines.push(`{bold}JWKS URI:{/bold} ${this.oidcData.config.jwks_uri}`);
        lines.push(`{bold}Token Endpoint:{/bold} ${this.oidcData.config.token_endpoint}`);
        lines.push(`{bold}Auth Endpoint:{/bold} ${this.oidcData.config.authorization_endpoint}`);
        lines.push('');
      }

      if (this.oidcData.jwks && this.oidcData.jwks.keys.length > 0) {
        lines.push('{bold}{cyan-fg}JWKS Keys:{/cyan-fg}{/bold}');
        lines.push('');
        for (const key of this.oidcData.jwks.keys) {
          lines.push(`{bold}Key ID:{/bold} ${key.kid}`);
          lines.push(`{bold}Type:{/bold} ${key.kty}`);
          lines.push(`{bold}Use:{/bold} ${key.use}`);
          lines.push(`{bold}Algorithm:{/bold} ${key.alg}`);
          lines.push('');
        }
      }

      lines.push('{gray-fg}Press R to refresh or O to open in modal{/gray-fg}');

      this.contentBox.setContent(lines.join('\n'));
    } else {
      this.contentBox.setContent('{gray-fg}No data loaded. Press R to refresh.{/gray-fg}');
    }
    this.requestRender();
  }

  private handleRefresh(): void {
    // Emit event to fetch OIDC data
    this.emit('refresh-oidc');
  }

  /**
   * Update with OIDC configuration
   */
  public setOidcConfig(config: OidcData['config']): void {
    this.oidcData.config = config;
    this.oidcData.error = undefined;
    this.updateDisplay();
  }

  /**
   * Update with JWKS data
   */
  public setJwks(jwks: OidcData['jwks']): void {
    this.oidcData.jwks = jwks;
    this.oidcData.error = undefined;
    this.updateDisplay();
  }

  /**
   * Set error message
   */
  public setError(error: string): void {
    this.oidcData.error = error;
    this.updateDisplay();
  }

  handleKey(key: string): boolean {
    const lower = key.toLowerCase();
    if (lower === 'r') {
      this.handleRefresh();
      return true;
    }
    if (lower === 'o') {
      this.emit('show-oidc-modal');
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

  protected onMount(): void {
    // Auto-load OIDC data on mount
    setTimeout(() => this.handleRefresh(), 100);
  }
}

/**
 * Factory function for creating OIDC widgets
 */
export function createOidcWidget(id: string, config: WidgetConfig): OidcWidget {
  return new OidcWidget(id, config);
}
