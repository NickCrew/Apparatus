# Integration Scenarios

Real-world integration patterns for the Apparatus client library across common use cases.

## Table of Contents

- [CI/CD Pipeline Integration](#cicd-pipeline-integration)
- [Monitoring & Alerting](#monitoring--alerting)
- [Security Testing Workflows](#security-testing-workflows)
- [Chaos Engineering](#chaos-engineering)
- [Load Testing Coordination](#load-testing-coordination)
- [Multi-Environment Management](#multi-environment-management)

---

## CI/CD Pipeline Integration

### Pre-Deployment Health Checks

Validate Apparatus is healthy before deploying dependent services:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function preDeploymentCheck(): Promise<boolean> {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 5000,
  });

  try {
    // Quick health check
    const healthy = await client.isHealthy();
    if (!healthy) {
      console.error('Apparatus health check failed');
      return false;
    }

    // Detailed health for CI logs
    const healthPro = await client.core.healthPro();
    console.log('Health Status:', healthPro.status);
    console.log('Uptime:', healthPro.uptime);
    console.log('Memory:', healthPro.memory);

    return healthPro.status === 'ok';
  } catch (error) {
    console.error('Pre-deployment check failed:', error);
    return false;
  }
}

// Exit with proper code for CI
preDeploymentCheck().then(success => {
  process.exit(success ? 0 : 1);
});
```

### Post-Deployment Validation

Verify endpoints respond correctly after deployment:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function postDeploymentValidation() {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
  });

  const checks = [
    // Verify echo endpoint
    async () => {
      const echo = await client.echo('/api/v1/status');
      return echo.method === 'GET' && echo.path === '/api/v1/status';
    },

    // Verify metrics endpoint
    async () => {
      const metrics = await client.core.metrics();
      return metrics.raw.includes('http_requests_total');
    },

    // Verify identity service
    async () => {
      const jwks = await client.identity.jwks();
      return Array.isArray(jwks.keys) && jwks.keys.length > 0;
    },
  ];

  const results = await Promise.allSettled(checks.map(check => check()));
  const allPassed = results.every(
    r => r.status === 'fulfilled' && r.value === true
  );

  console.log(`Post-deployment: ${allPassed ? 'PASSED' : 'FAILED'}`);
  return allPassed;
}
```

### GitHub Actions Example

```yaml
name: Deploy with Apparatus Validation

on:
  push:
    branches: [main]

jobs:
  validate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Pre-deployment health check
        env:
          APPARATUS_URL: ${{ secrets.APPARATUS_URL }}
        run: |
          npx ts-node scripts/pre-deploy-check.ts

      - name: Deploy application
        run: ./deploy.sh

      - name: Post-deployment validation
        env:
          APPARATUS_URL: ${{ secrets.APPARATUS_URL }}
        run: |
          npx ts-node scripts/post-deploy-validation.ts

      - name: Run security scan
        env:
          APPARATUS_URL: ${{ secrets.APPARATUS_URL }}
          TARGET_URL: ${{ secrets.TARGET_URL }}
        run: |
          npx ts-node scripts/security-scan.ts
```

---

## Monitoring & Alerting

### Prometheus Metrics Collection

Integrate Apparatus metrics into your monitoring stack:

```typescript
import { ApparatusClient } from 'apparatus-client';

class MetricsCollector {
  private client: ApparatusClient;
  private intervalId?: NodeJS.Timeout;

  constructor(baseUrl: string) {
    this.client = new ApparatusClient({ baseUrl, timeout: 5000 });
  }

  async collectMetrics(): Promise<Record<string, number>> {
    const raw = await this.client.core.metrics();
    const metrics: Record<string, number> = {};

    // Parse Prometheus format
    const lines = raw.raw.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      const match = line.match(/^(\w+)(?:\{[^}]*\})?\s+(\d+(?:\.\d+)?)/);
      if (match) {
        metrics[match[1]] = parseFloat(match[2]);
      }
    }

    return metrics;
  }

  startPolling(intervalMs: number, callback: (metrics: Record<string, number>) => void) {
    this.intervalId = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Usage
const collector = new MetricsCollector('http://localhost:8080');
collector.startPolling(10000, metrics => {
  console.log('Request count:', metrics.http_requests_total);
  console.log('Error rate:', metrics.http_errors_total / metrics.http_requests_total);
});
```

### Real-Time Event Streaming

Subscribe to server events for immediate alerting:

```typescript
import { ApparatusClient, SSEEventType } from 'apparatus-client';

function setupAlertingPipeline(client: ApparatusClient) {
  // Connect to SSE stream
  client.realtime.connect();

  // Alert on security events
  client.realtime.on('deception', event => {
    sendAlert({
      severity: 'high',
      title: 'Honeypot Triggered',
      details: `Type: ${event.type}, Path: ${event.path}, IP: ${event.ip}`,
    });
  });

  // Alert on tarpit events
  client.realtime.on('tarpit', event => {
    if (event.action === 'trapped') {
      sendAlert({
        severity: 'medium',
        title: 'IP Trapped in Tarpit',
        details: `IP: ${event.ip}, Reason: ${event.reason}`,
      });
    }
  });

  // Alert on health degradation
  client.realtime.on('health', event => {
    if (event.status !== 'ok') {
      sendAlert({
        severity: event.status === 'error' ? 'critical' : 'warning',
        title: 'Health Status Changed',
        details: `Status: ${event.status}`,
      });
    }
  });

  // Handle connection issues
  client.realtime.on('error', error => {
    sendAlert({
      severity: 'warning',
      title: 'SSE Connection Error',
      details: error.message,
    });
  });
}

function sendAlert(alert: { severity: string; title: string; details: string }) {
  // Integrate with your alerting system (PagerDuty, Slack, etc.)
  console.log(`[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.details}`);
}
```

### Health Check Service

Create a dedicated health monitoring service:

```typescript
import { ApparatusClient } from 'apparatus-client';

interface HealthStatus {
  healthy: boolean;
  timestamp: Date;
  latencyMs: number;
  details?: Record<string, unknown>;
}

class HealthMonitor {
  private client: ApparatusClient;
  private history: HealthStatus[] = [];
  private maxHistory = 100;

  constructor(baseUrl: string) {
    this.client = new ApparatusClient({ baseUrl, timeout: 5000 });
  }

  async check(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const health = await this.client.core.healthPro();
      const status: HealthStatus = {
        healthy: health.status === 'ok',
        timestamp: new Date(),
        latencyMs: Date.now() - start,
        details: health,
      };

      this.addToHistory(status);
      return status;
    } catch (error) {
      const status: HealthStatus = {
        healthy: false,
        timestamp: new Date(),
        latencyMs: Date.now() - start,
        details: { error: (error as Error).message },
      };

      this.addToHistory(status);
      return status;
    }
  }

  private addToHistory(status: HealthStatus) {
    this.history.push(status);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getUptime(): number {
    if (this.history.length === 0) return 0;
    const healthy = this.history.filter(h => h.healthy).length;
    return (healthy / this.history.length) * 100;
  }

  getAverageLatency(): number {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((acc, h) => acc + h.latencyMs, 0);
    return sum / this.history.length;
  }
}
```

---

## Security Testing Workflows

### Automated Security Scans

Run security validation as part of your test suite:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function runSecurityScan(targetUrl: string) {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 120000, // Security scans can take time
  });

  console.log(`Starting security scan against: ${targetUrl}`);

  const results = await client.security.redteam({
    target: targetUrl,
    tests: ['headers', 'cors', 'tls', 'csrf', 'injection'],
  });

  // Generate report
  const report = {
    target: targetUrl,
    timestamp: new Date().toISOString(),
    summary: results.summary,
    passed: results.results.filter(r => r.status === 'pass'),
    failed: results.results.filter(r => r.status === 'fail'),
    warnings: results.results.filter(r => r.status === 'warn'),
  };

  console.log('\n=== Security Scan Results ===');
  console.log(`Passed: ${report.passed.length}`);
  console.log(`Failed: ${report.failed.length}`);
  console.log(`Warnings: ${report.warnings.length}`);

  if (report.failed.length > 0) {
    console.log('\n--- Failed Tests ---');
    for (const test of report.failed) {
      console.log(`  - ${test.name}: ${test.message}`);
    }
  }

  // Fail CI if critical issues found
  if (report.failed.length > 0) {
    process.exit(1);
  }

  return report;
}
```

### WAF Rule Management

Automate WAF rule deployment:

```typescript
import { ApparatusClient, SentinelRule } from 'apparatus-client';

async function deployWafRules(rules: Omit<SentinelRule, 'id'>[]) {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
  });

  // Get existing rules
  const existing = await client.security.listRules();
  console.log(`Found ${existing.length} existing rules`);

  // Deploy new rules
  for (const rule of rules) {
    try {
      const created = await client.security.addRule(rule);
      console.log(`Created rule: ${created.name} (ID: ${created.id})`);
    } catch (error) {
      console.error(`Failed to create rule ${rule.name}:`, error);
    }
  }

  // Verify deployment
  const updated = await client.security.listRules();
  console.log(`Total rules after deployment: ${updated.length}`);

  return updated;
}

