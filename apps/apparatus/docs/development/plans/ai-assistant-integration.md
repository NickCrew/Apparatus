# Plan: "Red Team" AI Assistant Integration

## Objective
Integrate a persistent, natural language "Command Console" directly into the dashboard to allow users to interact with the Autopilot AI without switching contexts.

## Key Features
- **Persistent Chat:** A collapsible sidebar or "docked" terminal for AI communication.
- **Natural Language Execution:** Execute tasks like "Scan /api/v1/auth for SQLi" or "Trigger a 5s CPU spike on node 2".
- **Streaming "Thoughts":** See the AI's step-by-step reasoning as it analyzes targets.
- **Interactive Reports:** AI-generated findings that contain "Execute Mitigation" or "Replay Attack" buttons.
- **Context Awareness:** The AI automatically knows about your current cluster status and recent traffic logs.

## Technical Implementation
- **Backend:** Expand `apps/apparatus/src/ai/client.ts` to support multi-turn conversations and tool-calling.
- **Frontend:** New `AiChatPanel.tsx` component using a custom `useAiChat` hook.
- **Streaming:** Use SSE or WebSockets to stream AI tokens for a "real-time" feel.
- **Tool Integration:** Map user intent to the `ScenarioEngine` or direct API calls.

## UI/UX Design
- **Aesthetic:** "Hacker Console" look with mono-spaced fonts and typing animations.
- **Positioning:** Fixed-bottom or collapsible right sidebar.
- **Visual Cues:** Glowing indicators when the AI is "Thinking" vs "Awaiting Input".

## Milestones
1.  **M1:** Basic chat interface with streaming text responses.
2.  **M2:** Tool-calling integration (AI can trigger simple chaos spikes).
3.  **M3:** Context integration (AI can answer questions about recent logs).
4.  **M4:** Advanced autonomous loop control via chat.
