# Plan: UI-Terminal-Immersion (Boot Sequence & CRT Effects)

## Objective
Deepen the "Cybersecurity Lab" aesthetic with high-quality environmental effects and a cinematic "Initialization Sequence" when the dashboard loads.

## Key Features
- **Boot Animation:** A 2-second CLI-style scroll ("Mounting gRPC listeners...", "Connecting to cluster nodes...") before revealing the dashboard.
- **Enhanced CRT:** High-fidelity scanlines, chromatic aberration, and a subtle flickering "Noise" overlay.
- **Typography Flicker:** Subtle random opacity changes on critical text (Status: ONLINE) to simulate old monochrome terminals.
- **Soundscape (Optional):** Optional low-frequency "Humm" or UI clicks for key interactions.

## Technical Implementation
- **Boot Sequence:** A React "Preloader" component that blocks the main UI until key providers (Apparatus, DocViewer) report readiness.
- **SVG Filters:** Move from simple CSS gradients to SVG `<filter>` definitions for more realistic noise and CRT distortion.
- **Framer Motion:** Use `framer-motion` for sequence-based entry animations.

## Milestones
1. **M1:** Implement advanced CRT and Noise SVG filters.
2. **M2:** Create the "Terminal Boot" preloader component.
3. **M3:** Integrate "Typewriter" effect for system status announcements.
