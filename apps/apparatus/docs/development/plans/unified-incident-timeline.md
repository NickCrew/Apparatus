# Plan: Unified Incident Timeline ("Flight Recorder")

## Objective
Implement a centralized, correlated event timeline that merges HTTP traffic, chaos experiments, defense triggers (WAF/Tarpit), and infrastructure changes into a single chronological view for root-cause analysis.

## Key Features
- **Correlation Engine:** Automatically groups related events (e.g., a "CPU Spike" and the subsequent "Latency Spike" and "Self-Healing Load Shed").
- **Multi-Source Feed:** Real-time stream of all system events, not just HTTP requests.
- **Advanced Filtering:** Filter by module (Chaos, Defense, Traffic), severity (Info, Warn, Err), or Source IP.
- **Deep Inspection:** Click any event to see full metadata (e.g., WAF rule matched, raw request body, or chaos parameters).
- **Time-Travel:** Pause the live feed and scrub back through the buffer to analyze an incident "burst."

## Technical Implementation
- **Backend:** Create a `src/event-aggregator.ts` that acts as a central hub for all `broadcast*` functions. Implement a unified `SSEEvent` envelope.
- **Storage:** Maintain a rolling in-memory buffer (max 1000 events) of correlated system events.
- **Frontend:** `IncidentTimeline.tsx` using a virtualized list for performance. 
- **Correlation Logic:** Use sliding time windows to associate performance degradation events with chaos or security triggers.

## UI/UX Design
- **Aesthetic:** Vertical "Flight Recorder" look with high-contrast icons for different event types.
- **Visual Markers:** Use color-coded "pills" for severity and module tags.
- **Interactivity:** Hover over a chaos event to highlight affected traffic events in the timeline.

## Milestones
1. **M1:** Backend unified event hub and expanded SSE stream.
2. **M2:** Basic chronological timeline UI with filtering.
3. **M3:** Automated event correlation logic (linking chaos to latency).
4. **M4:** Advanced "Playback" controls and event export (JSON/HAR).
