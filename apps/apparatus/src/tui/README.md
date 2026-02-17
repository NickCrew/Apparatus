# Apparatus TUI - Developer Guide

Terminal User Interface for the Apparatus platform. Built with [blessed](https://github.com/chjj/blessed) using a modular widget architecture.

## Overview

The TUI is built with:
- **blessed** - Terminal UI library for node.js
- **TypeScript** - Type-safe implementation
- **SSE** - Server-Sent Events for real-time updates
- **REST** - API client for mutations

## Directory Structure

```
src/tui/
├── index.ts              # Entry point - CLI parsing
├── dashboard.ts          # Main orchestrator
├── api-client.ts         # REST API client (30+ methods)
├── sse-client.ts         # Server-Sent Events client
├── theme.ts              # Color themes and styling
├── types.ts              # TypeScript interfaces
│
├── core/                 # Core abstractions
│   ├── store.ts          # Centralized state management
│   ├── widget.ts         # Widget base class + registry
│   ├── screen-manager.ts # Screen navigation
│   ├── keyboard.ts       # Key binding manager
│   ├── modal.ts          # Modal factory
│   └── action-handler.ts # API action dispatcher
│
├── widgets/              # Widget implementations
│   ├── index.ts          # Widget exports + registry
│   ├── rps-gauge-widget.ts
│   ├── sparklines-widget.ts
│   ├── traffic-chart-widget.ts
│   ├── redteam-widget.ts
│   ├── chaos-widget.ts
│   ├── ghost-widget.ts
│   ├── netdiag-widget.ts
│   ├── sentinel-widget.ts
│   ├── mtd-widget.ts
│   ├── dlp-widget.ts
│   ├── cluster-widget.ts
│   ├── sysinfo-widget.ts
│   ├── kv-widget.ts
│   ├── webhook-widget.ts
│   ├── pcap-widget.ts
│   ├── har-widget.ts
│   ├── jwt-widget.ts
│   └── oidc-widget.ts
│
├── screens/              # Screen compositions
│   ├── index.ts          # Screen registry
│   ├── traffic-screen.ts
│   ├── testing-screen.ts
│   ├── defense-screen.ts
│   ├── system-screen.ts
│   └── forensics-screen.ts
│
├── modals/               # Modal dialogs
│   ├── index.ts          # Modal exports
│   ├── jwt-mint-modal.ts
│   ├── jwt-decode-modal.ts
│   ├── har-results-modal.ts
│   ├── add-rule-modal.ts
│   ├── dlp-output-modal.ts
│   ├── dns-form-modal.ts
│   ├── ping-form-modal.ts
│   ├── scan-form-modal.ts
│   ├── ghost-config-modal.ts
│   └── redteam-results-modal.ts
│
├── state/                # State utilities
│   └── metrics-buffer.ts # Ring buffer for time-series
│
└── __tests__/            # Test suite
    └── mocks/            # Mock factories
        ├── blessed.ts
        ├── eventsource.ts
        └── fetch.ts
```

## Creating a New Widget

### Step 1: Create Widget File

```typescript
// src/tui/widgets/my-widget.ts
import blessed from 'blessed';
import { BaseWidget, WidgetConfig } from '../core/widget.js';
import { Store } from '../core/store.js';
import { theme } from '../theme.js';

interface MyWidgetState {
  value: number;
}

export class MyWidget extends BaseWidget<MyWidgetState> {
  constructor(config: WidgetConfig) {
    super('my-widget', {
      label: ' My Widget ',
      border: { type: 'line' },
      style: {
        border: { fg: theme.colors.border },
      },
      ...config,
    });
  }

  // Required: render when state changes
  render(state: MyWidgetState): void {
    this.element.setContent(`Value: ${state.value}`);
    this.screen?.render();
  }

  // Optional: handle keyboard input
  handleKey(key: string): boolean {
    if (key === 'r') {
      this.refresh();
      return true; // consumed
    }
    return false;
  }

  // Optional: lifecycle hook
  mount(screen: blessed.Widgets.Screen, store: Store): void {
    super.mount(screen, store);
    // Setup subscriptions, timers, etc.
  }

  // Optional: cleanup
  unmount(): void {
    // Clear timers, unsubscribe
    super.unmount();
  }
}

// Factory function
export function createMyWidget(config: Partial<WidgetConfig> = {}): MyWidget {
  return new MyWidget({
    top: 0,
    left: 0,
    width: '50%',
    height: '50%',
    ...config,
  });
}
```

### Step 2: Register in Widget Index

```typescript
// src/tui/widgets/index.ts
export { MyWidget, createMyWidget } from './my-widget.js';

// In initializeWidgets():
widgetRegistry.register('my-widget', createMyWidget);
```

### Step 3: Use in Screen

```typescript
// src/tui/screens/my-screen.ts
import { createMyWidget } from '../widgets/index.js';

export function createMyScreen(): ScreenDefinition {
  return {
    id: 'my-screen',
    widgets: [
      {
        type: 'my-widget',
        position: { top: 0, left: 0, width: '50%', height: '50%' },
      },
    ],
  };
}
```

## Adding a New Screen

### Step 1: Create Screen File

```typescript
// src/tui/screens/my-screen.ts
import type { ScreenDefinition } from '../core/screen-manager.js';

/**
 * Layout:
 * ┌─────────────┬─────────────┐
 * │   Widget A  │   Widget B  │
 * ├─────────────┼─────────────┤
 * │   Widget C  │   Widget D  │
 * └─────────────┴─────────────┘
 */
export function createMyScreen(): ScreenDefinition {
  return {
    id: 'my-screen',
    name: 'My Screen',
    shortcut: '7',
    widgets: [
      { type: 'widget-a', position: { row: 0, col: 0, width: 6, height: 6 } },
      { type: 'widget-b', position: { row: 0, col: 6, width: 6, height: 6 } },
      { type: 'widget-c', position: { row: 6, col: 0, width: 6, height: 6 } },
      { type: 'widget-d', position: { row: 6, col: 6, width: 6, height: 6 } },
    ],
  };
}
```

### Step 2: Register in Screen Index

```typescript
// src/tui/screens/index.ts
import { createMyScreen } from './my-screen.js';

export const SCREENS: ScreenMeta[] = [
  // ...existing screens
  { id: 'my-screen', name: 'My Screen', shortcut: '7', description: '...' },
];

export function initializeScreens(): void {
  // ...existing registrations
  screenRegistry.register('my-screen', createMyScreen);
}
```

## API Client Usage

```typescript
import { ApiClient } from './api-client.js';

const api = new ApiClient({ baseUrl: 'http://localhost:8080' });

// Health & Metrics
const health = await api.getHealth();
const metrics = await api.getMetricsSummary();
const sysinfo = await api.getSystemInfo();

// Defense Controls
const rules = await api.getSentinelRules();
await api.addSentinelRule('pattern', 'block');
await api.deleteSentinelRule('rule-id');
const mtd = await api.getMtdStatus();
await api.rotateMtdPrefix('new-prefix');

// Chaos Engineering
await api.triggerCpuSpike(5000);
await api.triggerMemorySpike(100);
await api.triggerCrash();

// Testing
const results = await api.runRedTeamScan('target', '/path');
await api.startGhostTraffic('http://target', 1000);
await api.stopGhostTraffic();
const dns = await api.dnsLookup('example.com', 'A');
const ping = await api.tcpPing('example.com:443');

// Forensics
const pcapUrl = await api.startPcapCapture(10);
const harResults = await api.replayHar(harData);
const token = await api.mintJwt({ sub: 'test' });
const decoded = await api.decodeJwt(token.access_token);
const jwks = await api.getJwks();
const oidc = await api.getOidcConfig();

// System
const cluster = await api.getClusterMembers();
const keys = await api.getKvKeys();
await api.setKvValue('key', { data: 'value' });
const webhooks = await api.getWebhooks('hook-id');
```

## State Management

### Store Usage

```typescript
import { Store } from './core/store.js';

const store = new Store();

// Set state
store.set('metrics', { rps: 100, latency: 50 });

// Get state
const metrics = store.get<MetricsData>('metrics');

// Subscribe to changes
const unsubscribe = store.subscribe('metrics', (value) => {
  console.log('Metrics updated:', value);
});

// Cleanup
unsubscribe();
```

### MetricsBuffer

```typescript
import { MetricsBuffer } from './state/metrics-buffer.js';

const buffer = new MetricsBuffer(60); // 60-point circular buffer

buffer.push({ rps: 100, latency: 45 });
const data = buffer.getData();
const sparkline = buffer.getSparkline('rps');
```

## Theme System

```typescript
import { theme, methodColor, statusColor, severityColor } from './theme.js';

// Colors
const primary = theme.colors.primary;    // Accent color
const success = theme.colors.success;    // Green
const error = theme.colors.error;        // Red
const warning = theme.colors.warning;    // Yellow

// Utility functions
const getColor = methodColor('POST');     // HTTP method color
const statusClr = statusColor(200);       // Status code color
const sevColor = severityColor('high');   // Severity color

// Blessed tags
const content = `{${theme.colors.success}-fg}Success!{/}`;
```

## Testing

### Mock Factories

```typescript
// __tests__/mocks/blessed.ts
export function createMockScreen() {
  return {
    render: vi.fn(),
    append: vi.fn(),
    key: vi.fn(),
    on: vi.fn(),
  };
}

export function createMockBox() {
  return {
    setContent: vi.fn(),
    focus: vi.fn(),
    destroy: vi.fn(),
  };
}
```

### Widget Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MyWidget } from '../../widgets/my-widget.js';
import { createMockScreen } from '../mocks/blessed.js';

describe('MyWidget', () => {
  it('renders state', () => {
    const widget = new MyWidget({});
    const screen = createMockScreen();

    widget.mount(screen as any, store);
    widget.render({ value: 42 });

    expect(widget.getElement().setContent).toHaveBeenCalled();
  });
});
```

### Running Tests

```bash
pnpm test                    # All tests
pnpm test -- --watch         # Watch mode
pnpm test -- --coverage      # With coverage
```

### Coverage Target

- Overall: **85%**
- Critical paths (store, api-client): **95%**

## Common Patterns

### Blessed Color Tags

```typescript
'{red-fg}Red text{/}'
'{bold}Bold{/bold}'
'{cyan-fg}{blue-bg}Cyan on blue{/}'
```

### Layout Positioning

```typescript
// Percentage-based
{ width: '50%', height: '100%-3' }

// Absolute
{ width: 40, height: 10 }

// Centered
{ top: 'center', left: 'center' }
```

### Scrollable Content

```typescript
blessed.list({
  scrollable: true,
  keys: true,
  vi: true,
  mouse: true,
});
```

### Focus Management

```typescript
const widgets = [w1, w2, w3];
let focusIndex = 0;

function cycleFocus() {
  focusIndex = (focusIndex + 1) % widgets.length;
  widgets[focusIndex].focus();
}
```

## Related Documentation

- [TUI User Guide](../docs/TUI_USER_GUIDE.md) - End-user documentation
- [TUI Architecture](../docs/TUI_ARCHITECTURE.md) - Diagrams and design
- [TUI Keyboard Reference](../docs/TUI_KEYBOARD_REFERENCE.md) - All shortcuts
- [Apparatus CLAUDE.md](../CLAUDE.md) - Project overview
