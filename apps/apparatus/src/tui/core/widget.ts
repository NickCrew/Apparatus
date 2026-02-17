/**
 * Widget System for TUI Dashboard
 *
 * Provides a modular widget architecture with lifecycle management,
 * state subscriptions, and keyboard handling.
 */

import { EventEmitter } from 'events';
import type * as blessed from 'blessed';
import type { Store, StateKey, DashboardState } from './store.js';

/**
 * Widget configuration for grid placement
 */
export interface WidgetConfig {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  label?: string;
  style?: {
    border?: { fg: string };
    label?: { fg: string };
    fg?: string;
    bg?: string;
  };
}

/**
 * Widget lifecycle interface
 */
export interface Widget<TState = unknown> {
  /** Unique widget identifier */
  readonly id: string;

  /** Grid placement configuration */
  readonly config: WidgetConfig;

  /** The blessed element (box, table, etc.) */
  readonly element: blessed.Widgets.BoxElement;

  /**
   * Mount the widget to the screen
   * Called once when the widget is added to a screen
   */
  mount(screen: blessed.Widgets.Screen, store: Store): void;

  /**
   * Update the widget display with new state
   * Called whenever subscribed state changes
   */
  render(state: TState): void;

  /**
   * Unmount the widget from the screen
   * Called when switching screens or destroying the dashboard
   */
  destroy(): void;

  /**
   * Handle keyboard input when widget is focused
   * Return true if the key was handled, false to propagate
   */
  handleKey?(key: string, ch: string): boolean;

  /**
   * Called when widget gains focus
   */
  onFocus?(): void;

  /**
   * Called when widget loses focus
   */
  onBlur?(): void;
}

/**
 * Options for creating a widget
 */
export interface WidgetOptions {
  id: string;
  config: WidgetConfig;
  subscriptions?: StateKey[];
  focusable?: boolean;
}

/**
 * Base widget class providing common functionality
 */
export abstract class BaseWidget<TState = DashboardState> extends EventEmitter implements Widget<TState> {
  readonly id: string;
  readonly config: WidgetConfig;
  abstract readonly element: blessed.Widgets.BoxElement;

  protected screen: blessed.Widgets.Screen | null = null;
  protected store: Store | null = null;
  protected subscriptions: StateKey[];
  protected unsubscribers: Array<() => void> = [];
  protected focusable: boolean;
  protected mounted = false;

  constructor(options: WidgetOptions) {
    super();
    this.id = options.id;
    this.config = options.config;
    this.subscriptions = options.subscriptions ?? [];
    this.focusable = options.focusable ?? false;
  }

  /**
   * Mount the widget and set up state subscriptions
   */
  mount(screen: blessed.Widgets.Screen, store: Store): void {
    if (this.mounted) {
      throw new Error(`Widget ${this.id} is already mounted`);
    }

    this.screen = screen;
    this.store = store;
    this.mounted = true;

    // Subscribe to state changes
    for (const key of this.subscriptions) {
      const unsubscribe = store.subscribe(key, () => {
        this.render(store.getState() as TState);
      });
      this.unsubscribers.push(unsubscribe);
    }

    // Subscribe to general change events for full state updates
    if (this.subscriptions.length === 0) {
      const handler = () => this.render(store.getState() as TState);
      store.on('change', handler);
      this.unsubscribers.push(() => store.off('change', handler));
    }

    // Initial render
    this.render(store.getState() as TState);

    // Set up focus handling if focusable
    if (this.focusable && this.element) {
      this.element.on('focus', () => this.onFocus?.());
      this.element.on('blur', () => this.onBlur?.());
    }

    // Lifecycle hook
    this.onMount?.();
  }

  /**
   * Unmount the widget and clean up subscriptions
   */
  destroy(): void {
    if (!this.mounted) return;

    // Lifecycle hook
    this.onUnmount?.();

    // Unsubscribe all listeners
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];

    // Remove element from screen
    if (this.element && this.screen) {
      this.screen.remove(this.element);
    }

    this.screen = null;
    this.store = null;
    this.mounted = false;
  }

  /**
   * Abstract render method - must be implemented by subclasses
   */
  abstract render(state: TState): void;

  /**
   * Default key handler - can be overridden
   */
  handleKey?(key: string, ch: string): boolean;

  /**
   * Focus gained handler
   */
  onFocus?(): void;

  /**
   * Focus lost handler
   */
  onBlur?(): void;

  /**
   * Called after mount completes
   */
  protected onMount?(): void;

  /**
   * Called before unmount begins
   */
  protected onUnmount?(): void;

  /**
   * Request a screen render
   */
  protected requestRender(): void {
    if (this.screen) {
      this.screen.render();
    }
  }

  /**
   * Get the current store state
   */
  protected getState(): DashboardState | null {
    return this.store?.getState() ?? null;
  }

  /**
   * Update store state
   */
  protected setState<K extends keyof DashboardState>(
    key: K,
    value: DashboardState[K]
  ): void {
    this.store?.set(key, value);
  }

  /**
   * Update UI state
   */
  protected setUIState<K extends keyof DashboardState['ui']>(
    key: K,
    value: DashboardState['ui'][K]
  ): void {
    this.store?.setUI(key, value);
  }
}

/**
 * Create blessed box options from widget config
 */
export function createBoxOptions(config: WidgetConfig): blessed.Widgets.BoxOptions {
  return {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    label: config.label ? ` ${config.label} ` : undefined,
    border: { type: 'line' },
    style: {
      border: { fg: config.style?.border?.fg ?? 'cyan' },
      label: { fg: config.style?.label?.fg ?? 'white' },
      fg: config.style?.fg ?? 'white',
      bg: config.style?.bg,
    },
    tags: true,
    scrollable: false,
  };
}

/**
 * Widget factory type for creating widgets
 */
export type WidgetFactory<T extends Widget = Widget> = (
  id: string,
  config: WidgetConfig
) => T;

/**
 * Widget registry for managing widget factories
 */
export class WidgetRegistry {
  private factories: Map<string, WidgetFactory> = new Map();

  /**
   * Register a widget factory
   */
  register<T extends Widget>(type: string, factory: WidgetFactory<T>): void {
    this.factories.set(type, factory as WidgetFactory);
  }

  /**
   * Create a widget by type
   */
  create(type: string, id: string, config: WidgetConfig): Widget {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown widget type: ${type}`);
    }
    return factory(id, config);
  }

  /**
   * Check if a widget type is registered
   */
  has(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Get all registered widget types
   */
  types(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Global widget registry instance
 */
export const widgetRegistry = new WidgetRegistry();
