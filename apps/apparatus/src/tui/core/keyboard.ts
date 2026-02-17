/**
 * Keyboard Binding Manager for TUI Dashboard
 *
 * Centralized keyboard handling with context-aware bindings,
 * mode switching, and help generation.
 */

import type * as blessed from 'blessed';

/**
 * Keyboard binding handler signature
 */
export type KeyHandler = (key: string, ch: string) => void | boolean;

/**
 * Keyboard binding definition
 */
export interface KeyBinding {
  /** Keys that trigger this binding (e.g., ['q', 'Q', 'C-c']) */
  keys: string[];
  /** Human-readable description for help display */
  description: string;
  /** Handler function */
  handler: KeyHandler;
  /** Context/mode where this binding is active */
  context?: string;
  /** Category for help organization */
  category?: string;
  /** Whether this binding should be shown in help */
  hidden?: boolean;
}

/**
 * Keyboard binding category for help organization
 */
export interface BindingCategory {
  name: string;
  order: number;
}

/**
 * Default binding categories
 */
export const CATEGORIES: Record<string, BindingCategory> = {
  navigation: { name: 'Navigation', order: 1 },
  actions: { name: 'Actions', order: 2 },
  screens: { name: 'Screens', order: 3 },
  modals: { name: 'Modals', order: 4 },
  system: { name: 'System', order: 5 },
};

/**
 * Keyboard Manager for centralized key handling
 */
