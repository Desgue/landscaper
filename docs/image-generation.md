# Image Generation

Feature that produces photorealistic views of a garden plan by combining a 3D scene render from plan data (structural ground truth) with AI image generation (photorealistic output). This is a Feature Doc.

---

## Overview

The image generation pipeline translates a 2D plan into a photorealistic image through three stages:

1. **3D Scene Construction** — build a Three.js scene from plan element data (positions, dimensions, types)
2. **Structural Render** — render the scene to a depth map and a segmentation map
3. **AI Generation** — POST both maps + a structured text prompt to an image generation API using ControlNet conditioning

The AI produces an image that is spatially constrained by the structural maps and visually realistic via diffusion. The plan layout is preserved; the AI fills in photorealistic texture, lighting, and atmosphere.

---

## Pipeline Stages

### Stage 1: 3D Scene Construction

Build a Three.js scene by iterating over `project.elements` and `project.yardBoundary`.

**Coordinate mapping:**
- Plan coordinates are in centimeters. Map 1cm → 1 Three.js unit.
- Y-axis in plan points down (HTML Canvas). Three.js Y-axis points up. Convert: `threeZ = -planY`, `threeX = planX`. Height (vertical) maps to Three.js Y.
- Yard boundary defines the ground plane at Y = 0.

**Element-to-geometry mapping:**

| Element type | 3D representation | Height source |
|---|---|---|
| Terrain cell | 1m × 1m flat plane at Y = 0 | 0 (ground layer) |
| Plant — herb/groundcover | Flat disc at Y = 1cm | `spacingCm` as diameter |
| Plant — shrub | Hemisphere mesh | `heightCm` from plant type registry |
| Plant — tree (trunk) | Cylinder | `trunkWidthCm` as diameter, `heightCm` from registry |
| Plant — tree (canopy) | Sphere or flattened ellipsoid | `canopyWidthCm` as diameter, placed at `heightCm * 0.6` |
| Plant — climber | Vertical plane or extruded outline | `heightCm` from registry |
| Structure | Extruded footprint | Fixed height per structure category (see table below) |
| Path | Extruded polyline/arc | 2cm above ground (Y = 2) |
| Label | Not rendered | Excluded from 3D scene |
| Dimension | Not rendered | Excluded from 3D scene |

**Structure default heights (when registry does not specify):**

| Structure category | Default height |
|---|---|
| boundary (wall, fence) | 180cm |
| container (raised bed, planter) | 40cm |
| surface (patio, deck) | 5cm |
| overhead (pergola, arbor) | 240cm |
| feature (fire pit, water feature) | 50cm |
| furniture (bench, table) | 75cm |

Structure rotation from `element.rotation` (degrees) applies to the extruded mesh around Three.js Y-axis.

Curved structures and curved path segments use arc geometry. Compute arc center and radius from sagitta [spatial-math-specification.md "## 5. Arc Geometry"], then extrude along the arc path.

**Elements on hidden layers are excluded** from scene construction [layers-groups.md "## Layer Visibility"].

---

### Stage 2: Structural Render

Render the Three.js scene to two off-screen targets at the same resolution (default: 1024 × 1024px).

#### Depth Map

- Use Three.js `MeshDepthMaterial` or read the WebGL depth buffer directly.
- Normalize depth range: near plane = 0 (white), far plane = max yard diagonal (black).
- Output: grayscale PNG.
- White = closest to camera; black = furthest or sky.

#### Segmentation Map

- Assign each element a flat, unlit color based on its semantic category.
- Render with `MeshBasicMaterial` (no lighting, no shadows).
- Output: flat-color PNG with no anti-aliasing (nearest-neighbor sampling) to avoid color bleeding at boundaries.

**Segmentation color assignments:**

| Semantic category | Hex color | Applies to |
|---|---|---|
| sky / void | `#000000` | Background (outside yard boundary) |
| lawn / grass | `#00AA00` | Terrain type: grass |
| bare soil | `#8B4513` | Terrain type: soil |
| gravel / stone | `#AAAAAA` | Terrain type: gravel, concrete |
| mulch / bark | `#6B3A2A` | Terrain type: mulch, bark |
| hardscape — wood | `#C8A96E` | Terrain type: wood decking |
| path — stone | `#999999` | Path type: stone, gravel |
| path — brick | `#CC6644` | Path type: brick |
| path — wood | `#B8860B` | Path type: wood |
| tree trunk | `#5C3317` | Plant growth form: tree (trunk mesh) |
| tree canopy | `#228B22` | Plant growth form: tree (canopy mesh) |
| shrub | `#3A7A3A` | Plant growth form: shrub |
| herb / vegetable | `#66BB66` | Plant growth form: herb |
| groundcover | `#558B55` | Plant growth form: groundcover |
| climber | `#4A7A4A` | Plant growth form: climber |
| structure — wood | `#DEB887` | Structure material: wood |
| structure — metal | `#B0C4DE` | Structure material: metal |
| structure — masonry | `#D2B48C` | Structure material: masonry, stone |
| water | `#4169E1` | Terrain type: water; structure category: feature (water) |
| fire feature | `#FF6633` | Structure category: feature (fire) |

