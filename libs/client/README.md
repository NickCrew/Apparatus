# @atlascrew/apparatus-lib

TypeScript API client for [Apparatus](../../apps/demo-targets/apparatus/) - a comprehensive HTTP testing and chaos engineering server with 50+ endpoints.

## Installation

```bash
# npm
npm install @atlascrew/apparatus-lib

# pnpm
pnpm add @atlascrew/apparatus-lib

# yarn
yarn add @atlascrew/apparatus-lib
```

## Quick Start

```typescript
import { ApparatusClient } from '@atlascrew/apparatus-lib';

// Create client
const client = new ApparatusClient({
  baseUrl: 'http://localhost:8080',
  timeout: 30000,
});

// Health check
const isHealthy = await client.isHealthy();
console.log('Server healthy:', isHealthy);

// Echo a request
const echo = await client.echo('/api/users');
console.log('Request echoed:', echo.method, echo.path);

// Chaos engineering - CPU spike
await client.chaos.cpuSpike({ duration: 5000 });

// Security testing
const results = await client.security.redteam({
  target: 'https://api.example.com'
});
```

## Configuration

```typescript
interface ApparatusClientOptions {
  /** Base URL of Apparatus server */
  baseUrl: string;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Additional headers for all requests */
  headers?: Record<string, string>;

  /** Enable debug logging */
  debug?: boolean;
}
```

## API Categories

The client organizes Apparatus's 50+ endpoints into logical categories:

| Category | Description | Access |
|----------|-------------|--------|
| **core** | Health, echo, metrics, history | `client.core.*` |
| **network** | DNS, ping, sysinfo, rate limiting | `client.network.*` |
| **identity** | JWKS, OIDC, tokens, JWT debugging | `client.identity.*` |
| **security** | Red team, Sentinel rules, proxy | `client.security.*` |
| **chaos** | CPU spike, memory spike, crash, EICAR | `client.chaos.*` |
| **data** | Generate, sink, DLP scanning | `client.data.*` |
| **storage** | Key-value store, script execution | `client.storage.*` |
| **traffic** | Ghost (background) traffic | `client.traffic.*` |
| **defense** | Tarpit, deception/honeypot | `client.defense.*` |
| **forensics** | PCAP capture, HAR replay | `client.forensics.*` |
| **cluster** | Cluster members, distributed attacks | `client.cluster.*` |
| **mtd** | Moving target defense | `client.mtd.*` |
| **victim** | Intentionally vulnerable endpoints | `client.victim.*` |
| **webhooks** | Webhook receivers, inspection | `client.webhooks.*` |
| **graphql** | GraphQL query execution | `client.graphql.*` |
| **realtime** | SSE streaming | `client.realtime.*` |

---

## Core API

Health, echo, metrics, and request history.

### `client.core.health()`
Basic health check.
```typescript
const health = await client.core.health();
// { status: 'ok' | 'degraded' | 'error', timestamp: '...' }
```

### `client.core.healthPro()`
Detailed health check with component status.
```typescript
const health = await client.core.healthPro();
// { status: 'ok', checks: { redis: { status: 'ok', latencyMs: 2 }, ... } }
```

### `client.core.isHealthy()`
Quick boolean health check.
```typescript
if (await client.core.isHealthy()) {
  console.log('Server is ready');
}
```

### `client.core.echo(path, options?)`
Echo back request details (catch-all endpoint).
```typescript
const echo = await client.core.echo('/api/users', {
  method: 'POST',
  headers: { 'X-Custom': 'value' },
  body: { name: 'test' },
  delay: 1000,   // Inject 1s delay
  status: 201,   // Return specific status
});
// { method, path, headers, body, timestamp, latencyMs, ... }
```

### `client.core.metrics(options?)`
Get Prometheus metrics.
```typescript
const metrics = await client.core.metrics({ parse: true });
// { raw: '...', parsed: { http_requests_total: 42, ... } }
```

### `client.core.history()`
Get request history.
```typescript
const history = await client.core.history();
// { count: 100, entries: [{ id, method, path, timestamp, ... }] }
```

