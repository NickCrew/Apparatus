# Plan: UI-Collapsible-Sidebar (Stealth Mode)

## Objective
Maximize screen real estate for data-heavy visualizations (like the Network Map and Traffic Waterfall) by allowing the primary navigation to collapse into a narrow, icon-only "Stealth" bar.

## Key Features
- **Smooth Transition:** CSS-transform-based sliding and width animation between 240px and 64px.
- **Iconic Navigation:** In collapsed mode, only the glowing module icons are visible.
- **Smart Tooltips:** High-contrast tooltips that appear on hover to show labels and keyboard shortcuts in stealth mode.
- **Mini-Logo:** Replace the full "Apparatus" brand name with a pulsing "A" logo icon.

## Technical Implementation
- **State Management:** Use a persistent "isCollapsed" state (stored in `localStorage`).
- **Layout Refactor:** Update the main `Layout.tsx` grid to handle dynamic sidebar widths.
- **Keyboard Shortcut:** Bind `Cmd+B` (or similar) to toggle the sidebar.

## Milestones
1. **M1:** Add collapse toggle button and base animation logic.
2. **M2:** Implement "Stealth" tooltips for all navigation items.
3. **M3:** Refactor branding section for compact mode.
4. **M4:** Add persistent state and keyboard shortcut integration.
