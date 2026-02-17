# Apparatus TUI Keyboard Reference

Complete keyboard shortcut reference for the Apparatus Terminal User Interface.

---

## Quick Reference Card

```
Global:     q/Ctrl-C quit | ?/h help | r refresh | R reconnect | 1-6 screens
Navigate:   j/k or ↑↓ move | Enter select | Escape close | Tab next widget
Testing:    S scanner | C chaos | G ghost | D diagnostics
Defense:    A shield | M mtd | ; script | P dlp
System:     T topology | I sysinfo | K kv-store | W webhooks
Forensics:  F5 pcap | F6 har | J jwt | O oidc
```

---

## Global Shortcuts

These work from any screen.

| Key | Alternative | Description |
|-----|-------------|-------------|
| `q` | `Ctrl-C` | Quit application |
| `?` | `h` | Show help modal |
| `r` | - | Refresh current screen data |
| `R` | - | Reconnect SSE stream |
| `1` | - | Switch to Monitor screen |
| `2` | - | Switch to Traffic screen |
| `3` | - | Switch to Testing screen |
| `4` | - | Switch to Defense screen |
| `5` | - | Switch to System screen |
| `6` | - | Switch to Forensics screen |

---

## Navigation Keys

### Vim-Style Navigation

| Key | Vim Equivalent | Description |
|-----|----------------|-------------|
| `k` | `up` | Move selection up |
| `j` | `down` | Move selection down |
| `h` | `left` | Move left / Previous tab |
| `l` | `right` | Move right / Next tab |

### Arrow Key Navigation

| Key | Description |
|-----|-------------|
| `↑` | Move selection up |
| `↓` | Move selection down |
| `←` | Move left / Previous tab |
| `→` | Move right / Next tab |

### Modal and Focus Navigation

| Key | Description |
|-----|-------------|
| `Enter` | Select / Confirm action |
| `Escape` | Cancel / Close modal |
| `Tab` | Move to next widget |
| `Shift-Tab` | Move to previous widget |
| `Space` | Toggle selection (in lists) |

### List Navigation

| Key | Description |
|-----|-------------|
| `g` | Jump to first item |
| `G` | Jump to last item |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |

---

## Screen-Specific Shortcuts

### Screen 3: Testing

| Key | Description | Opens |
|-----|-------------|-------|
| `S` | Open Red Team Scanner | WAF validation modal |
| `C` | Open Chaos Controls | Chaos engineering panel |
| `G` | Toggle Ghost Traffic | Background traffic generator |
| `D` | Open Network Diagnostics | DNS/TCP test forms |

#### Scanner Modal (S)

| Key | Description |
|-----|-------------|
| `Enter` | Start scan / Select target |
| `j`/`k` | Navigate scan options |
| `s` | Stop running scan |
| `Escape` | Close scanner |

#### Chaos Modal (C)

| Key | Description |
|-----|-------------|
| `1` | Trigger CPU spike |
| `2` | Trigger memory spike |
| `3` | Trigger crash |
| `Enter` | Execute selected action |
| `Escape` | Close panel |

#### Ghost Traffic Modal (G)

| Key | Description |
|-----|-------------|
| `Space` | Toggle traffic on/off |
| `+`/`-` | Increase/decrease rate |
| `Enter` | Apply settings |
| `Escape` | Close modal |

### Screen 4: Defense

| Key | Description | Opens |
|-----|-------------|-------|
| `A` | Open Active Shield | Rule management |
| `M` | Open MTD Panel | Moving Target Defense |
| `;` | Open Script Console | Sandboxed JS execution |
| `P` | Open DLP Generator | Test data generator |

#### Active Shield Modal (A)

| Key | Description |
|-----|-------------|
| `j`/`k` | Navigate rules list |
| `Space` | Toggle rule enabled/disabled |
| `a` | Add new rule |
| `d` | Delete selected rule |
| `Enter` | Edit selected rule |
| `Escape` | Close modal |

#### MTD Modal (M)

| Key | Description |
|-----|-------------|
| `Space` | Toggle MTD enabled |
| `j`/`k` | Navigate settings |
| `Enter` | Apply changes |
| `Escape` | Close modal |

#### Script Console (;)

| Key | Description |
|-----|-------------|
| `Enter` | Execute script |
| `Ctrl-Enter` | Execute multi-line |
| `↑`/`↓` | Command history |
| `Ctrl-L` | Clear output |
| `Escape` | Close console |

#### DLP Generator (P)

| Key | Description |
|-----|-------------|
| `1` | Generate credit card |
| `2` | Generate SSN |
| `3` | Generate email |
| `4` | Generate custom |
| `c` | Copy to clipboard |
| `Escape` | Close modal |

### Screen 5: System

| Key | Description | Opens |
|-----|-------------|-------|
| `T` | Open Cluster Topology | Node visualization |
| `I` | Open System Info | Hardware/runtime info |
| `K` | Open KV Store | Key-value browser |
| `W` | Open Webhook Inspector | Webhook event viewer |

