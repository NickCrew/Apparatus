# Plan: Web-Based Protocol Inspector ("Mini-Wireshark")

## Objective
Enable real-time "Deep Packet Inspection" (DPI) within the browser dashboard, allowing users to decode and inspect non-HTTP protocols (Redis, MQTT, gRPC, Syslog) without external tools.

## Key Features
- **Protocol Decoders:** Specialized parsers for Redis (RESP), MQTT, SMTP, Syslog, and ICAP.
- **Hex/Text Toggle:** View raw packet bytes or the human-readable decoded structure.
- **Flow Following:** View a "conversation" view for persistent connections (e.g., a Redis SET/GET sequence).
- **Searchable Payloads:** Search for strings or patterns across all protocol data streams.
- **Port Context:** Automatically switch decoders based on the port/listener receiving the traffic.

## Technical Implementation
- **Backend:** Update non-HTTP protocol servers (e.g., `server-redis.ts`) to broadcast raw buffers via SSE to a new `protocol-data` stream.
- **Frontend:** Build a library of protocol-specific UI "cards" that can decode and render these buffers.
- **Performance:** Use a Web Worker for decoding complex binary protocols (like MQTT) to keep the main UI thread responsive.
- **Buffering:** Maintain a dedicated per-protocol buffer in the frontend for "Flow Following."

## UI/UX Design
- **Aesthetic:** High-density table view similar to Wireshark, with a "Packet Detail" pane on the right.
- **Visual Decodes:** For MQTT, show JSON-like trees; for Redis, show simple command/response pairs.
- **Indicators:** Pulsing icons next to the active listener in the "Listeners" page that link directly to the inspector.

## Milestones
1. **M1:** Backend telemetry for Redis and MQTT raw traffic.
2. **M2:** Basic hex/text viewer in the dashboard.
3. **M3:** Advanced protocol decoders (RESP, MQTT packet structure).
4. **M4:** Flow/Conversation reconstruction view.
