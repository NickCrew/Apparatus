# Troubleshooting Guide

Common issues and solutions when using the Apparatus client library.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authentication Errors](#authentication-errors)
- [Timeout Problems](#timeout-problems)
- [SSE/Real-time Issues](#ssereal-time-issues)
- [API Errors](#api-errors)
- [TypeScript Issues](#typescript-issues)
- [Performance Problems](#performance-problems)
- [Environment Issues](#environment-issues)

---

## Connection Issues

### ECONNREFUSED - Connection Refused

**Symptom:**
```
NetworkError: connect ECONNREFUSED 127.0.0.1:8080
```

**Causes:**
1. Apparatus server not running
2. Wrong URL or port configured
3. Firewall blocking the connection
4. Server crashed or restarting

**Solutions:**

```typescript
import { ApparatusClient, NetworkError } from 'apparatus-client';

// 1. Verify server is running
// $ curl http://localhost:8080/healthz

// 2. Check your configuration
const client = new ApparatusClient({
  baseUrl: process.env.APPARATUS_URL || 'http://localhost:8080',
  // Verify this URL is correct
});

// 3. Test connection explicitly
async function testConnection() {
  try {
    const healthy = await client.isHealthy();
    console.log('Connection successful:', healthy);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error('Cannot connect to Apparatus');
      console.error('URL:', process.env.APPARATUS_URL || 'http://localhost:8080');
      console.error('Error:', error.message);

      // Suggest fixes
      console.log('\nTroubleshooting steps:');
      console.log('1. Verify Apparatus is running: curl http://localhost:8080/healthz');
      console.log('2. Check the APPARATUS_URL environment variable');
      console.log('3. Verify network/firewall settings');
    }
    throw error;
  }
}
```

### ENOTFOUND - DNS Resolution Failed

**Symptom:**
```
NetworkError: getaddrinfo ENOTFOUND apparatus.example.com
```

**Solutions:**

```typescript
// 1. Verify the hostname resolves
// $ nslookup apparatus.example.com

// 2. Check for typos in the URL
const client = new ApparatusClient({
  baseUrl: 'https://apparatus.example.com',  // No trailing slash!
});

// 3. Use IP address temporarily to isolate DNS issues
const client = new ApparatusClient({
  baseUrl: 'http://192.168.1.100:8080',
});

// 4. Check /etc/hosts or DNS configuration
```

### ECONNRESET - Connection Reset

**Symptom:**
```
NetworkError: read ECONNRESET
```

**Causes:**
1. Server terminated the connection unexpectedly
2. Load balancer timeout
3. Network instability
4. TLS/SSL issues

**Solutions:**

```typescript
import { ApparatusClient, NetworkError } from 'apparatus-client';

// Implement retry with backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof NetworkError &&
          error.code === 'ECONNRESET' &&
          i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Connection reset, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// Usage
const health = await withRetry(() => client.core.healthPro());
```

---

## Authentication Errors

### 401 Unauthorized

**Symptom:**
```
ApiError: 401 Unauthorized
```

**Solutions:**

```typescript
import { ApparatusClient, ApiError } from 'apparatus-client';

// 1. Verify authentication headers
const client = new ApparatusClient({
  baseUrl: 'https://apparatus.example.com',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    // or
    'X-API-Key': process.env.API_KEY!,
  },
});

// 2. Handle authentication errors gracefully
async function authenticatedRequest() {
  try {
    return await client.core.healthPro();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      console.error('Authentication failed');
      console.log('Check that API_TOKEN or API_KEY is set correctly');

      // Optionally refresh token and retry
      // await refreshToken();
      // return await client.core.healthPro();
    }
    throw error;
  }
}

// 3. Verify token is not expired
async function checkTokenExpiry(token: string) {
  const decoded = await client.identity.decodeJwt(token);
  const exp = decoded.payload.exp as number;
  const now = Math.floor(Date.now() / 1000);

  if (exp < now) {
    console.error('Token expired at:', new Date(exp * 1000));
    return false;
  }

  console.log('Token valid until:', new Date(exp * 1000));
  return true;
}
```

### 403 Forbidden

**Symptom:**
```
ApiError: 403 Forbidden
```

**Solutions:**

```typescript
// This typically means authentication succeeded but authorization failed

// 1. Verify you have the required permissions
// Check with your administrator what permissions are needed

// 2. Check if IP is blocked by WAF rules
const rules = await client.security.listRules();
console.log('Active WAF rules:', rules.filter(r => r.enabled));

// 3. Check if IP is in tarpit
const trapped = await client.defense.listTrapped();
const myIp = '...'; // Your IP
const amITrapped = trapped.find(t => t.ip === myIp);
if (amITrapped) {
  console.log('Your IP is trapped in tarpit:', amITrapped);
  // Request release from administrator
}
```

---

## Timeout Problems

### Request Timeout

**Symptom:**
```
TimeoutError: Request timed out after 30000ms
```

**Causes:**
1. Server is slow or overloaded
2. Network latency
3. Operation takes longer than timeout allows
4. DNS resolution delays

**Solutions:**

```typescript
import { ApparatusClient, TimeoutError } from 'apparatus-client';

// 1. Increase timeout for slow operations
const client = new ApparatusClient({
  baseUrl: 'http://localhost:8080',
  timeout: 60000, // 60 seconds
});

// 2. Use different timeouts for different operations
const quickClient = new ApparatusClient({
  baseUrl: process.env.APPARATUS_URL!,
  timeout: 5000, // 5 seconds for health checks
});

const slowClient = new ApparatusClient({
  baseUrl: process.env.APPARATUS_URL!,
  timeout: 120000, // 2 minutes for security scans
});

// 3. Handle timeout errors specifically
async function securityScanWithFallback(target: string) {
  try {
    return await slowClient.security.redteam({ target });
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.warn('Security scan timed out, trying with reduced tests');
      // Try with fewer tests
      return await slowClient.security.redteam({
        target,
        tests: ['headers', 'tls'], // Quick tests only
      });
    }
    throw error;
  }
}

// 4. Monitor latency to detect issues
async function monitorLatency() {
  const start = Date.now();
  await client.isHealthy();
  const latency = Date.now() - start;

  if (latency > 1000) {
    console.warn(`High latency detected: ${latency}ms`);
  }

  return latency;
}
```

### Operation Cancelled

**Symptom:**
```
Error: The operation was cancelled
```

**Cause:**
AbortController cancelled the request (typically due to timeout or manual cancellation)

**Solutions:**

```typescript
// 1. Check if you're manually aborting requests
// Make sure AbortController is not being triggered prematurely

// 2. Handle cancellation gracefully
async function cancellableOperation() {
  const controller = new AbortController();

  // Cancel after 30 seconds
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    // Pass signal to operation if supported
    const result = await someAsyncOperation();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Operation was cancelled');
      return null; // Return default value
    }
    throw error;
  }
}
```

---

## SSE/Real-time Issues

### SSE Connection Fails

**Symptom:**
```
SSEError: Failed to connect to SSE endpoint
```

**Solutions:**

```typescript
import { ApparatusClient, SSEError } from 'apparatus-client';

// 1. Verify SSE endpoint is available
// $ curl -N http://localhost:8080/sse

// 2. Handle connection errors
client.realtime.on('error', (error) => {
  if (error instanceof SSEError) {
    console.error('SSE connection error:', error.message);

    // Attempt reconnection
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      client.realtime.connect();
    }, 5000);
  }
});

// 3. Monitor connection state
setInterval(() => {
  const connected = client.realtime.isConnected();
  if (!connected) {
    console.warn('SSE disconnected, reconnecting...');
    client.realtime.connect();
  }
}, 30000);
```

### Events Not Received

**Symptom:**
SSE connected but events not arriving

**Solutions:**

```typescript
// 1. Verify event subscription
client.realtime.connect();

// Make sure you're subscribed to the right events
client.realtime.on('request', (event) => {
  console.log('Received request event:', event);
});

client.realtime.on('deception', (event) => {
  console.log('Received deception event:', event);
});

// 2. Debug: log all events
client.realtime.on('message', (event) => {
  console.log('Raw SSE message:', event);
});

// 3. Generate test traffic
async function testEventFlow() {
  client.realtime.connect();

  // Wait for connection
  await new Promise(r => setTimeout(r, 1000));

  // Generate traffic that should trigger events
  await client.echo('/test/sse');

  // Should see request event in console
}
```

### SSE Memory Leak

**Symptom:**
Memory usage grows over time with SSE connection

**Solutions:**

```typescript
// 1. Remove event listeners when done
const handler = (event: any) => {
  // Process event
};

client.realtime.on('request', handler);

// Later, when cleaning up:
client.realtime.off('request', handler);

// 2. Limit event history
const events: any[] = [];
const MAX_EVENTS = 1000;

client.realtime.on('request', (event) => {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.shift(); // Remove oldest
  }
});

// 3. Properly disconnect when shutting down
process.on('SIGTERM', () => {
  client.realtime.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  client.realtime.disconnect();
  process.exit(0);
});
```

---

## API Errors

### 400 Bad Request

**Symptom:**
```
ApiError: 400 Bad Request - Invalid parameters
```

**Solutions:**

```typescript
import { ApparatusClient, ApiError, ValidationError } from 'apparatus-client';

// 1. Validate inputs before sending
function validateRule(rule: any) {
  if (!rule.name || typeof rule.name !== 'string') {
    throw new ValidationError('Rule name is required');
  }
  if (!rule.pattern || typeof rule.pattern !== 'string') {
    throw new ValidationError('Rule pattern is required');
  }
  if (!['block', 'log', 'allow'].includes(rule.action)) {
    throw new ValidationError('Invalid action: must be block, log, or allow');
  }
  return rule;
}

// 2. Handle API errors with details
async function createRuleSafe(rule: any) {
  try {
    return await client.security.addRule(validateRule(rule));
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 400) {
      console.error('Invalid request:', error.message);
      // Log the request that failed
      console.error('Rule data:', JSON.stringify(rule, null, 2));
    }
    throw error;
  }
}
```

### 404 Not Found

**Symptom:**
```
ApiError: 404 Not Found - Resource not found
```

**Solutions:**

```typescript
// 1. Verify resource exists before operating on it
async function safeDeleteRule(ruleId: string) {
  const rules = await client.security.listRules();
  const exists = rules.find(r => r.id === ruleId);

  if (!exists) {
    console.warn(`Rule ${ruleId} not found, skipping delete`);
    return;
  }

  return client.security.deleteRule(ruleId);
}

// 2. Handle 404 gracefully for optional resources
async function getKeyOrDefault(key: string, defaultValue: any) {
  try {
    return await client.storage.kvGet(key);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return defaultValue;
    }
    throw error;
  }
}
```

### 429 Too Many Requests

**Symptom:**
```
ApiError: 429 Too Many Requests - Rate limit exceeded
```

**Solutions:**

```typescript
import { ApparatusClient, ApiError } from 'apparatus-client';

// 1. Implement rate limiting on client side
class RateLimitedClient {
  private client: ApparatusClient;
  private lastRequest = 0;
  private minInterval = 100; // 10 RPS max

  constructor(client: ApparatusClient) {
    this.client = client;
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequest;

    if (elapsed < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    }

    this.lastRequest = Date.now();
  }

  async echo(path: string) {
    await this.throttle();
    return this.client.echo(path);
  }
}

// 2. Handle 429 with exponential backoff
async function withRateLimitRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  let delay = 1000;
  const maxDelay = 60000;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 429) {
        console.log(`Rate limited, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);
        continue;
      }
      throw error;
    }
  }
}

// 3. Check rate limit status before operations
async function checkRateLimit() {
  const status = await client.network.rateLimit();
  console.log('Rate limit:', status.limit);
  console.log('Remaining:', status.remaining);

  if (status.remaining < 10) {
    console.warn('Running low on rate limit!');
  }

  return status.remaining > 0;
}
```

### 500 Internal Server Error

**Symptom:**
```
ApiError: 500 Internal Server Error
```

**Solutions:**

```typescript
// 1. Report the error with context
async function operationWithErrorReporting() {
  try {
    return await client.security.redteam({ target: 'https://example.com' });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode >= 500) {
      console.error('Server error detected');
      console.error('Operation: security.redteam');
      console.error('Status:', error.statusCode);
      console.error('Message:', error.message);

      // Check server health
      try {
        const health = await client.core.healthPro();
        console.error('Server health:', health.status);
      } catch {
        console.error('Server health check also failed');
      }
    }
    throw error;
  }
}

// 2. Retry transient 5xx errors
async function retryServerErrors<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Only retry 502, 503, 504 (transient errors)
      if (error instanceof ApiError &&
          [502, 503, 504].includes(error.statusCode)) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`Server error (${error.statusCode}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
```

---

## TypeScript Issues

### Type Errors with Responses

**Symptom:**
```
Type 'unknown' is not assignable to type '...'
```

**Solutions:**

```typescript
import {
  ApparatusClient,
  HealthResponse,
  EchoResponse,
  SentinelRule,
} from 'apparatus-client';

// 1. Import and use the provided types
const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

async function example() {
  // Response is properly typed
  const health: HealthResponse = await client.core.health();
  const echo: EchoResponse = await client.echo('/test');
  const rules: SentinelRule[] = await client.security.listRules();

  // Type inference works automatically
  const metrics = await client.core.metrics();
  // metrics.raw is string
  // metrics.parsed is Record<string, number> | undefined
}

// 2. Type narrowing for error handling
import { ApparatusError, NetworkError, ApiError } from 'apparatus-client';

async function handleErrors() {
  try {
    await client.isHealthy();
  } catch (error) {
    // Type guard
    if (error instanceof NetworkError) {
      // error.code is string
      // error.message is string
      console.log(error.code);
    } else if (error instanceof ApiError) {
      // error.statusCode is number
      // error.message is string
      console.log(error.statusCode);
    }
  }
}
```

### Missing Type Definitions

**Symptom:**
```
Cannot find module 'apparatus-client' or its type declarations
```

**Solutions:**

```typescript
// 1. Ensure package is installed
// $ pnpm add apparatus-client

// 2. Check tsconfig.json includes node_modules types
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "types": ["node"]
  }
}

// 3. If using workspace, ensure build is up to date
// $ pnpm nx build apparatus-client

// 4. For type augmentation (extending types)
declare module 'apparatus-client' {
  interface ApparatusClientOptions {
    customOption?: string;
  }
}
```

---

## Performance Problems

### High Memory Usage

**Solutions:**

```typescript
// 1. Avoid storing all events in memory
// Bad:
const allEvents: any[] = [];
client.realtime.on('request', e => allEvents.push(e));

// Good:
const recentEvents: any[] = [];
const MAX_EVENTS = 100;
client.realtime.on('request', e => {
  recentEvents.push(e);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.shift();
  }
});

// 2. Clear references when done
let client: ApparatusClient | null = new ApparatusClient({ baseUrl: '...' });

// When shutting down
client.realtime.disconnect();
client = null;

// 3. Use streaming for large data instead of buffering
// Instead of loading all history at once:
const history = await client.core.history({ limit: 10 }); // Limit results
```

### Slow Operations

**Solutions:**

```typescript
// 1. Use parallel requests for independent operations
// Bad (sequential):
const health = await client.core.healthPro();
const metrics = await client.core.metrics();
const rules = await client.security.listRules();

// Good (parallel):
const [health, metrics, rules] = await Promise.all([
  client.core.healthPro(),
  client.core.metrics(),
  client.security.listRules(),
]);

// 2. Cache frequently accessed data
const cachedJwks = {
  data: null as any,
  timestamp: 0,
  ttl: 300000, // 5 minutes
};

async function getJwks() {
  if (cachedJwks.data && Date.now() - cachedJwks.timestamp < cachedJwks.ttl) {
    return cachedJwks.data;
  }

  cachedJwks.data = await client.identity.jwks();
  cachedJwks.timestamp = Date.now();
  return cachedJwks.data;
}

// 3. Use appropriate timeouts
const quickClient = new ApparatusClient({
  baseUrl: process.env.APPARATUS_URL!,
  timeout: 5000, // Don't wait too long for health checks
});
```

---

## Environment Issues

### Environment Variable Not Set

**Symptom:**
```
Error: baseUrl is required
```

**Solutions:**

```typescript
// 1. Provide defaults
const client = new ApparatusClient({
  baseUrl: process.env.APPARATUS_URL || 'http://localhost:8080',
});

// 2. Validate environment on startup
function validateEnvironment() {
  const required = ['APPARATUS_URL'];
  const missing = required.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    console.error('Please set them in your .env file or environment');
    process.exit(1);
  }
}

// 3. Use dotenv for local development
import 'dotenv/config';

// .env file:
// APPARATUS_URL=http://localhost:8080
// APPARATUS_TIMEOUT=30000
```

### Different Behavior in Production

**Solutions:**

```typescript
// 1. Log configuration for debugging
console.log('Environment:', process.env.NODE_ENV);
console.log('Apparatus URL:', process.env.APPARATUS_URL);
console.log('Timeout:', process.env.APPARATUS_TIMEOUT || 'default (30000)');

// 2. Validate connectivity on startup
async function validateConnectivity() {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 5000,
  });

  try {
    const healthy = await client.isHealthy();
    if (!healthy) {
      throw new Error('Apparatus is not healthy');
    }
    console.log('Successfully connected to Apparatus');
  } catch (error) {
    console.error('Failed to connect to Apparatus:', error);
    console.error('URL:', process.env.APPARATUS_URL);
    throw error;
  }
}

// Run on startup
validateConnectivity().catch(() => process.exit(1));
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs** - Enable debug mode: `APPARATUS_DEBUG=true`
2. **Verify server status** - `curl http://localhost:8080/healthz`
3. **Check network** - `curl http://localhost:8080/sse` for SSE
4. **Review configuration** - Log all config values on startup
5. **File an issue** - Include error message, configuration, and steps to reproduce

## Related Resources

- [Integration Scenarios](./INTEGRATION_SCENARIOS.md) - Real-world integration patterns
- [Testing Patterns](./TESTING_PATTERNS.md) - Unit and integration testing strategies
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment best practices
