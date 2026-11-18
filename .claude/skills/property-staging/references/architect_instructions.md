# Architect Analysis — Room Structure

## Goal
Analyze an empty room photo and extract permanent structural elements, spatial relationships, and constraints that guide virtual staging without modifying the architecture.

## Output Schema

```json
{
  "room_type": "Kitchen",
  "visible_zones": ["Living Room"],
  "fixed_elements": ["Front Door", "Large Window", "Kitchen Island", "Refrigerator"],
  "floor_material": "Polished concrete",
  "lighting_source": "Natural light from west-facing window",
  "perspective_notes": "Low camera angle, slightly wide angle",
  "blocking_rules": [
    {"element_name": "Front Door", "blocking_rule": "cannot_block"},
    {"element_name": "Kitchen Island", "blocking_rule": "can_place_on_top"},
    {"element_name": "North Wall", "blocking_rule": "can_block"}
  ],
  "spatial_layout": [
    {"subject": "Window", "relation": "is left of", "object": "Door"},
    {"subject": "Island", "relation": "is in front of", "object": "Sink"}
  ]
}
```

## Analysis Steps

1. **Primary room type** — identify the main function of the foreground space.
2. **Visible zones** — for open-concept spaces, list secondary rooms visible in the background (e.g., a Kitchen shot showing a Living Room in the background).
3. **Fixed elements** — everything immovable: Doors, Doorways, Windows, Kitchen Islands, Peninsulas, Built-in Cabinets, Appliances, HVAC vents, Fireplaces.
4. **Blocking rules** — assign exactly ONE rule per element (never an array):
   - `cannot_block`: Doors, doorways, windows, appliances — must stay fully visible
   - `can_place_on_top`: Countertops, islands, shelves — surfaces that accept decor
   - `can_block`: Walls, columns — furniture may be placed in front
5. **Spatial layout** — relative positions of elements. These relationships are invariant across all camera angles of the same room (architecture doesn't move).
6. **Perspective notes** — camera height, angle, lens distortion. Staging furniture must be scaled to this perspective.

## Blocking Rule Priority (when in doubt)
`cannot_block` > `can_place_on_top` > `can_block`

An element that could be both `cannot_block` and `can_place_on_top` (e.g., a kitchen island you cannot walk behind) should be assigned `cannot_block`.

## Critical Rules
- `blocking_rule` MUST be a single string, never an array.
- Spatial layout relationships are permanent — they hold across all angles of the same room.
- Include ALL doors and windows in `blocking_rules` with `cannot_block`.
