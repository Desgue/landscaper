# Plants

Plants are placed on the canvas from the palette. They render above structures and below labels [canvas-viewport.md "## Render Layer Order (bottom to top)"].

## Placement

Plant tool (P) or click/drag from the Plants tab in the palette. Click-to-stamp activates stamp mode — subsequent clicks place the same plant type until Escape or tool switch. Drag from palette shows a preview that snaps to the grid, placing on release.

Plants snap to 10cm increments by default [snap-system.md "## Grid Snap"]. Alt disables snap [snap-system.md "## Alt Modifier Behavior"].

## Visual Size

Visual size depends on `growthForm`:

- **Herb, groundcover, climber**: illustrated sprite size = `spacingCm`. Centered in the 1m grid cell.
- **Tree**: canopy size = `canopyWidthCm`, trunk size = `trunkWidthCm`. Centered on the plant position. May extend well beyond the grid cell.
- **Shrub**: illustrated sprite size = `canopyWidthCm` if set, else `spacingCm`.

For herbs (default behavior):

```
spritePosition = cellOrigin + (100 - spacingCm) / 2
spriteSize = spacingCm (in world cm)
```

A tomato (spacingCm 60) occupies 60% of the cell. A carrot (spacingCm 5) occupies 5%. Minimum render size: 4px screen-space to prevent illegibility at low zoom. See [spatial-math-specification.md "## 9. Plant Visual Size"].

## Cannot Resize or Rotate

Plants have no resize handles (size is determined solely by spacingCm) and no rotation handle.

## Growth Form

The `growthForm` field on the plant type [data-schema.md "### Plant Type"] determines visual representation, sizing, and collision behavior:

### Herb (default)

Renders as an illustrated procedural sprite with category-specific visual style. Applies to vegetables, herbs, flowers, and small plants. Icon centered in grid cell, size = `spacingCm`. Each plant type receives deterministic per-type variation via djb2 hash seeding — same plant type always renders with the same visual characteristics (color hue, detail count, proportions).

### Tree

Renders as a leaf-cluster blob (illustrated canopy) with trunk. Consists of:
- **Trunk**: small filled circle at the plant center, diameter = `trunkWidthCm`. Dark brown. Participates in collision detection as a ground-level obstacle (blocks like a small structure).
- **Canopy**: large illustrated leaf-cluster shape, diameter = `canopyWidthCm`. Rendered with radial gradient dome lighting and baked drop shadow. Does NOT participate in collision detection — other elements can exist beneath the canopy.

Visual size = `canopyWidthCm` (not `spacingCm`). Trees often exceed the 1m grid cell.

### Shrub

Renders as overlapping ellipses forming an illustrated shrub silhouette, diameter = `canopyWidthCm` if set, else `spacingCm`. Includes radial gradient dome lighting and drop shadow. Solid fill (not semi-transparent like trees). Participates in spacing collision like herbs.

### Groundcover

Fills area similar to terrain but is placed as a plant element. Icon renders as a textured fill within the plant's bounding box. Useful for creeping plants, moss, or lawn alternatives.

### Climber

Placed against structures. Icon renders as an illustrated plant form with a directional indicator (arrow pointing toward the nearest structure edge). Collision uses `spacingCm` like herbs.

## Type Properties (from registry)

name, icon, category, growthForm, spacingCm, rowSpacingCm, canopyWidthCm, heightCm, trunkWidthCm, sunRequirement (full/partial/shade), waterNeed (low/medium/high), season[], daysToHarvest, companionPlants[], costPerUnit, description. See [data-schema.md "### Plant Type"] for field details.

`rowSpacingCm` is informational metadata (the recommended row spacing for row-planted vegetables). It has no effect on collision detection or canvas placement — `spacingCm` drives all spacing calculations. `rowSpacingCm` is displayed in the inspector only. `companionPlants` is likewise informational — IDs that don't resolve to a known plant type are stored as-is.

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

Any status can transition to `removed`. Forward transitions follow the lifecycle. Backward transitions are allowed (user corrects a mistake). This is the canonical definition of plant lifecycle — [spatial-math-specification.md "## 10. Element Lifecycle (Plant Status)"] cross-references this section.

## Inspector

Shows all type properties and instance properties, all editable. Changes apply immediately. See [spatial-math-specification.md "## 10. Element Lifecycle (Plant Status)"] for lifecycle details. All element types can be linked to journal entries [journal.md "## Element Linking"].

## Built-in Types

**Vegetables** (growthForm: herb): cherry-tomato (45cm), tomato (60cm), onion (10cm), eggplant (60cm), pepper (45cm), lettuce (25cm), carrot (5cm).

**Herbs** (growthForm: herb): basil (20cm), rosemary (30cm), mint (25cm), thyme (15cm).

**Trees** (growthForm: tree): oak (canopy 800cm, trunk 60cm), maple (canopy 700cm, trunk 50cm), birch (canopy 500cm, trunk 30cm), fruit-tree (canopy 400cm, trunk 25cm), ornamental-pear (canopy 350cm, trunk 20cm), japanese-maple (canopy 300cm, trunk 15cm).

**Shrubs** (growthForm: shrub): boxwood (canopy 80cm), lavender (canopy 60cm), hydrangea (canopy 120cm), rose-bush (canopy 90cm), holly (canopy 150cm), privet (canopy 100cm).

Extensible via registry.

## Collision Rules

Plants respect realistic placement constraints [canvas-viewport.md "## Collision Rules"]:

- **Spacing enforcement** (herbs, shrubs, groundcovers, climbers): `spacingCm` is the minimum center-to-center distance for a plant type. Each plant's collision radius is `spacingCm / 2`. Two plants violate spacing when `distance(centerA, centerB) < (spacingA + spacingB) / 2`
- **Tree spacing**: trees also use `spacingCm / 2` as their plant-to-plant spacing radius (same formula as herbs). `canopyWidthCm` is NOT used for spacing. So two trees violate spacing when `distance(centerA, centerB) < (spacingA + spacingB) / 2`, where spacingA/B are the trees' `spacingCm` values.
- **Tree trunk collision** (separate from spacing): tree trunks additionally block ground-level elements using `trunkWidthCm / 2` as the collision radius. Non-plant elements (structures, paths) cannot overlap the trunk circle. Tree canopy does NOT participate in collision detection [canvas-viewport.md "## Collision Rules"]
- **Blocked by structures**: plants cannot be placed inside structures unless the structure has `category: "container"` (raised beds, garden beds, planters) or `category: "overhead"` (pergolas — plants allowed beneath)
- **Allowed on terrain**: plants can be placed on any terrain type
- **Allowed on paths**: plants can be placed near or on paths (e.g., plants along a border)

Invalid placement shows a red ghost preview. Placement is blocked until the cursor moves to a valid position.
