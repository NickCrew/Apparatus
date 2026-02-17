# Deployment Guide

Best practices for deploying applications using the Apparatus client library in production environments.

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Connection Management](#connection-management)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Monitoring & Observability](#monitoring--observability)
- [Containerization](#containerization)

---

## Environment Configuration

### Configuration Hierarchy

Apparatus client supports multiple configuration sources with the following priority:

1. **Constructor options** (highest priority)
2. **Environment variables**
3. **Default values** (lowest priority)

```typescript
import { ApparatusClient } from 'apparatus-client';

// Configuration is resolved in order:
// 1. baseUrl from constructor
// 2. APPARATUS_URL or APPARATUS_URL env var
// 3. Default: http://localhost:8080

const client = new ApparatusClient({
  baseUrl: process.env.CUSTOM_URL,  // Explicit override
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
  debug: process.env.DEBUG === 'true',
});
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPARATUS_URL` | Apparatus server URL | `http://localhost:8080` |
| `APPARATUS_URL` | Alias for APPARATUS_URL | - |
| `APPARATUS_TIMEOUT` | Request timeout (ms) | `30000` |
| `APPARATUS_DEBUG` | Enable debug logging | `false` |

### Environment-Specific Configurations

```typescript
// config/apparatus.ts
import { ApparatusClientOptions } from 'apparatus-client';

interface EnvironmentConfig {
  development: ApparatusClientOptions;
  staging: ApparatusClientOptions;
  production: ApparatusClientOptions;
}

const configs: EnvironmentConfig = {
  development: {
    baseUrl: 'http://localhost:8080',
    timeout: 60000,  // Longer timeout for debugging
    debug: true,
  },
  staging: {
    baseUrl: process.env.STAGING_APPARATUS_URL!,
    timeout: 30000,
    debug: false,
  },
  production: {
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 10000,  // Shorter timeout, fail fast
    debug: false,
  },
};

export function getConfig(): ApparatusClientOptions {
  const env = process.env.NODE_ENV || 'development';
  return configs[env as keyof EnvironmentConfig] || configs.development;
}
```

### Secrets Management

Never hardcode credentials. Use environment variables or secrets managers:

```typescript
// Using AWS Secrets Manager
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ApparatusClient } from 'apparatus-client';

async function createSecureClient(): Promise<ApparatusClient> {
  const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: 'apparatus/config' })
  );

  const config = JSON.parse(secret.SecretString!);

  return new ApparatusClient({
    baseUrl: config.baseUrl,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });
}
```

---

## Connection Management

### Singleton Pattern

Use a singleton to avoid creating multiple client instances:

```typescript
// services/apparatus.ts
import { ApparatusClient } from 'apparatus-client';

let clientInstance: ApparatusClient | null = null;

export function getApparatusClient(): ApparatusClient {
  if (!clientInstance) {
    clientInstance = new ApparatusClient({
      baseUrl: process.env.APPARATUS_URL!,
      timeout: 30000,
    });
  }
  return clientInstance;
}

// For testing - allows resetting the singleton
export function resetApparatusClient(): void {
  if (clientInstance?.realtime.isConnected()) {
    clientInstance.realtime.disconnect();
  }
  clientInstance = null;
}
```

### Connection Pooling

For high-throughput scenarios, manage connection reuse:

```typescript
import { ApparatusClient } from 'apparatus-client';

class ClientPool {
  private clients: ApparatusClient[] = [];
  private currentIndex = 0;
  private readonly poolSize: number;

  constructor(config: { baseUrl: string; poolSize?: number }) {
    this.poolSize = config.poolSize || 5;

    for (let i = 0; i < this.poolSize; i++) {
      this.clients.push(new ApparatusClient({
        baseUrl: config.baseUrl,
        timeout: 30000,
      }));
    }
  }

  // Round-robin client selection
  getClient(): ApparatusClient {
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return client;
  }

  // Parallel request distribution
  async executeParallel<T>(
    requests: Array<(client: ApparatusClient) => Promise<T>>
  ): Promise<T[]> {
    const assignments = requests.map((req, i) => ({
      request: req,
      client: this.clients[i % this.poolSize],
    }));

    return Promise.all(
      assignments.map(({ request, client }) => request(client))
    );
  }
}
```

### SSE Connection Management

Handle SSE connections properly in long-running processes:

```typescript
import { ApparatusClient } from 'apparatus-client';

class ManagedSSEConnection {
  private client: ApparatusClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  constructor(client: ApparatusClient) {
    this.client = client;
  }

  connect() {
    this.client.realtime.connect();

    this.client.realtime.on('error', (error) => {
      console.error('SSE connection error:', error);
      this.handleReconnect();
    });

    this.client.realtime.on('close', () => {
      console.log('SSE connection closed');
      this.handleReconnect();
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.client.realtime.connect();
    }, delay);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.client.realtime.disconnect();
  }
}
```

---

## Error Handling

### Comprehensive Error Handling

```typescript
import {
  ApparatusClient,
  ApparatusError,
  NetworkError,
  TimeoutError,
  ApiError,
  ValidationError,
} from 'apparatus-client';

async function robustOperation(client: ApparatusClient) {
  try {
    return await client.core.healthPro();
  } catch (error) {
    if (error instanceof NetworkError) {
      // Connection issues - may be transient
      console.error('Network error:', error.code, error.message);
      // Implement retry logic
      throw new Error('Service temporarily unavailable');
    }

    if (error instanceof TimeoutError) {
      // Request took too long
      console.error('Request timed out after', error.timeout, 'ms');
      // Consider increasing timeout or circuit breaking
      throw new Error('Service response timeout');
    }

    if (error instanceof ApiError) {
      // Server returned an error status
      console.error('API error:', error.statusCode, error.message);

      if (error.statusCode === 401) {
        // Handle authentication issues
        throw new Error('Authentication required');
      }

      if (error.statusCode >= 500) {
        // Server error - may be transient
        throw new Error('Service error');
      }

      throw error;
    }

    if (error instanceof ValidationError) {
      // Invalid request parameters
      console.error('Validation error:', error.message);
      throw new Error('Invalid request parameters');
    }

    // Unknown error
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

### Retry with Exponential Backoff

```typescript
interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    ...options,
  };

  let lastError: Error | undefined;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry validation errors
      if (error instanceof ValidationError) {
        throw error;
      }

      // Don't retry client errors (4xx except 429)
      if (error instanceof ApiError &&
          error.statusCode >= 400 &&
          error.statusCode < 500 &&
          error.statusCode !== 429) {
        throw error;
      }

      if (attempt === config.maxAttempts) {
        break;
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError;
}

// Usage
const health = await withRetry(
  () => client.core.healthPro(),
  { maxAttempts: 5, initialDelay: 500 }
);
```

### Circuit Breaker Pattern

```typescript
enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private lastFailure?: Date;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 30000;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) return true;
    return Date.now() - this.lastFailure.getTime() > this.resetTimeout;
  }

  private onSuccess() {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn('Circuit breaker opened');
    }
  }

  getState(): string {
    return CircuitState[this.state];
  }
}

