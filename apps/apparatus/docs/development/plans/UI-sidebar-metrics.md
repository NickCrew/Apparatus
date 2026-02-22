# Plan: UI-High-Density-Sidebar-Metrics (Mini-Sparklines)

## Objective
Reduce the need for context switching by embedding micro-visualizations directly into the sidebar navigation, providing real-time system state at a glance.

## Key Features
- **Nav Sparklines:** Tiny, 48px-wide line charts next to the "Traffic" and "Performance" links.
- **Activity Dots:** Pulsing "Heat" indicators next to "Chaos" and "Deception" links that light up when an active experiment or honeypot hit is detected.
- **Count Badges:** Numerical overlays for items like "Webhooks" (showing pending hooks) or "Sentinels" (showing active blocking rules).

## Technical Implementation
- **Shared Data Hook:** Export simplified metric streams from the main providers for sidebar use.
- **Micro-Canvas:** Use a small `<canvas>` for each sparkline to keep DOM overhead low.
- **Polling/SSE:** Bind the activity dots to specific SSE event types (`chaos_start`, `honeypot_hit`).

## Milestones
1. **M1:** Add "Activity Dot" component to existing `NAV_ITEMS`.
2. **M2:** Implement real-time "Pending Count" for Webhooks and Scenarios.
3. **M3:** Add micro-sparkline rendering for throughput and latency.
