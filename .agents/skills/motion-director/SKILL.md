---
name: motion-director
description: Define restrained, accessible motion for Protlys Hub interactions, transitions, and state changes when motion work is requested.
---

# Motion director — Protlys adaptation

- Design the static hierarchy first. Motion clarifies state or narrative; it is not decoration.
- Inherit motion behavior from the root `DESIGN.md`. Keep one coherent timing/easing vocabulary.
- Prefer short ease-out transitions, generally under 300 ms for UI feedback.
- Animate transform and opacity where possible. Avoid layout animation on high-frequency interactions.
- Motion must be interruptible and retargetable. Keep tap feedback immediate.
- Do not add GSAP, Motion, Framer Motion, Lottie, or Rive merely for a small CSS transition. Use the existing stack unless the task justifies a dependency.
- Provide a useful static state and honor `prefers-reduced-motion`; never make motion the only indication of success, selection, or progress.
- Test on low-powered/mobile hardware when available. Report what was and was not tested.

## Source

Adapted from [frankxai/awesome-motion-design-agent-skills](https://github.com/frankxai/awesome-motion-design-agent-skills), CC0 1.0 Universal. See `UPSTREAM-LICENSE.md`.
