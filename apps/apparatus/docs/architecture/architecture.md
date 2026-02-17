# Apparatus Ecosystem Architecture

This document visualizes the interactions between the core components of the Apparatus (formerly Apparatus) ecosystem, including its companion tools: **Egress Tester** (egress tester), **Cloud Metadata Mock** (cloud metadata mock), and **Chaos Proxy** (chaos proxy).

## 0. Apparatus Core Service Architecture

The main Apparatus service exposes multiple interfaces and includes defensive middleware layers.

```mermaid
graph TB
    subgraph "Apparatus Core Service"
        HTTP[HTTP/1.1 :8080]
        HTTP2[HTTP/2 TLS :8443]
        TCP[TCP Echo :9000]
        UDP[UDP Echo :9001]
        Redis[Redis Mock :6379]

        subgraph "Express Middleware Stack"
            MTD[MTD - Route Polymorphism]
            SelfHeal[Self-Healing QoS]
            Deception[Deception Engine]
            Tarpit[Tarpit Defense]
            Shield[Active Shield WAF]
        end

        subgraph "Endpoints"
            Echo[/echo/* - Request Mirror]
            Health[/healthz - Health Check]
            Dashboard[/dashboard - Command Center]
            Metrics[/metrics - Prometheus]
            Threat Intel[/threat-intel/status - Risk Server]
        end

        Static[Static Files]
    end

    HTTP --> MTD --> SelfHeal --> Deception --> Tarpit --> Shield --> Echo
    HTTP --> Health
    HTTP --> Dashboard --> Static
    HTTP --> Metrics
    HTTP --> Threat Intel

    RiskServer[Threat Intel Risk Server] <-->|Blocklist Sync| Threat Intel
```

### Key Components

| Component | Port | Purpose |
|-----------|------|---------|
| HTTP/1.1 | 8080 | Primary API, Dashboard, Health checks |
| HTTP/2 TLS | 8443 | Secure API with TLS termination |
| TCP Echo | 9000 | Raw TCP protocol testing |
| UDP Echo | 9001 | Raw UDP protocol testing |
| Redis Mock | 6379 | Redis protocol honeypot |

### Middleware Defense Layers

1. **MTD (Moving Target Defense)** - Polymorphic route shuffling
2. **Self-Healing** - Automatic circuit breaking and recovery
3. **Deception Engine** - AI-powered honeypot responses
4. **Tarpit Defense** - Rate limiting and slow-response traps
5. **Active Shield** - WAF-style virtual patching

### Graceful Shutdown

The service handles SIGINT/SIGTERM signals to:
- Close HTTP/HTTPS servers
- Drain active connections
- Stop protocol servers (TCP, UDP, Redis)
- Log shutdown completion

## 1. High-Level Ecosystem

The Apparatus suite is designed to be deployed within a Kubernetes cluster to simulate a complete hostile/testing environment.

```mermaid
graph TD
    User[User / Attacker] -->|Ingress| WAF[WAF / Firewall]
    WAF -->|Allowed| Chaos Proxy[Chaos Proxy - Chaos Proxy]
    Chaos Proxy -->|Proxy| Apparatus[Apparatus - Target]

    subgraph "Internal Network"
        Apparatus
        Chaos Proxy
        Cloud Metadata Mock[Cloud Metadata Mock - Cloud Mock]
        Egress Tester[Egress Tester - Egress Tester]
        Neural[Neural Interface]
    end

    Apparatus -->|Sync Blocklist| Threat Intel[Threat Intel - Risk Server]
    Apparatus -->|Report Honeypot| Threat Intel
    Apparatus -->|Generative Text| Neural

    Neural -->|Local| Ollama[Ollama]
    Neural -->|Cloud| OpenAI[OpenAI / Anthropic]

    Egress Tester -->|Probe Egress| Internet((Internet))
    Egress Tester -->|Report Breach| Threat Intel

    Apparatus -.->|Metadata Request| Cloud Metadata Mock
```

## 2. Interactive Honeypot Workflow (Neural Interface)

This flow traps attackers in an LLM-powered hallucinated environment.

```mermaid
sequenceDiagram
    participant Attacker
    participant Dashboard as Apparatus (/console)
    participant Engine as AI Module (Neural Interface)
    participant LLM as LLM (Ollama/Claude/GPT)
    participant Risk as Threat Intel (Risk Server)

    Attacker->>Dashboard: POST /console/api { cmd: "ls -la /etc" }
    Dashboard->>Engine: Forward command + SessionID
    Engine->>LLM: Prompt: "Simulate Ubuntu. Output for 'ls -la /etc'"
    LLM-->>Engine: "total 128\ndrwxr-xr-x 1 root root..."
    Engine->>Risk: Report signal (honeypot_hit, details: "ls -la /etc")
    Engine-->>Dashboard: Return hallucinated output
    Dashboard-->>Attacker: Display green text in terminal
```


