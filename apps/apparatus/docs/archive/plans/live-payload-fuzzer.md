# Live Payload Fuzzer Plan

## Problem Statement
`/redteam/validate` provides fixed payload scanning, but operators cannot iteratively craft one request, inspect response behavior, then pivot into controlled bulk fuzzing in the dashboard. This limits exploratory testing and slows red-team/blue-team feedback loops.

## Goals
- Provide a high-interactivity **Fuzzing Lab** for manual and automated payload execution.
- Support both single-request experimentation and bounded bulk runs.
- Surface target response and Apparatus defense outcomes in one place.
- Preserve lab safety with strict execution limits and predictable behavior.

## Non-Goals
- No unbounded internet-scale scanner behavior.
- No persistent storage in first delivery (in-memory results only).
- No replacement of Autopilot strategy engine; this is operator-directed fuzzing.

## Delivery Scope

### M1 (Current Start): Single-Request Builder + Response Viewer
- New backend endpoint to execute one normalized fuzz request.
- Dashboard interaction model for request input and response display.
- Validation and response-shape contract tests.

### M2: Presets + Bulk Engine
- Category payload packs (XSS, SQLi, SSRF, command injection, traversal, NoSQL).
- Bounded concurrency + pacing controls.
- Rolling results stream for batch progress.

### M3: Defense Telemetry
- Enrich results with WAF/defense action context.
- Show blocked/passed/errored status with explanation.

### M4: Analytics + Handoff
- Bypass rate/block rate aggregation.
- Expected vs actual diff workflow for notable payloads.
- One-click "Add to Scenario" handoff for selected bypasses.

## Architecture

### Backend
- File: `apps/apparatus/src/redteam.ts`
- Route wiring: `apps/apparatus/src/app.ts`
- Initial endpoint (M1):
  - `POST /api/redteam/fuzzer/run`
  - Executes one outbound request to configured target and returns normalized metadata.
- Future endpoint (M2+):
  - `POST /api/redteam/fuzzer/bulk`
  - Executes bounded batch queue with concurrency and pacing controls.

### Frontend
- Existing lab shell: `apps/apparatus/src/dashboard/components/dashboard/TestingLab.tsx`
- M1 adds request-builder controls and response panel for single-run execution.
- M2+ adds payload picker, execution controls, and rolling results table.

### Integration Points
- Active Shield (`sentinel`) outcome mapping for defense context in M3.
- Scenario pipeline integration for M4 payload handoff.

## API Contract (M1)

### Request
`POST /api/redteam/fuzzer/run`

```json
{
  "target": "http://127.0.0.1:8090",
  "path": "/echo",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "X-Payload": "<script>alert(1)</script>"
  },
  "query": {
    "q": "<script>alert(1)</script>"
  },
  "body": {
    "probe": "xss"
  },
  "timeoutMs": 5000
}
```

`target` is optional. When omitted, the server targets itself (loopback + current port).

### Response
```json
{
  "request": {
    "method": "POST",
    "url": "http://127.0.0.1:8090/echo?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E"
  },
  "response": {
    "status": 200,
    "blocked": false,
    "durationMs": 18,
    "headers": {
      "content-type": "application/json; charset=utf-8"
    },
    "bodyPreview": "{...}",
    "bodyBytes": 624,
    "bodyTruncated": false
  }
}
```

### Validation Rules (M1)
- `target` optional; when provided it must be valid `http`/`https` URL.
- Host restriction (M1 safety): only loopback hosts are allowed by default. Additional hosts can be allowlisted via `APPARATUS_FUZZER_ALLOWED_TARGETS`.
- `method` defaults to `GET`; normalized to uppercase.
- `path` defaults to `/echo`.
- `path` must be relative (no scheme/host).
- `headers` and `query` must be flat key/value objects if present.
- `timeoutMs` clamped to bounded safe range.
- Request body size and response capture bytes are bounded to protect memory.
- `bodyPreview` may be truncated; `bodyTruncated` flags that condition.

## Safety Controls
- Timeout and response-preview limits required for every execution.
- Bounded bulk concurrency (M2) with hard max values.
- Strict URL protocol checking.
- Error responses normalized to avoid leaking stack traces.
- Existing `/redteam/validate` is now gated and host-restricted for consistency with fuzzer safety constraints.

## Testing Strategy
- Integration tests in `apps/apparatus/test` for:
  - invalid request handling (`400`),
  - successful run contract shape,
  - body/query/header pass-through behavior.
- Type check and scoped test commands required before milestone completion.

## Verification Commands
- `pnpm --filter @apparatus/server exec tsc --noEmit`
- `pnpm --filter @apparatus/server test -- test/advanced.defense.test.ts`
- Add focused fuzzer test file once M1 implementation lands.

## Milestone Exit Criteria
1. **M1**: Single-request workflow is callable from dashboard and covered by tests.
2. **M2**: Bulk execution supports presets and bounded controls with passing tests.
3. **M3**: Defense telemetry is shown in API and UI with robust fallback handling.
4. **M4**: Analytics/reporting + scenario handoff are shipped with docs and tests.
