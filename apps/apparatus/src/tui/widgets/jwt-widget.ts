/**
 * JWT Tools Widget
 *
 * Provides JWT token minting and decoding capabilities
 * with interactive controls.
 */

import blessed from 'blessed';
import { BaseWidget, createBoxOptions, type WidgetConfig } from '../core/widget.js';
import type { DashboardState } from '../core/store.js';
import { colors } from '../theme.js';

interface JwtState {
  lastToken?: string;
  lastDecoded?: {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
  };
  error?: string;
}

export class JwtWidget extends BaseWidget<DashboardState> {
  readonly element: blessed.Widgets.BoxElement;
  private statusText: blessed.Widgets.TextElement;
  private mintBtn: blessed.Widgets.ButtonElement;
  private decodeBtn: blessed.Widgets.ButtonElement;
  private tokenDisplay: blessed.Widgets.TextElement;

  private jwtState: JwtState = {};

  constructor(id: string, config: WidgetConfig) {
    super({
      id,
      config,
      subscriptions: [],
      focusable: true,
    });

    this.element = blessed.box({
      ...createBoxOptions(config),
      label: config.label ?? ' JWT Tools ',
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
      content: '{gray-fg}JWT Tools{/gray-fg}',
      tags: true,
      style: { fg: 'white' },
    });

    // Mint button
    this.mintBtn = blessed.button({
      parent: this.element,
      top: 2,
      left: 1,
      width: 18,
      height: 1,
      content: ' Mint Token ',
      style: {
        fg: 'white',
        bg: colors.success,
        focus: { bg: 'green' },
      },
    });

    // Decode button
    this.decodeBtn = blessed.button({
      parent: this.element,
      top: 2,
      left: 20,
      width: 18,
      height: 1,
      content: ' Decode Token ',
      style: {
        fg: 'white',
        bg: colors.accent,
        focus: { bg: 'blue' },
      },
    });

    // Token display area
    this.tokenDisplay = blessed.text({
      parent: this.element,
      top: 4,
      left: 1,
      width: '100%-2',
      height: '100%-6',
      content: '{gray-fg}No token yet\n\nPress M to mint or D to decode{/gray-fg}',
      tags: true,
      style: { fg: 'white' },
      scrollable: true,
    });

    // Button handlers
    this.mintBtn.on('press', () => this.handleMint());
    this.decodeBtn.on('press', () => this.handleDecode());
  }

  render(_state: DashboardState): void {
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (this.jwtState.error) {
      this.statusText.setContent(`{red-fg}Error: ${this.jwtState.error}{/red-fg}`);
      this.tokenDisplay.setContent(`{red-fg}${this.jwtState.error}{/red-fg}`);
    } else if (this.jwtState.lastDecoded) {
      this.statusText.setContent('{green-fg}Token Decoded{/green-fg}');
      const lines = [
        '{bold}Header:{/bold}',
        JSON.stringify(this.jwtState.lastDecoded.header, null, 2),
        '',
        '{bold}Payload:{/bold}',
        JSON.stringify(this.jwtState.lastDecoded.payload, null, 2),
      ];
      this.tokenDisplay.setContent(lines.join('\n'));
    } else if (this.jwtState.lastToken) {
      this.statusText.setContent('{green-fg}Token Minted{/green-fg}');
      this.tokenDisplay.setContent(
        `{bold}Token:{/bold}\n\n${this.jwtState.lastToken}\n\n{gray-fg}Press D to decode or copy to clipboard{/gray-fg}`
      );
    } else {
      this.statusText.setContent('{gray-fg}JWT Tools{/gray-fg}');
      this.tokenDisplay.setContent(
        '{gray-fg}No token yet\n\nPress M to mint or D to decode{/gray-fg}'
      );
    }
    this.requestRender();
  }

  private handleMint(): void {
    // Emit event to open mint modal
    this.emit('mint-jwt');
  }

  private handleDecode(): void {
    // Emit event to open decode modal
    this.emit('decode-jwt');
  }

  /**
   * Update with minted token
   */
  public setMintedToken(token: string): void {
    this.jwtState.lastToken = token;
    this.jwtState.lastDecoded = undefined;
    this.jwtState.error = undefined;
    this.updateDisplay();
  }

  /**
   * Update with decoded token
   */
  public setDecodedToken(header: Record<string, unknown>, payload: Record<string, unknown>): void {
    this.jwtState.lastDecoded = { header, payload };
    this.jwtState.error = undefined;
    this.updateDisplay();
  }

  /**
   * Set error message
   */
  public setError(error: string): void {
    this.jwtState.error = error;
    this.updateDisplay();
  }

  handleKey(key: string): boolean {
    const lower = key.toLowerCase();
    if (lower === 'm' || lower === 'j') {
      this.handleMint();
      return true;
    }
    if (lower === 'd') {
      this.handleDecode();
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
 * Factory function for creating JWT widgets
 */
export function createJwtWidget(id: string, config: WidgetConfig): JwtWidget {
  return new JwtWidget(id, config);
}
