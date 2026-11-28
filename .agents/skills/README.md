# Protlys Hub design skills

These project-local Agent Skills are reusable design and review workflows, not runtime dependencies. They do not add npm packages or change the shipped interface by themselves.

| Skill | Use |
|---|---|
| `better-design` | Primary workflow for scoped UI improvements, responsive behavior, accessibility, and evidence-based verification |
| `frontend-design-deslop` | Optional strategic review when creating a new surface or when a screen feels generic |
| `make-interfaces-feel-better` | Focused polish for typography, surfaces, icons, touch targets, and transitions |
| `motion-director` | Motion design when a task explicitly needs motion |
| `web-motion-auditor` | Review motion quality, performance, and reduced-motion behavior |

## Application order

1. Read root `DESIGN.md`; it remains the source of truth for Protlys.
2. Use `better-design` for the task workflow and `make-interfaces-feel-better` for the detail pass.
3. Consult `frontend-design-deslop` only for new direction; never replace the approved brand.
4. Use motion skills only when motion is in scope. No extra motion dependency for cosmetic polish.
5. Preserve existing functionality, the supplied logo, dark/light themes, safe areas, and the five current destinations.
6. Protein intake logging remains out of scope. Do not reintroduce it.
7. Report actual tests and mark browser/device checks as unverified when unavailable.

The `make-interfaces-feel-better` repository was listed twice in the request and is installed once.
