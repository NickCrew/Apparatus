# AI-Driven Red Team Agent: Implementation Plan

## Overview
A portable, autonomous agent that uses Generative AI to analyze API specifications (Swagger/OpenAPI) and runtime responses to synthesize contextual attack payloads, moving beyond static lists.

## Reconciliation Status (2026-02-21)

This plan has been partially implemented under the **Autopilot** surface.

### Implemented in Codebase
- Server endpoints are live under `/api/redteam/autopilot/*`:
  - `GET /api/redteam/autopilot/config`
  - `POST /api/redteam/autopilot/start`
  - `POST /api/redteam/autopilot/stop`
  - `POST /api/redteam/autopilot/kill`
  - `GET /api/redteam/autopilot/status`
  - `GET /api/redteam/autopilot/reports`
- Core autonomous loop exists in `src/ai/redteam.ts`:
  - telemetry capture (`analyze`)
  - model-driven tool selection (`decide`)
  - tool execution (`act`)
  - post-action verification (`verify`)
- Scope/safety rails are enforced for allowed tools and protected target paths.
- Client and CLI surfaces exist for autopilot controls.

### Still Missing from Original Plan
- Standalone shared package extraction (`@apparatus/threat-intel-apparatus-redteam-ai`).
- Swagger/OpenAPI attack-surface parser feeding the model prompt.
- Orchestrator-level multi-agent integration.
- Original naming surfaces:
  - `POST /api/redteam/auto-attack`
  - `apparatus redteam auto --target <url>`

### Canonical Naming Decision
- Current canonical surface is **Autopilot** (`/api/redteam/autopilot/*` and CLI `autopilot` command).
- This plan remains the source for target architecture and remaining work.

## Architecture

### 1. Library Core (`@apparatus/threat-intel-apparatus-redteam-ai`)
This module should be decoupled from Apparatus to allow usage in other tools (Orchestrator, CLI).

**Interfaces:**
```typescript
interface TargetProfile {
  name: string;
  baseUrl: string;
  swagger?: OpenAPI.Document; // Optional: If provided, guides the attack
  endpoints?: string[]; // Discovery list
}

interface AttackContext {
  history: AttackAttempt[];
  findings: Vulnerability[];
}

interface AttackAttempt {
  endpoint: string;
  method: string;
  payload: any;
  responseCode: number;
  responseBody: string;
  aiAnalysis: string; // "Blocked by WAF", "Successful SQLi", "Sanitized"
}
```

**Core Class: `RedTeamAgent`**
*   `constructor(llmClient: AIClient, target: TargetProfile)`
*   `discover()`: Spiders the target or parses Swagger to build an attack surface map.
*   `analyze(endpoint)`: Asks LLM to identify potential weak points (e.g., "This looks like a login, try SQLi on 'username'").
*   `attack(strategy)`: Generates payload, executes, captures response.
*   `refine()`: Feeds response back to LLM ("Server returned 500 with SQL syntax error") to iterate ("Okay, trying blind SQLi").

### 2. Integration Points

**Apparatus (Server)**
*   New endpoint: `POST /api/redteam/auto-attack`
*   Invokes the library against `localhost` (Victim App).
*   Streams progress via SSE (`/sse`) to Dashboard.

**Apparatus CLI**
*   Command: `apparatus redteam auto --target <url>`
*   Uses the library directly (client-side execution).

**Orchestrator**
*   Can instantiate multiple Agents to attack different services in a microservices mesh.

## Implementation Steps

1.  `[~]` **Refactor `src/ai/client.ts`**: Structured parsing currently happens in `src/ai/redteam.ts`; client-level structured output contract is still pending.
2.  `[ ]` **Schema Parser**: Add a utility to parse `swagger.json` into a simplified "Attack Surface" prompt for the LLM.
3.  `[x]` **Feedback Loop**: `attack -> observe -> refine` style loop is implemented in Autopilot mission execution.
4.  `[x]` **Safety Rails**: Tool scope and protected target path constraints are implemented.

## Example LLM Prompting Strategy

**Phase 1: Analysis**
> "Analyze this API endpoint: POST /login {user, pass}. Identify 3 top vulnerability classes to test."

**Phase 2: Payload Generation**
> "Generate a JSON payload for /login to test for SQL Injection. Focus on bypassing standard WAF filters."

**Phase 3: Analysis**
> "I sent payload X. Server responded with 500 and body 'Syntax error near AND'. Interpret this result."
