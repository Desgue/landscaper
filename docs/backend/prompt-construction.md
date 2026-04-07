# Prompt Construction

Covers Stage 3 of the image generation pipeline: building structured prompt parts from plan registry data and generation options.

## Architecture: Interleaved Multi-Part Prompts

Instead of a single text string, the prompt builder produces a `PromptParts` struct whose text blocks are interleaved with image blobs by the Gemini client so each instruction is adjacent to the image it describes.

The number of parts scales with the yard photo count:

```
0 photos (3 parts):   [segmap_instruction] [segmap_blob] [scene_prompt]

1 photo  (5 parts):   [segmap_instruction] [segmap_blob]
                      [photo_instruction] [photo_blob]
                      [scene_prompt]

N photos (3+2N parts): [segmap_instruction] [segmap_blob]
                       [photo_1_instruction] [photo_1_blob]
                       ...
                       [photo_N_instruction] [photo_N_blob]
                       [scene_prompt]
```

This ordering ensures the model reads each image's role explanation immediately before seeing that image, improving spatial compliance and preventing segmentation map artifacts from bleeding into the output.

## Segmap Instruction

Fixed text placed immediately before the segmentation map blob. Explains the map's role, provides a color legend, and includes explicit prohibitions against reproducing map artifacts.

```
This image is a top-down color-coded layout map of a garden. Each colored shape
represents an element: pink/magenta shapes are plants, red/orange shapes are
structures, neon green shapes are paths, cyan is lawn, gold is soil/mulch. These
colors are intentionally artificial — they exist ONLY to mark positions. Use this
map ONLY to understand where each element is positioned and its approximate size.
NO neon colors in the output. NO pink circles. NO geometric shapes from this map.
NO flat diagram overlays. The output must be a photorealistic photograph, not a
diagram.
```

The color legend maps to the segmentation color table in [segmentation-render.md "## Segmentation Color Table"]. Colors use a non-natural, high-contrast palette (neons, magentas, cyans) so the model never confuses diagram shapes with photorealistic content.

## Yard Photo Instruction

Text placed immediately before each yard photo blob. Only included when one or more yard photos are present in the request. Omitted entirely when no photos are provided.

The instruction text varies by photo count.

**Single photo (`photoCount == 1`)** — fixed text, identical to the original single-photo behaviour:

```
This image is a real photograph of the yard. Match the perspective, camera angle,
lighting, ground textures, fences, walls, and surroundings from this photo. Place
the garden elements from the layout map into this real scene.
```

**Multiple photos (`photoCount > 1`)** — each photo receives its own numbered instruction. For photo N of M:

```
This is yard photo N of M. Use all yard photos together to understand the yard's
perspective, lighting, and surroundings from different angles.
```

For example, in a three-photo request the instructions are "This is yard photo 1 of 3 …", "This is yard photo 2 of 3 …", and "This is yard photo 3 of 3 …".

## Scene Prompt (SCHEMA Order)

The main scene description follows the SCHEMA framework ordering for optimal Gemini compliance:

1. **Style + Composition** — photography type, camera/lens, viewpoint
2. **Subject** — garden style, season, time of day
3. **Mandatory elements** — element names linked to map positions
4. **Constraint** — only include elements from the map
5. **Prohibitions** — explicit NO statements

### Style + Composition

Template:

```
"High-end residential landscape photography, {viewpoint_phrase}, natural lighting, rich textures, sharp detail."
```

Viewpoint phrases include camera/lens hints per viewpoint:

| Viewpoint | Phrase |
|---|---|
| `eye-level` | `"eye-level perspective, 24mm wide-angle lens, ground-level viewpoint, horizon at mid-frame"` |
| `elevated` | `"elevated three-quarter view looking down at an angle, 35mm lens, slightly above fence height"` |
| `isometric` | `"isometric perspective, tilt-shift lens effect, uniform scale across the scene"` |

### Subject Construction

Template:

```
"A {garden_style} garden, {season}, {time_of_day}"
```

