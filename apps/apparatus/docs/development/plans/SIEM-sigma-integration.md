# Plan: SIEM-Sigma-Integration

## Objective
Integrate the Sigma rule format into the Apparatus defense layer, allowing users to test SIEM detection logic against live simulated traffic and chaos events.

## Key Features
- **Sigma Rule Editor:** A dashboard interface to write and validate Sigma rules (YAML).
- **Live Detection Engine:** Real-time matching of incoming telemetry (HTTP, gRPC, Syslog) against active Sigma rules.
- **SIEM Export:** Convert Apparatus WAF rules or successful detections into Sigma format for use in real-world SIEMs (Splunk, Elastic, etc.).
- **Detection Scoring:** Track "Detection Coverage" — showing which percentage of simulated attacks were caught by the current Sigma ruleset.

## Technical Implementation
- **Library:** Use `sigma-js` or a custom YAML-to-Regex transpiler.
- **Backend:** Expand `src/sentinel.ts` to handle Sigma-structured logic beyond simple regex.
- **Telemetry Mapping:** Create a mapper that translates Apparatus SSE events into the standard Sigma log fields (e.g., `image`, `command_line`, `status_code`).

## UI/UX Design
- **Aesthetic:** Clean YAML editor with side-by-side "Match Status."
- **Visuals:** Use the "Glow" system (Info/Success) to highlight when a specific rule "Fires" in the timeline.

## Milestones
1. **M1:** Sigma YAML editor and schema validation.
2. **M2:** Backend Sigma-to-Regex engine for HTTP logs.
3. **M3:** Live "Detection Alert" feed in the dashboard.
4. **M4:** Multi-SIEM export functionality.
