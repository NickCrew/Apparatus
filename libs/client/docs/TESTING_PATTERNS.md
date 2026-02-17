# Testing Patterns

Comprehensive testing strategies for applications using the Apparatus client library.

## Table of Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mocking Strategies](#mocking-strategies)
- [Test Fixtures](#test-fixtures)
- [CI/CD Integration](#cicd-integration)

---

## Unit Testing

### Basic Client Mocking

Mock the ApparatusClient for unit tests:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApparatusClient } from 'apparatus-client';

// Mock the entire client
vi.mock('apparatus-client', () => ({
  ApparatusClient: vi.fn().mockImplementation(() => ({
    isHealthy: vi.fn().mockResolvedValue(true),
    echo: vi.fn().mockResolvedValue({
      method: 'GET',
      path: '/test',
      timestamp: new Date().toISOString(),
      latencyMs: 15,
    }),
    core: {
      health: vi.fn().mockResolvedValue({ status: 'ok' }),
      healthPro: vi.fn().mockResolvedValue({
        status: 'ok',
        uptime: 3600,
        memory: { heapUsed: 50000000, heapTotal: 100000000 },
      }),
      metrics: vi.fn().mockResolvedValue({ raw: 'http_requests_total 42' }),
    },
  })),
}));

describe('MyService', () => {
  let client: ApparatusClient;

  beforeEach(() => {
    client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });
    vi.clearAllMocks();
  });

  it('should check health on startup', async () => {
    const healthy = await client.isHealthy();
    expect(healthy).toBe(true);
    expect(client.isHealthy).toHaveBeenCalledTimes(1);
  });

  it('should handle echo requests', async () => {
    const response = await client.echo('/api/test');
    expect(response.method).toBe('GET');
    expect(response.path).toBe('/test');
  });
});
```

### Testing Error Handling

Test error scenarios comprehensively:

```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  ApparatusClient,
  NetworkError,
  TimeoutError,
  ApiError
} from 'apparatus-client';

describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

    vi.spyOn(client, 'isHealthy').mockRejectedValue(
      new NetworkError('ECONNREFUSED', 'Connection refused')
    );

    await expect(client.isHealthy()).rejects.toThrow(NetworkError);
    await expect(client.isHealthy()).rejects.toThrow('Connection refused');
  });

  it('should handle timeout errors', async () => {
    const client = new ApparatusClient({
      baseUrl: 'http://localhost:8080',
      timeout: 1000,
    });

    vi.spyOn(client.core, 'healthPro').mockRejectedValue(
      new TimeoutError(1000)
    );

    await expect(client.core.healthPro()).rejects.toThrow(TimeoutError);
  });

  it('should handle API errors with status codes', async () => {
    const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

    vi.spyOn(client.security, 'deleteRule').mockRejectedValue(
      new ApiError(404, 'Rule not found')
    );

    await expect(client.security.deleteRule('invalid-id'))
      .rejects.toThrow(ApiError);
    await expect(client.security.deleteRule('invalid-id'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
```

### Testing Async Operations

Test SSE and streaming operations:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApparatusClient, SSEEvent } from 'apparatus-client';

describe('Realtime Operations', () => {
  let client: ApparatusClient;
  let mockEventEmitter: any;

  beforeEach(() => {
    client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

    // Create mock event emitter
    mockEventEmitter = {
      handlers: new Map<string, Function[]>(),
      on(event: string, handler: Function) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
      },
      emit(event: string, data: any) {
        const handlers = this.handlers.get(event) || [];
        handlers.forEach(h => h(data));
      },
      off(event: string, handler: Function) {
        const handlers = this.handlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      },
    };

    // Mock realtime methods
    vi.spyOn(client.realtime, 'connect').mockImplementation(() => {});
    vi.spyOn(client.realtime, 'disconnect').mockImplementation(() => {});
    vi.spyOn(client.realtime, 'on').mockImplementation((event, handler) => {
      mockEventEmitter.on(event, handler);
    });
    vi.spyOn(client.realtime, 'off').mockImplementation((event, handler) => {
      mockEventEmitter.off(event, handler);
    });
  });

  it('should receive request events', () => {
    const events: SSEEvent[] = [];

    client.realtime.connect();
    client.realtime.on('request', (event) => {
      events.push(event);
    });

    // Simulate incoming event
    mockEventEmitter.emit('request', {
      type: 'request',
      method: 'POST',
      path: '/api/users',
      timestamp: new Date().toISOString(),
    });

    expect(events).toHaveLength(1);
    expect(events[0].method).toBe('POST');
  });

  it('should handle multiple event types', () => {
    const deceptionEvents: any[] = [];
    const tarpitEvents: any[] = [];

    client.realtime.connect();
    client.realtime.on('deception', (e) => deceptionEvents.push(e));
    client.realtime.on('tarpit', (e) => tarpitEvents.push(e));

    mockEventEmitter.emit('deception', { type: 'deception', path: '/admin' });
    mockEventEmitter.emit('tarpit', { type: 'tarpit', ip: '1.2.3.4' });

    expect(deceptionEvents).toHaveLength(1);
    expect(tarpitEvents).toHaveLength(1);
  });

  it('should allow unsubscribing from events', () => {
    const events: any[] = [];
    const handler = (e: any) => events.push(e);

    client.realtime.connect();
    client.realtime.on('request', handler);

    mockEventEmitter.emit('request', { id: 1 });
    expect(events).toHaveLength(1);

    client.realtime.off('request', handler);
    mockEventEmitter.emit('request', { id: 2 });
    expect(events).toHaveLength(1); // Should not receive second event
  });
});
```

---

## Integration Testing

### Live Server Testing

Test against a running Apparatus instance:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApparatusClient } from 'apparatus-client';

describe('Integration Tests', () => {
  let client: ApparatusClient;

  beforeAll(() => {
    const baseUrl = process.env.APPARATUS_URL || 'http://localhost:8080';
    client = new ApparatusClient({ baseUrl, timeout: 10000 });
  });

  describe('Core API', () => {
    it('should return healthy status', async () => {
      const healthy = await client.isHealthy();
      expect(healthy).toBe(true);
    });

    it('should return detailed health info', async () => {
      const health = await client.core.healthPro();
      expect(health.status).toBe('ok');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memory).toBeDefined();
    });

    it('should echo requests correctly', async () => {
      const response = await client.echo('/test/path');
      expect(response.method).toBe('GET');
      expect(response.path).toBe('/test/path');
      expect(response.latencyMs).toBeGreaterThan(0);
    });

    it('should return prometheus metrics', async () => {
      const metrics = await client.core.metrics();
      expect(metrics.raw).toContain('http_requests_total');
    });
  });

  describe('Network API', () => {
    it('should resolve DNS', async () => {
      const result = await client.network.dns('localhost');
      expect(result.hostname).toBe('localhost');
      expect(result.addresses).toContain('127.0.0.1');
    });

    it('should check port connectivity', async () => {
      const result = await client.network.ping('localhost', 8080);
      expect(result.status).toBe('open');
      expect(result.latencyMs).toBeGreaterThan(0);
    });

    it('should return system info', async () => {
      const info = await client.network.sysinfo();
      expect(info.hostname).toBeDefined();
      expect(info.platform).toBeDefined();
      expect(info.cpus).toBeGreaterThan(0);
    });
  });

  describe('Identity API', () => {
    it('should return JWKS', async () => {
      const jwks = await client.identity.jwks();
      expect(jwks.keys).toBeDefined();
      expect(Array.isArray(jwks.keys)).toBe(true);
    });

    it('should mint and decode tokens', async () => {
      const token = await client.identity.mintToken({
        subject: 'test-user',
        audience: 'test-app',
        expiresIn: '1h',
      });

      expect(token.token).toBeDefined();
      expect(token.token).toMatch(/^eyJ/); // JWT format

      const decoded = await client.identity.decodeJwt(token.token);
      expect(decoded.payload.sub).toBe('test-user');
      expect(decoded.payload.aud).toBe('test-app');
    });
  });

  describe('Storage API', () => {
    const testKey = `test-${Date.now()}`;
    const testValue = { foo: 'bar', count: 42 };

    it('should set and get values', async () => {
      await client.storage.kvSet(testKey, testValue);
      const retrieved = await client.storage.kvGet(testKey);
      expect(retrieved).toEqual(testValue);
    });

    it('should list keys', async () => {
      const keys = await client.storage.kvList();
      expect(keys).toContain(testKey);
    });

    it('should delete values', async () => {
      await client.storage.kvDelete(testKey);
      await expect(client.storage.kvGet(testKey)).rejects.toThrow();
    });

    it('should execute scripts', async () => {
      const result = await client.storage.script('return 2 + 2');
      expect(result.result).toBe(4);
    });
  });
});
```

### End-to-End Workflow Tests

Test complete workflows:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApparatusClient, SentinelRule } from 'apparatus-client';

describe('E2E Workflows', () => {
  let client: ApparatusClient;
  let createdRuleIds: string[] = [];

  beforeAll(() => {
    client = new ApparatusClient({
      baseUrl: process.env.APPARATUS_URL || 'http://localhost:8080',
    });
  });

  afterAll(async () => {
    // Cleanup created rules
    for (const id of createdRuleIds) {
      try {
        await client.security.deleteRule(id);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Security Rule Management', () => {
    it('should create, list, update, and delete rules', async () => {
      // Create
      const rule = await client.security.addRule({
        name: 'E2E Test Rule',
        pattern: 'test-pattern',
        action: 'log',
        priority: 100,
        enabled: true,
      });
      createdRuleIds.push(rule.id);
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('E2E Test Rule');

      // List
      const rules = await client.security.listRules();
      const found = rules.find(r => r.id === rule.id);
      expect(found).toBeDefined();

      // Update (disable)
      await client.security.disableRule(rule.id);
      const updated = await client.security.listRules();
      const disabled = updated.find(r => r.id === rule.id);
      expect(disabled?.enabled).toBe(false);

      // Delete
      await client.security.deleteRule(rule.id);
      const final = await client.security.listRules();
      expect(final.find(r => r.id === rule.id)).toBeUndefined();
      createdRuleIds = createdRuleIds.filter(id => id !== rule.id);
    });
  });

  describe('Chaos Engineering Workflow', () => {
    it('should execute CPU spike and recover', async () => {
      // Check initial health
      const beforeHealth = await client.core.healthPro();
      expect(beforeHealth.status).toBe('ok');

      // Execute short CPU spike
      await client.chaos.cpuSpike({ duration: 1000, intensity: 5 });

      // Wait for recovery
      await new Promise(r => setTimeout(r, 2000));

      // Verify recovery
      const afterHealth = await client.core.healthPro();
      expect(afterHealth.status).toBe('ok');
    });

    it('should allocate and clear memory', async () => {
      // Allocate memory
      await client.chaos.memorySpike({
        size: 10 * 1024 * 1024, // 10MB
        duration: 60000,
      });

      // Verify allocation via health check
      const duringAllocation = await client.core.healthPro();
      const initialHeap = duringAllocation.memory.heapUsed;

      // Clear memory
      await client.chaos.clearMemory();

      // Wait for GC
      await new Promise(r => setTimeout(r, 500));

      // Verify memory released (might not be immediate due to GC)
      const afterClear = await client.core.healthPro();
      // Memory should be same or less (GC timing varies)
      expect(afterClear.memory.heapUsed).toBeLessThanOrEqual(initialHeap);
    });
  });

  describe('Traffic Generation Workflow', () => {
    it('should start, check status, and stop traffic', async () => {
      // Start traffic
      await client.traffic.start({ rps: 5, duration: 30000 });

      // Check status
      const status = await client.traffic.status();
      expect(status.active).toBe(true);

      // Stop traffic
      await client.traffic.stop();

      // Verify stopped
      const stoppedStatus = await client.traffic.status();
      expect(stoppedStatus.active).toBe(false);
    });
  });
});
```

---

## Mocking Strategies

### Factory Pattern for Test Doubles

Create reusable mock factories:

```typescript
import { ApparatusClient } from 'apparatus-client';

// Type-safe mock factory
export function createMockClient(overrides: Partial<MockClientConfig> = {}): ApparatusClient {
  const defaults: MockClientConfig = {
    healthy: true,
    healthStatus: 'ok',
    echoLatency: 15,
    rules: [],
    ...overrides,
  };

  return {
    isHealthy: vi.fn().mockResolvedValue(defaults.healthy),
    echo: vi.fn().mockImplementation(async (path, options) => ({
      method: options?.method || 'GET',
      path,
      timestamp: new Date().toISOString(),
      latencyMs: defaults.echoLatency,
      headers: {},
    })),
    core: {
      health: vi.fn().mockResolvedValue({ status: defaults.healthStatus }),
      healthPro: vi.fn().mockResolvedValue({
        status: defaults.healthStatus,
        uptime: 3600,
        memory: { heapUsed: 50000000, heapTotal: 100000000 },
      }),
      metrics: vi.fn().mockResolvedValue({ raw: 'http_requests_total 42' }),
      history: vi.fn().mockResolvedValue([]),
      clearHistory: vi.fn().mockResolvedValue(undefined),
    },
    security: {
      listRules: vi.fn().mockResolvedValue(defaults.rules),
      addRule: vi.fn().mockImplementation(async (rule) => ({
        id: `rule-${Date.now()}`,
        ...rule,
      })),
      deleteRule: vi.fn().mockResolvedValue(undefined),
      enableRule: vi.fn().mockResolvedValue(undefined),
      disableRule: vi.fn().mockResolvedValue(undefined),
      redteam: vi.fn().mockResolvedValue({
        summary: { passed: 5, failed: 0 },
        results: [],
      }),
      proxy: vi.fn().mockImplementation(async (url) => ({
        url,
        statusCode: 200,
        body: '',
      })),
    },
    chaos: {
      cpuSpike: vi.fn().mockResolvedValue(undefined),
      memorySpike: vi.fn().mockResolvedValue(undefined),
      clearMemory: vi.fn().mockResolvedValue(undefined),
      crash: vi.fn().mockResolvedValue(undefined),
      eicar: vi.fn().mockResolvedValue('EICAR test file'),
    },
    network: {
      dns: vi.fn().mockImplementation(async (hostname) => ({
        hostname,
        addresses: ['127.0.0.1'],
      })),
      ping: vi.fn().mockResolvedValue({ status: 'open', latencyMs: 1 }),
      sysinfo: vi.fn().mockResolvedValue({
        hostname: 'test-host',
        platform: 'linux',
        cpus: 4,
        memory: { total: 8000000000, free: 4000000000 },
      }),
      rateLimit: vi.fn().mockResolvedValue({ limit: 100, remaining: 95 }),
    },
    storage: {
      kvGet: vi.fn().mockResolvedValue(null),
      kvSet: vi.fn().mockResolvedValue(undefined),
      kvDelete: vi.fn().mockResolvedValue(undefined),
      kvList: vi.fn().mockResolvedValue([]),
      script: vi.fn().mockResolvedValue({ result: null }),
    },
    traffic: {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      status: vi.fn().mockResolvedValue({ active: false, currentRps: 0 }),
    },
    defense: {
      listTrapped: vi.fn().mockResolvedValue([]),
      release: vi.fn().mockResolvedValue(undefined),
      releaseAll: vi.fn().mockResolvedValue(undefined),
      deceptionHistory: vi.fn().mockResolvedValue([]),
    },
    identity: {
      jwks: vi.fn().mockResolvedValue({ keys: [] }),
      oidc: vi.fn().mockResolvedValue({ issuer: 'http://localhost:8080' }),
      mintToken: vi.fn().mockResolvedValue({ token: 'mock.jwt.token' }),
      decodeJwt: vi.fn().mockResolvedValue({ header: {}, payload: {} }),
    },
    realtime: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
    },
    // Add other categories as needed
  } as unknown as ApparatusClient;
}

interface MockClientConfig {
  healthy: boolean;
  healthStatus: 'ok' | 'degraded' | 'error';
  echoLatency: number;
  rules: any[];
}
```

### Scenario-Based Mocks

Create mocks for specific test scenarios:

```typescript
// Unhealthy server scenario
export function createUnhealthyServerMock(): ApparatusClient {
  return createMockClient({
    healthy: false,
    healthStatus: 'error',
  });
}

// Slow server scenario
export function createSlowServerMock(): ApparatusClient {
  const mock = createMockClient({ echoLatency: 5000 });

  // Override with slow responses
  mock.echo = vi.fn().mockImplementation(async () => {
    await new Promise(r => setTimeout(r, 5000));
    return { method: 'GET', path: '/', latencyMs: 5000 };
  });

  return mock;
}

// Server with existing rules
export function createServerWithRulesMock(rules: any[]): ApparatusClient {
  return createMockClient({ rules });
}

// Network error scenario
export function createNetworkErrorMock(): ApparatusClient {
  const mock = createMockClient();

  mock.isHealthy = vi.fn().mockRejectedValue(
    new NetworkError('ECONNREFUSED', 'Connection refused')
  );

  return mock;
}
```

---

## Test Fixtures

### Response Fixtures

Create consistent test data:

```typescript
// fixtures/responses.ts

export const healthyResponse = {
  status: 'ok' as const,
  timestamp: '2024-01-15T10:30:00Z',
};

export const healthProResponse = {
  status: 'ok' as const,
  uptime: 86400,
  version: '1.0.0',
  memory: {
    heapUsed: 50000000,
    heapTotal: 100000000,
    external: 5000000,
    rss: 150000000,
  },
  cpu: {
    user: 1000,
    system: 500,
  },
};

export const echoResponse = (path: string, options?: any) => ({
  method: options?.method || 'GET',
  path,
  query: {},
  headers: {
    'content-type': 'application/json',
    'user-agent': 'test-agent',
  },
  body: null,
  timestamp: new Date().toISOString(),
  latencyMs: 15,
  tls: null,
});

export const dnsResponse = (hostname: string) => ({
  hostname,
  addresses: hostname === 'localhost' ? ['127.0.0.1'] : ['93.184.216.34'],
  ttl: 300,
});

export const sentinelRules = [
  {
    id: 'rule-001',
    name: 'Block SQL Injection',
    pattern: "(?i)(union.*select)",
    action: 'block' as const,
    priority: 1,
    enabled: true,
    hits: 42,
  },
  {
    id: 'rule-002',
    name: 'Log Admin Access',
    pattern: '/admin',
    action: 'log' as const,
    priority: 10,
    enabled: true,
    hits: 156,
  },
];

export const redteamResults = {
  target: 'https://example.com',
  timestamp: '2024-01-15T10:30:00Z',
  summary: {
    total: 10,
    passed: 8,
    failed: 1,
    warnings: 1,
  },
  results: [
    { name: 'TLS Version', status: 'pass', message: 'TLS 1.3 supported' },
    { name: 'Security Headers', status: 'pass', message: 'All required headers present' },
    { name: 'CORS Policy', status: 'warn', message: 'Permissive CORS configuration' },
    { name: 'CSRF Protection', status: 'fail', message: 'No CSRF token found' },
  ],
};

export const sysinfoResponse = {
  hostname: 'apparatus-server',
  platform: 'linux',
  arch: 'x64',
  cpus: 4,
  memory: {
    total: 8589934592,
    free: 4294967296,
  },
  uptime: 86400,
  loadavg: [1.5, 1.2, 0.8],
};

export const deceptionEvents = [
  {
    id: 'dec-001',
    type: 'admin-probe',
    path: '/admin/login',
    ip: '192.168.1.100',
    timestamp: '2024-01-15T10:15:00Z',
    userAgent: 'curl/7.68.0',
  },
  {
    id: 'dec-002',
    type: 'file-access',
    path: '/.env',
    ip: '10.0.0.50',
    timestamp: '2024-01-15T10:20:00Z',
    userAgent: 'python-requests/2.28.0',
  },
];

export const tarpitEntries = [
  {
    ip: '192.168.1.100',
    trappedAt: '2024-01-15T10:15:00Z',
    reason: 'Admin probe attempt',
    requestCount: 15,
  },
  {
    ip: '10.0.0.50',
    trappedAt: '2024-01-15T10:20:00Z',
    reason: 'Sensitive file access',
    requestCount: 3,
  },
];
```

### Loading Fixtures in Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fixtures from './fixtures/responses';
import { createMockClient } from './mocks/client';

describe('Service with Fixtures', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();

    // Configure with fixtures
    client.core.healthPro.mockResolvedValue(fixtures.healthProResponse);
    client.security.listRules.mockResolvedValue(fixtures.sentinelRules);
    client.security.redteam.mockResolvedValue(fixtures.redteamResults);
    client.defense.deceptionHistory.mockResolvedValue(fixtures.deceptionEvents);
    client.defense.listTrapped.mockResolvedValue(fixtures.tarpitEntries);
  });

  it('should process health data correctly', async () => {
    const health = await client.core.healthPro();
    expect(health.uptime).toBe(86400);
    expect(health.memory.heapUsed).toBeLessThan(health.memory.heapTotal);
  });

  it('should count security rules', async () => {
    const rules = await client.security.listRules();
    expect(rules).toHaveLength(2);
    expect(rules.filter(r => r.action === 'block')).toHaveLength(1);
  });

  it('should calculate security scan pass rate', async () => {
    const results = await client.security.redteam({ target: 'https://example.com' });
    const passRate = results.summary.passed / results.summary.total;
    expect(passRate).toBe(0.8);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      apparatus:
        image: ghcr.io/your-org/apparatus:latest
        ports:
          - 8080:8080
        options: >-
          --health-cmd "curl -f http://localhost:8080/healthz || exit 1"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Wait for Apparatus
        run: |
          until curl -f http://localhost:8080/healthz; do
            echo "Waiting for Apparatus..."
            sleep 2
          done

      - name: Run integration tests
        env:
          APPARATUS_URL: http://localhost:8080
        run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run E2E tests against staging
        env:
          APPARATUS_URL: ${{ secrets.STAGING_APPARATUS_URL }}
        run: pnpm test:e2e
```

### Test Scripts in package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts",
    "test:watch": "vitest watch",
    "test:ci": "vitest run --coverage --reporter=junit --outputFile=test-results.xml"
  }
}
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        'tests/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});

// vitest.integration.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});
```

---

## Next Steps

- [Integration Scenarios](./INTEGRATION_SCENARIOS.md) - Real-world integration patterns
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment best practices
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
