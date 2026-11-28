# Protlys Hub Design System

## Overview

Protlys Hub is a mobile-first movement, protein-goal and community product. The visual language should feel athletic, calm, premium, and distinctly Protlys rather than like a generic SaaS dashboard.

## Colors

- Dark background: #0D0F0E
- Dark surface: #151815
- Light background: #F7F8F6
- Brand green: #6BCB45
- Light-theme green: #4F9F35
- Primary text: #111111 on light, #FFFFFF on dark
- Muted text: use reduced-opacity versions of the primary text
- Do not introduce new accent colors unless a semantic state requires one.

## Typography

- Display / metric: Space Grotesk, bold, tight tracking, tabular numerals.
- UI / body: Manrope.
- Technical / metadata: IBM Plex Mono where appropriate.
- Headlines may be expressive, but never clip or overflow on mobile.

## Layout

- Mobile first.
- Primary navigation remains five destinations: Feed, Movement, Challenges, Protein calculator, Dashboard.
- The Protein destination is for calculator and target guidance; protein intake logging is out of scope.
- Keep navigation in the thumb-reachable bottom zone on mobile.
- Respect safe-area insets and dynamic viewport height.
- Prefer one strong primary action per surface.
- Keep secondary actions grouped rather than scattered.
- Preserve existing Dashboard information architecture unless a change is explicitly requested.

## Components

### Bottom navigation
- 3–5 destinations.
- Icon + visible label.
- Active state uses Protlys green and a restrained background indicator.
- Touch targets should remain comfortably tappable; prefer at least 44×44 CSS px on mobile.

### Sheets and dialogs
- On mobile, use a bottom-sheet mental model.
- Keep the main content area scroll-safe and action controls anchored.
- Close controls must be obvious and keyboard/touch accessible.
- Theme selectors and similar option rows may horizontally scroll rather than compress.

### Buttons
- Primary CTA: strong filled treatment.
- Secondary actions: visible border, sufficient contrast, icon + label where space allows.
- Use visible focus states for keyboard and switch-access navigation; never suppress focus without a clear replacement.
- Disabled state must remain legible.
- Do not rely on color alone to communicate meaning.

### Cards
- Use restrained borders and depth.
- Avoid excessive shadows, gradients, glass effects, or decorative illustrations.
- Data hierarchy matters more than ornament.

## Interaction principles

- Small press feedback is useful; large motion is not.
- Use motion to communicate state changes, not to decorate.
- Respect prefers-reduced-motion.
- Keep success/error feedback close to the action that caused it.
- Avoid nested modals when a sheet or page is sufficient.

## Share cards

- Share-card output is a product surface, not a generic screenshot.
- Preview and exported image must use the same component.
- Preserve the fixed 9:16 poster format.
- Keep Protlys logo, metric, date, and data hierarchy consistent across themes.
- Export-safe rendering takes priority over browser-only visual tricks.

## Design source principles

This system incorporates useful patterns observed in DESIGN.md, Component Gallery, Mobbin, shadcn/ui, 21st.dev, and CTA.gallery: portable design tokens, real-world component references, mobile-first navigation, thumb-reachable sheets, grouped actions, explicit accessible labels, and strong primary/secondary action hierarchy.
Do not copy another product's visual identity. Borrow interaction patterns and implementation principles, then express them through Protlys' existing brand.

## Do

- Prefer clarity over novelty.
- Keep existing approved Protlys layouts intact.
- Use the project-local UI skills in `.agents/skills/` as review aids, with this file remaining authoritative.
- Make mobile interactions feel intentional.
- Reuse components rather than creating parallel variants.
- Test dark and light themes.

## Don't

- Don't add random gradients, 3D objects, or decorative illustrations.
- Don't add more navigation destinations without a clear product reason.
- Don't replace the Protlys logo with text.
- Don't introduce a new design language on individual screens.
- Don't sacrifice export reliability for visual effects.
- Don't introduce food logging or protein intake logging.

## Interface quality addendum

- Use tabular numerals for live step counts, targets, leaderboard positions, and other changing metrics.
- Prefer explicit transitions over `transition: all`; keep interactions interruptible and short.
- Preserve visible focus, keyboard operation, 44×44 px mobile hit areas where controls permit, and a reduced-motion path.
- Use motion only to communicate a state change or user action. Avoid ambient animation and motion on repeated/high-frequency controls.
- Keep headings balanced and body copy readable without changing the established font roles.
- Audit both light and dark themes and narrow Android viewports after shared component or token changes.

## Design skill sources

The project-local skills in `.agents/skills/` are adapted from Moddingflow/better-design, samber/cc-skills, jakubkrehel/make-interfaces-feel-better, and frankxai/awesome-motion-design-agent-skills. Use them selectively; they do not override this design system. See each skill's `UPSTREAM-LICENSE.md` for source license information.