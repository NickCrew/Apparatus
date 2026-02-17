/**
 * Forensics Screen
 *
 * Combines PCAP capture, HAR replay, JWT tools, and OIDC display
 * widgets in a 2x2 grid layout.
 */

import type { ScreenDefinition } from '../core/screen-manager.js';
import { createPcapWidget } from '../widgets/pcap-widget.js';
import { createHarWidget } from '../widgets/har-widget.js';
import { createJwtWidget } from '../widgets/jwt-widget.js';
import { createOidcWidget } from '../widgets/oidc-widget.js';

/**
 * Create the Forensics Screen
 *
 * Layout (12x12 grid):
 * ┌─────────────────────────────────────┐
 * │ PCAP (6 cols)    │ HAR (6 cols)     │
 * │                  │                  │
 * ├─────────────────────────────────────┤
 * │ JWT (6 cols)     │ OIDC (6 cols)    │
 * │                  │                  │
 * └─────────────────────────────────────┘
 */
export function createForensicsScreen(): ScreenDefinition {
  // Create widget instances
  const pcapWidget = createPcapWidget('forensics-pcap', {
    row: 1,
    col: 0,
    rowSpan: 6,
    colSpan: 6,
    label: 'PCAP Capture',
    style: {
      border: { fg: 'cyan' },
      label: { fg: 'white' },
    },
  });

  const harWidget = createHarWidget('forensics-har', {
    row: 1,
    col: 6,
    rowSpan: 6,
    colSpan: 6,
    label: 'HAR Replay',
    style: {
      border: { fg: 'green' },
      label: { fg: 'white' },
    },
  });

  const jwtWidget = createJwtWidget('forensics-jwt', {
    row: 7,
    col: 0,
    rowSpan: 5,
    colSpan: 6,
    label: 'JWT Tools',
    style: {
      border: { fg: 'yellow' },
      label: { fg: 'white' },
    },
  });

  const oidcWidget = createOidcWidget('forensics-oidc', {
    row: 7,
    col: 6,
    rowSpan: 5,
    colSpan: 6,
    label: 'OIDC Configuration',
    style: {
      border: { fg: 'magenta' },
      label: { fg: 'white' },
    },
  });

  return {
    id: 'forensics',
    name: 'Forensics',
    shortcut: '6',
    widgets: [
      { widget: pcapWidget, config: pcapWidget.config },
      { widget: harWidget, config: harWidget.config },
      { widget: jwtWidget, config: jwtWidget.config },
      { widget: oidcWidget, config: oidcWidget.config },
    ],
  };
}