Values come directly from `options.garden_style`, `options.season`, and `options.time_of_day` after defaults are applied. See [api-contract.md "## Options and Defaults"] for allowed values and defaults.

## Season Derivation

When `options.season` is provided, use it as-is — skip derivation entirely.

When `options.season` is omitted, derive from `project.location.lat` and the server's current date.

### Hemisphere Detection

```
project.location == null          → default "summer" (skip derivation)
project.location.lat >= 0         → northern hemisphere
project.location.lat < 0          → southern hemisphere
project.location present, lat == null → default "summer"
```

### Northern Hemisphere Date → Season

| Date range | Season |
|---|---|
| Mar 1 – Apr 14 | `"early spring"` |
| Apr 15 – May 31 | `"late spring"` |
| Jun 1 – Aug 31 | `"summer"` |
| Sep 1 – Oct 14 | `"late summer"` |
| Oct 15 – Nov 30 | `"autumn"` |
| Dec 1 – Feb 28/29 | `"winter"` |

### Southern Hemisphere Date → Season

Offset by 6 months relative to the northern table.

| Date range | Season |
|---|---|
| Sep 1 – Oct 14 | `"early spring"` |
| Oct 15 – Nov 30 | `"late spring"` |
| Dec 1 – Feb 28/29 | `"summer"` |
| Mar 1 – Apr 14 | `"late summer"` |
| Apr 15 – May 31 | `"autumn"` |
| Jun 1 – Aug 31 | `"winter"` |

### Fallback

If none of the above produces a value: default `"summer"`.

## Element Collection

Source: elements that passed Stage 1 filtering. See [segmentation-render.md "## Stage 1: Element Filtering"] for which elements are included.

### Registry Lookup

Resolve names from `project.registries` using the type ID on each element:

- Plant name: `element.plantTypeId` → `registries.plants[]` where `id` matches → `plantType.name`. See [data-schema.md "### Plant Type"].
- Structure name: `element.structureTypeId` → `registries.structures[]` where `id` matches → `structureType.name`. See [data-schema.md "### Structure Type"].
- Terrain name: `element.terrainTypeId` → `registries.terrain[]` where `id` matches → `terrainType.name`. See [data-schema.md "### Terrain Type"].

Paths are rendered in the segmentation map (Stage 1/2) but are intentionally excluded from prompt element collection. Path types do have a `name` field, but listing path names (e.g., "Brick Edging") adds no useful scene information for the AI model — their material and color are already fully encoded in the segmentation map.

Collect unique names only — if multiple elements share the same type ID, that name appears once.

### Botanical Name Enrichment

Plant names are enriched with botanical (Latin) names when the plant type ID matches a known built-in. A static lookup map of 23 common plants maps registry IDs to species names. When a match exists, the name is formatted as `"Botanical Name (Common Name)"` — e.g., `"Lavandula angustifolia (Lavender)"`. Unknown plant IDs use the common name only.

This improves species-level accuracy in Gemini's output (e.g., rendering the correct leaf shape for *Acer palmatum* vs a generic maple).

| Registry ID | Botanical Name |
|---|---|
| `tomato` | Solanum lycopersicum |
| `cherry-tomato` | Solanum lycopersicum var. cerasiforme |
| `onion` | Allium cepa |
| `eggplant` | Solanum melongena |
| `pepper` | Capsicum annuum |
| `lettuce` | Lactuca sativa |
| `carrot` | Daucus carota |
| `basil` | Ocimum basilicum |
| `rosemary` | Salvia rosmarinus |
| `mint` | Mentha spicata |
| `thyme` | Thymus vulgaris |
| `oak` | Quercus robur |
| `maple` | Acer saccharum |
| `birch` | Betula pendula |
| `fruit-tree` | Malus domestica |
| `ornamental-pear` | Pyrus calleryana |
| `japanese-maple` | Acer palmatum |
| `boxwood` | Buxus sempervirens |
| `lavender` | Lavandula angustifolia |
| `hydrangea` | Hydrangea macrophylla |
| `rose-bush` | Rosa floribunda |
| `holly` | Ilex aquifolium |
| `privet` | Ligustrum vulgare |

