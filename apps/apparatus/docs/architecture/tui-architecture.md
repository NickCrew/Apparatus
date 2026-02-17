# Apparatus TUI Architecture

Architectural overview of the Apparatus Terminal User Interface with Mermaid diagrams.

---

## Component Hierarchy

```mermaid
graph TB
    subgraph Application["Application Layer"]
        Main["index.ts<br/>(Entry Point)"]
    end

    subgraph Core["Core Infrastructure"]
        Store["store.ts<br/>(State Management)"]
        ScreenMgr["screen-manager.ts<br/>(Navigation)"]
        Keyboard["keyboard.ts<br/>(Input Handling)"]
        Modal["modal.ts<br/>(Dialogs)"]
        ActionHandler["action-handler.ts<br/>(API Mutations)"]
        Widget["widget.ts<br/>(Base Class)"]
    end

    subgraph DataLayer["Data Layer"]
        SSE["sse-client.ts<br/>(Real-time Events)"]
        API["api-client.ts<br/>(HTTP Polling)"]
    end

    subgraph Presentation["Presentation Layer"]
        Screens["screens/"]
        Widgets["widgets/"]
        Modals["modals/"]
        Theme["theme.ts"]
    end

    Main --> Store
    Main --> ScreenMgr
    Main --> SSE
    SSE --> Store
    API --> Store
    ScreenMgr --> Screens
    Screens --> Widgets
    Widgets --> Widget
    ActionHandler --> API
    Keyboard --> ActionHandler
```

### Layer Responsibilities

| Layer | Purpose | Files |
|-------|---------|-------|
| **Application** | Bootstrap, main loop | `index.ts` |
| **Core** | Infrastructure services | `core/*.ts` |
| **Data** | Server communication | `api-client.ts`, `sse-client.ts` |
| **Presentation** | Visual components | `screens/`, `widgets/`, `modals/` |

---

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph Server["Apparatus Server"]
        HTTP["HTTP API<br/>:8080"]
        SSEEndpoint["SSE Endpoint<br/>/events"]
    end

    subgraph Clients["Data Clients"]
        APIClient["api-client.ts"]
        SSEClient["sse-client.ts"]
    end

    subgraph State["State Management"]
        Store["Store"]
        Subs["Subscriptions"]
    end

    subgraph Render["Rendering"]
        Widgets["Widgets"]
        Blessed["Blessed Elements"]
        Screen["Terminal"]
    end

    HTTP --> APIClient
    SSEEndpoint --> SSEClient
    APIClient --> Store
    SSEClient --> Store
    Store --> Subs
    Subs --> Widgets
    Widgets --> Blessed
    Blessed --> Screen
```

### Data Flow Steps

1. **Server Events**: Apparatus emits SSE events for real-time metrics
2. **Client Ingestion**: `sse-client.ts` receives events, `api-client.ts` polls periodically
3. **State Update**: Clients call `store.set(key, value)` to update state
4. **Notification**: Store notifies all subscribers for that key
5. **Widget Update**: Widgets receive new data via callback
6. **Render**: Widgets update blessed elements, triggering screen render

---

## Screen Navigation

```mermaid
stateDiagram-v2
    [*] --> Monitor: Default

    Monitor --> Traffic: 2
    Traffic --> Testing: 3
    Testing --> Defense: 4
    Defense --> System: 5
    System --> Forensics: 6
    Forensics --> Monitor: 1

    state Monitor {
        Health --> Stats
        Stats --> Alerts
        Alerts --> Requests
    }

    state Traffic {
        RPSGauge --> Sparklines
        Sparklines --> Charts
    }

    state Testing {
        RedTeam --> Chaos
        Chaos --> Ghost
        Ghost --> NetDiag
    }

    state Defense {
        Sentinel --> MTD
        MTD --> DLP
    }

    state System {
        Cluster --> SysInfo
        SysInfo --> KVStore
        KVStore --> Webhooks
    }

    state Forensics {
        PCAP --> HAR
        HAR --> JWT
        JWT --> OIDC
    }
```

---

## State Management

```mermaid
flowchart TB
    subgraph Store["Centralized Store"]
        State["state: Map<string, any>"]
        Subs["subscribers: Map<string, Set>"]
    end

    subgraph Producers["Data Producers"]
        SSE["SSE Client"]
        API["API Client"]
        Actions["Action Handler"]
    end

    subgraph Consumers["Consumers"]
        W1["RPSGauge"]
        W2["Sparklines"]
        W3["TrafficChart"]
    end

    SSE -->|"set()"| Store
    API -->|"set()"| Store
    Actions -->|"set()"| Store
    Store -->|"notify"| W1
    Store -->|"notify"| W2
    Store -->|"notify"| W3
