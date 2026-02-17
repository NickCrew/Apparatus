/**
 * Screen Registry
 *
 * Defines all screens for the TUI dashboard with their
 * widget configurations and navigation shortcuts.
 */

import type { ScreenDefinition } from '../core/screen-manager.js';
import { createTrafficScreen } from './traffic-screen.js';
import { createTestingScreen } from './testing-screen.js';
import { createSystemScreen } from './system-screen.js';
import { createForensicsScreen } from './forensics-screen.js';

// Re-export screens
export { createTrafficScreen } from './traffic-screen.js';
export { createTestingScreen } from './testing-screen.js';
export type { TestingScreenOptions } from './testing-screen.js';
export { createSystemScreen } from './system-screen.js';
export { createForensicsScreen } from './forensics-screen.js';

/**
 * Screen ID constants
 */
export const SCREEN_IDS = {
  MAIN: 'main',
  TRAFFIC: 'traffic',
  TESTING: 'testing',
  DEFENSE: 'defense',
  SYSTEM: 'system',
  FORENSICS: 'forensics',
} as const;

export type ScreenId = (typeof SCREEN_IDS)[keyof typeof SCREEN_IDS];

/**
 * Screen metadata for registration
 */
export interface ScreenMeta {
  id: ScreenId;
  name: string;
  shortcut: string;
  description: string;
}

/**
 * All available screens with metadata
 */
export const SCREENS: ScreenMeta[] = [
  {
    id: SCREEN_IDS.MAIN,
    name: 'Monitor',
    shortcut: '1',
    description: 'Main monitoring dashboard with health, requests, and alerts',
  },
  {
    id: SCREEN_IDS.TRAFFIC,
    name: 'Traffic',
    shortcut: '2',
    description: 'Traffic visualization with RPS, sparklines, and charts',
  },
  {
    id: SCREEN_IDS.TESTING,
    name: 'Testing',
    shortcut: '3',
    description: 'Red Team, Chaos Engineering, and Network Diagnostics',
  },
  {
    id: SCREEN_IDS.DEFENSE,
    name: 'Defense',
    shortcut: '4',
    description: 'Active Shield, MTD, and DLP configuration',
  },
  {
    id: SCREEN_IDS.SYSTEM,
    name: 'System',
    shortcut: '5',
    description: 'Cluster topology, System info, KV Store, and Webhooks',
  },
  {
    id: SCREEN_IDS.FORENSICS,
    name: 'Forensics',
    shortcut: '6',
    description: 'PCAP capture, HAR replay, JWT tools, and OIDC configuration',
  },
];

/**
 * Screen factory type
 */
export type ScreenFactory = () => ScreenDefinition;

/**
 * Screen registry
 */
class ScreenRegistry {
  private factories: Map<ScreenId, ScreenFactory> = new Map();

  /**
   * Register a screen factory
   */
  register(id: ScreenId, factory: ScreenFactory): void {
    this.factories.set(id, factory);
  }

  /**
   * Create a screen by ID
   */
  create(id: ScreenId): ScreenDefinition | null {
    const factory = this.factories.get(id);
    return factory ? factory() : null;
  }

  /**
   * Get all registered screen IDs
   */
  getRegisteredIds(): ScreenId[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Check if a screen is registered
   */
  has(id: ScreenId): boolean {
    return this.factories.has(id);
  }

  /**
   * Get screen metadata by ID
   */
  getMeta(id: ScreenId): ScreenMeta | undefined {
    return SCREENS.find((s) => s.id === id);
  }
}

/**
 * Global screen registry instance
 */
export const screenRegistry = new ScreenRegistry();

/**
 * Initialize all screen factories
 * This is called during dashboard startup to register all screens
 */
export function initializeScreens(): void {
  // Traffic Screen (Workstream 1)
  screenRegistry.register(SCREEN_IDS.TRAFFIC, createTrafficScreen);

  // Testing Screen (Workstream 2)
  // Note: Testing screen is not a ScreenDefinition, it's a custom screen class
  // It will be initialized separately in the main dashboard

  // System Screen (Workstream 4)
  screenRegistry.register(SCREEN_IDS.SYSTEM, createSystemScreen);

  // Forensics Screen (Workstream 5)
  screenRegistry.register(SCREEN_IDS.FORENSICS, createForensicsScreen);

  // Additional screens will be registered here as they are implemented
}

/**
 * Get screen names for tab bar
 */
export function getScreenNames(): string[] {
  return SCREENS.map((s) => s.name);
}

/**
 * Get screen shortcuts for keyboard binding
 */
export function getScreenShortcuts(): Record<string, ScreenId> {
  const shortcuts: Record<string, ScreenId> = {};
  for (const screen of SCREENS) {
    shortcuts[screen.shortcut] = screen.id;
  }
  return shortcuts;
}