export class KeyboardManager {
  private screen: blessed.Widgets.Screen;
  private bindings: KeyBinding[] = [];
  private activeContext: string = 'default';
  private boundKeys: Set<string> = new Set();
  private keyHandlers: Map<string, KeyHandler> = new Map();

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
  }

  /**
   * Register a key binding
   */
  bind(binding: KeyBinding): void {
    this.bindings.push(binding);

    // Register with blessed screen
    for (const key of binding.keys) {
      if (!this.boundKeys.has(key)) {
        this.boundKeys.add(key);
        this.screen.key([key], (ch: string, keyInfo: unknown) => {
          this.handleKey(key, ch);
        });
      }
    }
  }

  /**
   * Register multiple bindings at once
   */
  bindAll(bindings: KeyBinding[]): void {
    for (const binding of bindings) {
      this.bind(binding);
    }
  }

  /**
   * Remove a binding by keys
   */
  unbind(keys: string[]): void {
    this.bindings = this.bindings.filter((b) =>
      !keys.some((k) => b.keys.includes(k))
    );
  }

  /**
   * Set the active context for context-aware bindings
   */
  setContext(context: string): void {
    this.activeContext = context;
  }

  /**
   * Get the active context
   */
  getContext(): string {
    return this.activeContext;
  }

  /**
   * Handle a key press
   */
  private handleKey(key: string, ch: string): void {
    // Find matching bindings for this key
    const matchingBindings = this.bindings.filter((b) => {
      if (!b.keys.includes(key)) return false;
      if (b.context && b.context !== this.activeContext && b.context !== 'global') {
        return false;
      }
      return true;
    });

    // Execute handlers (most specific context first)
    const contextBindings = matchingBindings.filter((b) => b.context === this.activeContext);
    const globalBindings = matchingBindings.filter((b) => !b.context || b.context === 'global');

    // Context-specific bindings take precedence
    for (const binding of contextBindings) {
      const result = binding.handler(key, ch);
      if (result === true) return; // Handler consumed the key
    }

    // Then global bindings
    for (const binding of globalBindings) {
      const result = binding.handler(key, ch);
      if (result === true) return;
    }
  }

  /**
   * Get all bindings for help display
   */
  getBindings(context?: string): KeyBinding[] {
    return this.bindings.filter((b) => {
      if (b.hidden) return false;
      if (context && b.context && b.context !== context && b.context !== 'global') {
        return false;
      }
      return true;
    });
  }

  /**
   * Get bindings organized by category
   */
  getBindingsByCategory(context?: string): Map<string, KeyBinding[]> {
    const bindings = this.getBindings(context);
    const categories = new Map<string, KeyBinding[]>();

    for (const binding of bindings) {
      const category = binding.category ?? 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(binding);
    }

    return categories;
  }

  /**
   * Generate help text for display
   */
  generateHelpText(context?: string): string {
    const byCategory = this.getBindingsByCategory(context);
    const lines: string[] = [];

    // Sort categories by order
    const sortedCategories = Array.from(byCategory.entries()).sort((a, b) => {
      const orderA = CATEGORIES[a[0]]?.order ?? 99;
      const orderB = CATEGORIES[b[0]]?.order ?? 99;
      return orderA - orderB;
    });

    for (const [category, bindings] of sortedCategories) {
      const categoryName = CATEGORIES[category]?.name ?? category;
      lines.push(`{bold}${categoryName}{/bold}`);

      for (const binding of bindings) {
        const keys = binding.keys.join(', ');
        lines.push(`  {cyan-fg}${keys.padEnd(12)}{/cyan-fg} ${binding.description}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Destroy the keyboard manager
   */
  destroy(): void {
    this.bindings = [];
    this.boundKeys.clear();
    this.keyHandlers.clear();
  }
}

/**
 * Create common navigation bindings
 */
export function createNavigationBindings(handlers: {
  onUp?: KeyHandler;
  onDown?: KeyHandler;
  onLeft?: KeyHandler;
  onRight?: KeyHandler;
  onEnter?: KeyHandler;
  onEscape?: KeyHandler;
}): KeyBinding[] {
  const bindings: KeyBinding[] = [];

  if (handlers.onUp) {
    bindings.push({
      keys: ['up', 'k'],
      description: 'Move up',
      handler: handlers.onUp,
      category: 'navigation',
    });
  }

  if (handlers.onDown) {
    bindings.push({
      keys: ['down', 'j'],
      description: 'Move down',
      handler: handlers.onDown,
      category: 'navigation',
    });
  }

  if (handlers.onLeft) {
    bindings.push({
      keys: ['left', 'h'],
      description: 'Move left',
      handler: handlers.onLeft,
      category: 'navigation',
    });
  }

  if (handlers.onRight) {
    bindings.push({
      keys: ['right', 'l'],
      description: 'Move right',
      handler: handlers.onRight,
      category: 'navigation',
    });
  }

  if (handlers.onEnter) {
    bindings.push({
      keys: ['enter'],
      description: 'Select / Confirm',
      handler: handlers.onEnter,
      category: 'navigation',
    });
  }

  if (handlers.onEscape) {
    bindings.push({
      keys: ['escape'],
      description: 'Cancel / Close',
      handler: handlers.onEscape,
      category: 'navigation',
    });
  }

  return bindings;
}

/**
 * Create default system bindings
 */
export function createSystemBindings(handlers: {
  onQuit: KeyHandler;
  onHelp: KeyHandler;
  onRefresh?: KeyHandler;
  onReconnect?: KeyHandler;
}): KeyBinding[] {
  const bindings: KeyBinding[] = [
    {
      keys: ['q', 'C-c'],
      description: 'Quit',
      handler: handlers.onQuit,
      category: 'system',
      context: 'global',
    },
    {
      keys: ['?', 'h'],
      description: 'Show help',
      handler: handlers.onHelp,
      category: 'system',
      context: 'global',
    },
  ];

  if (handlers.onRefresh) {
    bindings.push({
      keys: ['r'],
      description: 'Refresh data',
      handler: handlers.onRefresh,
      category: 'system',
      context: 'global',
    });
  }

  if (handlers.onReconnect) {
    bindings.push({
      keys: ['R'],
      description: 'Reconnect SSE',
      handler: handlers.onReconnect,
      category: 'system',
      context: 'global',
    });
  }

  return bindings;
}

/**
 * Create screen switching bindings (1-5)
 */
export function createScreenBindings(
  screenNames: string[],
  onSwitch: (index: number) => void
): KeyBinding[] {
  return screenNames.slice(0, 5).map((name, index) => ({
    keys: [String(index + 1)],
    description: `Switch to ${name}`,
    handler: () => onSwitch(index),
    category: 'screens',
    context: 'global',
  }));
}

/**
 * Fluent builder for keyboard bindings
 */
export class BindingBuilder {
  private binding: Partial<KeyBinding> = {};

  /**
   * Set the keys for this binding
   */
  keys(...keys: string[]): BindingBuilder {
    this.binding.keys = keys;
    return this;
  }

  /**
   * Set the description
   */
  description(desc: string): BindingBuilder {
    this.binding.description = desc;
    return this;
  }

  /**
   * Set the handler
   */
  handler(fn: KeyHandler): BindingBuilder {
    this.binding.handler = fn;
    return this;
  }

  /**
   * Set the context
   */
  context(ctx: string): BindingBuilder {
    this.binding.context = ctx;
    return this;
  }

  /**
   * Set the category
   */
  category(cat: string): BindingBuilder {
    this.binding.category = cat;
    return this;
  }

  /**
   * Mark as hidden
   */
  hidden(): BindingBuilder {
    this.binding.hidden = true;
    return this;
  }

  /**
   * Build the binding
   */
  build(): KeyBinding {
    if (!this.binding.keys || !this.binding.description || !this.binding.handler) {
      throw new Error('KeyBinding requires keys, description, and handler');
    }
    return this.binding as KeyBinding;
  }
}

/**
 * Create a new binding builder
 */
export function binding(): BindingBuilder {
  return new BindingBuilder();
}
