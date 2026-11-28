---
name: better-design
description: Improve or audit Protlys Hub interfaces with an evidence-led workflow. Use for new UI, focused improvements, redesigns, responsive behavior, interaction states, accessibility, and visual QA.
---

# Better Design — Protlys adaptation

## First: inherit the real product

- Read the repository root `DESIGN.md` before changing UI.
- Inspect the actual screen, its components, styles, data states, and nearby routes.
- Treat existing Protlys tokens, logo, navigation, themes, and working behavior as authoritative.
- Preserve the existing information architecture. Do not introduce new destinations or features without an explicit request.
- Protein intake logging is out of scope and must not be reintroduced. The Protein destination is the calculator/target experience only.

## Scope and acceptance

Describe the user task as entry → action → result → error/retry → back/cancel. Identify affected components and the smallest useful scope. A focused polish task should remain focused; do not turn it into a redesign.

Check the supported viewports: narrow Android phones, typical phones, tablet, desktop, and browser zoom where applicable. Preserve safe-area insets and thumb reach.

## Design and implementation

- Use the current `DESIGN.md` tokens. If a role is missing, add it to the design system and implementation together.
- Make hierarchy and spacing serve the task. Avoid repeated generic cards, decorative labels, gradients, glass effects, and unnecessary illustrations.
- Ensure every interactive component has appropriate default, hover, pressed, focus, disabled, loading, success, and error states.
- Preserve semantic links, buttons, form labels, keyboard operation, and clear accessible names.
- Aim for WCAG 2.2 AA contrast and comfortable mobile hit areas (prefer 44×44 CSS px).
- Motion must communicate feedback, causality, orientation, or a changed value. Keep it brief, interruptible, and compatible with `prefers-reduced-motion`.
- Do not add animation libraries or runtime packages for cosmetic polish alone.

## Verification

Run the repository's relevant tests and build. Inspect rendered output at the supported sizes when a browser is available. Check both themes, keyboard focus, touch targets, empty/loading/error states, and reduced motion. Report only checks actually performed; label unavailable visual or device checks as unverified.

## Source

Adapted from [Moddingflow/better-design](https://github.com/Moddingflow/better-design), MIT. See `UPSTREAM-LICENSE.md`.