### `client.core.clearHistory()`
Clear request history.
```typescript
await client.core.clearHistory();
// { message: 'History cleared', count: 42 }
```

---

## Network API

DNS resolution, port scanning, and system information.

### `client.network.dns(hostname)`
DNS resolution.
```typescript
const dns = await client.network.dns('google.com');
// { hostname: 'google.com', addresses: ['142.250.xxx.xxx'], family: 4 }
```

### `client.network.ping(host, port)`
TCP port check.
```typescript
const ping = await client.network.ping('example.com', 443);
// { host, port, status: 'open' | 'closed' | 'timeout', latencyMs }
```

### `client.network.sysinfo()`
System information.
```typescript
const info = await client.network.sysinfo();
// { hostname, platform, arch, cpus, memory: { total, free, used }, uptime, ... }
```

### `client.network.rateLimit()`
Check rate limit status.
```typescript
const limit = await client.network.rateLimit();
// { status: 'allowed' | 'limited', remaining: 95, limit: 100, resetAt }
```

---

## Identity API

JWKS, OIDC configuration, and JWT operations.

### `client.identity.jwks()`
Get JSON Web Key Set.
```typescript
const jwks = await client.identity.jwks();
// { keys: [{ kty: 'RSA', kid: '...', n: '...', e: 'AQAB' }] }
```

### `client.identity.oidc()`
Get OIDC discovery configuration.
```typescript
const oidc = await client.identity.oidc();
// { issuer, authorization_endpoint, token_endpoint, jwks_uri, ... }
```

### `client.identity.mintToken(request?)`
Generate a JWT token.
```typescript
const token = await client.identity.mintToken({
  subject: 'user123',
  audience: 'api.example.com',
  expiresIn: '1h',
  claims: { role: 'admin' },
});
// { access_token: 'eyJ...', token_type: 'Bearer', expires_in: 3600 }
```

### `client.identity.decodeJwt(token)`
Debug/decode a JWT.
```typescript
const decoded = await client.identity.decodeJwt('eyJ...');
// { valid: true, header: { alg: 'RS256' }, payload: { sub: '...' } }
```

---

## Security API

Red team testing, WAF rules, and proxying.

### `client.security.redteam(request)`
Run security validation tests.
```typescript
const results = await client.security.redteam({
  target: 'https://api.example.com',
  tests: ['headers', 'cors', 'tls', 'csrf'],
  timeout: 30000,
});
// { target, results: [{ test, status: 'pass'|'fail'|'warn', message }], summary }
```

### `client.security.quickScan(target)`
Quick security scan with default tests.
```typescript
const results = await client.security.quickScan('https://example.com');
```

### `client.security.fullScan(target, timeout?)`
Full security scan with all tests.
```typescript
const results = await client.security.fullScan('https://example.com', 60000);
```

### `client.security.listRules()`
List Sentinel WAF rules.
```typescript
const rules = await client.security.listRules();
// [{ id, name, pattern, action: 'block'|'log'|'allow', priority, enabled }]
```

### `client.security.addRule(rule)`
Add a Sentinel rule.
```typescript
const rule = await client.security.addRule({
  name: 'Block SQLi',
  pattern: '(?i)(union.*select|insert.*into)',
  action: 'block',
  priority: 1,
});
```

### `client.security.deleteRule(id)`
Delete a Sentinel rule.
```typescript
await client.security.deleteRule('rule-123');
```

### `client.security.proxy(request)`
Proxy a request through Apparatus.
```typescript
const response = await client.security.proxy({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: { Authorization: 'Bearer ...' },
  timeout: 5000,
});
// { status: 200, statusText: 'OK', headers, body, latencyMs }
```

---

## Chaos API

Chaos engineering for testing resilience.

### `client.chaos.cpuSpike(options?)`
Trigger CPU spike.
```typescript
await client.chaos.cpuSpike({
  duration: 5000,    // 5 seconds
  intensity: 8,      // 1-10
});
```

### `client.chaos.memorySpike(options?)`
Trigger memory allocation.
```typescript
await client.chaos.memorySpike({
  size: 104857600,   // 100MB
  duration: 10000,   // Hold for 10s
});
```