Color assignments are fixed constants — not derived from plant type registry colors. Registry colors drive the 2D canvas render [canvas-viewport.md "## Render Layer Order"]; segmentation colors are exclusively for AI conditioning.

Unknown terrain/structure/path types fall back to the closest category in the table. If no match: use `#888888` (neutral gray).

---

### Stage 3: Text Prompt Construction

Build the prompt programmatically from plan data. The prompt has three parts: **subject**, **elements**, and **style**.

```
{subject}. {elements}. {style directives}.
```

**Subject:** Describe the overall garden type and setting.

```
subject = "A {garden_style} garden, {season}, {time_of_day}"
```

- `garden_style`: user-selected enum — `cottage`, `formal`, `tropical`, `mediterranean`, `japanese`, `kitchen`, `native`, `contemporary`. Default: `garden`.
- `season`: derived from `project.location` + generation date, or user-selected — `early spring`, `late spring`, `summer`, `late summer`, `autumn`, `winter`.
- `time_of_day`: user-selected — `morning`, `midday`, `golden hour`, `overcast`. Default: `golden hour`.

**Elements:** One clause per notable element present in the plan.

```
elements = comma-joined list of:
  - Each unique plant species name from registry (plantType.commonName or plantType.botanicalName)
  - Each terrain type present (e.g., "gravel path", "lawn", "raised vegetable beds")
  - Each structure category present (e.g., "wooden pergola", "stone raised beds")
```

Cap element list at 12 items to avoid prompt dilution. Priority: plants first, then structures, then terrain.

**Style directives:** Fixed suffix appended to every prompt.

```
"photorealistic, natural lighting, high detail, garden photography"
```

**Full example:**

```
A cottage garden, late summer, golden hour. apple tree, rosa 'Gertrude Jekyll',
lavender, raised vegetable beds, gravel path, wooden pergola, lawn.
photorealistic, natural lighting, high detail, garden photography.
```

Negative prompt (always sent):

```
"illustration, flat design, cartoon, aerial view, watercolor, pencil sketch,
 text, labels, grid lines, blurry, low quality"
```

---

### Stage 4: API Request

POST to the configured image generation API endpoint.

**Request payload:**

```json
{
  "prompt": "{constructed prompt}",
  "negative_prompt": "{negative prompt}",
  "controlnet_units": [
    {
      "type": "depth",
      "image": "{base64-encoded depth map PNG}",
      "weight": 0.7,
      "guidance_start": 0.0,
      "guidance_end": 1.0
    },
    {
      "type": "seg",
      "image": "{base64-encoded segmentation map PNG}",
      "weight": 0.9,
      "guidance_start": 0.0,
      "guidance_end": 0.8
    }
  ],
  "width": 1024,
  "height": 1024,
  "steps": 30,
  "cfg_scale": 7.5,
  "seed": -1
}
```

ControlNet weights are defaults. User can adjust depth weight `[0.3, 1.0]` and segmentation weight `[0.5, 1.0]` via the generation panel (see [image-generation.md "## Generation Panel UI"]).

**Supported API backends:**

| Backend | ControlNet support | Auth |
|---|---|---|
| Replicate | Yes — SDXL + ControlNet models | API token |
| Stability AI | Yes — Stable Diffusion API v2 | API key |
| ComfyUI (local) | Yes — self-hosted | Base URL (no auth) |

API backend and credentials are stored in project-level user settings (not in project JSON export). Credentials are never included in exported project files.

If the API request fails: display error message with HTTP status and response body. Do not retry automatically.

---

## Camera / Viewpoint

The viewpoint used for the 3D render determines the perspective of the generated image. The AI is conditioned on the structural render, so the viewpoint must be consistent between the render and the prompt.

**Viewpoint options:**

