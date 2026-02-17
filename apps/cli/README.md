# Apparatus CLI

Command-line interface for [Threat Intel Apparatus](../apparatus/) - interact with 50+ API endpoints from your terminal.

## Features

- **12 command categories** covering all Apparatus endpoints
- **Interactive REPL** with tab completion and history
- **Rich output** with colors, tables, and spinners
- **Environment variable** and config file support
- **JSON output** for scripting
- **Labs integration** with companion security tools

## Installation

```bash
# From the monorepo
pnpm nx run apparatus-cli:build

# Run directly
./dist/index.js

# Or link globally
npm link
apparatus --help
```

## Quick Start

```bash
# Health check
apparatus health

# Echo a request
apparatus echo /api/users

# Chaos engineering
apparatus chaos cpu --duration 5000

# Security testing
apparatus security redteam --target https://api.example.com

# Interactive mode
apparatus repl
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APPARATUS_URL` | Base URL of Apparatus server | `http://localhost:8080` |
| `APPARATUS_TIMEOUT` | Request timeout in ms | `30000` |
| `APPARATUS_DEBUG` | Enable debug mode | `false` |
| `APPARATUS_FORMAT` | Default output format (`json`, `table`, `raw`) | `table` |
| `NO_COLOR` | Disable colored output | - |

### Config File

Create `~/.apparatus/config.json`:

```json
{
  "baseUrl": "http://localhost:8080",
  "timeout": 30000,
  "debug": false,
  "defaultFormat": "table"
}
```

### Command-line Options

```bash
apparatus [options] <command>

Options:
  -u, --url <url>     Base URL (overrides APPARATUS_URL)
  -j, --json          Output as JSON
  -v, --verbose       Verbose output
  --no-color          Disable colored output
  --config <file>     Config file path
  -V, --version       Show version
  -h, --help          Show help
```

---

## Commands

### Root Commands

Quick access to common operations:

```bash
apparatus health              # Quick health check
apparatus echo [path]         # Echo request to path
apparatus config              # Show current configuration
apparatus repl                # Start interactive REPL
```

---

## Core Commands

Health, echo, metrics, and request history.

```bash
apparatus core health [--pro]           # Health check (--pro for detailed)
apparatus core echo [path] [options]    # Echo request
apparatus core metrics [--raw]          # Get Prometheus metrics
apparatus core history [-n <limit>]     # Get request history
apparatus core history --clear          # Clear history
```

### Echo Options

```bash
apparatus core echo /api/users \
  --method POST \
  --delay 1000 \
  --status 201 \
  --header "X-Custom:value" \
  --header "Authorization:Bearer token"
```

| Option | Description |
|--------|-------------|
| `-m, --method <method>` | HTTP method (default: GET) |
| `-d, --delay <ms>` | Inject response delay |
| `-s, --status <code>` | Inject status code |
| `-H, --header <header>` | Add header (repeatable) |

---

## Chaos Commands

Chaos engineering for resilience testing.

```bash
apparatus chaos cpu [options]      # Trigger CPU spike
apparatus chaos memory [options]   # Trigger memory spike
apparatus chaos crash [--force]    # Crash the server
apparatus chaos eicar              # Get EICAR test file
apparatus chaos test               # Quick chaos test (5s CPU)
```

### Examples

```bash
# 10-second CPU spike at intensity 8
apparatus chaos cpu --duration 10000 --intensity 8

# Allocate 500MB for 30 seconds
apparatus chaos memory --size 524288000 --duration 30000

# Clear allocated memory
apparatus chaos memory --clear

# Crash (requires confirmation)
apparatus chaos crash --force
```

---

## Security Commands

Red team testing, WAF rules, and proxying.

```bash
apparatus security redteam --target <url>    # Security scan
apparatus security sentinel list             # List WAF rules
apparatus security sentinel add [options]    # Add rule
apparatus security sentinel delete <id>      # Delete rule
apparatus security proxy --url <url>         # Proxy request
```

### Red Team

```bash
# Quick scan
apparatus security redteam --target https://api.example.com

# Specific tests with timeout
apparatus security redteam \
  --target https://api.example.com \
  --tests headers,cors,tls,csrf \
  --timeout 60000
```

### Sentinel Rules

