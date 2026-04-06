# Plants

Plants are placed on the canvas from the palette. They render above structures and below labels [canvas-viewport.md "## Render Layer Order"].

## Placement

Plant tool (P) or click/drag from the Plants tab in the palette. Click-to-stamp activates stamp mode — subsequent clicks place the same plant type until Escape or tool switch. Drag from palette shows a preview that snaps to the grid, placing on release.

Plants snap to 10cm increments by default [snap-system.md "## Grid Snap"]. Alt disables snap [snap-system.md "## Alt Modifier Behavior"].

## Visual Size

The plant icon is centered within its grid cell (1m × 1m). Icon size is proportional to `spacingCm`:

```
iconPosition = cellOrigin + (100 - spacingCm) / 2
iconSize = spacingCm (in world cm)
```

A tomato (spacingCm 60) occupies 60% of the cell. A carrot (spacingCm 5) occupies 5%. Minimum render size: 4px screen-space to prevent illegibility at low zoom. See [spatial-math-specification.md "## 9. Plant Visual Size"].

## Cannot Resize or Rotate

Plants have no resize handles (size is determined solely by spacingCm) and no rotation handle.

## Type Properties (from registry)

name, icon, category, spacingCm, rowSpacingCm, sunRequirement (full/partial/shade), waterNeed (low/medium/high), season[], daysToHarvest, companionPlants[], description.

## Instance Properties (per placement)

- **plantedDate**: null when status is "planned". Auto-set to current date when status changes to "planted". Editable via inspector.
- **status**: lifecycle state (see below). Default on placement: "planned".
- **quantity**: number of plants at this position (default 1). Visually shown as a badge overlay. Icon size does not change with quantity.
- **notes**: freeform text.

## Status Lifecycle

```
planned → planted → growing → harvested → removed
                  ↘ removed (skip harvest)
planned → removed (never planted)
```

Any status can transition to `removed`. Forward transitions follow the lifecycle. Backward transitions are allowed (user corrects a mistake).

## Inspector

Shows all type properties and instance properties, all editable. Changes apply immediately. See [spatial-math-specification.md "## 10. Element Lifecycle"] for lifecycle details.

## Built-in Types

cherry-tomato (45cm), tomato (60cm), onion (10cm), eggplant (60cm), pepper (45cm), basil (20cm), lettuce (25cm), carrot (5cm). Extensible via registry.

## Overlap

Plants can be placed on top of terrain and inside structures. Both remain unchanged.
