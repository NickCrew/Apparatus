# Plan: AI Red Team vs. AI Blue Team ("War Room")

## Objective
Create an autonomous "War Game" simulation where two independent AI agents compete: one attempting to breach the system and the other attempting to detect and mitigate the attack in real-time.

## Key Features
- **Opposing Agents:** "Attacker" AI (Red Team) vs. "Defender" AI (Blue Team).
- **Tool Allowlist:** Define which tools the Blue Team can use (MTD rotation, WAF deployment, Tarpit activation).
- **Victory Conditions:** Define success for each side (e.g., Red: "Get data from /victim", Blue: "Detect and block within 30s").
- **Live Commentary:** A text feed of the "battle" logic ("Attacker is probing port 6379...", "Defender detected scan and deployed WAF rule").
- **Performance Scoring:** Generate a final report comparing the breach success rate vs. mitigation speed.

## Technical Implementation
- **Backend:** New `src/war-room.ts` coordinator. Manage two distinct AI sessions.
- **Observability:** Blue Team AI must have read-access to the `IncidentTimeline` and `TrafficStream`.
- **Latency Control:** Configurable "thinking time" for each agent to balance the game.
- **Reporting:** Aggregate the "Thoughts" and "Actions" of both agents into a single unified session report.

## UI/UX Design
- **Aesthetic:** "Versus" layout with two terminals (Red vs Blue).
- **Status Bars:** Health bars for each side based on progress toward victory.
- **Visual Duel:** Highlighting nodes on the "Topology Map" as they are attacked or defended.

## Milestones
1. **M1:** Red vs Blue AI session orchestration.
2. **M2:** "Blue Team" tool-calling capabilities (Defense API integration).
3. **M3:** Live "War Room" dashboard with versus terminals.
4. **M4:** Breach Protocol scoring and performance reporting.
