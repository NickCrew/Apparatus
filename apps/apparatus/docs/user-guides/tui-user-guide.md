# Apparatus TUI User Guide

A comprehensive guide to the Apparatus Terminal User Interface for monitoring and controlling the network simulation platform.

---

## Quick Start

### Prerequisites

Ensure the Apparatus server is running:

```bash
pnpm run dev
# Server starts at http://localhost:8080
```

### Launching the TUI

```bash
# Using npm script
pnpm run tui

# With custom server URL
pnpm run tui -- --url http://your-server:8080

# Direct execution
node dist/tui/index.js --url http://localhost:8080
```

### First Launch

When the TUI starts:
1. Connects to Apparatus server via Server-Sent Events (SSE)
2. Displays the Monitor screen (default)
3. Begins receiving real-time metrics

### Exiting

Press `q` or `Ctrl+C` to quit.

---

## Screens Overview

The TUI has six screens accessible via number keys `1` through `6`:

| Key | Screen | Purpose |
|-----|--------|---------|
| `1` | **Monitor** | Main dashboard - health status, request metrics, alerts |
| `2` | **Traffic** | Traffic visualization - RPS gauge, sparklines, charts |
| `3` | **Testing** | Security testing - Red Team scanner, Chaos, Ghost traffic |
| `4` | **Defense** | Defense config - Active Shield, MTD, DLP |
| `5` | **System** | System management - Cluster, KV Store, Webhooks |
| `6` | **Forensics** | Analysis tools - PCAP capture, HAR replay, JWT tools |

---

## Screen Details

### 1. Monitor Screen

The default screen showing server health and activity.

**Panels:**
- **Health Panel**: Server status, uptime, memory, CPU usage
- **Request Statistics**: Total requests, RPS, latency, error rate
- **Active Alerts**: Critical warnings and security events
- **Recent Requests**: Live feed of last 10 requests

**Color Coding:**
- Green: Healthy / Success
- Yellow: Warning
- Red: Error / Critical

### 2. Traffic Screen

Real-time traffic visualization with charts.

**Widgets:**
- **RPS Gauge**: Large gauge showing requests per second
- **RPS Sparkline**: 60-second history trend line
- **Latency Chart**: p50/p90/p99 percentile distribution
- **Status Code Breakdown**: 2xx/3xx/4xx/5xx ratio

### 3. Testing Screen

Security testing and chaos engineering tools.

**Red Team Scanner (S):**
- SQLi injection tests
- XSS payload delivery
- Path traversal attempts
- Command injection probes

**Chaos Engineering (C):**
- CPU spike trigger
- Memory allocation
- Server crash
- Network latency injection

**Ghost Traffic (G):**
- Background traffic generation
- Configurable RPS and patterns

**Network Diagnostics (D):**
- DNS resolution testing
- TCP connectivity checks

### 4. Defense Screen

Configure security controls.

**Active Shield (A):**
- Virtual patching rules
- Add/edit/delete patterns
- Block or log actions

**MTD Configuration (M):**
- Moving Target Defense
- Route obfuscation settings
- Rotation interval

**DLP Generator (P):**
- Credit card test data
- SSN patterns
- Email addresses
- Custom patterns

### 5. System Screen

System administration tools.

**Cluster Topology (T):**
- Node visualization
- Leader/follower status
- Heartbeat monitoring

**System Info (I):**
- Node.js version
- Platform, architecture
- Memory, CPU usage

**KV Store (K):**
- Browse keys
- Get/set values
- Delete entries

**Webhook Inspector (W):**
- View received webhooks
- Inspect payloads

### 6. Forensics Screen

Network forensics and identity tools.

**PCAP Capture (F5):**
- Start/stop capture
- Apply BPF filters
- Download files

**HAR Replay (F6):**
- Load HAR files
- Replay requests
- View responses

**JWT Tools (J):**
- Decode tokens
- Verify signatures
- Mint test tokens

**OIDC Display (O):**
- JWKS endpoint
- OIDC configuration

---

## Keyboard Reference

### Global Shortcuts

| Key | Action |
|-----|--------|
| `q`, `Ctrl-C` | Quit |
| `?`, `h` | Show help |
| `r` | Refresh data |
| `R` | Reconnect SSE |
| `1-6` | Switch screens |

### Navigation

| Key | Action |
|-----|--------|
| `up`, `k` | Move up |
| `down`, `j` | Move down |
| `enter` | Select/confirm |
| `escape` | Cancel/close |
| `tab` | Next widget |

### Screen-Specific

**Testing (3):** `S` scanner, `C` chaos, `G` ghost, `D` diagnostics

**Defense (4):** `A` shield, `M` mtd, `;` script, `P` dlp

**System (5):** `T` topology, `I` info, `K` kv-store, `W` webhooks

**Forensics (6):** `F5` pcap, `F6` har, `J` jwt, `O` oidc

---

## Common Workflows

### Health Monitoring

1. Stay on Monitor screen (1)
2. Watch Health panel for memory/CPU
3. Check Request stats for RPS/latency
4. Review Alerts for warnings

### Security Testing

1. Go to Defense (4) → Review Active Shield rules
2. Go to Testing (3) → Run Red Team scanner
3. Review results: BLOCKED = working, PASSED = vulnerability
4. Return to Defense to adjust rules

### Chaos Engineering

1. Keep Monitor (1) visible
2. Go to Testing (3) → Chaos panel
3. Start with mild actions (CPU stress)
4. Watch Monitor for degradation
5. Note recovery time

---

## Troubleshooting

### Connection Issues

**"Connection Failed":**
```bash
# Check server is running
curl http://localhost:8080/health

# Start if needed
pnpm run dev
```

**SSE Disconnects:**
- Press `R` to reconnect
- Check network stability
- Review server logs

### Display Issues

**Garbled characters:**
```bash
export LANG=en_US.UTF-8
export TERM=xterm-256color
```

**Layout broken:**
- Resize terminal (min 120x40)
- Press `r` to refresh

### Data Not Updating

- Check SSE connection (status bar)
- Press `R` to reconnect
- Generate test traffic: `curl http://localhost:8080/test`

---

## Color Legend

| Color | Meaning |
|-------|---------|
| Green | Success, healthy, enabled |
| Yellow | Warning, degraded |
| Red | Error, critical, disabled |
| Cyan | Informational, selected |
| Blue | Links, navigation |
| Gray | Disabled, unavailable |

---

*Apparatus TUI v1.0 | December 2024*
