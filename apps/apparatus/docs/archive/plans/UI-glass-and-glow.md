# Plan: UI-Glass-And-Glow (Advanced Glassmorphism)

## Objective
Deepen the "Command Center" visual hierarchy by implementing layered transparency and semantic glowing borders that vary based on the module's functional category.

## Key Features
- **Dynamic Semantic Glows:** Components automatically adopt an outer glow based on their context:
  - **Defense/Identity:** Cyan/Teal glow (#00C4A7).
  - **Chaos/Network:** Amber/Orange pulse (#FFB800).
  - **Security/Attacks:** Crimson/Red alert glow (#E11D48).
- **GlassCard Component:** A new UI primitive with `backdrop-blur-xl`, `bg-white/[0.03]`, and a high-contrast thin border.
- **Layered Z-Space:** Use subtle shadows and different blur intensities to make modals and HUDs feel like they are floating above the data grid.

## Technical Implementation
- **Tailwind Extension:** Add specific `glow-*` utilities to `tailwind.config.ts`.
- **CVA Variants:** Expand the `Card` component's `VariantProps` to include `glow="primary | warning | danger"`.
- **Performance:** Ensure `backdrop-filter` usage is optimized to prevent frame-rate drops on low-end hardware.

## Milestones
1. **M1:** Update `tailwind.config.ts` with new glow utility classes.
2. **M2:** Refactor `Card.tsx` to support semantic glow variants.
3. **M3:** Apply "Glow" styling to all major dashboard consoles.