## 3. Chaos Proxy - Chaos Proxy Flow (Resilience Testing)

How Chaos Proxy injects faults into legitimate traffic without code changes.

```mermaid
sequenceDiagram
    participant Client
    participant Chaos Proxy as Chaos Proxy (Chaos Proxy)
    participant App as Real Application

    Client->>Chaos Proxy: GET /api/users

    opt Toxicity Check (5% Chance)
        Chaos Proxy->>Chaos Proxy: Determine Mode (e.g., Latency)
        Chaos Proxy->>Chaos Proxy: Sleep 2000ms
    end

    Chaos Proxy->>App: GET /api/users
    App-->>Chaos Proxy: JSON Response

    opt Corruption Check
        Chaos Proxy->>Chaos Proxy: Flip Random Bit in Body
    end

    Chaos Proxy-->>Client: Corrupted Response
    Client->>Client: Handle Parse Error?
```

## 4. Cloud Metadata Mock - Cloud Metadata Deception

Simulating cloud environments (AWS IMDS, GCP) to test application behavior.

```mermaid
sequenceDiagram
    participant App
    participant Cloud Metadata Mock as Cloud Metadata Mock (169.254.169.254)

    App->>Cloud Metadata Mock: GET /latest/meta-data/iam/security-credentials
    Cloud Metadata Mock-->>App: "siren-role"

    App->>Cloud Metadata Mock: GET /.../security-credentials/siren-role
    Cloud Metadata Mock-->>App: { AccessKey: "FAKE...", Secret: "FAKE..." }

    Note over App: App logs credentials (Unsafe!)

    App->>Cloud Metadata Mock: GET /latest/meta-data/spot/instance-action
    Cloud Metadata Mock-->>App: 404 Not Found (Normal)

    Note right of Cloud Metadata Mock: Admin triggers Spot Termination

    App->>Cloud Metadata Mock: GET /latest/meta-data/spot/instance-action
    Cloud Metadata Mock-->>App: { action: "terminate", time: "2024-..." }

    Note over App: App initiates graceful shutdown
```

## 5. Security Architecture

### Defense-in-Depth Layers

```mermaid
graph TD
    Request[Incoming Request] --> CSP[Content Security Policy]
    CSP --> Helmet[Security Headers]
    Helmet --> CORS[CORS Validation]
    CORS --> BodyLimit[Body Size Limits]
    BodyLimit --> InputVal[Input Validation]
    InputVal --> XSS[XSS Prevention]
    XSS --> Response[Safe Response]

    subgraph "Security Controls"
        CSP
        Helmet
        CORS
        BodyLimit
        InputVal
        XSS
    end
```

### Security Controls Summary

| Control | Implementation | Purpose |
|---------|---------------|---------|
| CSP | Meta tag + headers | Prevent script injection |
| Body Limits | 20MB default | Prevent DoS via large payloads |
| Buffer Limits | 64KB Redis | Prevent memory exhaustion |
| XSS Prevention | textContent, escapeHtml() | Prevent DOM injection |
| Port Validation | parsePort() helper | Prevent invalid configuration |
| Error Handling | try/catch + Express error handler | Prevent information leakage |
| Async Safety | res.headersSent checks | Prevent double responses |

### OWASP Alignment

- **A03 Injection**: Input validation, parameterized outputs
- **A05 Misconfiguration**: CSP headers, secure defaults
- **A09 Logging**: Structured logging via Pino

## 6. Egress Tester - Egress Testing Flow

Testing egress filter effectiveness with various exfiltration techniques.

```mermaid
sequenceDiagram
    participant Egress Tester as Egress Tester (Egress Tester)
    participant Egress as Egress Filter/Firewall
    participant Internet as Internet
    participant Threat Intel as Threat Intel (Risk Server)

    Note over Egress Tester: Test DNS Exfiltration
    Egress Tester->>Egress: DNS Query: data.evil.com
    alt Blocked
        Egress-->>Egress Tester: NXDOMAIN/Blocked
        Egress Tester->>Threat Intel: Report: DNS exfil blocked ✓
    else Allowed
        Egress->>Internet: DNS Query forwarded
        Internet-->>Egress Tester: Response
        Egress Tester->>Threat Intel: Report: DNS exfil ALLOWED ⚠️
    end

    Note over Egress Tester: Test HTTP Exfiltration
    Egress Tester->>Egress: POST https://external/data
    alt Blocked
        Egress-->>Egress Tester: Connection refused
        Egress Tester->>Threat Intel: Report: HTTP exfil blocked ✓
    else Allowed
        Egress->>Internet: Request forwarded
        Egress Tester->>Threat Intel: Report: HTTP exfil ALLOWED ⚠️
    end
```
