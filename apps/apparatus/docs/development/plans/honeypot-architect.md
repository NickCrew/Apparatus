# Plan: Dynamic Honeypot Architect

## Objective
Enable users to visually "deploy" and configure custom deception targets, allowing the lab to simulate specific vulnerable software or services on demand.

## Key Features
- **Route Manager:** Add custom HTTP paths (e.g., `/jenkins/login`, `/gitlab/status`) to the deception engine.
- **Persona Selector:** Assign a specific AI persona to a route (e.g., "Frustrated Admin", "Legacy Database", "Secret API").
- **Dynamic Response Builder:** Set status codes, headers, and body templates for honeypot responses.
- **Deception "Blueprints":** Save collections of honeypots as a single "Environment" (e.g., "DevOps Lab", "Finance Server").
- **Visual Deployment Status:** See which honeypots are currently active and their total hit count.

## Technical Implementation
- **Backend:** Refactor `src/deception.ts` to replace hardcoded paths with a dynamic `DeceptionRegistry`.
- **API:** New CRUD endpoints for managing deception routes and personas.
- **AI Integration:** Pass the route-specific persona metadata to the AI client during request handling.
- **Storage:** Maintain the registry in memory, with export/import support for blueprints.

## UI/UX Design
- **Aesthetic:** "Drag and Drop" deployment feel. 
- **Wizard:** A step-by-step "Deploy Honeypot" wizard.
- **Live Preview:** A "Test" button to hit the honeypot and see the AI response immediately.

## Milestones
1. **M1:** Backend refactor to support dynamic route registration.
2. **M2:** Deception Management UI (Add/Remove routes).
3. **M3:** Custom Persona and Response templating.
4. **M4:** Blueprint system for environment-wide deception.
