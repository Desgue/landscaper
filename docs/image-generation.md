# Image Generation

Feature that produces photorealistic views of a garden plan by combining a 2D segmentation render from plan data (spatial ground truth) with Nano Banana image generation (photorealistic output). The backend is a standalone Go service.

This feature is developed as a **standalone API** that consumes a garden planner JSON export and returns an image. It will be integrated into the garden planner app in a future phase. See [## Future App Integration].

---

## Overview

The image generation pipeline translates a 2D plan into a photorealistic image through four stages:

1. **Element Parsing & Filtering** — parse plan elements, apply visibility and status filters
2. **2D Segmentation Render** — render a top-down color-coded map of the yard (Go, `fogleman/gg`)
3. **Text Prompt Construction** — build a structured prompt from plan registry data and options
4. **Nano Banana API** — send the segmentation map + prompt to Nano Banana; receive a PNG

The segmentation map gives the AI spatial layout (what is where); the prompt gives style, season, viewpoint, and plant/structure names. Nano Banana synthesizes a photorealistic view from both inputs.

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

| Value | Dimensions | Gemini aspect_ratio |
|---|---|---|
| `square` | 1024 × 1024 px | `1:1` |
| `landscape` | 1024 × 576 px (16:9) | `16:9` |
| `portrait` | 576 × 1024 px (9:16) | `9:16` |

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
| `GEMINI_API_KEY` | Gemini API key (Google AI Studio) |
| `GEMINI_MODEL` | Nano Banana model ID (default: `gemini-3.1-flash-image-preview`) |

---

## Backend Tech Stack

| Concern | Library / Package |
|---|---|
| HTTP server | `net/http` (standard library) |
| 2D segmentation render | [`fogleman/gg`](https://github.com/fogleman/gg) — Go 2D graphics context, outputs PNG |
| Gemini API client | [`google/generative-ai-go`](https://github.com/google/generative-ai-go) — official Go SDK |
| JSON parsing | `encoding/json` (standard library) |

No CGo, no system graphics dependencies. `fogleman/gg` is pure Go. The service has no external dependencies beyond the Gemini API.

---

## Pipeline Stages

### Stage 1: Element Parsing & Filtering

Parse `project.elements` and `project.yardBoundary` from the JSON export. No 3D geometry is built — this stage produces a filtered list of elements with their 2D footprints ready for rendering.

#### Element Filtering

| Condition | Action |
|---|---|
| Element on a hidden layer | Exclude — check `element.layerId` against `project.layers[].visible` |
| Plant with `status: "removed"` | Always exclude |
| Plant with `status: "planned"` and `include_planned: false` | Exclude |
| Labels and dimensions | Always exclude (no physical footprint) |
| All other elements | Include |

#### Element 2D Position

All elements store `x, y` as the **top-left corner** of their bounding box. Coordinates are in centimeters; no axis conversion is needed (the segmentation map is top-down, matching the plan's coordinate space).

```
centerX = element.x + element.width / 2
centerY = element.y + element.height / 2
```

Exception — terrain cell: `x, y` is always the cell's top-left corner aligned to 100cm boundaries. Center is always `x + 50, y + 50`.

#### Element 2D Footprint

| Element type | 2D shape | Size |
|---|---|---|
| Terrain cell | 100×100cm filled rectangle | Fixed |
| Plant — herb / groundcover / climber | Filled circle | Diameter = `spacingCm` |
| Plant — shrub | Filled circle | Diameter = `canopyWidthCm` if set, else `spacingCm` |
| Plant — tree (canopy) | Filled circle | Diameter = `canopyWidthCm` if set, else `spacingCm` |
| Plant — tree (trunk) | Filled circle | Diameter = `trunkWidthCm` if set, else 20cm |
| Structure (straight) | Filled rectangle | `element.width` × `element.height`, rotated by `element.rotation` |
| Structure (curved) | Filled arc band | Derived from `arcSagitta` [spatial-math-specification.md "## 5. Arc Geometry"] |
| Path | Stroked polyline / arc | Width = `strokeWidthCm` |

Plant `quantity > 1` renders as **1 shape**. Quantity is informational only.

Trees are drawn as two overlapping shapes: trunk circle first (smaller, center), canopy circle on top (larger, same center). Both use their respective segmentation colors.

Curved structures and curved path segments: compute arc center and radius from `arcSagitta`, then stroke/fill along the arc.

---

### Stage 2: 2D Segmentation Render

Render the filtered element list as a flat top-down color map. This is a pure 2D draw operation — no 3D, no perspective, no lighting.

**Canvas setup:**

1. Compute the AABB of `project.yardBoundary` vertices.
2. Add 10% padding on all sides.
3. Scale to fill the output resolution for the requested `aspect_ratio` (uniform scale, letterbox with `#000000` if aspect ratios differ).

**Draw order (bottom to top):**

1. Fill entire canvas with `#000000` (void — outside yard boundary)
2. Fill yard boundary polygon with bare soil color (`#8B4513`) — this is the default ground
3. Draw terrain cells (each as a filled 100×100cm rectangle)
4. Draw paths (stroked polylines/arcs at `strokeWidthCm` width)
5. Draw structures (filled rectangles or arc bands, rotated)
6. Draw plants — canopy/disc first, then trunk on top for trees

When elements overlap, the higher draw order paints over lower elements — matching the canvas render order [canvas-viewport.md "## Render Layer Order (bottom to top)"]. Canvas-only layers (grid, overflow dim, selection UI) are never drawn.

**Implementation note (`fogleman/gg`):**

```go
dc := gg.NewContext(outputWidth, outputHeight)
dc.SetHexColor("#000000")
dc.Clear()
// ... draw yard boundary, terrain, paths, structures, plants
dc.SavePNG("seg_map.png")
```

#### Segmentation Color Assignments

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

**Elements:** Collect from elements included after Stage 1 filtering:

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
| `eye-level` | `"photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan"` |
| `elevated` | `"photorealistic, elevated perspective view, garden photography, natural lighting, high detail, not a floor plan"` |
| `isometric` | `"photorealistic, isometric view, garden photography, natural lighting, high detail, not a floor plan"` |

The `"not a floor plan"` directive reduces the risk of Nano Banana treating the segmentation map reference as a literal output style.

**Full example:**

```
A cottage garden, late summer, golden hour. Cherry Tomato, Lavender, Rose Bush,
Wooden Pergola, Raised Bed, Grass, Gravel.
photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan.
```

---

### Stage 4: Nano Banana API

Send the segmentation map and prompt to Nano Banana via the Gemini API. The segmentation map is passed as a reference image — the model uses it for spatial layout context.

**Request (Go SDK):**

```go
client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_MODEL")))
model := client.GenerativeModel(os.Getenv("GEMINI_MODEL"))

parts := []genai.Part{
    genai.Text(prompt),
    genai.ImageData("image/png", segMapBytes), // base64-encoded segmentation map
}

resp, err := model.GenerateContent(ctx, parts...)
```

**Abstract parameters sent to Nano Banana:**

```
model:           {GEMINI_MODEL}
prompt:          {constructed prompt string}
reference_image: {segmentation map PNG — base64}
aspect_ratio:    {from aspect_ratio table — "1:1" | "16:9" | "9:16"}
seed:            {options.seed; -1 = omit parameter for random}
```

**Response handling:** Nano Banana returns the image inline in the response parts. Extract the first `image/png` part and return it as the HTTP response body.

**Timeout:** 60 seconds. On timeout: return HTTP 504 with `{ "error": "image generation timed out" }`. No automatic retry.

---

## Viewpoint

The viewpoint has no effect on the segmentation map render — the map is always top-down. Viewpoint controls only the style suffix appended to the prompt (see Stage 3). Nano Banana infers the requested perspective from the top-down layout and the viewpoint directive.

| Viewpoint | What the AI is asked to do |
|---|---|
| `eye-level` | Generate a ground-level perspective view of the garden layout |
| `elevated` | Generate an elevated ~45° angle perspective view |
| `isometric` | Generate an isometric / axonometric view |

---

## Integration with Existing Data

### Registry Lookups

The standalone API resolves all element types via `project.registries` included in the JSON export. Lookup chain:

```
element.plantTypeId     → registries.plants[].id     → 2D footprint size + prompt name
element.structureTypeId → registries.structures[].id → segmentation color + prompt name
element.terrainTypeId   → registries.terrain[].id    → segmentation color + prompt name
element.pathTypeId      → registries.paths[].id      → segmentation color
```

If a registry type is not found for an element: exclude that element from the render and omit from prompt. Log a warning.

### Layer Visibility

Elements on hidden layers (`project.layers[n].visible === false`) are excluded from the segmentation render and prompt element list. Locked layers are included. This matches PNG export behavior [persistence-projects.md "## PNG Export"].

### Plant Type Fields Used

| Field | Used for |
|---|---|
| `name` | Prompt construction |
| `growthForm` | Shape selection and segmentation color |
| `spacingCm` | Herb/groundcover/climber circle diameter; tree/shrub fallback diameter |
| `canopyWidthCm` | Shrub and tree canopy circle diameter |
| `trunkWidthCm` | Tree trunk circle diameter |

`iconUrl` and `heightCm` are not used by the image generation pipeline.

### Structure Type Fields Used

| Field | Used for |
|---|---|
| `name` | Prompt construction |
| `category` | Segmentation color fallback; water/fire feature detection |
| `material` | Segmentation color (pending — see [## Pending Schema Changes]) |

---

## Constraints and Edge Cases

| Condition | Handling |
|---|---|
| `project.yardBoundary` is null | Return HTTP 400: `"project has no yard boundary"` |
| No elements after filtering | Render yard boundary ground only; generate with terrain-only prompt |
| Plant type not found in registry | Exclude element; log warning |
| Structure type not found in registry | Exclude element; log warning |
| `canopyWidthCm` null on tree or shrub | Use `spacingCm` as fallback diameter |
| `trunkWidthCm` null on tree | Use 20cm fixed diameter for trunk circle |
| `structureType.material` null | Segmentation color `#888888`; no material term added to prompt |
| `pathType.material` null | Segmentation color `#888888` |
| Yard boundary has arc edges | Approximate arc with 12-segment polyline for ground polygon fill |
| `options.season` not provided and location is null | Default to `"summer"` |
| Plant `quantity > 1` | Render 1 shape; quantity is ignored for rendering |
| Segmentation map render fails | Return HTTP 500: `"segmentation render failed"` |
| Nano Banana API timeout > 60s | Return HTTP 504: `"image generation timed out"` |
| Nano Banana API returns error | Return HTTP 502 with upstream error message |

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

Adding real-world height to the garden planner is a significant change that spans the data model, rendering, and collision rules. It is tracked separately. Affected docs: `data-schema.md`, `structures.md`, `plants.md`, `spatial-math-specification.md`, `visual-design.md`.

The image generation pipeline does not currently use `heightCm` — the segmentation map is top-down and does not encode vertical information. Height may become relevant in a future pipeline revision (e.g., shadow casting, elevated view depth cues).

When the height schema is formalized, the following per-growth-form values are recommended as canonical defaults:

| Growth form | Recommended default `heightCm` |
|---|---|
| herb | 30cm |
| shrub | 120cm |
| tree | 600cm |
| groundcover | 5cm |
| climber | 200cm |

---

## Future App Integration

When this API is integrated into the garden planner app, the following UI and integration points are needed. These are not part of the standalone API spec.

- **Visualize panel**: right-side panel with segmentation map preview, prompt display, style controls, generate button, result display
- **Journal attachment**: generated images saved to journal entries [journal.md "## Entries"]
- **Keyboard shortcut**: `V` is currently assigned to the Select tool [keyboard-shortcuts.md "## Tools"]; an alternative shortcut must be chosen for the Visualize panel at integration time
- **API credentials**: stored in app user settings (not in project JSON export)

---

## Not in MVP — Deferred

- **Inpainting**: re-generate only a region of the image after editing part of the plan
- **Animation / timelapse**: sequence of images across seasons or plant growth stages
- **Style transfer**: apply a reference photo's style to the generated image
- **Multi-view generation**: generate front, side, and overhead views simultaneously
