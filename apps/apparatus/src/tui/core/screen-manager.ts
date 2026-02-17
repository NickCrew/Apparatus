/**
 * Screen Manager for TUI Dashboard
 *
 * Manages multiple screens with tab navigation (1-5 shortcuts),
 * widget mounting/unmounting, and screen transitions.
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import type { Store } from './store.js';
import type { Widget, WidgetConfig } from './widget.js';
import { colors } from '../theme.js';

/**
 * Screen definition with widgets
 */
export interface ScreenDefinition {
  id: string;
  name: string;
  shortcut: string;
  widgets: Array<{
    widget: Widget;
    config: WidgetConfig;
  }>;
}

/**
 * Tab bar configuration
 */
export interface TabBarConfig {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

/**
 * Screen Manager handles tab navigation and widget lifecycle
 */
export class ScreenManager {
  private screen: blessed.Widgets.Screen;
  private store: Store;
  private grid: contrib.grid;
  private screens: Map<string, ScreenDefinition> = new Map();
  private screenOrder: string[] = [];
  private activeScreenId: string | null = null;
  private mountedWidgets: Widget[] = [];
  private tabBar: blessed.Widgets.BoxElement | null = null;
  private contentContainer: blessed.Widgets.BoxElement | null = null;

  constructor(screen: blessed.Widgets.Screen, store: Store) {
    this.screen = screen;
    this.store = store;
    this.grid = new contrib.grid({ rows: 12, cols: 12, screen });
  }

  /**
   * Register a screen definition
   */
  registerScreen(definition: ScreenDefinition): void {
    this.screens.set(definition.id, definition);
    this.screenOrder.push(definition.id);
  }

  /**
   * Initialize the screen manager with tab bar
   */
  initialize(tabBarConfig?: TabBarConfig): void {
    const config = tabBarConfig ?? { row: 0, col: 0, rowSpan: 1, colSpan: 12 };

    // Create tab bar
    this.tabBar = this.grid.set(
      config.row,
      config.col,
      config.rowSpan,
      config.colSpan,
      blessed.box,
      {
        tags: true,
        style: {
          fg: 'white',
          bg: 'black',
        },
      }
    );

    this.updateTabBar();

    // Set up keyboard handlers for tab switching
    this.setupKeyboardHandlers();

    // Subscribe to active screen changes
    this.store.subscribe('ui.activeScreen', (newScreen: string) => {
      if (newScreen !== this.activeScreenId) {
        this.switchToScreen(newScreen);
      }
    });
  }

  /**
   * Switch to a specific screen by ID
   */
  switchToScreen(screenId: string): void {
    const definition = this.screens.get(screenId);
    if (!definition) {
      console.error(`Screen not found: ${screenId}`);
      return;
    }

    // Unmount current widgets
    this.unmountCurrentWidgets();

    // Update active screen
    this.activeScreenId = screenId;
    this.store.setUI('activeScreen', screenId);

    // Mount new widgets
    this.mountScreenWidgets(definition);

    // Update tab bar highlight
    this.updateTabBar();

    // Render the screen
    this.screen.render();
  }

  /**
   * Switch to the next screen
   */
  nextScreen(): void {
    if (!this.activeScreenId || this.screenOrder.length === 0) return;

    const currentIndex = this.screenOrder.indexOf(this.activeScreenId);
    const nextIndex = (currentIndex + 1) % this.screenOrder.length;
    this.switchToScreen(this.screenOrder[nextIndex]);
  }

  /**
   * Switch to the previous screen
   */
  prevScreen(): void {
    if (!this.activeScreenId || this.screenOrder.length === 0) return;

    const currentIndex = this.screenOrder.indexOf(this.activeScreenId);
    const prevIndex = currentIndex === 0 ? this.screenOrder.length - 1 : currentIndex - 1;
    this.switchToScreen(this.screenOrder[prevIndex]);
  }

  /**
   * Get the active screen ID
   */
  getActiveScreen(): string | null {
    return this.activeScreenId;
  }

  /**
   * Get all registered screen IDs
   */
  getScreenIds(): string[] {
    return [...this.screenOrder];
  }

  /**
   * Get a screen definition by ID
   */
  getScreen(screenId: string): ScreenDefinition | undefined {
    return this.screens.get(screenId);
  }