```bash
# Add a blocking rule
apparatus security sentinel add \
  --name "Block SQLi" \
  --pattern "(?i)(union.*select)" \
  --action block \
  --priority 1

# Enable/disable rule
apparatus security sentinel enable <id>
apparatus security sentinel disable <id>
```

---

## Defense Commands

Tarpit, deception/honeypot, MTD, and cluster features.

```bash
# Tarpit
apparatus defense tarpit list         # List trapped connections
apparatus defense tarpit release <ip> # Release specific IP
apparatus defense tarpit clear        # Release all

# Deception
apparatus defense deception history   # View honeypot events

# Moving Target Defense (MTD)
apparatus defense mtd status          # Show MTD status
apparatus defense mtd rotate          # Force route rotation
apparatus defense mtd enable          # Enable MTD
apparatus defense mtd disable         # Disable MTD
apparatus defense mtd interval <ms>   # Set rotation interval

# Cluster Coordination
apparatus defense cluster members     # List cluster members
apparatus defense cluster leader      # Show current leader
apparatus defense cluster healthy     # Check cluster health
apparatus defense cluster count       # Count active nodes
apparatus defense cluster attack <pattern>  # Coordinated attack
apparatus defense cluster attack-status     # Check attack status
apparatus defense cluster attack-stop       # Stop attack
```

### Examples

```bash
# View trapped IPs
apparatus defense tarpit list

# Release specific attacker
apparatus defense tarpit release 192.168.1.100

# View deception triggers
apparatus defense deception history

# Enable Moving Target Defense with 30s rotation
apparatus defense mtd enable
apparatus defense mtd interval 30000

# Coordinated cluster attack
apparatus defense cluster attack "sqli,xss" --duration 60000
```

---

## Network Commands

DNS, port scanning, and system info.

```bash
apparatus network dns <hostname>       # DNS lookup
apparatus network ping <host> <port>   # TCP port check
apparatus network sysinfo              # System information
apparatus network ratelimit            # Check rate limit status
```

### Examples

```bash
apparatus network dns google.com
# hostname: google.com
# addresses: 142.250.xxx.xxx

apparatus network ping example.com 443
# status: open, latency: 15ms

apparatus network sysinfo
# hostname, platform, cpus, memory, uptime...
```

---

## Storage Commands

Key-value store and script execution.

```bash
apparatus storage kv list               # List all keys
apparatus storage kv get <key>          # Get value
apparatus storage kv set <key> <value>  # Set value
apparatus storage kv delete <key>       # Delete key
apparatus storage script <code>         # Execute script
```

### Examples

```bash
# Store JSON value
apparatus storage kv set mykey '{"count": 42}'

# Get value
apparatus storage kv get mykey

# Execute script
apparatus storage script "return 2 + 2"
```

---

## Traffic Commands

Background traffic generation (ghosts).

```bash
apparatus traffic status               # Ghost traffic status
apparatus traffic start [options]      # Start ghost traffic
apparatus traffic stop                 # Stop ghost traffic
```

### Examples

```bash
# Start 10 RPS background traffic
apparatus traffic start --rps 10 --duration 60000

# Check status
apparatus traffic status

# Stop
apparatus traffic stop
```

---

## Identity Commands

JWKS, OIDC, and JWT operations.

```bash
apparatus identity jwks                # Get JWKS
apparatus identity oidc                # Get OIDC config
apparatus identity token [options]     # Mint JWT
apparatus identity decode <token>      # Decode JWT
```

### Examples

```bash
# Mint a token
apparatus identity token \
  --subject user123 \
  --audience api.example.com \
  --expires 1h

# Decode a token
apparatus identity decode eyJhbGciOiJSUzI1NiIs...
```

---

## GraphQL Commands

Query the GraphQL endpoint.

```bash
apparatus graphql query <query>        # Execute GraphQL query
apparatus graphql schema               # Get schema SDL
apparatus graphql types                # List available types
apparatus graphql echo                 # Echo query (test)
apparatus graphql introspect           # Full introspection
```

### Examples

```bash
# Simple query
apparatus graphql query "{ echo { message } }"

# Query with variables
apparatus graphql query "query($n: Int) { echo(count: \$n) { message } }" \
  --variables '{"n": 5}'

# Get schema
apparatus graphql schema

# List all types
apparatus graphql types
```

---