// Usage
const breaker = new CircuitBreaker();
const client = new ApparatusClient({ baseUrl: 'http://localhost:8080' });

async function safeHealthCheck() {
  return breaker.execute(() => client.core.healthPro());
}
```

---

## Performance Optimization

### Request Batching

Batch multiple requests when possible:

```typescript
import { ApparatusClient } from 'apparatus-client';

async function batchStatusCheck(client: ApparatusClient) {
  // Execute all independent requests in parallel
  const [health, metrics, sysinfo, rules] = await Promise.all([
    client.core.healthPro(),
    client.core.metrics(),
    client.network.sysinfo(),
    client.security.listRules(),
  ]);

  return {
    health,
    metrics,
    sysinfo,
    ruleCount: rules.length,
  };
}
```

### Caching Responses

Cache responses that don't change frequently:

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CachedClient {
  private client: ApparatusClient;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(client: ApparatusClient) {
    this.client = client;
  }

  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    return data;
  }

  // Cache JWKS for 5 minutes
  async getJWKS() {
    return this.getCached(
      'jwks',
      () => this.client.identity.jwks(),
      5 * 60 * 1000
    );
  }

  // Cache sysinfo for 1 minute
  async getSysinfo() {
    return this.getCached(
      'sysinfo',
      () => this.client.network.sysinfo(),
      60 * 1000
    );
  }

  // Cache rules for 30 seconds
  async getRules() {
    return this.getCached(
      'rules',
      () => this.client.security.listRules(),
      30 * 1000
    );
  }

  // Health should not be cached
  async getHealth() {
    return this.client.core.healthPro();
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### Timeout Tuning

Configure appropriate timeouts for different operation types:

```typescript
import { ApparatusClient } from 'apparatus-client';

// Different clients for different use cases
const clients = {
  // Quick operations - fail fast
  health: new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 5000,
  }),

  // Standard operations
  standard: new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 30000,
  }),

  // Long operations (security scans, data generation)
  longRunning: new ApparatusClient({
    baseUrl: process.env.APPARATUS_URL!,
    timeout: 120000,
  }),
};

// Use appropriate client for each operation
async function healthCheck() {
  return clients.health.isHealthy();
}

async function securityScan(targetUrl: string) {
  return clients.longRunning.security.redteam({ target: targetUrl });
}
```

---

## Security Considerations

### Transport Security

Always use HTTPS in production:

```typescript
import { ApparatusClient } from 'apparatus-client';

function createProductionClient(): ApparatusClient {
  const baseUrl = process.env.APPARATUS_URL!;

  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && !baseUrl.startsWith('https://')) {
    throw new Error('Production must use HTTPS');
  }

  return new ApparatusClient({
    baseUrl,
    timeout: 30000,
  });
}
```

### Input Validation

Validate inputs before sending to the API:

```typescript
import { z } from 'zod';
import { ApparatusClient } from 'apparatus-client';

// Define schemas
const RuleSchema = z.object({
  name: z.string().min(1).max(100),
  pattern: z.string().min(1),
  action: z.enum(['block', 'log', 'allow']),
  priority: z.number().int().min(0).max(1000),
  enabled: z.boolean(),
});