### `client.chaos.memoryClear()`
Clear allocated memory.
```typescript
const result = await client.chaos.memoryClear();
// { message: 'Memory cleared', freed: 104857600 }
```

### `client.chaos.crash()`
Trigger server crash (use with caution).
```typescript
await client.chaos.crash();
```

### `client.chaos.eicar()`
Get EICAR antivirus test file.
```typescript
const eicar = await client.chaos.eicar();
// { filename: 'eicar.com', contentType: 'application/octet-stream', content: '...' }
```

### `client.chaos.quickTest()`
Run quick chaos test (5s CPU spike).
```typescript
await client.chaos.quickTest();
```

---

## Data API

Data generation, sinking, and DLP scanning.

### `client.data.generate(options)`
Generate synthetic data.
```typescript
// Stream 1MB of JSON
const stream = await client.data.generate({
  type: 'json',
  size: 1048576,
  schema: { name: 'string', age: 'number' },
});
```

### `client.data.sink(data)`
Sink (absorb) data.
```typescript
const result = await client.data.sink(largePayload);
// { received: 1048576, contentType: 'application/json', timestamp }
```

### `client.data.dlp(request)`
Scan content for sensitive data.
```typescript
const scan = await client.data.dlp({
  content: 'My SSN is 123-45-6789',
  rules: ['ssn', 'credit_card', 'email'],
});
// { matches: [{ type: 'ssn', value: '123-45-6789', confidence: 0.99 }], summary }
```

---

## Storage API

Key-value store and script execution.

### `client.storage.kvGet(key)`
Get a value.
```typescript
const entry = await client.storage.kvGet('mykey');
// { key: 'mykey', value: { ... }, createdAt, updatedAt }
```

### `client.storage.kvSet(key, value, ttl?)`
Set a value.
```typescript
await client.storage.kvSet('mykey', { data: 123 }, 3600);  // TTL: 1 hour
```

### `client.storage.kvDelete(key)`
Delete a value.
```typescript
await client.storage.kvDelete('mykey');
```

### `client.storage.kvList()`
List all keys.
```typescript
const keys = await client.storage.kvList();
// ['key1', 'key2', ...]
```

### `client.storage.script(request)`
Execute JavaScript in sandbox.
```typescript
const result = await client.storage.script({
  code: 'return args[0] + args[1]',
  args: [1, 2],
  timeout: 1000,
});
// { result: 3, logs: [], duration: 5 }
```

---

## Traffic API

Background traffic generation.

### `client.traffic.status()`
Get ghost traffic status.
```typescript
const status = await client.traffic.status();
// { running: true, config: { rps: 10, endpoints: ['/api/...'] }, stats: { requestsSent: 1000 } }
```

### `client.traffic.start(config)`
Start ghost traffic.
```typescript
await client.traffic.start({
  rps: 10,
  duration: 60000,
  endpoints: ['/api/users', '/api/products'],
});
```

### `client.traffic.stop()`
Stop ghost traffic.
```typescript
await client.traffic.stop();
```

---

## Defense API

Tarpit and deception/honeypot features.

### `client.defense.tarpitList()`
List trapped connections.
```typescript
const trapped = await client.defense.tarpitList();
// { count: 5, trapPaths: ['/admin'], trapped: [{ ip, trappedAt, duration }] }
```

### `client.defense.tarpitRelease(ip?)`
Release trapped connections.
```typescript
await client.defense.tarpitRelease('192.168.1.100');  // Release specific IP
await client.defense.tarpitRelease();                  // Release all
```

### `client.defense.deceptionHistory()`
Get deception/honeypot events.
```typescript
const events = await client.defense.deceptionHistory();
// { count: 10, events: [{ type: 'honeypot_hit', ip, route, details }] }
```

---

## Forensics API

Network capture and replay.

### `client.forensics.pcap(options?)`
Capture network traffic.
```typescript
const pcap = await client.forensics.pcap({
  duration: 10000,
  filter: 'port 80',
  maxPackets: 1000,
});
// Returns binary PCAP data
```

