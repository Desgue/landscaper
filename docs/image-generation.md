# Image Generation

Feature that produces photorealistic views of a garden plan by combining a 3D scene render from plan data (structural ground truth) with AI image generation (photorealistic output).

This feature is developed as a **standalone API** that consumes a garden planner JSON export and returns an image. It will be integrated into the garden planner app in a future phase. See [## Future App Integration].

---

## Overview

The image generation pipeline translates a 2D plan into a photorealistic image through four stages:

1. **3D Scene Construction** — build a 3D scene from plan element data (positions, dimensions, types)
2. **Structural Render** — render the scene to a depth map and a segmentation map
3. **Text Prompt Construction** — build a structured prompt from plan registry data
4. **Image Generation API** — POST both maps + prompt to an image generation API using ControlNet conditioning

The AI produces an image that is spatially constrained by the structural maps and visually realistic via diffusion. The plan layout is preserved; the AI fills in photorealistic texture, lighting, and atmosphere.

---

## Standalone API Contract

This is the single source of truth for the standalone image generation API interface. Future app integration references this section.

### Endpoint

```
POST /generate
Content-Type: application/json
Accept: image/png
```

### Request Body

```json
{
  "project": { "...full JSON export per data-schema.md ## Export Format..." },
  "options": {
    "include_planned": "boolean (default: true — include plants with status 'planned')",
    "garden_style": "cottage | formal | tropical | mediterranean | japanese | kitchen | native | contemporary | garden",
    "season": "early spring | late spring | summer | late summer | autumn | winter",
    "time_of_day": "morning | midday | golden hour | overcast",
    "viewpoint": "eye-level | elevated | isometric",
    "aspect_ratio": "square | landscape | portrait",
    "seed": "integer | -1 (default: -1 = random)"
  }
}
```

All `options` fields are optional. Defaults:

| Field | Default |
|---|---|
| `include_planned` | `true` |
| `garden_style` | `"garden"` |
| `season` | Derived from `project.location` + server date; falls back to `"summer"` if location is null |
| `time_of_day` | `"golden hour"` |
| `viewpoint` | `"eye-level"` |
| `aspect_ratio` | `"square"` |
| `seed` | `-1` |

### Response

```
HTTP 200
Content-Type: image/png
Body: raw PNG image bytes
```

Output dimensions per `aspect_ratio`:

| Value | Dimensions |
|---|---|
| `square` | 1024 × 1024 px |
| `landscape` | 1024 × 576 px (16:9) |
| `portrait` | 576 × 1024 px (9:16) |

On error:

```
HTTP 4xx / 5xx
Content-Type: application/json
Body: { "error": "string" }
```

### Server Configuration

These values are set in server environment variables, never in the request body:

| Variable | Purpose |
|---|---|
| `IMAGE_API_KEY` | API key for the image generation backend |
| `IMAGE_API_BASE_URL` | Base URL of the image generation backend |
| `IMAGE_MODEL_ID` | Model identifier on the backend |

The specific image generation backend is not specified in this document — it is a deployment decision. The API abstraction described in [## Stage 4: Image Generation API] defines what the server must send; the backend adapter translates it.

---

## Pipeline Stages

### Stage 1: 3D Scene Construction

Build a 3D scene by iterating over `project.elements` and `project.yardBoundary` from the JSON export.

#### Coordinate Mapping

- Plan coordinates are in centimeters. Map 1cm → 1 world unit.
- Y-axis in plan points down (HTML Canvas). 3D Y-axis points up. Convert: `worldZ = -planY`, `worldX = planX`. Vertical height maps to world Y.
- Yard boundary defines the ground plane at Y = 0.

#### Element Filtering

Before building geometry, filter `project.elements`:

| Condition | Action |
|---|---|
| Element on a hidden layer | Exclude — check `element.layerId` against `project.layers[].visible` |
| Plant with `status: "removed"` | Always exclude |
| Plant with `status: "planned"` and `include_planned: false` | Exclude |
| All other elements | Include |

Labels and dimensions are always excluded (no physical geometry).

#### Element Center Position

All elements store `x, y` as the **top-left corner** of their bounding box. Compute world center before placing geometry:

```
centerX = element.x + element.width / 2
centerZ = -(element.y + element.height / 2)    // Y-flip
```

Exception — terrain cell: `x, y` is the cell's top-left corner aligned to 100cm boundaries. Center is always `x + 50, y + 50`.

#### Element-to-Geometry Mapping

| Element type | 3D representation | Notes |
|---|---|---|
| Terrain cell | Flat 100×100cm plane at Y = 0 | Centered at cell center |
| Plant — herb / groundcover / climber | Flat disc at Y = 1cm | Diameter = `spacingCm` |
| Plant — shrub | Hemisphere | Diameter = `canopyWidthCm` if set, else `spacingCm` |
| Plant — tree (trunk) | Cylinder | Diameter = `trunkWidthCm`; if null → exclude trunk mesh, AI infers from plant name |
| Plant — tree (canopy) | Sphere | Diameter = `canopyWidthCm`; if null → exclude canopy mesh, AI infers from plant name |
| Structure | Extruded footprint | Height from registry `heightCm` if set, else category default (see table below) |
| Path | Extruded polyline / arc | 2cm above ground (Y = 2); width = `strokeWidthCm` |

Plant `quantity` is always rendered as **1 mesh** regardless of the quantity value. Quantity is informational.

**Structure height defaults** (used when `structureType.heightCm` is null — see [## Pending Schema Changes]):

| Structure category | Default height |
|---|---|
| boundary | 180cm |
| container | 40cm |
| surface | 5cm |
| overhead | 240cm |
| feature | 50cm |
| furniture | 75cm |

Structure `element.rotation` (degrees) applies to the extruded mesh around the vertical axis.

Curved structures and curved path segments use arc geometry. Compute arc center and radius from `arcSagitta` [spatial-math-specification.md "## 5. Arc Geometry"], then extrude along the arc path.

#### Yard Boundary Ground Fill

The yard boundary polygon defines the ground extent. Areas inside the boundary where no terrain cell exists (unpainted ground) are rendered as **bare soil** in the 3D scene and segmentation map.

Areas outside the boundary are not rendered (void — mapped to `#000000` in segmentation).

---

### Stage 2: Structural Render

Render the 3D scene to two off-screen targets at the output resolution matching the requested `aspect_ratio`.

**Render layer order:** when elements overlap, the element higher in the canvas render order paints over lower elements in both the depth map and segmentation map. Order (bottom to top): terrain → paths → structures → plants [canvas-viewport.md "## Render Layer Order (bottom to top)"].

#### Depth Map

- Render using a depth material (grayscale from depth buffer).
- Normalize depth: near = white, far / sky = black.
- Output: grayscale PNG at output resolution.

#### Segmentation Map

- Assign each element a flat, unlit color based on its semantic category.
- Render with flat / unlit shading — no lighting, no shadows.
- Output: flat-color PNG at output resolution. No anti-aliasing (nearest-neighbor sampling) to prevent color bleeding at boundaries.

**Segmentation color assignments:**

| Semantic category | Hex color | Applies to |
|---|---|---|
| void / sky | `#000000` | Outside yard boundary |
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
| tree trunk | `#5C3317` | Plant growth form: tree (trunk mesh) |
| tree canopy | `#228B22` | Plant growth form: tree (canopy mesh) |
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

Segmentation colors are fixed constants — not derived from registry display colors. Registry colors drive the 2D canvas render only [canvas-viewport.md "## Render Layer Order"].

**Fallback rules:**

- Terrain type not in table → use `terrainType.category`: `natural` → `#00AA00`, `hardscape` → `#AAAAAA`, `water` → `#4169E1`, `other` → `#8B4513`
- Path or structure with no `material` field (pending schema change) → use `#888888`
- Unknown element type → exclude from segmentation map

---

### Stage 3: Text Prompt Construction

Build the prompt from `options` and `project.registries`. The prompt has three parts:

```
{subject}. {elements}. {style}.
```

**Subject:**

```
"A {garden_style} garden, {season}, {time_of_day}"
```

Values come directly from `options.garden_style`, `options.season`, `options.time_of_day`.

**Elements:** Collect from elements included in the scene (post-filtering from Stage 1):

```
elements = comma-joined list of:
  1. Unique plant names: plantType.name for each unique plantTypeId present
  2. Unique structure descriptions: "{structureType.name}" for each unique structureTypeId present
  3. Unique terrain descriptions: terrainType.name for each unique terrainTypeId present
```

Registry lookup: `element.plantTypeId` → `project.registries.plants[]` where `id` matches. Same pattern for structures and terrain.

Cap at 12 items total. Priority: plants first (up to 7), structures second (up to 3), terrain last (up to 2).

**Style:** Fixed suffix per `options.viewpoint`:

| Viewpoint | Style suffix |
|---|---|
| `eye-level` | `"photorealistic, eye-level view, garden photography, natural lighting, high detail"` |
| `elevated` | `"photorealistic, elevated perspective view, garden photography, natural lighting, high detail"` |
| `isometric` | `"photorealistic, isometric view, garden photography, natural lighting, high detail"` |

**Full example:**

```
A cottage garden, late summer, golden hour. Cherry Tomato, Lavender, Rose Bush,
Wooden Pergola, Raised Bed, Grass, Gravel.
photorealistic, eye-level view, garden photography, natural lighting, high detail.
```

**Negative prompt** (always sent):

```
"illustration, flat design, cartoon, watercolor, pencil sketch, text, labels,
 grid lines, blurry, low quality, aerial view, floor plan"
```

---

### Stage 4: Image Generation API

Send depth map, segmentation map, and prompt to the configured image generation backend via ControlNet conditioning.

**Abstract request to backend:**

```
prompt:           {constructed prompt string}
negative_prompt:  {negative prompt string}
depth_image:      {depth map PNG — base64 or multipart}
seg_image:        {segmentation map PNG — base64 or multipart}
depth_weight:     0.7        // how strictly spatial depth is enforced
seg_weight:       0.9        // how strictly segmentation categories are enforced
width:            {from aspect_ratio table}
height:           {from aspect_ratio table}
steps:            30
cfg_scale:        7.5
seed:             {options.seed}
```

The server-side backend adapter translates this abstract request into the concrete API schema of the configured backend. The adapter is an internal implementation detail — not part of this spec.

**Timeout:** 60 seconds. On timeout: return HTTP 504 with `{ "error": "image generation timed out" }`. No automatic retry.

---

## Camera / Viewpoint

The viewpoint defines the 3D camera used for structural rendering. It must be consistent between the depth map render and the prompt style directive.

| Viewpoint | Camera type | Position |
|---|---|---|
| `eye-level` | Perspective, FOV 60° | Height 170cm (eye height), 3m behind yard boundary edge, facing yard center |
| `elevated` | Perspective, FOV 50° | Height 600cm, 5m outside yard boundary, angled down ~45° toward yard center |
| `isometric` | Orthographic | 45° tilt, camera angle 30° from north, framing full yard |

**Eye-level default camera position:**

```
camera.x = yardCenter.x
camera.y = 170
camera.z = yardBoundary.maxZ + 300

lookAt: (yardCenter.x, 100, yardCenter.z)
```

**Aspect ratio framing:** the camera frustum is sized to frame the full yard with 10% padding on all sides. Unpainted sky above / ground below the yard fills the remaining frame.

---

## Integration with Existing Data

### Registry Lookups

The standalone API resolves all element types via `project.registries` included in the JSON export. Lookup chain:

```
element.plantTypeId     → registries.plants[].id     → geometry + prompt name
element.structureTypeId → registries.structures[].id → geometry + prompt name
element.terrainTypeId   → registries.terrain[].id    → segmentation color + prompt name
element.pathTypeId      → registries.paths[].id      → segmentation color
```

If a registry type is not found for an element: exclude that element from the 3D scene and omit from prompt. Log a warning.

### Layer Visibility

Elements on hidden layers (`project.layers[n].visible === false`) are excluded from the 3D scene, structural renders, and prompt element list. Locked layers are included. This matches PNG export behavior [persistence-projects.md "## PNG Export"].

### Plant Type Fields Used

| Field | Used for |
|---|---|
| `name` | Prompt construction |
| `growthForm` | Geometry selection |
| `spacingCm` | Herb/groundcover/climber disc diameter; tree/shrub fallback diameter |
| `canopyWidthCm` | Shrub and tree canopy diameter |
| `trunkWidthCm` | Tree trunk cylinder diameter |
| `heightCm` | Plant vertical height in 3D scene |

`iconUrl` is not used. `heightCm` on plants is informational in the 2D app [data-schema.md "### Plant Type"] but is used as a geometry driver here — this is the only consumer of this field for computation.

### Structure Type Fields Used

| Field | Used for |
|---|---|
| `name` | Prompt construction |
| `category` | Height default fallback; collision semantics |
| `material` | Segmentation color (pending — see [## Pending Schema Changes]) |
| `heightCm` | 3D extrusion height (pending — see [## Pending Schema Changes]) |

---

## Constraints and Edge Cases

| Condition | Handling |
|---|---|
| `project.yardBoundary` is null | Return HTTP 400: `"project has no yard boundary"` |
| No elements after filtering | Render yard boundary ground only; generate with terrain-only prompt |
| Plant type not found in registry | Exclude element; log warning |
| Structure type not found in registry | Exclude element; log warning |
| `heightCm` null on plant | Default by growth form: herb 30cm, shrub 120cm, tree 600cm, groundcover 5cm, climber 200cm |
| `canopyWidthCm` null on tree | Exclude canopy mesh; AI infers canopy from plant name in prompt |
| `trunkWidthCm` null on tree | Exclude trunk mesh; AI infers trunk from plant name in prompt |
| `structureType.heightCm` null | Use category default from height table |
| `structureType.material` null | Segmentation color `#888888`; no material term added to prompt |
| `pathType.material` null | Segmentation color `#888888` |
| Yard boundary has arc edges | Approximate arc with 12-segment polyline for 3D ground plane extrusion |
| `options.season` not provided and location is null | Default to `"summer"` |
| Plant `quantity > 1` | Render 1 mesh; quantity is ignored for geometry |
| Image generation API timeout > 60s | Return HTTP 504 |
| Image generation API returns error | Return HTTP 502 with upstream error message |

---

## Pending Schema Changes

These changes to the main garden planner data schema are required for full image generation fidelity. Until they are implemented, fallback rules from [## Constraints and Edge Cases] apply.

### 1. `material` field on StructureType

Add to `data-schema.md "### Structure Type"`:

```json
"material": "wood | metal | masonry | stone | other"
```

Default on import: `"other"`. Affects: segmentation color assignment, prompt construction.

Docs requiring update: `data-schema.md`, `structures.md`, `image-generation.md`.

### 2. `material` field on PathType

Add to `data-schema.md "### Path Type"`:

```json
"material": "stone | gravel | brick | wood | concrete | other"
```

Default on import: `"other"`. Affects: segmentation color assignment.

Docs requiring update: `data-schema.md`, `paths-borders.md`, `image-generation.md`.

### 3. Height across the app

Adding real-world height to the garden planner is a significant change that spans the data model, rendering, and collision rules. It is tracked separately. Affected docs: `data-schema.md`, `structures.md`, `plants.md`, `spatial-math-specification.md`, `visual-design.md`, `image-generation.md`.

Until height is implemented in the main app, `structureType.heightCm` and `plantType.heightCm` are used by the image generation API only. The 2D canvas is unaffected.

---

## Future App Integration

When this API is integrated into the garden planner app, the following UI and integration points are needed. These are not part of the standalone API spec.

- **Visualize panel**: right-side panel with 3D scene preview, prompt display, style controls, generate button, result display
- **Journal attachment**: generated images saved to journal entries [journal.md "## Entries"]
- **Keyboard shortcut**: `V` to open the Visualize panel [keyboard-shortcuts.md]
- **API credentials**: stored in app user settings (not in project JSON export)

---

## Not in MVP — Deferred

- **Inpainting**: re-generate only a region of the image after editing part of the plan
- **Animation / timelapse**: sequence of images across seasons or plant growth stages
- **Style transfer**: apply a reference photo's style to the generated image
- **Multi-view generation**: generate front, side, and overhead views simultaneously
- **3D asset library**: replace procedural geometry with curated models per plant species
