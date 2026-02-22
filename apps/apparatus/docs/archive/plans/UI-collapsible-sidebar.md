# Plan: UI-Collapsible-Sidebar (Stealth Mode)

## Objective
Maximize screen real estate for data-heavy visualizations by evolving the sidebar from a full panel into a compact, icon-first "Stealth" mode while preserving fast navigation.

## Current Status (2026-02-22)
- `Done`: Sidebar collapse/expand toggle exists and persists in `localStorage`.
- `Done`: Expanded section state persists in `localStorage`.
- `Done`: Brand switches to icon-only when collapsed.
- `Not Done`: Collapsed mode still hides navigation items entirely (not icon-only nav).
- `Not Done`: Tooltip system for collapsed nav items.
- `Not Done`: Keyboard shortcut for collapse/expand (`Cmd+B` / `Ctrl+B`).

## Scope
1. Keep current collapse persistence behavior.
2. Replace "hidden nav" collapsed mode with icon-only navigation rail.
3. Add tooltips for collapsed icons (label + optional shortcut).
4. Add keyboard toggle shortcut and register/unregister listener cleanly.
5. Maintain accessibility: keyboard navigation, focus states, aria labels.

## Technical Notes
- Sidebar implementation: `apps/apparatus/src/dashboard/components/layout/Sidebar.tsx`
- App shell keyboard bindings: `apps/apparatus/src/dashboard/App.tsx`
- Persisted key in use: `apparatus-sidebar:collapsed`

## Milestones
1. `M1`: Keep width animation + collapse toggle baseline (already shipped).
2. `M2`: Render icon-only nav rail when collapsed instead of hiding nav.
3. `M3`: Add tooltip treatment for collapsed rail items.
4. `M4`: Add `Cmd+B` / `Ctrl+B` shortcut for sidebar toggle.
5. `M5`: Validate behavior on desktop/mobile widths and keyboard-only navigation.

## Acceptance Criteria
- Collapsed mode shows clickable icon-only navigation for all primary routes.
- Hover/focus on collapsed icons reveals readable tooltip labels.
- `Cmd+B` (macOS) and `Ctrl+B` (Windows/Linux) toggles sidebar collapse.
- Sidebar collapse state persists after page refresh.
- No regression in active-route highlighting or focus-visible styles.
