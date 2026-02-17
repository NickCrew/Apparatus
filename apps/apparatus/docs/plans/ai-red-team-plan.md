# AI-Driven Red Team Agent: Implementation Plan

## Overview
A portable, autonomous agent that uses Generative AI to analyze API specifications (Swagger/OpenAPI) and runtime responses to synthesize contextual attack payloads, moving beyond static lists.

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

1.  **Refactor `src/ai/client.ts`**: Ensure it's robust enough to handle structured JSON output from LLMs (crucial for "function calling" style payload generation).
2.  **Schema Parser**: Add a utility to parse `swagger.json` into a simplified "Attack Surface" prompt for the LLM.
3.  **Feedback Loop**: Implement the `attack -> observe -> refine` loop. This is the "Agent" part.
4.  **Safety Rails**: Ensure the agent respects a "Scope" (allowed domains) to prevent accidental attacks on real infrastructure.

## Example LLM Prompting Strategy

**Phase 1: Analysis**
> "Analyze this API endpoint: POST /login {user, pass}. Identify 3 top vulnerability classes to test."

**Phase 2: Payload Generation**
> "Generate a JSON payload for /login to test for SQL Injection. Focus on bypassing standard WAF filters."

**Phase 3: Analysis**
> "I sent payload X. Server responded with 500 and body 'Syntax error near AND'. Interpret this result."
