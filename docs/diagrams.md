# Diagram Index

Diagram visuals are now embedded directly in the documentation sections where they are used.

This file is retained as an index for existing links and quick lookup.

## Where Each Diagram Lives

| Diagram | Primary Doc Location |
|---|---|
| 1. High-Level Data Flow | [Architecture Guide](architecture.md#high-level-data-flow) |
| 2. Request Flow Through Middleware | [Architecture Guide](architecture.md#request-flow-through-middleware) |
| 3. Docker Compose Network Topology | [Integration Guide](integration-guide.md#docker-compose-network) and [Architecture Guide](architecture.md#network-topology-in-docker-compose) |
| 4. Red Team Autopilot Loop | [Autopilot Tutorial](tutorial-autopilot.md#typical-workflow) and [Architecture Guide](architecture.md#red-team-autopilot-loop) |
| 5. System Health States | [Architecture Guide](architecture.md#1-middleware-stack) |
| 6. Protocol Server Architecture | [Architecture Guide](architecture.md#2-protocol-servers) |
| 7. Monitoring Architecture | [Monitoring Tutorial](tutorial-monitoring.md#apparatus-monitoring-architecture) |
| 8. Dashboard Layout | [Dashboard Tutorial](tutorial-dashboard.md#the-layout) |
| 9. Middleware Stack Dependencies | [Architecture Guide](architecture.md#1-middleware-stack) |
| 10. Feature Adoption Timeline | [Quick Reference Guide](quick-reference.md#learning-path-at-a-glance) |
| 11. Interface Comparison | [Feature Catalog](features.md#dashboard--ui-2-interfaces) |
| 12. Attacker Fingerprinting Layout | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#the-attacker-fingerprinting-layout) |
| 13. Attacker Profile Card | [Attacker Fingerprinting Tutorial](tutorial-attacker-fingerprinting.md#whats-in-an-attacker-profile) |
| 14. Chaos Console Layout | [Chaos Console Tutorial](tutorial-chaos-console.md#the-chaos-console-layout) |
| 15. Overview Dashboard Sections | [Overview Dashboard Tutorial](tutorial-overview-dashboard.md#main-sections) |
| 16. Scenario Structure | [Scenario Builder Tutorial](tutorial-scenario-builder.md#scenario-structure) |
| 17. Campaign Phases | [Advanced Red Team Tutorial](tutorial-advanced-red-team.md#campaign-structure) |
| 18. Console Panel Structure | [Dashboard Tutorial](tutorial-dashboard.md#console-parts-standard-layout) |

## Diagram Source Files

Mermaid sources and generated SVG files:

- `docs/assets/diagrams/*.mmd`
- `docs/assets/diagrams/*.svg`

## Update Workflow

```bash
# Re-render all diagrams after editing .mmd files
for f in docs/assets/diagrams/*.mmd; do
  mmdc -i "$f" -o "${f%.mmd}.svg" -b transparent --configFile docs/assets/diagrams/mermaid-theme.json
done
```
