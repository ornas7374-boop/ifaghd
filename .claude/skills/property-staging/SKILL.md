---
name: property-staging
description: Two-phase virtual staging rules (Architect analysis + Painter) for furnishing an empty room photo without touching its architecture. Use when designing how sadu stages an emptied room - blocking rules for doors/windows, the carry test, zoning, perspective and "fewer pieces when space is tight". Instructions only; sadu draws through its own server.
allowed-tools: Read
source: https://github.com/appleaa123/skills_directory/tree/main/property-staging-skill (MIT, see LICENSE)
---

# Real Estate Virtual Staging Skill

Transforms empty room photos into professionally staged interiors without modifying the room's architecture. Uses a two-phase "Architect + Painter" pipeline: first analyze the room's structure and constraints, then generate a photorealistic staged image.

## How to use (sadu)
1. Read `references/architect_instructions.md` - the room analysis (fixed elements, blocking rules, spatial layout).
2. Read `references/painter_instructions.md` - what may be added, what may never be touched.
3. `assets/style_database.json` has generic per-room furniture lists; sadu's own setup styles (api/_lib/setup.js) win over it.

sadu overrides: no rugs or carpets (the floor is always protected); curtains only as the planned window dressing after the room is emptied.
The original script fallback (which calls Google/OpenAI with its own keys) is intentionally not included.

## Design Principles (For User Context)

- **Architecture is immutable** — walls, floors, ceilings, doors, windows are never changed
- **Blocking rules are enforced** — doors and windows are always kept visible; countertops can hold decor
- **Perspective-accurate** — furniture is scaled and aligned to the camera angle
- **Zone-aware** — open-concept spaces (e.g., Kitchen + Living Room) are staged with appropriate furniture in each zone

