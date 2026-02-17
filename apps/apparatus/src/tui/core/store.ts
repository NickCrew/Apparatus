/**
 * Centralized State Management for TUI Dashboard
 *
 * Provides reactive state management with per-key subscriptions,
 * enabling efficient widget updates without full re-renders.
 */

import { EventEmitter } from 'events';
import type {
  HealthStatus,
  TarpitStatus,
  DeceptionHistory,
  RequestEntry,
} from '../types.js';

/**
 * UI-specific state for focus, selection, and filters
 */
export interface UIState {
  activeScreen: string;
  focusedWidget: string | null;
  selectedTarpitIndex: number;
  selectedRequestIndex: number;
  logFilter: {
    method?: string;
    pathContains?: string;
    ipContains?: string;
  };
  modalVisible: boolean;
  modalType: string | null;
}

/**
 * Complete dashboard state
 */
export interface DashboardState {
  // Connection state
  connected: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Data from APIs
  health: HealthStatus | null;
  tarpit: TarpitStatus | null;
  deception: DeceptionHistory | null;

  // Streaming data
  requests: RequestEntry[];

  // Counters
  requestCount: number;
  deceptionCount: number;

  // UI state
  ui: UIState;
}

/**
 * State change listener signature
 */
export type StateListener<T> = (newValue: T, oldValue: T | undefined) => void;

/**
 * State key paths for subscriptions
 */
export type StateKey = keyof DashboardState | `ui.${keyof UIState}`;

/**
 * Create initial dashboard state
 */
export function createInitialState(): DashboardState {
  return {
    connected: false,
    error: null,
    lastUpdated: null,

    health: null,
    tarpit: null,
    deception: null,

    requests: [],

    requestCount: 0,
    deceptionCount: 0,

    ui: {
      activeScreen: 'main',
      focusedWidget: null,
      selectedTarpitIndex: 0,
      selectedRequestIndex: 0,
      logFilter: {},
      modalVisible: false,
      modalType: null,
    },
  };
}

/**
 * Centralized Store with reactive subscriptions
 */
export class Store extends EventEmitter {
  private state: DashboardState;
  private stateListeners: Map<StateKey, Set<StateListener<unknown>>> = new Map();
  private maxRequests: number;
  private maxDeceptionEvents: number;

  constructor(options?: {
    maxRequests?: number;
    maxDeceptionEvents?: number;
  }) {
    super();
    this.state = createInitialState();
    this.maxRequests = options?.maxRequests ?? 100;
    this.maxDeceptionEvents = options?.maxDeceptionEvents ?? 50;
  }

  /**
   * Get current state (immutable snapshot)
   */
  getState(): Readonly<DashboardState> {
    return this.state;
  }

  /**
   * Get a specific state value
   */
  get<K extends keyof DashboardState>(key: K): DashboardState[K] {
    return this.state[key];
  }

  /**
   * Get UI state value
   */
  getUI<K extends keyof UIState>(key: K): UIState[K] {
    return this.state.ui[key];
  }

  /**
   * Update state and notify subscribers
   */
  set<K extends keyof DashboardState>(
    key: K,
    value: DashboardState[K]
  ): void {
    const oldValue = this.state[key];
    if (oldValue === value) return;

    this.state = { ...this.state, [key]: value };
    this.notifyListeners(key, value, oldValue);
    this.emit('change', key, value, oldValue);
  }

  /**
   * Update UI state
   */
  setUI<K extends keyof UIState>(key: K, value: UIState[K]): void {
    const oldValue = this.state.ui[key];
    if (oldValue === value) return;

    this.state = {
      ...this.state,
      ui: { ...this.state.ui, [key]: value },
    };
    this.notifyListeners(`ui.${key}` as StateKey, value, oldValue);
    this.emit('change', `ui.${key}`, value, oldValue);
  }

  /**
   * Batch update multiple state keys
   */
  batch(updates: Partial<DashboardState>): void {
    const changes: Array<{ key: StateKey; newValue: unknown; oldValue: unknown }> = [];

    for (const [key, value] of Object.entries(updates)) {
      const k = key as keyof DashboardState;
      const oldValue = this.state[k];
      if (oldValue !== value) {
        changes.push({ key: k, newValue: value, oldValue });
      }
    }

    if (changes.length === 0) return;

    this.state = { ...this.state, ...updates };

    for (const { key, newValue, oldValue } of changes) {
      this.notifyListeners(key, newValue, oldValue);
    }

    this.emit('batch', changes);
  }

