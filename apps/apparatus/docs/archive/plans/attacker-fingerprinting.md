# Plan: Attacker Fingerprinting & Heatmap

## Objective
Shift from tracking isolated events to tracking persistent "Attacker Identities," providing a centralized view of high-risk actors and their behavior across all protocols.

## Key Features
- **Attacker Profiles:** Automatically group events by Source IP and calculate a "Risk Score" based on behavior (e.g., hitting honeypots, triggering WAF rules).
- **Behavior Timeline:** See a dedicated timeline for a specific IP (e.g., "10:00: Port Scan -> 10:05: SQLi Probe -> 10:10: Successful Honeypot Hit").
- **Interactive Heatmap:** A visual grid showing which IPs are hitting which protocols/listeners.
- **One-Click Mitigation:** Buttons to "Blackhole" or "Tarpit" an IP across the entire system.
- **Geographic Estimation:** Optional mapping of IPs to broad categories (e.g., "Internal", "Known Bot", "Unknown External").

## Technical Implementation
- **Backend:** New `src/attacker-tracker.ts` using an in-memory `Map<IP, Profile>`.
- **Scoring Engine:** Implement a weighted scoring system (Honeypot hit = +50, WAF Warn = +10, Standard Request = +1).
- **Frontend:** `AttackerHeatmap.tsx` and a searchable `AttackerRegistry.tsx`.
- **Mitigation API:** Expose global IP blocking that hooks into the middleware stack at the earliest possible stage.

## UI/UX Design
- **Aesthetic:** "Global Threat Map" feel. Large, bold numbers for "Active Attackers".
- **Visual Feedback:** Use "heat" colors (Yellow -> Red) to represent the Risk Score of different actors.
- **Detailed View:** Modal window for individual IPs showing their full "Kill Chain" progress.

## Milestones
1. **M1:** Backend IP state store and behavior aggregation.
2. **M2:** Attacker registry UI with real-time risk scores.
3. **M3:** Attacker Heatmap visualizer.
4. **M4:** Integrated "Blackhole" and global mitigation controls.
