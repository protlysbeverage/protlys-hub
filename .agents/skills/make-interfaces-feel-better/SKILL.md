---
name: make-interfaces-feel-better
description: Apply focused interface polish to Protlys typography, surfaces, icons, touch targets, and micro-interactions without changing the product's design system.
---

# Make interfaces feel better — Protlys adaptation

Before changing a component, identify its existing CSS conventions and reuse them. Do not introduce a second styling system.

## Polish checklist

- **Typography:** use tabular numerals for changing metrics; balance headings; use readable line lengths and wrapping; preserve existing type roles.
- **Surfaces:** nested corner radii should be visually concentric; use borders for structure/state and restrained depth for elevation; avoid stacking border and shadow without purpose.
- **Alignment:** correct optical alignment at the component level rather than adding one-off offsets.
- **Touch:** prefer 44×44 CSS px hit areas on mobile. Expand small icon controls only when their hit areas will not collide.
- **Icons:** keep one coherent icon set, consistent stroke weight, `currentColor` state styling, and accessible names for icon-only controls.
- **Transitions:** never use `transition: all`; name the properties that change. Prefer interruptible CSS transitions for interactive states.
- **Press feedback:** subtle, brief feedback only where it helps. Do not animate high-frequency interactions or make motion the only state cue.
- **Performance:** avoid unnecessary `will-change`; animate composited properties such as transform and opacity when appropriate.
- **Accessibility:** retain visible focus, keyboard operation, and a reduced-motion path.

## Review output

List the exact components inspected, findings with severity and file locations, the correction, and the checks actually run. Do not claim a full audit if only one surface was inspected.

## Source

Adapted from [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better), MIT. See `UPSTREAM-LICENSE.md`.