// Example rules
const rules = [
  {
    name: 'Block SQL Injection',
    pattern: "(?i)(union.*select|insert.*into|delete.*from)",
    action: 'block' as const,
    priority: 1,
    enabled: true,
  },
  {
    name: 'Block XSS Attempts',
    pattern: "(<script|javascript:|on\\w+=)",
    action: 'block' as const,
    priority: 2,
    enabled: true,
  },
  {
    name: 'Log Suspicious Paths',
    pattern: "(\\.\\.[\\\\/]|/etc/passwd|/proc/)",
    action: 'log' as const,
    priority: 10,
    enabled: true,
  },
];

deployWafRules(rules);
```

### Penetration Testing Coordination

Coordinate pentest activities with proper tracking:

```typescript
import { ApparatusClient } from 'apparatus-client';

interface PentestSession {
  client: ApparatusClient;
  startTime: Date;
  targetUrl: string;
  findings: Array<{
    severity: string;
    title: string;
    details: string;
    timestamp: Date;
  }>;
}

class PentestCoordinator {
  private sessions: Map<string, PentestSession> = new Map();

  async startSession(sessionId: string, targetUrl: string): Promise<PentestSession> {
    const client = new ApparatusClient({
      baseUrl: process.env.APPARATUS_URL!,
      timeout: 60000,
    });

    const session: PentestSession = {
      client,
      startTime: new Date(),
      targetUrl,
      findings: [],
    };

    // Start real-time monitoring
    client.realtime.connect();
    client.realtime.on('deception', event => {
      session.findings.push({
        severity: 'high',
        title: 'Deception Triggered',
        details: JSON.stringify(event),
        timestamp: new Date(),
      });
    });

    this.sessions.set(sessionId, session);
    console.log(`Pentest session ${sessionId} started against ${targetUrl}`);

    return session;
  }

