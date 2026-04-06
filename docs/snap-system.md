# Snap System

Snapping controls how elements align when placed, moved, or resized. Grid snap and geometry snap work together with a priority system. Snap toggle (Ctrl+G) and grid visibility toggle (Ctrl+') are independent [keyboard-shortcuts.md "## Toggles"].

## Grid Snap

Default increment: 10cm (nearest-round, configurable via `snapIncrementCm` in project settings [data-schema.md "### Project-level defaults"]). `snap(274) = 270`, `snap(276) = 280`, `snap(275) = 280`.

See [spatial-math-specification.md "## 2. Grid Snapping"] for the formula, negative coordinate handling, and the symmetric rounding variant.

## Geometry Snap

Active in MVP. Three types, in priority order:

**Edge alignment**: element edge aligns to a nearby element's edge. Detected per-axis — the cursor's X or Y is within tolerance of a candidate edge.

**Perpendicular alignment**: element meets an existing line/edge at exactly 90 degrees. The cursor position is projected onto the nearest edge; if the perpendicular foot is within tolerance, the snap fires.

**Midpoint alignment**: element aligns to the midpoint of a nearby element's edge. If distance from cursor to any edge midpoint is within tolerance, the snap fires.

See [spatial-math-specification.md "## 3. Snap System Architecture"] for detection algorithms, spatial indexing, and candidate collection.

## Priority Resolution

Geometry snaps take priority over grid snaps. Each axis (X, Y) is resolved independently — an element can snap to a geometry edge on X and to the grid on Y.

When multiple geometry snaps compete on the same axis, the closest one wins. If distances are equal (within 1cm), the most recently added element wins (creation order).

## Adaptive Tolerance

Tolerance is constant in screen pixels (8px), converted to world units: `toleranceWorld = 8 / zoom`. Clamped to [2cm, 100cm].

At zoom 1.0: 8cm tolerance. At zoom 5.0: 1.6cm (precise). At zoom 0.1: 80cm (easy targeting). See [spatial-math-specification.md "### Adaptive Snap Tolerance"] for the formula and practical values.

## Snap Guides

When a snap fires, a visual guide line appears: thin (1px screen-space), accent blue (#1971c2), 50% opacity, extending across the visible viewport on the snapped axis. Guides disappear when the element moves away from the snap point. All active guides are shown, not just the winning one.

## Alt Modifier Behavior

Alt is context-dependent:

| Context | Default | Alt held |
|---------|---------|----------|
| Placing/painting (terrain, plant, structure, arc, path, eraser) | Snap ON | Snap OFF |
| Moving selected elements | Snap OFF (free move) | Snap ON |
| Placing labels | Snap OFF (free placement) | Snap ON |
| Placing measurement endpoints (M) | Snap OFF (free placement) | Snap ON |
| Pasting (Ctrl+V) | Snap ON (grid only) | — (Alt has no effect on paste) |
| Resizing (structures, labels) | Snap ON | Snap OFF |
