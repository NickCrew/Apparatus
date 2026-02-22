# Plan: Live Payload Fuzzer

## Objective
Create a high-interactivity "Fuzzing Lab" where users can manually or automatically fire security payloads against targets and monitor the real-time response from both the target and the Apparatus defense layers.

## Key Features
- **Request Builder:** Visual interface to define Method, URL, Headers, and Body.
- **Payload Presets:** Built-in lists for XSS, SQLi, SSRF, and Command Injection.
- **Bulk Execution:** Run hundreds of payloads in sequence with configurable concurrency and delay.
- **Results Heatmap:** A table showing Payload vs Response Status vs WAF Action (Blocked/Passed).
- **Comparison View:** Side-by-side diff of "Expected" vs "Actual" response content.

## Technical Implementation
- **Backend:** New `fuzzerHandler` in `redteam.ts` to manage high-speed request dispatching.
- **Frontend:** `FuzzingLab.tsx` with a multi-step wizard (Configure -> Select Payloads -> Execute).
- **Visualization:** Use `StatCard` to show "Bypass Rate" and "Block Rate" in real-time.
- **Integration:** Directly hooks into `ActiveShield` (WAF) to show which rule caught a payload.

## UI/UX Design
- **Aesthetic:** Data-dense "IDE-like" layout.
- **Live Feedback:** Progress bars and "rolling results" feed.
- **Interaction:** One-click "Add to Scenario" for any successful bypass payload.

## Milestones
1.  **M1:** Basic single-request builder and response viewer.
2.  **M2:** Payload list management and bulk execution engine.
3.  **M3:** Real-time WAF-action tracking.
4.  **M4:** Advanced analytics and bypass reporting.