## Webhooks Commands

Create and manage webhook endpoints for testing callbacks.

```bash
apparatus webhooks create              # Create webhook and get URL
apparatus webhooks url <id>            # Get URL for webhook
apparatus webhooks inspect <id>        # View received requests
apparatus webhooks send <id> [data]    # Send test request
apparatus webhooks delete <id>         # Delete webhook
apparatus webhooks clear <id>          # Clear request history
apparatus webhooks wait <id>           # Wait for next request
apparatus webhooks count <id>          # Count received requests
```

### Examples

```bash
# Create a webhook
apparatus webhooks create
# → Webhook ID: abc123
# → URL: http://localhost:8080/hooks/abc123

# Inspect received requests
apparatus webhooks inspect abc123

# Send a test payload
apparatus webhooks send abc123 '{"event": "test"}'

# Wait for callback (blocking)
apparatus webhooks wait abc123 --timeout 30000
```

---

## Victim Commands

Intentionally vulnerable endpoints for security testing.

> ⚠️ **Warning**: These commands trigger intentionally vulnerable code paths.
> Use `--force` to skip confirmation prompts.

```bash
apparatus victim sqli <input>          # SQL injection test
apparatus victim rce <expression>      # Remote code execution test
apparatus victim xss <input>           # Cross-site scripting test
apparatus victim test                  # Quick vulnerability test
apparatus victim check                 # Check victim endpoint status
```

### Examples

```bash
# Test SQL injection
apparatus victim sqli "admin' OR '1'='1" --force

# Test RCE (expression evaluation)
apparatus victim rce "2+2" --force

# Test XSS reflection
apparatus victim xss "<script>alert(1)</script>" --force

# Quick test (all vulnerabilities)
apparatus victim test --force
```

---

## Labs Commands

Experimental features: AI, Escape Artist, Cloud Imposter, Toxic Sidecar, Simulator.

```bash
# AI Chat
apparatus labs ai-chat <message>       # Chat with AI
apparatus labs ai-personas             # List AI personas

# Escape Artist (Egress Testing)
apparatus labs escape-scan             # Run egress firewall scan
  --dlp <type>                       # Generate fake data: cc, ssn, email
  --report                           # Report to Risk Server

# Cloud Imposter (IMDS Mock)
apparatus labs imposter-status         # Check Imposter status
apparatus labs imposter-creds          # Get honey credentials
  -p, --provider <aws|gcp>           # Cloud provider

# Toxic Sidecar (Chaos Proxy)
apparatus labs sidecar-status          # Check Sidecar status
apparatus labs sidecar-inject <path>   # Send request through sidecar
  -m, --mode <mode>                  # latency, error_500, slow_drip, corrupt_body

# Supply Chain Simulator
apparatus labs supply-chain            # Simulate malicious package
  -t, --target <url>                 # C2 server URL
```

### Examples

```bash
# Chat with AI
apparatus labs ai-chat "Hello, how are you?"

# Simulate compromised terminal
apparatus labs ai-chat "ls -la" -s linux_terminal

# Test egress paths with fake credit card
apparatus labs escape-scan --dlp cc --report

# Get AWS honey credentials
apparatus labs imposter-creds -p aws

# Get GCP honey token
apparatus labs imposter-creds -p gcp

# Inject latency through sidecar
apparatus labs sidecar-inject /api/test -m latency

# Simulate supply chain attack
apparatus labs supply-chain --force
```

### Companion Tools

| Tool | Codename | Description |
|------|----------|-------------|
| Escape Artist | **Egress Tester** | Egress firewall validation |
| Cloud Imposter | **Cloud Metadata Mock** | AWS/GCP IMDS credential mock |
| Toxic Sidecar | **Chaos Proxy** | Chaos injection proxy |

---

## Interactive REPL

Start an interactive session with tab completion and command history.

```bash
apparatus repl
```

### REPL Features

- **Tab completion** for commands and options
- **Command history** (persisted to `~/.apparatus/history`)
- **Shortcuts** for common operations
- **Dot notation** support
- **Live server status** on startup

### Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `h` | `core health` |
| `hp` | `core health --pro` |
| `e /path` | `core echo /path` |
| `m` | `core metrics` |
| `hist` | `core history` |
| `cpu` | `chaos cpu` |
| `mem` | `chaos memory` |
| `dns` | `network dns` |
| `ping` | `network ping` |
| `sys` | `network sysinfo` |
| `trap` | `defense tarpit list` |
| `ghost` | `traffic status` |
| `token` | `identity token` |
| `jwt` | `identity decode` |
| `rules` | `security sentinel list` |
| `?` | `help` |

### Dot Notation

Use object-style syntax for commands:

```
apparatus> chaos.cpu 5000
apparatus> network.dns google.com
apparatus> storage.kv set mykey value
apparatus> defense.tarpit
```

### Built-in Commands

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `url [new-url]` | Show or change base URL |
| `clear` / `cls` | Clear screen |
| `exit` / `quit` | Exit REPL |

### REPL Example Session

```
$ apparatus repl

🗡️  Apparatus REPL
Connected to: http://localhost:8080
Type "help" for commands, "exit" to quit

✓ Server is healthy

apparatus> h
✓ Server is ok

apparatus> cpu 3000
✓ CPU spike completed (3000ms)

apparatus> dns google.com
hostname: google.com
addresses: 142.250.191.46

apparatus> chaos.memory --size 104857600
✓ Memory allocated (100 MB)

apparatus> exit
Goodbye!
```

---

## JSON Output

Use `-j` or `--json` for machine-readable output:

```bash
apparatus -j health
# {"status":"ok","timestamp":"2024-01-15T..."}

apparatus -j core metrics
# {"raw":"...","parsed":{"http_requests_total":42}}

apparatus -j network dns google.com
# {"hostname":"google.com","addresses":["142.250.xxx.xxx"]}
```

Useful for scripting:

```bash
# Check if healthy
if apparatus -j health | jq -e '.status == "ok"' > /dev/null; then
  echo "Server is ready"
fi

# Get specific metric
apparatus -j core metrics | jq '.parsed.http_requests_total'
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (connection failure, invalid input, etc.) |

---

## Examples

### Health Monitoring Script

```bash
#!/bin/bash
while true; do
  if ! apparatus health > /dev/null 2>&1; then
    echo "$(date): Server unhealthy!"
    # Send alert...
  fi
  sleep 10
done
```

### Load Testing Setup

```bash
# Start background traffic
apparatus traffic start --rps 50 --duration 300000

# Run chaos tests
apparatus chaos cpu --duration 10000
sleep 15
apparatus chaos memory --size 209715200
sleep 15
apparatus chaos memory --clear

# Stop traffic
apparatus traffic stop
```

### Security Audit

```bash
#!/bin/bash
TARGET=$1

echo "Running security audit on $TARGET"
apparatus -j security redteam --target "$TARGET" > audit-results.json

# Check for failures
FAILURES=$(jq '.summary.failed' audit-results.json)
if [ "$FAILURES" -gt 0 ]; then
  echo "Found $FAILURES security issues!"
  jq '.results[] | select(.status == "fail")' audit-results.json
  exit 1
fi

echo "All security tests passed"
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Health Check
  run: |
    apparatus -u ${{ env.API_URL }} health

- name: Run Security Scan
  run: |
    apparatus -u ${{ env.API_URL }} -j security redteam \
      --target ${{ env.TARGET_URL }} > security.json
    if jq -e '.summary.failed > 0' security.json; then
      echo "Security scan failed"
      exit 1
    fi
```

---

## Troubleshooting

### Connection Refused

```
✗ Health check failed: connect ECONNREFUSED
```

Check that Apparatus is running and the URL is correct:

```bash
# Check URL
apparatus config

# Try different URL
apparatus -u http://localhost:8081 health
```

### Timeout Errors

```
✗ Request timed out after 30000ms
```

Increase timeout:

```bash
APPARATUS_TIMEOUT=60000 apparatus security redteam --target https://slow-api.com
```

### Colors Not Working

```bash
# Check terminal support
echo $TERM

# Force disable colors
NO_COLOR=1 apparatus health
# or
apparatus --no-color health
```

### Config File Not Loading

```bash
# Check config path
cat ~/.apparatus/config.json

# Use explicit config
apparatus --config ./my-config.json health
```

---

## See Also

- [apparatus-client](../../../packages/apparatus-client/) - TypeScript API client
- [Apparatus](../apparatus/) - The API server

## License

MIT
