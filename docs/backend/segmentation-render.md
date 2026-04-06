# Segmentation Render

Stage 1 filters and resolves plan elements to a 2D footprint list; Stage 2 rasterizes that list into a flat top-down color-coded PNG used as the spatial reference image for Nano Banana.

---

## Stage 1: Element Filtering

### Filtering Rules

| Condition | Action |
|---|---|
| Element on a hidden layer | Exclude — check `element.layerId` against `project.layers[].visible` |
| Plant with `status: "removed"` | Always exclude |
| Plant with `status: "planned"` and `include_planned: false` | Exclude — see [api-contract.md "## Options and Defaults"] |
| Labels | Always exclude — no physical footprint, regardless of layer visibility |
| Dimensions | Always exclude — no physical footprint, regardless of layer visibility |
| All other elements | Include |

### Registry Lookup Chain

All element types are resolved through `project.registries` before rendering:

```
element.plantTypeId     → registries.plants[].id     → footprint size, growth form
element.structureTypeId → registries.structures[].id → segmentation color, material
element.terrainTypeId   → registries.terrain[].id    → segmentation color
element.pathTypeId      → registries.paths[].id      → segmentation color
```

See [data-schema.md "### Plant Type"] and [data-schema.md "### Structure Type"] for field definitions.

If a registry entry is not found for an element: exclude that element from the render and log a warning at `WARN` level including the element ID and the missing type ID.

### Layer Visibility Rule

- Hidden layer (`project.layers[n].visible === false`): exclude all elements on that layer.
- Locked layer: include all elements on that layer. Locked does not mean hidden.

---

## Element 2D Footprints

### Position

All elements store `x, y` as the top-left corner of their bounding box, in centimeters. Center is derived as:

```
centerX = element.x + element.width / 2
centerY = element.y + element.height / 2
```

**Terrain cell exception:** `x, y` is always the cell's top-left corner aligned to 100cm boundaries. Center is always `x + 50, y + 50` — do not use width/height for derivation.

### Footprint Table

| Element type | 2D shape | Size source |
|---|---|---|
| Terrain cell | Filled 100×100cm rectangle | Fixed |
| Plant — herb / groundcover / climber | Filled circle | Diameter = `spacingCm` |
| Plant — shrub | Filled circle | Diameter = `canopyWidthCm` if set, else `spacingCm` |
| Plant — tree (canopy) | Filled circle | Diameter = `canopyWidthCm` if set, else `spacingCm` |
| Plant — tree (trunk) | Filled circle | Diameter = `trunkWidthCm` if set, else 20cm fixed |
| Structure (straight) | Filled rectangle | `element.width` × `element.height`, rotated by `element.rotation` |
| Structure (curved) | Filled arc band | Derived from `arcSagitta` [spatial-math-specification.md "## 5. Arc Geometry"] |
| Path | Stroked polyline or arc | Width = `strokeWidthCm` |

### Tree Dual-Shape Rule

Trees are drawn as two overlapping shapes at the same center point. The trunk circle is drawn first (smaller); the canopy circle is drawn on top (larger). Each shape uses its own segmentation color from the color table below.

### Plant Quantity

Plant elements with `quantity > 1` render as **1 shape**. Quantity is informational only and has no effect on the segmentation render.

---

## Stage 2: 2D Segmentation Render

### Canvas Setup

1. Compute the AABB of `project.yardBoundary` vertices.
2. Add 10% padding on all sides.
3. Scale to fill the output resolution for the requested `aspect_ratio` using uniform scale. If the aspect ratios differ, letterbox with `#000000`.

### Draw Order

Elements are drawn bottom to top. When elements overlap, the higher step paints over lower steps — matching [canvas-viewport.md "## Render Layer Order (bottom to top)"]. Canvas-only layers (grid, overflow dim, selection UI) are never drawn.

1. Fill entire canvas with `#000000` (void — outside yard boundary)
2. Fill yard boundary polygon with bare soil color `#8B4513` (default ground)
3. Draw terrain cells (each as a filled 100×100cm rectangle)
4. Draw paths (stroked polylines or arcs at `strokeWidthCm` width)
5. Draw structures (filled rectangles or arc bands, with rotation)
6. Draw plants — canopy circle first, then trunk circle on top for trees

### In-Memory Output

The segmentation map is kept in memory as a `[]byte` PNG. No temp files are written to disk.

```go
dc := gg.NewContext(outputWidth, outputHeight)
dc.SetHexColor("#000000")
dc.Clear()
// ... draw yard boundary polygon
// ... draw terrain cells
// ... draw paths, structures, plants

buf := new(bytes.Buffer)
if err := dc.EncodePNG(buf); err != nil {
    return nil, err
}
segMapBytes := buf.Bytes()
```