If a type ID does not resolve in the registry, exclude that element from the element list (registry miss is already logged during Stage 1).

### Cap Rules

| Category | Max items |
|---|---|
| Plants | 7 |
| Structures | 3 |
| Terrain | 2 |

Priority order: plants first, then structures, then terrain. Trim each category to its cap before joining.

### Joining with Map Position Linking

When elements are present, they are prefixed with a directive linking them to the segmentation map:

```
"Place these elements at the positions shown by their corresponding colored shapes in the layout map: Rose Bush, Wooden Pergola, Grass."
```

If no names remain after filtering and cap rules: omit the element section entirely.

## Constraint

Fixed string always present in the scene prompt:

```
"Only include elements shown in the layout map. NO extra structures, furniture, or decorations not in the plan."
```

## Prohibitions

Prohibition block at the end of the scene prompt. The "NO bird's-eye view" clause is conditional on viewpoint — it is included for `eye-level` and `elevated` but omitted for `isometric` (which is a top-down variant where bird's-eye prohibition would conflict):

For `eye-level` / `elevated`:
```
"NO bird's-eye view. NO floor plan. NO top-down diagram. NO colored circles or geometric overlays. NO cartoon or illustrated style. NO watermarks. NO text overlays. NO close-up of a single plant."
```

For `isometric`:
```
"NO floor plan. NO top-down diagram. NO colored circles or geometric overlays. NO cartoon or illustrated style. NO watermarks. NO text overlays. NO close-up of a single plant."
```

These use declarative "NO" statements rather than "don't" phrasing, following the SCHEMA framework finding that prohibitions outperform positive constraints (94% vs 91% compliance).

## Full Prompt Assembly

The `Build` function accepts a `photoCount int` parameter (replacing the former `hasYardPhoto bool`) and returns a `PromptParts` struct. The Gemini client interleaves these text parts with image blobs.

When `photoCount == 0` (3 parts total):

```
[segmap_instruction_text] [segmap_png] [scene_prompt_text]
```

When `photoCount == 1` (5 parts total):

```
[segmap_instruction_text] [segmap_png] [yard_photo_instruction_text] [yard_photo_blob] [scene_prompt_text]
```

When `photoCount == N` where N > 1 (3 + 2N parts total):

```
[segmap_instruction_text] [segmap_png]
[photo_1_instruction_text] [photo_1_blob]
...
[photo_N_instruction_text] [photo_N_blob]
[scene_prompt_text]
```

### Example scene prompt with elements:

```
High-end residential landscape photography, eye-level perspective, 24mm wide-angle
lens, ground-level viewpoint, horizon at mid-frame, natural lighting, rich textures,
sharp detail. A cottage garden, late summer, golden hour. Place these elements at
the positions shown by their corresponding colored shapes in the layout map: Solanum
lycopersicum var. cerasiforme (Cherry Tomato), Lavandula angustifolia (Lavender),
Rosa floribunda (Rose Bush), Wooden Pergola, Raised Bed, Grass, Gravel. Only include
elements shown in the layout map. NO extra structures, furniture, or decorations not
in the plan. NO bird's-eye view. NO floor plan. NO top-down diagram. NO colored
circles or geometric overlays. NO cartoon or illustrated style. NO watermarks. NO
text overlays. NO close-up of a single plant.
```

### Example scene prompt without elements:

```
High-end residential landscape photography, eye-level perspective, 24mm wide-angle
lens, ground-level viewpoint, horizon at mid-frame, natural lighting, rich textures,
sharp detail. A garden, summer, golden hour. Only include elements shown in the
layout map. NO extra structures, furniture, or decorations not in the plan. NO floor
plan. NO top-down diagram. NO bird's-eye view. NO colored circles or geometric
overlays. NO cartoon or illustrated style. NO watermarks. NO text overlays. NO
close-up of a single plant.
```

The assembled `PromptParts` are passed to the Gemini client. See [gemini-client.md "## Request Construction"] for how the parts are interleaved with images.
