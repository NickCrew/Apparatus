# Plan: FORENSICS-CyberChef-Integration

## Objective
Seamlessly bridge the gap between detection and deep analysis by integrating CyberChef directly into the dashboard's forensic workflows.

## Key Features
- **"Open in CyberChef" Button:** Added to all Payload, Request Body, and Live Packet views.
- **Deep Linking:** Automatically encode the selected data (Base64) into a CyberChef URL state so it opens with the input pre-filled.
- **Recipe Presets:** Provide one-click recipes for common tasks (e.g., "From Base64", "URL Decode", "Deflate").
- **Embedded Mode (Optional):** Explore using an iframe or embedded CyberChef instance for a side-by-side analysis experience.

## Technical Implementation
- **Utility:** Create a `cyberchef.ts` utility to handle URL state generation (mapping data to the `input` and `recipe` URL parameters).
- **Frontend:** Add the `ExternalLink` icon and CyberChef action to the `EventInspector` and `LiveMonitor` components.
- **Data Handling:** Ensure binary data from PCAPs or raw TCP streams is correctly serialized for the transition.

## UI/UX Design
- **Aesthetic:** Minimalist "Baker" icon next to payloads.
- **Placement:** Integrated into context menus and detail panes.

## Milestones
1. **M1:** CyberChef URL generator utility.
2. **M2:** "Open in CyberChef" button in the Request/Webhook Detail view.
3. **M3:** Integration with the Live Packet Monitor for hex/binary analysis.
4. **M4:** Pre-configured recipe shortcuts for common security payloads.