  /**
   * Destroy the screen manager and all widgets
   */
  destroy(): void {
    this.unmountCurrentWidgets();
    this.screens.clear();
    this.screenOrder = [];
    this.activeScreenId = null;
  }

  /**
   * Get the grid instance for widget placement
   */
  getGrid(): contrib.grid {
    return this.grid;
  }

  /**
   * Get the blessed screen instance
   */
  getBlessedScreen(): blessed.Widgets.Screen {
    return this.screen;
  }

  /**
   * Mount widgets for a screen
   */
  private mountScreenWidgets(definition: ScreenDefinition): void {
    for (const { widget, config } of definition.widgets) {
      // Position widget in grid
      const element = this.grid.set(
        config.row,
        config.col,
        config.rowSpan,
        config.colSpan,
        blessed.box,
        {
          label: config.label ? ` ${config.label} ` : undefined,
          border: { type: 'line' },
          style: {
            border: { fg: config.style?.border?.fg ?? 'cyan' },
            label: { fg: config.style?.label?.fg ?? 'white' },
            fg: config.style?.fg ?? 'white',
            bg: config.style?.bg,
          },
          tags: true,
        }
      );

      // Replace widget element with grid-positioned element
      // Note: In blessed-contrib, we use the grid to position elements
      // and then mount the widget to update content
      widget.mount(this.screen, this.store);
      this.mountedWidgets.push(widget);
    }
  }

  /**
   * Unmount all currently mounted widgets
   */
  private unmountCurrentWidgets(): void {
    for (const widget of this.mountedWidgets) {
      widget.destroy();
    }
    this.mountedWidgets = [];
  }

  /**
   * Update the tab bar display
   */
  private updateTabBar(): void {
    if (!this.tabBar) return;

    const tabs: string[] = [];

    for (let i = 0; i < this.screenOrder.length; i++) {
      const screenId = this.screenOrder[i];
      const definition = this.screens.get(screenId);
      if (!definition) continue;

      const shortcut = definition.shortcut;
      const name = definition.name;
      const isActive = screenId === this.activeScreenId;

      if (isActive) {
        tabs.push(`{${colors.primary}-bg}{black-fg} ${shortcut}:${name} {/}`);
      } else {
        tabs.push(`{gray-fg}[${shortcut}] ${name}{/gray-fg}`);
      }
    }

    const tabContent = tabs.join('  ');
    const helpHint = '{gray-fg}Press 1-5 to switch tabs | ? for help{/gray-fg}';

    this.tabBar.setContent(`${tabContent}    ${helpHint}`);
  }

  /**
   * Set up keyboard handlers for tab switching
   */
  private setupKeyboardHandlers(): void {
    // Number keys 1-5 for tab switching
    const numberKeys = ['1', '2', '3', '4', '5'];

    this.screen.key(numberKeys, (ch: string) => {
      const index = parseInt(ch, 10) - 1;
      if (index >= 0 && index < this.screenOrder.length) {
        this.switchToScreen(this.screenOrder[index]);
      }
    });

    // Tab and Shift-Tab for cycling
    this.screen.key(['tab'], () => {
      this.nextScreen();
    });

    this.screen.key(['S-tab'], () => {
      this.prevScreen();
    });
  }
}

/**
 * Create a screen definition
 */
export function createScreen(
  id: string,
  name: string,
  shortcut: string,
  widgets: Array<{ widget: Widget; config: WidgetConfig }>
): ScreenDefinition {
  return { id, name, shortcut, widgets };
}

/**
 * Screen builder for fluent API
 */
export class ScreenBuilder {
  private id: string;
  private name: string;
  private shortcut: string;
  private widgets: Array<{ widget: Widget; config: WidgetConfig }> = [];

  constructor(id: string, name: string, shortcut: string) {
    this.id = id;
    this.name = name;
    this.shortcut = shortcut;
  }

  /**
   * Add a widget to the screen
   */
  addWidget(widget: Widget, config: WidgetConfig): ScreenBuilder {
    this.widgets.push({ widget, config });
    return this;
  }

  /**
   * Build the screen definition
   */
  build(): ScreenDefinition {
    return {
      id: this.id,
      name: this.name,
      shortcut: this.shortcut,
      widgets: this.widgets,
    };
  }
}

/**
 * Create a new screen builder
 */
export function screen(id: string, name: string, shortcut: string): ScreenBuilder {
  return new ScreenBuilder(id, name, shortcut);
}
