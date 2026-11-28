---
name: web-motion-auditor
description: Audit motion in Protlys web interfaces for usability, performance, interruptibility, and reduced-motion behavior.
---

# Web motion auditor — Protlys adaptation

Inspect the requested screen and all relevant states, including initial load, hover, focus, pressed, open/close, loading, success, error, and repeated input.

Check:
- Does each animation communicate feedback, causality, orientation, or a meaningful value change?
- Does the interface remain responsive when the user changes intent mid-transition?
- Are durations and easing consistent with Protlys' motion language?
- Are layout properties being animated unnecessarily?
- Does reduced motion remove unnecessary movement while preserving state feedback?
- Does the animation work at mobile sizes and avoid obscuring controls or content?
- Is a third-party motion dependency actually necessary?

Report each finding with screen/component, observed behavior, user impact, recommended change, and severity. Separate source inspection from rendered/browser verification. Never claim device performance or accessibility testing unless performed.

## Source

Adapted from [frankxai/awesome-motion-design-agent-skills](https://github.com/frankxai/awesome-motion-design-agent-skills), CC0 1.0 Universal. See `UPSTREAM-LICENSE.md`.
