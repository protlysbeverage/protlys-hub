# Protlys Hub agent guidance

## Interface and product work

- Read `DESIGN.md` before any UI change. It is the authoritative product design system.
- For interface creation, redesign, or a focused UX improvement, read `.agents/skills/better-design/SKILL.md`.
- For a detail/polish pass, also read `.agents/skills/make-interfaces-feel-better/SKILL.md`.
- For a genuinely new visual direction, consult `.agents/skills/frontend-design-deslop/SKILL.md` without replacing established Protlys tokens.
- For motion-specific tasks, read `.agents/skills/motion-director/SKILL.md` and `.agents/skills/web-motion-auditor/SKILL.md`.
- Keep all skill guidance subordinate to the user request, existing product behavior, and root `DESIGN.md`.

## Non-negotiable product constraints

- Preserve the supplied Protlys logo, green identity, existing light/dark themes, mobile-first layout, and five existing destinations.
- Protein intake/food logging is out of scope. Do not restore, add, or advertise it. The Protein destination is the protein calculator and target guidance.
- Do not add runtime dependencies for cosmetic UI changes without a clear functional need.
- Do not claim browser, device, accessibility, or visual verification unless it was actually performed.

## Engineering workflow

- Keep changes scoped; preserve unrelated work.
- Add regression tests for durable product constraints when appropriate.
- Run `npm ci`, `npm test`, and `npm run build` for application changes.
- Inspect both light and dark themes and narrow Android layouts when rendered-browser verification is available.
- Report what changed, what was tested, and what remains unverified.