```

### State Keys

| Key | Type | Source | Description |
|-----|------|--------|-------------|
| `metrics` | `MetricsData` | SSE | Real-time RPS, latency |
| `traffic` | `TrafficEvent[]` | SSE | Recent requests |
| `history` | `number[]` | SSE | RPS history for sparklines |
| `alerts` | `Alert[]` | SSE | Security alerts |
| `sysinfo` | `SysInfo` | API | System information |
| `cluster` | `ClusterState` | SSE | Node status |
| `sentinel` | `SentinelState` | API | Active Shield rules |
| `mtd` | `MTDState` | API | MTD state |

---

## File Structure

```mermaid
graph TB
    subgraph Root["src/tui/"]
        Index["index.ts"]
        Dashboard["dashboard.ts"]
        API["api-client.ts"]
        SSE["sse-client.ts"]
        Types["types.ts"]
        Theme["theme.ts"]
    end

    subgraph Core["core/"]
        Store["store.ts"]
        Widget["widget.ts"]
        ScreenMgr["screen-manager.ts"]
        Keyboard["keyboard.ts"]
        Modal["modal.ts"]
        ActionH["action-handler.ts"]
    end

    subgraph Screens["screens/"]
        TrafficS["traffic-screen.ts"]
        TestingS["testing-screen.ts"]
        DefenseS["defense-screen.ts"]
        SystemS["system-screen.ts"]
        ForensicsS["forensics-screen.ts"]
    end

    subgraph Widgets["widgets/"]
        RPSGauge["rps-gauge-widget.ts"]
        Sparklines["sparklines-widget.ts"]
        RedTeam["redteam-widget.ts"]
        Chaos["chaos-widget.ts"]
        Sentinel["sentinel-widget.ts"]
        More["...16 more"]
    end

    subgraph Modals["modals/"]
        JWTMint["jwt-mint-modal.ts"]
        JWTDecode["jwt-decode-modal.ts"]
        AddRule["add-rule-modal.ts"]
        DNSForm["dns-form-modal.ts"]
        MoreM["...10 more"]
    end
```

---

## Widget System

```mermaid
classDiagram
    class Widget {
        <<interface>>
        +id: string
        +element: BoxElement
        +mount(screen, store): void
        +render(state): void
        +handleKey(key): boolean
        +destroy(): void
    }

    class BaseWidget {
        #container: Box
        #screen: Screen
        #store: Store
        +mount()
        +unmount()
        +show()
        +hide()
    }

    class RPSGaugeWidget {
        -gauge: ProgressBar
        +render(metrics)
    }

    class SparklinesWidget {
        -chart: Sparkline
        -history: number[]
        +render(history)
    }

    class RedTeamWidget {
        -list: List
        -output: Log
        +runScan()
    }

    Widget <|-- BaseWidget
    BaseWidget <|-- RPSGaugeWidget
    BaseWidget <|-- SparklinesWidget
    BaseWidget <|-- RedTeamWidget
```

### Widget Categories

| Category | Widgets | Screen |
|----------|---------|--------|
| **Traffic** | RPSGauge, Sparklines, TrafficChart | Traffic (2) |
| **Testing** | RedTeam, Chaos, Ghost, NetDiag | Testing (3) |
| **Defense** | Sentinel, MTD, DLP | Defense (4) |
| **System** | Cluster, SysInfo, KV, Webhook | System (5) |
| **Forensics** | PCAP, HAR, JWT, OIDC | Forensics (6) |

---

## Widget Lifecycle

```mermaid
sequenceDiagram
    participant Screen
    participant Widget
    participant Store
    participant Blessed

    Screen->>Widget: new Widget(config)
    Screen->>Widget: mount(screen, store)
    Widget->>Blessed: create elements
    Widget->>Store: subscribe(keys)
    Widget->>Widget: render(initialState)

    loop State Changes
        Store->>Widget: callback(newValue)
        Widget->>Blessed: setContent()
        Widget->>Blessed: render()
    end

    Screen->>Widget: destroy()
    Widget->>Store: unsubscribe()
    Widget->>Blessed: detach()
```

---

## Theme System

```mermaid
graph LR
    subgraph Theme["theme.ts"]
        Colors["colors"]
        Styles["styles"]
        Utils["utilities"]
    end

    subgraph Colors
        Primary["primary: #5B8DEE"]
        Success["success: #48BB78"]
        Warning["warning: #ECC94B"]
        Error["error: #FC8181"]
    end

    subgraph Utils
        Severity["severityColor()"]
        Method["methodColor()"]
        Status["statusColor()"]
    end

    Theme --> Widgets
    Theme --> Screens
    Theme --> Modals
```

### Color Functions

| Function | Input | Output |
|----------|-------|--------|
| `severityColor(level)` | `critical`, `high`, `medium`, `low` | red, yellow, cyan, green |
| `methodColor(method)` | `GET`, `POST`, `DELETE` | green, blue, red |
| `statusColor(code)` | `2xx`, `4xx`, `5xx` | green, yellow, red |

---

## Summary

The Apparatus TUI architecture emphasizes:

1. **Modularity** - Each widget is self-contained with clear lifecycle
2. **Reactivity** - Subscription-based updates minimize unnecessary renders
3. **Separation of Concerns** - Data, state, and presentation cleanly separated
4. **Extensibility** - New widgets/screens added with minimal changes
5. **Consistency** - Centralized theme ensures visual coherence

---

*Architecture Documentation v1.0 | December 2024*
