# Plan: AI Blue-Team Evasion (Tactical Switching)

## Objective
Teach Autopilot to detect defensive responses in-flight and adapt tactics instead of repeatedly executing the same failing action.

This initiative extends the existing red-team memory pipeline and planner loop so decisions incorporate immediate defensive feedback (status/body/latency/error signals), then trigger a tactical pivot with explicit operator-visible reasoning.

## Scope

### In Scope
- Defensive signal detection from recent action outcomes:
  - HTTP `403`, `404` (MTD-style route hiding), `406`, `429`
  - tarpit-like latency spikes
  - repeated tool failures tied to specific vectors
- Tactical switching and counter-maneuvers:
  - backoff behavior on likely rate limiting
  - route/prefix pivots on likely WAF/MTD blocking
  - controlled use of emergency tools (for example `mtd.rotate`)
- Evasion-aware planner context:
  - include recent defensive feedback in planner payload
  - add decision heuristics for blocked-vs-retry-vs-pivot
- Dashboard observability:
  - evasion events in action/mission log
  - concise blocked-vs-evaded signal history

### Out of Scope (for this rollout)
- Building a full autonomous exploit strategy engine per vulnerability class
- Adding unbounded or unsafe emergency actions
- External target evasion policies outside local/sandbox guardrails

## Current Baseline
- Autopilot already has:
  - session context memory (`assets`, `observations`, `relations`, `objectiveProgress`)
  - planner prompt composition in `apps/apparatus/src/ai/redteam.ts`
  - action and verification loop with telemetry snapshots
  - UI session rendering in `apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.tsx`
- Gap:
  - planner does not currently receive a structured "last defensive response" object
  - no first-class evasion classification layer with deterministic pivot behavior
  - UI does not distinguish normal actions from evasion maneuvers

## Architecture Touchpoints
- Backend decision loop: `apps/apparatus/src/ai/redteam.ts`
- Session/report contracts: `apps/apparatus/src/ai/report-store.ts`
- Tool execution envelope: `apps/apparatus/src/tool-executor.ts`
- Dashboard rendering: `apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.tsx`
- Hook/state wiring: `apps/apparatus/src/dashboard/hooks/useAutopilot.ts`
- Contract tests:
  - `apps/apparatus/test/redteam.decision.test.ts`
  - `apps/apparatus/test/redteam.planner-payload.test.ts`
  - `apps/apparatus/test/redteam.memory-extraction.test.ts`
  - `apps/apparatus/test/autopilot.test.ts`
  - `apps/apparatus/test/autopilot.memory-states.test.ts`

## Workstreams

### W1. Feedback Signal Ingestion
- Add a structured per-iteration feedback model that captures:
  - status code and body snippet from a post-action probe
  - latency and error deltas
  - defensive-signal classification (`rate_limited`, `waf_blocked`, `mtd_hidden_route`, `tarpit_suspected`, `none`)
- Persist feedback in session context for planner and UI consumers.

### W2. Tactical Switching Engine
- Add an evasion decision layer before LLM fallback:
  - if blocked repeatedly on one vector, pivot action family
  - apply anti-rate-limit backoff automatically
  - trigger safe MTD rotation when route blocking is likely
- Ensure all pivots respect `allowedTools` and guardrails.

### W3. Planner Prompt Integration
- Inject the previous action’s structured feedback into planner payload.
- Extend system prompt instructions so model output can explain:
  - why it believes blocking occurred
  - why chosen pivot is expected to work better

### W4. Evasion Telemetry UX
- Add explicit evasion maneuver entries in Autopilot console.
- Show compact blocked/evasion history per session.
- Keep signal language aligned with backend classification codes.

### W5. Verification and Hardening
- Add contract tests for:
  - signal classification and sanitizer behavior
  - deterministic pivots on `403/429/high-latency`
  - planner payload schema including `recentDefenseFeedback`
  - end-to-end session state safety (`completed|stopped|failed`)
- Run specialist review + test-gap audit before closure.

## Milestones

### M1: Defense Feedback Plumbing
**Outcome:** Planner payload includes structured prior defensive feedback.
**Exit Criteria:**
- Feedback object is generated each iteration.
- Feedback is available to planner composition and memory extraction.
- Targeted tests cover classification shape and null/empty edge cases.

### M2: Tactical Pivot + Backoff
**Outcome:** Autopilot reacts deterministically to clear block signals.
**Exit Criteria:**
- `429` triggers interval/backoff strategy.
- repeated `403/404/406` triggers route/prefix pivot strategy.
- pivots are blocked if unsafe/disallowed by scope.

### M3: Emergency Evasion Toolkit
**Outcome:** Reactive evasion tools are available and auditable.
**Exit Criteria:**
- `mtd.rotate` path is integrated into evasion policy.
- tool-use reasons are logged as evasion decisions.
- no regression to crash/unsafe tool defaults.

### M4: Dashboard Evasion Visibility
**Outcome:** Operators can distinguish blocked vs evaded behavior in UI.
**Exit Criteria:**
- action timeline labels evasion maneuvers.
- blocked-route/defense indicators are surfaced in autopilot views.
- UI tests validate rendering and fallback states.

### M5: Validation + Rollout Readiness
**Outcome:** Confidence that tactical switching is stable and observable.
**Exit Criteria:**
- focused test suite passes for redteam/autopilot modules.
- review artifacts captured (`specialist-review`, `test-review-request`).
- residual risks documented.

## Task Decomposition (Backlog Mapping)
- Parent initiative: AI Blue-Team Evasion
- Subtasks:
  1. M1 feedback model + planner payload wiring
  2. M2 tactical pivot and anti-rate-limit behavior
  3. M3 emergency tool policy + evasion logging
  4. M4 dashboard blocked/evasion telemetry
  5. M5 validation sweep + review/audit closure

## Verification Gates
- Backend targeted tests:
  - `pnpm --filter @apparatus/server test -- test/redteam.decision.test.ts test/redteam.planner-payload.test.ts test/redteam.memory-extraction.test.ts`
- Contract/state tests:
  - `pnpm --filter @apparatus/server test -- test/autopilot.test.ts test/autopilot.memory-states.test.ts`
- Type safety:
  - `pnpm --filter @apparatus/server exec tsc --noEmit`
- Review/audit:
  - `scripts/specialist-review.sh --git -- apps/apparatus/src/ai/redteam.ts apps/apparatus/src/ai/report-store.ts apps/apparatus/src/dashboard/components/dashboard/AutopilotConsole.tsx`
  - `scripts/test-review-request.sh apps/apparatus/src/ai --tests apps/apparatus/test`

## Risks and Mitigations
- Risk: false-positive block detection causes unnecessary pivots.
  - Mitigation: classify with bounded thresholds + repeated-signal confirmation.
- Risk: tactical switching loops between two ineffective actions.
  - Mitigation: short-term action cooldown and pivot history checks.
- Risk: increased prompt size degrades reliability.
  - Mitigation: capped feedback/body snippets and summarized signal codes.
- Risk: UI over-noise from transient defense events.
  - Mitigation: debounce and bucket low-confidence signals.

## Rollout Notes
- Ship backend decisioning first (M1-M3), then UI (M4).
- Keep feature behavior behind existing autopilot scope controls.
- Log evasion outcomes to support post-run tuning without changing defaults.
