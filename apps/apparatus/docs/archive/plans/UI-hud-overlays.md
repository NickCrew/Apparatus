# Plan: UI-HUD-Overlays (Heads-Up Display)

## Objective
Enable critical system metadata to persist across all dashboard views by implementing floating, translucent "HUD" widgets in the screen corners.

## Key Features
- **Primary HUD:** Top-right overlay showing global throughput, active threat count, and system health.
- **AI Thought Stream:** Bottom-left overlay showing the most recent thoughts from the Autopilot AI.
- **Draggable Widgets:** Allow the user to reposition HUD elements or toggle them off for a cleaner view.
- **HUD Glass:** Ultra-minimal translucent styling with no borders, relying on glowing text for visibility.

## Technical Implementation
- **Portal Rendering:** Use React Portals to render HUD elements outside the standard page flow.
- **Context Integration:** Bind to `useApparatus` and `useAutopilot` for live data.
- **Z-Index Management:** Ensure HUD elements stay above page content but below modals and command palettes.

## Milestones
1. **M1:** Implement the "HUD Container" system with portal support.
2. **M2:** Add the "Global Stats" HUD widget.
3. **M3:** Add the "AI Thought" HUD widget.
4. **M4:** Add user customization (drag/toggle) persistence.