The render is implemented using [`fogleman/gg`](https://github.com/fogleman/gg) — a pure Go 2D graphics context with PNG output. No CGo or system graphics dependencies are required.

---

## Segmentation Color Table

Segmentation colors are fixed constants — not derived from registry display colors. Registry colors drive the 2D canvas render only [canvas-viewport.md "## Render Layer Order (bottom to top)"].

| Semantic category | Hex color | Applies to |
|---|---|---|
| void | `#000000` | Outside yard boundary (canvas background) |
| bare soil (default ground) | `#8B4513` | Unpainted ground inside yard boundary |
| lawn / grass | `#00AA00` | Terrain type: grass |
| soil / mulch | `#6B3A2A` | Terrain type: soil, mulch, bark |
| gravel / stone | `#AAAAAA` | Terrain type: gravel, concrete |
| wood decking | `#C8A96E` | Terrain type: wood decking |
| water (terrain) | `#4169E1` | Terrain type: water |
| path — stone / gravel | `#999999` | Path `material`: stone, gravel |
| path — brick | `#CC6644` | Path `material`: brick |
| path — wood | `#B8860B` | Path `material`: wood |
| path — concrete | `#BBBBBB` | Path `material`: concrete |
| path — other | `#888888` | Path `material`: other |
| tree trunk | `#5C3317` | Plant growth form: tree (trunk shape) |
| tree canopy | `#228B22` | Plant growth form: tree (canopy shape) |
| shrub | `#3A7A3A` | Plant growth form: shrub |
| herb / vegetable | `#66BB66` | Plant growth form: herb |
| groundcover | `#558B55` | Plant growth form: groundcover |
| climber | `#4A7A4A` | Plant growth form: climber |
| structure — wood | `#DEB887` | Structure `material`: wood |
| structure — metal | `#B0C4DE` | Structure `material`: metal |
| structure — masonry | `#D2B48C` | Structure `material`: masonry |
| structure — stone | `#C9A96E` | Structure `material`: stone |
| structure — other | `#BBAA99` | Structure `material`: other |
| water feature | `#4169E1` | Structure category: feature + material: other (water) |
| fire feature | `#FF6633` | Structure category: feature + id contains "fire" |

### Fallback Rules

- Terrain type not in table: use `terrainType.category` — `natural` → `#00AA00`, `hardscape` → `#AAAAAA`, `water` → `#4169E1`, `other` → `#8B4513`.
- Path or structure with no `material` field: use `#888888`.
- Unknown element type: exclude from the segmentation map entirely.

---

## Arc Approximation

Yard boundary edges may be arcs defined by chord endpoints and a sagitta value. These are approximated as a 12-segment polyline for the ground polygon fill.

### Algorithm

Given chord endpoints P0 and P1, and sagitta `s` (the perpendicular distance from the chord midpoint to the arc midpoint):

1. Compute the chord midpoint `M = (P0 + P1) / 2`.
2. Compute the chord half-length `h = |P1 - P0| / 2`.
3. Compute the arc radius `r = (h² + s²) / (2 * s)`.
4. The arc center lies on the perpendicular bisector of the chord at distance `r - s` from `M`, on the opposite side from the arc. Compute the perpendicular unit vector `n` (rotate the chord direction by 90°) and place the center at `C = M - n * (r - s)`.

For arc direction and sign conventions see [spatial-math-specification.md "## 5. Arc Geometry"].

5. Compute the start angle `θ0 = atan2(P0.y - C.y, P0.x - C.x)` and end angle `θ1 = atan2(P1.y - C.y, P1.x - C.x)`.
6. Sample 13 points evenly along the arc from `θ0` to `θ1` (inclusive), giving 12 equal angular intervals:

```
for i in 0..12:
    θ = θ0 + (θ1 - θ0) * i / 12
    point[i] = (C.x + r * cos(θ), C.y + r * sin(θ))
```

7. Use `point[0]` through `point[12]` as the polyline vertices replacing the arc edge in the yard boundary polygon.

---

## BDD Scenarios

### Filtering

```
Scenario: Plant element on a hidden layer is excluded
  Given a plant element assigned to a layer with visible: false
  When the segmentation map is rendered
  Then the plant shape is not drawn on the canvas

Scenario: Removed plant is always excluded
  Given a plant element with status: "removed"
  When the segmentation map is rendered
  Then the plant shape is not drawn on the canvas

Scenario: Planned plant excluded when include_planned is false
  Given a plant element with status: "planned"
  And the request options include include_planned: false
  When the segmentation map is rendered
  Then the plant shape is not drawn on the canvas

Scenario: Planned plant included when include_planned is true
  Given a plant element with status: "planned"
  And the request options include include_planned: true
  When the segmentation map is rendered
  Then the plant shape is drawn on the canvas

Scenario: Label element is always excluded
  Given a label element assigned to a layer with visible: true
  When the segmentation map is rendered
  Then no label shape is drawn on the canvas

Scenario: Dimension element is always excluded
  Given a dimension element assigned to a layer with visible: true
  When the segmentation map is rendered
  Then no dimension shape is drawn on the canvas
```

### Registry Misses

```
Scenario: Plant with unknown plantTypeId is excluded with a warning
  Given a plant element whose plantTypeId is not present in registries.plants
  When the segmentation map is rendered
  Then the plant shape is not drawn on the canvas
  And a WARN log entry is emitted containing the element ID and the missing plantTypeId

Scenario: Structure with unknown structureTypeId is excluded with a warning
  Given a structure element whose structureTypeId is not present in registries.structures
  When the segmentation map is rendered
  Then the structure shape is not drawn on the canvas
  And a WARN log entry is emitted containing the element ID and the missing structureTypeId
```

### Layer Locking

```
Scenario: Element on a locked layer is included
  Given a plant element assigned to a layer with locked: true and visible: true
  When the segmentation map is rendered
  Then the plant shape is drawn on the canvas
```

### Empty Element List

```
Scenario: All elements filtered out renders yard boundary only
  Given all elements in the plan are either hidden, removed, or excluded by registry misses
  When the segmentation map is rendered
  Then the canvas is filled with void color #000000
  And the yard boundary polygon is filled with bare soil color #8B4513
  And no element shapes are drawn on the canvas
```

### Tree Dual Shape

```
Scenario: Tree element renders trunk and canopy as two separate shapes
  Given a tree plant element with a resolved plantTypeId in registries.plants
  When the segmentation map is rendered
  Then a trunk circle is drawn first at the tree's center position using color #5C3317
  And a canopy circle is drawn on top of the trunk circle at the same center using color #228B22
```

### Plant Quantity

```
Scenario: Plant with quantity greater than one renders as a single shape
  Given a plant element with quantity: 3
  When the segmentation map is rendered
  Then exactly one plant shape is drawn for that element
```