| Mode | Description | Three.js camera type |
|---|---|---|
| Eye-level | Standing in or at the edge of the garden | PerspectiveCamera, FOV 60°, camera at 170cm height |
| Elevated perspective | Looking down at ~45°, standing outside the yard | PerspectiveCamera, FOV 50°, camera elevated |
| Isometric | Fixed orthographic 3/4 view | OrthographicCamera, 45° tilt, 30° rotation |

Default viewpoint: Eye-level, camera positioned at the yard boundary edge facing the garden center.

Camera position for eye-level:

```
camera.position = {
  x: yardCenter.x,
  y: 170,                        // 170cm (eye height)
  z: yardBoundary.maxZ + 300     // 3m behind the far boundary edge
}
camera.lookAt(yardCenter.x, 100, yardCenter.z)
```

User can orbit the camera within the 3D preview before triggering generation. The selected viewpoint and camera transform are sent with the generation request as metadata (not as a conditioning input).

Prompt style directive appended per viewpoint:

| Viewpoint | Appended directive |
|---|---|
| Eye-level | `"eye-level view, standing in garden"` |
| Elevated perspective | `"elevated perspective, looking down into garden"` |
| Isometric | `"isometric view, 45 degree angle"` |

---

## Generation Panel UI

Triggered from the top toolbar: **"Visualize"** button (or keyboard shortcut `V`). Opens a right-side panel without hiding the canvas inspector.

**Panel sections:**

1. **3D Preview** — interactive Three.js viewport (orbit, zoom). Shows the scene that will be used for structural rendering. "Render structural maps" button produces the depth + segmentation maps and shows them as thumbnails.

2. **Prompt** — read-only constructed prompt with an optional free-text suffix the user can append. Segmentation and depth map thumbnails shown here.

3. **Style** — controls for garden style, season, time of day, viewpoint.

4. **API** — backend selector, API key/URL input (masked), model selector.

5. **Controls** — depth weight slider `[0.3, 1.0]`, segmentation weight slider `[0.5, 1.0]`, steps `[10, 50]`, seed (empty = random).

6. **Generate** button — triggers the full pipeline. Shows spinner during API call.

7. **Result** — generated image displayed below controls. "Save to journal" button links the image to the current journal entry or creates a new one [journal.md "## Element Linking"]. "Download PNG" exports the image directly.

---

## Integration with Existing Data

### Plant Registry

`plantType.commonName` and `plantType.botanicalName` are used in prompt construction. `plantType.heightCm` and `plantType.canopyWidthCm` drive 3D geometry. No new fields required in the registry schema [data-schema.md "### Plant Type Registry"].

### Structure Registry

`structureType.category` maps to default height (see Stage 1 table). No new fields required [data-schema.md "### Structure Type Registry"].

### Layers

Hidden layers are excluded from the 3D scene and structural renders. Locked layers are included. Behavior matches the PNG export rule [persistence-projects.md "## PNG Export"].

### Journal

Generated images can be attached to journal entries as assets. The generation metadata (prompt, viewpoint, API backend, seed) is stored as a journal entry annotation — not in the project element data [journal.md "## Entries"].

---

## Constraints and Edge Cases

| Condition | Handling |
|---|---|
| No API key configured | "Generate" button disabled; tooltip: "Configure an API backend in the API panel" |
| Empty plan (no elements) | 3D scene renders yard boundary only; generation proceeds with terrain-only prompt |
| Plant type missing `heightCm` | Default to growth-form height: herb 30cm, shrub 120cm, tree 600cm, groundcover 10cm, climber 200cm |
| Structure type missing category | Treat as `feature`; default height 50cm |
| Yard boundary has arc edges | Approximate arc with 12-segment polyline for 3D extrusion |
| API timeout (> 60s) | Show timeout error; do not retry automatically |
| Generated image dimensions differ from request | Display as-is; do not upscale or crop |
| User denies camera orbit before generation | Use default camera position |

---

## Not in MVP — Deferred

- **Inpainting**: re-generate only a selected region of the image after editing part of the plan. Requires mask generation from changed elements.
- **Animation / timelapse**: generate a sequence of images across seasons or plant growth stages.
- **Style transfer**: apply a reference photo's style to the generated image.
- **Local GPU inference**: direct integration with a locally-running ComfyUI workflow via WebSocket API (beyond the base URL option).
- **Multi-view generation**: generate front, side, and overhead views simultaneously.
- **3D asset library**: replace procedural geometry with curated GLTF models per plant species.