async function createRule(client: ApparatusClient, input: unknown) {
  // Validate input
  const rule = RuleSchema.parse(input);

  // Sanitize pattern (prevent ReDoS)
  if (rule.pattern.length > 500) {
    throw new Error('Pattern too long');
  }

  return client.security.addRule(rule);
}
```

### Audit Logging

Log security-sensitive operations:

```typescript
import { ApparatusClient } from 'apparatus-client';

class AuditedClient {
  private client: ApparatusClient;
  private logger: (entry: AuditEntry) => void;

  constructor(client: ApparatusClient, logger: (entry: AuditEntry) => void) {
    this.client = client;
    this.logger = logger;
  }

  async addRule(rule: any) {
    this.logger({
      action: 'security.addRule',
      timestamp: new Date(),
      details: { ruleName: rule.name, action: rule.action },
    });

    return this.client.security.addRule(rule);
  }

  async deleteRule(id: string) {
    this.logger({
      action: 'security.deleteRule',
      timestamp: new Date(),
      details: { ruleId: id },
    });

    return this.client.security.deleteRule(id);
  }

  async releaseTarpit(ip: string) {
    this.logger({
      action: 'defense.releaseTarpit',
      timestamp: new Date(),
      details: { ip },
    });

    return this.client.defense.release(ip);
  }
}

interface AuditEntry {
  action: string;
  timestamp: Date;
  details: Record<string, unknown>;
}
```

---

## Monitoring & Observability

### Health Check Endpoint

Expose Apparatus health as part of your service health:

```typescript
import express from 'express';
import { ApparatusClient } from 'apparatus-client';

const app = express();
const client = new ApparatusClient({ baseUrl: process.env.APPARATUS_URL! });

app.get('/health', async (req, res) => {
  try {
    const echoProHealth = await client.isHealthy();

    res.json({
      status: echoProHealth ? 'healthy' : 'degraded',
      components: {
        self: 'healthy',
        echoPro: echoProHealth ? 'healthy' : 'unhealthy',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      components: {
        self: 'healthy',
        echoPro: 'unreachable',
      },
      error: (error as Error).message,
    });
  }
});
```

### Metrics Collection

Export Prometheus metrics for your Apparatus operations:

```typescript
import { Counter, Histogram, Registry } from 'prom-client';
import { ApparatusClient } from 'apparatus-client';

const registry = new Registry();

const requestCounter = new Counter({
  name: 'apparatus_requests_total',
  help: 'Total Apparatus API requests',
  labelNames: ['method', 'status'],
  registers: [registry],
});

const requestDuration = new Histogram({
  name: 'apparatus_request_duration_seconds',
  help: 'Apparatus API request duration',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

class InstrumentedClient {
  private client: ApparatusClient;

  constructor(client: ApparatusClient) {
    this.client = client;
  }

  async healthCheck() {
    const end = requestDuration.startTimer({ method: 'health' });

    try {
      const result = await this.client.isHealthy();
      requestCounter.inc({ method: 'health', status: 'success' });
      return result;
    } catch (error) {
      requestCounter.inc({ method: 'health', status: 'error' });
      throw error;
    } finally {
      end();
    }
  }

  // Similar instrumentation for other methods...
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### Distributed Tracing

Integrate with OpenTelemetry:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ApparatusClient } from 'apparatus-client';

const tracer = trace.getTracer('apparatus-client');

class TracedClient {
  private client: ApparatusClient;

  constructor(client: ApparatusClient) {
    this.client = client;
  }

  async healthCheck() {
    return tracer.startActiveSpan('apparatus.health', async (span) => {
      try {
        span.setAttribute('apparatus.operation', 'healthCheck');
        const result = await this.client.core.healthPro();
        span.setAttribute('apparatus.health.status', result.status);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async securityScan(target: string) {
    return tracer.startActiveSpan('apparatus.security.redteam', async (span) => {
      try {
        span.setAttribute('apparatus.operation', 'redteam');
        span.setAttribute('apparatus.target', target);

        const result = await this.client.security.redteam({ target });

        span.setAttribute('apparatus.redteam.passed', result.summary.passed);
        span.setAttribute('apparatus.redteam.failed', result.summary.failed);
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

---

## Containerization

### Dockerfile Example

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Build application
COPY . .
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist

# Runtime configuration
ENV NODE_ENV=production
ENV APPARATUS_TIMEOUT=30000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - APPARATUS_URL=http://apparatus:8080
      - APPARATUS_TIMEOUT=30000
    depends_on:
      apparatus:
        condition: service_healthy
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  apparatus:
    image: ghcr.io/your-org/apparatus:latest
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: APPARATUS_URL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: apparatus-url
            - name: APPARATUS_TIMEOUT
              value: "30000"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  apparatus-url: "http://apparatus-service:8080"
```

---

## Next Steps

- [Integration Scenarios](./INTEGRATION_SCENARIOS.md) - Real-world integration patterns
- [Testing Patterns](./TESTING_PATTERNS.md) - Unit and integration testing strategies
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