  /**
   * Subscribe to state changes for a specific key
   */
  subscribe<T>(key: StateKey, listener: StateListener<T>): () => void {
    if (!this.stateListeners.has(key)) {
      this.stateListeners.set(key, new Set());
    }
    this.stateListeners.get(key)!.add(listener as StateListener<unknown>);

    // Return unsubscribe function
    return () => {
      const keyListeners = this.stateListeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener as StateListener<unknown>);
        if (keyListeners.size === 0) {
          this.stateListeners.delete(key);
        }
      }
    };
  }

  /**
   * Add a request to the circular buffer
   */
  addRequest(request: RequestEntry): void {
    const requests = [request, ...this.state.requests];
    if (requests.length > this.maxRequests) {
      requests.pop();
    }
    this.set('requests', requests);
    this.set('requestCount', this.state.requestCount + 1);
  }

  /**
   * Add a deception event
   */
  addDeceptionEvent(event: { type: string; ip: string; route: string; timestamp: string; details?: Record<string, unknown> }): void {
    const fullEvent = {
      ...event,
      type: event.type as 'honeypot_hit' | 'shell_command' | 'sqli_probe',
      details: event.details ?? {},
    };
    if (!this.state.deception) {
      this.set('deception', { events: [fullEvent], count: 1 });
    } else {
      const events = [fullEvent, ...this.state.deception.events];
      if (events.length > this.maxDeceptionEvents) {
        events.pop();
      }
      this.set('deception', {
        events,
        count: this.state.deception.count + 1,
      });
    }
    this.set('deceptionCount', this.state.deceptionCount + 1);
  }

  /**
   * Update connection status
   */
  setConnected(connected: boolean, error?: string): void {
    this.batch({
      connected,
      error: error ?? null,
      lastUpdated: connected ? new Date() : this.state.lastUpdated,
    });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.set('error', null);
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    const initial = createInitialState();
    this.batch(initial);
  }

  /**
   * Get filtered requests based on current UI filter
   */
  getFilteredRequests(): RequestEntry[] {
    const filter = this.state.ui.logFilter;
    if (!filter.method && !filter.pathContains && !filter.ipContains) {
      return this.state.requests;
    }

    return this.state.requests.filter((req) => {
      if (filter.method && req.method !== filter.method) return false;
      if (filter.pathContains && !req.path.includes(filter.pathContains)) return false;
      if (filter.ipContains && !req.ip.includes(filter.ipContains)) return false;
      return true;
    });
  }

  /**
   * Navigate tarpit selection
   */
  navigateTarpit(direction: 'up' | 'down'): void {
    const current = this.state.ui.selectedTarpitIndex;
    const maxIndex = (this.state.tarpit?.trapped?.length ?? 1) - 1;

    if (direction === 'up') {
      this.setUI('selectedTarpitIndex', Math.max(0, current - 1));
    } else {
      this.setUI('selectedTarpitIndex', Math.min(maxIndex, current + 1));
    }
  }

  /**
   * Navigate request selection
   */
  navigateRequest(direction: 'up' | 'down'): void {
    const current = this.state.ui.selectedRequestIndex;
    const maxIndex = this.getFilteredRequests().length - 1;

    if (direction === 'up') {
      this.setUI('selectedRequestIndex', Math.max(0, current - 1));
    } else {
      this.setUI('selectedRequestIndex', Math.min(maxIndex, current + 1));
    }
  }

  /**
   * Notify all listeners for a specific key
   */
  private notifyListeners(key: StateKey, newValue: unknown, oldValue: unknown): void {
    const keyListeners = this.stateListeners.get(key);
    if (keyListeners) {
      keyListeners.forEach((listener) => {
        try {
          listener(newValue, oldValue);
        } catch (err) {
          console.error(`Store listener error for ${key}:`, err);
        }
      });
    }
  }
}

/**
 * Create a new store instance
 */
export function createStore(options?: {
  maxRequests?: number;
  maxSignals?: number;
  signalTtlMs?: number;
  maxDeceptionEvents?: number;
}): Store {
  return new Store(options);
}
