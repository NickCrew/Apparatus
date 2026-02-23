# Plan: Interactive Network Topology Map

## Objective
Replace the static `ClusterMap` with a high-fidelity, interactive network topology visualizer that shows real-time traffic relationships between Apparatus, the attacker, and downstream targets (Chimera).

## Key Features
- **Dynamic Graph:** Auto-arranging force-directed graph of all connected nodes.
- **Traffic Animation:** Visual "pulses" flowing along edges representing real-time throughput.
- **Node Intelligence:** Click any node to see its specific telemetry (CPU, Latency, RPS).
- **Fault Injection:** Right-click context menu on nodes to "Inject Latency", "Sever Connection", or "Trigger Crash".
- **Zoom & Pan:** Support for large-scale cluster environments.

## Technical Implementation
- **Frontend Library:** `react-force-graph-2d` for performance-optimized canvas rendering.
- **Data Source:** Aggregate data from `/api/infra/status` and the existing `/cluster/members` endpoint.
- **State Management:** Map SSE `request` events to specific edges in the graph to trigger animations.
- **Fault Backend:** Wire context menu actions to existing `/chaos` and `/cluster` endpoints.

## UI/UX Design
- **Aesthetic:** High-contrast neon lines on dark background (consistent with Command Center theme).
- **Icons:** Distinct Lucide icons for "Proxy", "Target", "Attacker", and "Internal Service".
- **Overlay:** A persistent mini-map in the corner for navigation in dense clusters.

## Milestones
1.  **M1:** Basic graph rendering with `react-force-graph`.
2.  **M2:** Real-time data binding from SSE stream.
3.  **M3:** Interactive tooltips and node selection.
4.  **M4:** Context-menu based chaos injection.