#### Cluster Topology Modal (T)

| Key | Description |
|-----|-------------|
| `j`/`k` | Navigate node list |
| `Enter` | View node details |
| `r` | Refresh topology |
| `Escape` | Close modal |

#### System Info Modal (I)

| Key | Description |
|-----|-------------|
| `Tab` | Switch info sections |
| `r` | Refresh info |
| `Escape` | Close modal |

#### KV Store Modal (K)

| Key | Description |
|-----|-------------|
| `j`/`k` | Navigate keys |
| `Enter` | View/edit value |
| `a` | Add new key |
| `d` | Delete selected key |
| `/` | Search keys |
| `Escape` | Close modal |

#### Webhook Inspector Modal (W)

| Key | Description |
|-----|-------------|
| `j`/`k` | Navigate events |
| `Enter` | View details |
| `c` | Clear history |
| `Escape` | Close modal |

### Screen 6: Forensics

| Key | Description | Opens |
|-----|-------------|-------|
| `F5` | Start PCAP Capture | Packet capture controls |
| `F6` | Open HAR Replay | HTTP Archive replay |
| `J` | Open JWT Tools | JWT decoder/minter |
| `O` | Open OIDC Display | OIDC configuration |

#### PCAP Modal (F5)

| Key | Description |
|-----|-------------|
| `Space` | Start/stop capture |
| `s` | Save capture to file |
| `c` | Clear packets |
| `f` | Apply filter |
| `Escape` | Close modal |

#### HAR Replay Modal (F6)

| Key | Description |
|-----|-------------|
| `o` | Open HAR file |
| `Enter` | Replay selected request |
| `j`/`k` | Navigate requests |
| `Space` | Toggle request selection |
| `a` | Replay all selected |
| `Escape` | Close modal |

#### JWT Tools Modal (J)

| Key | Description |
|-----|-------------|
| `Tab` | Switch decode/verify tabs |
| `Enter` | Decode/verify token |
| `c` | Copy decoded payload |
| `Escape` | Close modal |

#### OIDC Display Modal (O)

| Key | Description |
|-----|-------------|
| `r` | Refresh config |
| `c` | Copy JWKS URL |
| `Enter` | View full config |
| `Escape` | Close modal |

---

## Input Fields

When typing in text fields:

| Key | Description |
|-----|-------------|
| `Enter` | Submit input |
| `Escape` | Cancel / Clear field |
| `Backspace` | Delete before cursor |
| `Delete` | Delete after cursor |
| `Ctrl-A` | Move to beginning |
| `Ctrl-E` | Move to end |
| `Ctrl-K` | Delete to end of line |
| `Ctrl-U` | Delete to beginning |

---

## Efficiency Tips

### 1. Use Vim Keys

`h`, `j`, `k`, `l` keep your fingers on home row for faster navigation.

### 2. Quick Screen Switching

Number keys `1-6` instantly jump between screens.

### 3. Consistent Modal Pattern

All modals follow: `Enter` confirm, `Escape` cancel, `j`/`k` navigate.

### 4. Refresh vs Reconnect

- `r` - Quick data refresh
- `R` - Full SSE reconnection

### 5. Chained Actions

Example sequence:
```
3 → S → Enter → Escape → C → 1 → Escape
```
(Testing → Scanner → Start → Close → Chaos → CPU → Close)

---

## Quick Reference by Modal

| Screen | Key | Modal |
|--------|-----|-------|
| Any | `?`/`h` | Help |
| Testing (3) | `S` | Scanner |
| Testing (3) | `C` | Chaos |
| Testing (3) | `G` | Ghost Traffic |
| Testing (3) | `D` | Diagnostics |
| Defense (4) | `A` | Active Shield |
| Defense (4) | `M` | MTD |
| Defense (4) | `;` | Script Console |
| Defense (4) | `P` | DLP Generator |
| System (5) | `T` | Cluster Topology |
| System (5) | `I` | System Info |
| System (5) | `K` | KV Store |
| System (5) | `W` | Webhook Inspector |
| Forensics (6) | `F5` | PCAP Capture |
| Forensics (6) | `F6` | HAR Replay |
| Forensics (6) | `J` | JWT Tools |
| Forensics (6) | `O` | OIDC Display |

---

## Function Keys

| Key | Description |
|-----|-------------|
| `F5` | PCAP Capture (Forensics) |
| `F6` | HAR Replay (Forensics) |

## Modifier Keys

| Combination | Description |
|-------------|-------------|
| `Ctrl-C` | Quit application |
| `Ctrl-L` | Clear (Script Console) |
| `Ctrl-Enter` | Execute multi-line |
| `Shift-Tab` | Previous widget |

---

*Keyboard Reference v1.0 | December 2024*