  async runTests(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Run comprehensive security tests
    const results = await session.client.security.redteam({
      target: session.targetUrl,
      tests: ['headers', 'cors', 'tls', 'csrf', 'injection', 'auth'],
    });

    for (const result of results.results) {
      if (result.status === 'fail') {
        session.findings.push({
          severity: result.severity || 'medium',
          title: result.name,
          details: result.message,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  async endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.client.realtime.disconnect();

    const report = {
      sessionId,
      targetUrl: session.targetUrl,
      duration: Date.now() - session.startTime.getTime(),
      totalFindings: session.findings.length,
      findings: session.findings,
    };

    this.sessions.delete(sessionId);
    return report;
  }
}
```

---

## Chaos Engineering

### Resilience Testing Framework

Test application resilience systematically:

```typescript
import { ApparatusClient } from 'apparatus-client';

interface ChaosExperiment {
  name: string;
  description: string;
  execute: (client: ApparatusClient) => Promise<void>;
  validate: (client: ApparatusClient) => Promise<boolean>;
  cleanup?: (client: ApparatusClient) => Promise<void>;
}

class ChaosRunner {
  private client: ApparatusClient;

  constructor(baseUrl: string) {
    this.client = new ApparatusClient({ baseUrl, timeout: 30000 });
  }

  async runExperiment(experiment: ChaosExperiment): Promise<{
    success: boolean;
    duration: number;
    error?: string;
  }> {
    const start = Date.now();
    console.log(`\n=== Running: ${experiment.name} ===`);
    console.log(experiment.description);

    try {
      // Execute chaos
      await experiment.execute(this.client);

      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate system recovered
      const recovered = await experiment.validate(this.client);

      // Cleanup
      if (experiment.cleanup) {
        await experiment.cleanup(this.client);
      }

      return {
        success: recovered,
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - start,
        error: (error as Error).message,
      };
    }
  }
}

// Define experiments
const experiments: ChaosExperiment[] = [
  {
    name: 'CPU Stress Test',
    description: 'Verify system recovers from CPU spike',
    execute: async (client) => {
      await client.chaos.cpuSpike({ duration: 5000, intensity: 8 });
    },
    validate: async (client) => {
      const health = await client.core.health();
      return health.status === 'ok';
    },
  },
  {
    name: 'Memory Pressure Test',
    description: 'Verify system handles memory pressure',
    execute: async (client) => {
      await client.chaos.memorySpike({
        size: 100 * 1024 * 1024, // 100MB
        duration: 5000
      });
    },
    validate: async (client) => {
      const health = await client.core.healthPro();
      return health.memory.heapUsed < health.memory.heapTotal * 0.9;
    },
    cleanup: async (client) => {
      await client.chaos.clearMemory();
    },
  },
  {
    name: 'Latency Injection Test',
    description: 'Verify clients handle slow responses',
    execute: async (client) => {
      // Inject 2-second delay
      await client.echo('/', { delay: 2000 });
    },
    validate: async (client) => {
      const start = Date.now();
      await client.echo('/');
      const latency = Date.now() - start;
      return latency < 500; // Should be fast again
    },
  },
];

// Run all experiments
async function runChaosTests() {
  const runner = new ChaosRunner('http://localhost:8080');
  const results = [];

  for (const experiment of experiments) {
    const result = await runner.runExperiment(experiment);
    results.push({ ...experiment, result });
    console.log(`Result: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);
  }

  const passed = results.filter(r => r.result.success).length;
  console.log(`\n=== Summary: ${passed}/${results.length} experiments passed ===`);

  return results;
}
```

### Gameday Automation

Automate chaos gameday exercises:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function runGameday(scenarioName: string) {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
  });

  const scenarios: Record<string, () => Promise<void>> = {
    'cpu-storm': async () => {
      console.log('Scenario: CPU Storm - Multiple CPU spikes');
      for (let i = 0; i < 3; i++) {
        await client.chaos.cpuSpike({ duration: 3000, intensity: 9 });
        await new Promise(r => setTimeout(r, 1000));
      }
    },

    'memory-leak': async () => {
      console.log('Scenario: Simulated Memory Leak');
      for (let i = 0; i < 5; i++) {
        await client.chaos.memorySpike({
          size: 50 * 1024 * 1024,
          duration: 30000
        });
        await new Promise(r => setTimeout(r, 5000));
      }
      await client.chaos.clearMemory();
    },

    'network-partition': async () => {
      console.log('Scenario: Network Issues');
      // Simulate slow network with high latency echo requests
      for (let i = 0; i < 10; i++) {
        await client.echo('/api/data', { delay: 5000 });
      }
    },
  };

  const scenario = scenarios[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  await scenario();
  console.log('Gameday scenario completed');
}
```

---

## Load Testing Coordination

### Traffic Generation

Use Ghost Traffic for load testing preparation:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function prepareLoadTest(targetRps: number, durationMs: number) {
  const client = new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
  });

  console.log(`Starting ghost traffic: ${targetRps} RPS for ${durationMs}ms`);

  // Start background traffic
  await client.traffic.start({
    rps: targetRps,
    duration: durationMs,
  });

  // Monitor traffic status
  const checkInterval = setInterval(async () => {
    const status = await client.traffic.status();
    console.log(`Traffic status: ${status.active ? 'Active' : 'Stopped'}, RPS: ${status.currentRps}`);
  }, 5000);

  // Stop after duration
  setTimeout(async () => {
    clearInterval(checkInterval);
    await client.traffic.stop();
    console.log('Load test completed');
  }, durationMs);
}
```

### Baseline Establishment

Establish performance baselines:

```typescript
import { ApparatusClient } from 'apparatus-client';

interface Baseline {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  rps: number;
}

async function establishBaseline(
  client: ApparatusClient,
  samples: number = 100
): Promise<Baseline> {
  const latencies: number[] = [];
  let errors = 0;
  const start = Date.now();

  for (let i = 0; i < samples; i++) {
    const requestStart = Date.now();
    try {
      await client.echo('/baseline-test');
      latencies.push(Date.now() - requestStart);
    } catch {
      errors++;
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 10));
  }

  const duration = (Date.now() - start) / 1000;
  latencies.sort((a, b) => a - b);

  return {
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p95Latency: latencies[Math.floor(latencies.length * 0.95)],
    p99Latency: latencies[Math.floor(latencies.length * 0.99)],
    errorRate: errors / samples,
    rps: samples / duration,
  };
}

async function compareToBaseline(current: Baseline, baseline: Baseline) {
  const degradation = {
    latency: ((current.avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100,
    p95: ((current.p95Latency - baseline.p95Latency) / baseline.p95Latency) * 100,
    errorRate: current.errorRate - baseline.errorRate,
  };

  console.log('Performance Comparison:');
  console.log(`  Avg Latency: ${degradation.latency.toFixed(1)}% change`);
  console.log(`  P95 Latency: ${degradation.p95.toFixed(1)}% change`);
  console.log(`  Error Rate Delta: ${(degradation.errorRate * 100).toFixed(2)}%`);

  // Alert if significant degradation
  if (degradation.latency > 20 || degradation.p95 > 30 || degradation.errorRate > 0.01) {
    console.warn('WARNING: Significant performance degradation detected!');
    return false;
  }

  return true;
}
```

---

## Multi-Environment Management

### Environment Configuration

Manage multiple Apparatus environments:

```typescript
import { ApparatusClient } from 'apparatus-client';

interface Environment {
  name: string;
  url: string;
  timeout?: number;
}

class EnvironmentManager {
  private environments: Map<string, Environment> = new Map();
  private clients: Map<string, ApparatusClient> = new Map();

  addEnvironment(env: Environment) {
    this.environments.set(env.name, env);
  }

  getClient(envName: string): ApparatusClient {
    let client = this.clients.get(envName);
    if (client) return client;

    const env = this.environments.get(envName);
    if (!env) throw new Error(`Unknown environment: ${envName}`);

    client = new ApparatusClient({
      baseUrl: env.url,
      timeout: env.timeout ?? 30000,
    });

    this.clients.set(envName, client);
    return client;
  }

  async checkAllEnvironments(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name] of this.environments) {
      try {
        const client = this.getClient(name);
        results[name] = await client.isHealthy();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}

// Usage
const envManager = new EnvironmentManager();

envManager.addEnvironment({
  name: 'development',
  url: 'http://localhost:8080',
});

envManager.addEnvironment({
  name: 'staging',
  url: 'https://staging.apparatus.example.com',
  timeout: 10000,
});

envManager.addEnvironment({
  name: 'production',
  url: 'https://apparatus.example.com',
  timeout: 5000,
});

// Check all environments
envManager.checkAllEnvironments().then(results => {
  console.log('Environment Status:');
  for (const [env, healthy] of Object.entries(results)) {
    console.log(`  ${env}: ${healthy ? 'OK' : 'DOWN'}`);
  }
});
```

### Configuration Synchronization

Sync WAF rules across environments:

```typescript
import { ApparatusClient, SentinelRule } from 'apparatus-client';

async function syncRulesAcrossEnvironments(
  sourceEnv: string,
  targetEnvs: string[],
  envManager: EnvironmentManager
) {
  // Get rules from source
  const sourceClient = envManager.getClient(sourceEnv);
  const sourceRules = await sourceClient.security.listRules();

  console.log(`Found ${sourceRules.length} rules in ${sourceEnv}`);

  for (const targetEnv of targetEnvs) {
    const targetClient = envManager.getClient(targetEnv);
    const targetRules = await targetClient.security.listRules();

    console.log(`\nSyncing to ${targetEnv}...`);

    // Find rules to add
    for (const rule of sourceRules) {
      const exists = targetRules.find(r => r.name === rule.name);
      if (!exists) {
        const { id, ...ruleData } = rule;
        await targetClient.security.addRule(ruleData);
        console.log(`  Added: ${rule.name}`);
      }
    }

    // Find rules to remove (in target but not in source)
    for (const rule of targetRules) {
      const exists = sourceRules.find(r => r.name === rule.name);
      if (!exists) {
        await targetClient.security.deleteRule(rule.id);
        console.log(`  Removed: ${rule.name}`);
      }
    }
  }

  console.log('\nSync complete!');
}
```

---

## Next Steps

- [Testing Patterns](./TESTING_PATTERNS.md) - Unit and integration testing strategies
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment best practices
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
