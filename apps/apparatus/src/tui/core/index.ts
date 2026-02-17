/**
 * Core TUI Infrastructure
 *
 * Exports all core abstractions for the modular TUI dashboard.
 */

// State Management
export {
  Store,
  createStore,
  createInitialState,
  type DashboardState,
  type UIState,
  type StateKey,
  type StateListener,
} from './store.js';

// Widget System
export {
  BaseWidget,
  WidgetRegistry,
  widgetRegistry,
  createBoxOptions,
  type Widget,
  type WidgetConfig,
  type WidgetOptions,
  type WidgetFactory,
} from './widget.js';

// Screen Management
export {
  ScreenManager,
  ScreenBuilder,
  createScreen,
  screen,
  type ScreenDefinition,
  type TabBarConfig,
} from './screen-manager.js';

// Keyboard Management
export {
  KeyboardManager,
  BindingBuilder,
  binding,
  createNavigationBindings,
  createSystemBindings,
  createScreenBindings,
  CATEGORIES,
  type KeyBinding,
  type KeyHandler,
  type BindingCategory,
} from './keyboard.js';

// Modal System
export {
  ModalManager,
  createModalManager,
  type ModalOptions,
  type FormField,
  type ConfirmOptions,
  type ResultOptions,
} from './modal.js';

// Action Handler
export {
  ActionHandler,
  createActionHandler,
  createTarpitActions,
  createRefreshActions,
  type ActionResult,
  type ActionDefinition,
  type ActionContext,
} from './action-handler.js';