### `client.forensics.replay(request)`
Replay HAR file.
```typescript
const results = await client.forensics.replay({
  har: harFileContent,
  baseUrl: 'http://localhost:8080',
  delay: 100,
});
// { entries: [{ url, method, status, latencyMs }], summary }
```

---

## Cluster API

Distributed operations.

### `client.cluster.members()`
Get cluster members.
```typescript
const cluster = await client.cluster.members();
// { leader: 'node-1', members: [{ id, hostname, ip, port, status }] }
```

### `client.cluster.attack(request)`
Launch distributed attack.
```typescript
const attack = await client.cluster.attack({
  type: 'flood',
  target: 'http://target.example.com',
  params: { rps: 100, duration: 60000 },
});
// { id: 'attack-123', status: 'running' }
```

---

## MTD API

Moving Target Defense.

### `client.mtd.status()`
Get MTD status.
```typescript
const status = await client.mtd.status();
// { enabled: true, currentProfile: 'profile-a', rotationInterval: 300000, nextRotation }
```

### `client.mtd.rotate()`
Force profile rotation.
```typescript
const result = await client.mtd.rotate();
// { previousProfile: 'profile-a', newProfile: 'profile-b', rotatedAt }
```

---

## Victim API

Intentionally vulnerable endpoints for security testing.

### `client.victim.sqli(input)`
SQL injection test endpoint.
```typescript
const result = await client.victim.sqli("' OR 1=1 --");
// { query: '...', results: [...], vulnerable: true }
```

### `client.victim.rce(command)`
Remote code execution test endpoint.
```typescript
const result = await client.victim.rce('id');
// { command: 'id', output: 'uid=1000...', vulnerable: true }
```

### `client.victim.xss(input)`
XSS test endpoint.
```typescript
const result = await client.victim.xss('<script>alert(1)</script>');
// { input: '...', rendered: '...', vulnerable: true }
```

---

## Webhooks API

Webhook receivers and inspection.

### `client.webhooks.info(id)`
Get webhook info.
```typescript
const info = await client.webhooks.info('hook-123');
// { id, createdAt, requestCount, lastRequest }
```

### `client.webhooks.inspect(id)`
Inspect received webhook requests.
```typescript
const requests = await client.webhooks.inspect('hook-123');
// { id, requests: [{ method, path, headers, body, receivedAt }] }
```

### `client.webhooks.send(id, data)`
Send data to webhook endpoint.
```typescript
await client.webhooks.send('hook-123', { event: 'test', data: {} });
```

---

## GraphQL API

GraphQL query execution.

### `client.graphql.query(request)`
Execute GraphQL query.
```typescript
const result = await client.graphql.query({
  query: `query { users { id name } }`,
  variables: { limit: 10 },
});
// { data: { users: [...] }, errors: [] }
```

---

## Realtime API (SSE)

Server-Sent Events for real-time updates.

### `client.realtime.connect()`
Connect to SSE stream.
```typescript
client.realtime.connect();
```

### `client.realtime.disconnect()`
Disconnect from SSE stream.
```typescript
client.realtime.disconnect();
```

### `client.realtime.onEvent(handler)`
Subscribe to all events.
```typescript
const unsubscribe = client.realtime.onEvent((event) => {
  console.log(event.type, event.data);
});
```

### `client.realtime.on(type, handler)`
Subscribe to specific event type.
```typescript
client.realtime.on('request', (event) => {
  console.log('Request received:', event.data);
});
```

### Event Types
- `request` - Incoming HTTP requests
- `deception` - Honeypot/deception triggers
- `tarpit` - Tarpit trap events
- `health` - Health status changes
- `threat-intel` - Threat intelligence events

### `client.realtime.onStateChange(handler)`
Monitor connection state.
```typescript
client.realtime.onStateChange((state) => {
  // state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  console.log('SSE state:', state);
});
```

---

## Error Handling

The client provides a comprehensive error hierarchy:

```typescript
import {
  ApparatusError,      // Base error class
  NetworkError,      // Connection failures
  ApiError,          // HTTP 4xx/5xx responses
  TimeoutError,      // Request timeouts
  ValidationError,   // Invalid parameters
  SSEError,          // SSE connection issues
  ConfigurationError, // Config errors
  isApiError,        // Type guards
  isNetworkError,
  isTimeoutError,
} from '@atlascrew/apparatus-lib';

try {
  await client.core.health();
} catch (error) {
  if (isApiError(error)) {
    console.log('HTTP error:', error.status, error.statusText);
    if (error.isNotFound) console.log('Resource not found');
    if (error.isRateLimited) console.log('Rate limited');
  } else if (isNetworkError(error)) {
    console.log('Network error:', error.url);
  } else if (isTimeoutError(error)) {
    console.log('Timed out after:', error.timeoutMs);
  }
}
```

### ApiError Helpers

```typescript
error.isClientError   // 4xx
error.isServerError   // 5xx
error.isNotFound      // 404
error.isUnauthorized  // 401
error.isForbidden     // 403
error.isRateLimited   // 429
```

---

## TypeScript Types

All types are exported for use in your code:

```typescript
import type {
  // Client config
  ApparatusClientOptions,
  SSEClientOptions,

  // Core
  HealthResponse,
  EchoResponse,
  MetricsResponse,
  HistoryResponse,

  // Network
  DnsResponse,
  PingResponse,
  SysInfoResponse,

  // Security
  RedTeamRequest,
  RedTeamResponse,
  SentinelRule,
  ProxyResponse,

  // Chaos
  CpuSpikeRequest,
  MemorySpikeResponse,

  // And many more...
} from '@atlascrew/apparatus-lib';
```

---

## Examples

### Health Monitoring

```typescript
import { ApparatusClient } from '@atlascrew/apparatus-lib';

const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

// Periodic health check
setInterval(async () => {
  const health = await client.core.healthPro();
  console.log(`Status: ${health.status}`);

  for (const [name, check] of Object.entries(health.checks)) {
    console.log(`  ${name}: ${check.status} (${check.latencyMs}ms)`);
  }
}, 10000);
```

### Chaos Testing

```typescript
import { ApparatusClient } from '@atlascrew/apparatus-lib';

const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

// Stress test sequence
async function stressTest() {
  console.log('Starting CPU stress...');
  await client.chaos.cpuSpike({ duration: 10000, intensity: 8 });

  console.log('Starting memory stress...');
  await client.chaos.memorySpike({ size: 500 * 1024 * 1024 }); // 500MB

  console.log('Cleaning up...');
  await client.chaos.memoryClear();
}
```

### Real-time Event Monitoring

```typescript
import { ApparatusClient } from '@atlascrew/apparatus-lib';

const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

// Connect and monitor events
client.realtime.connect();

client.realtime.on('request', (event) => {
  console.log(`[${event.timestamp}] ${event.data.method} ${event.data.path}`);
});

client.realtime.on('deception', (event) => {
  console.log(`[ALERT] Honeypot triggered by ${event.data.ip}`);
});

client.realtime.onStateChange((state) => {
  console.log(`Connection: ${state}`);
});

// Cleanup on exit
process.on('SIGINT', () => {
  client.realtime.disconnect();
  process.exit(0);
});
```

### Security Scanning

```typescript
import { ApparatusClient, isApiError } from '@atlascrew/apparatus-lib';

const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

async function securityScan(target: string) {
  try {
    const results = await client.security.fullScan(target);

    console.log(`Security Scan: ${target}`);
    console.log(`Total tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);

    for (const result of results.results.filter(r => r.status === 'fail')) {
      console.log(`  [FAIL] ${result.test}: ${result.message}`);
    }
  } catch (error) {
    if (isApiError(error) && error.isRateLimited) {
      console.log('Rate limited, try again later');
    } else {
      throw error;
    }
  }
}
```

---

## See Also

- [Apparatus CLI](../../apps/demo-targets/apparatus-cli/) - Command-line interface
- [Apparatus Server](../../apps/demo-targets/apparatus/) - The API server

## License

MIT
