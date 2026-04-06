# Prompt Construction

Covers Stage 3 of the image generation pipeline: building the structured text prompt from plan registry data and generation options.

## Prompt Structure

Three-part format:

```
{subject}. {elements}. {style}.
```

All three parts are joined with `". "` as the separator. If no elements remain after filtering, the elements part is omitted and the prompt is assembled as `{subject}. {style}.`

Full example:

```
A cottage garden, late summer, golden hour. Cherry Tomato, Lavender, Rose Bush,
Wooden Pergola, Raised Bed, Grass, Gravel.
photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan.
```

## Subject Construction

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

Collect unique names only — if multiple elements share the same type ID, that name appears once.

If a type ID does not resolve in the registry, exclude that element from the element list (registry miss is already logged during Stage 1).

### Cap Rules

| Category | Max items |
|---|---|
| Plants | 7 |
| Structures | 3 |
| Terrain | 2 |
| **Total** | **12** |

Priority order: plants first, then structures, then terrain. Trim each category to its cap before joining.

### Joining

Concatenate all collected names as a comma-separated list. The list forms the elements part of the prompt.

If no names remain after filtering and cap rules: omit the elements part entirely and generate using subject + style only.

## Style Suffix

Fixed string per `options.viewpoint`:

| Viewpoint | Style suffix |
|---|---|
| `eye-level` | `"photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan"` |
| `elevated` | `"photorealistic, elevated perspective view, garden photography, natural lighting, high detail, not a floor plan"` |
| `isometric` | `"photorealistic, isometric view, garden photography, natural lighting, high detail, not a floor plan"` |

The `"not a floor plan"` directive is present in all three variants. It reduces the risk of the model treating the segmentation map (a top-down color diagram) as the target output style rather than as a spatial reference input.

Note: viewpoint does not affect the segmentation map render — the map is always top-down. The viewpoint directive is prompt-only; the model infers the requested perspective from the layout combined with the style suffix.

## Yard Photo Preamble

When `yard_photo` is present in the request, prepend a fixed context sentence to the prompt before the subject block. This tells Gemini the role of each reference image so it does not conflate the segmentation map with the target output style.

```
"The first image is a top-down segmentation plan of the garden layout. The second image is the real yard. Generate a photorealistic view showing the planned garden in the real yard's perspective and lighting."
```

This preamble is inserted once, at the very start of the prompt, regardless of viewpoint or style options. The rest of the prompt (subject, elements, style suffix) is assembled identically to the non-photo path.

When `yard_photo` is absent, this preamble is omitted entirely — do not include a partial or modified version.

## Full Prompt Assembly

```
subject + ". " + elements + ". " + style + "."
```

When elements are present:

```
A cottage garden, late summer, golden hour. Cherry Tomato, Lavender, Rose Bush,
Wooden Pergola, Raised Bed, Grass, Gravel.
photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan.
```

When no elements remain after filtering:

```
A garden, summer, golden hour. photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan.
```

When `yard_photo` is present, the full prompt with elements is:

```
The first image is a top-down segmentation plan of the garden layout. The second image is
the real yard. Generate a photorealistic view showing the planned garden in the real yard's
perspective and lighting. A cottage garden, late summer, golden hour. Cherry Tomato,
Lavender, Rose Bush, Wooden Pergola, Raised Bed, Grass, Gravel. photorealistic, eye-level
view, garden photography, natural lighting, high detail, not a floor plan.
```

The assembled prompt string is passed directly to the Gemini API call. See [gemini-client.md "## Request Construction"] for how the prompt is combined with the segmentation map and optional yard photo when sent to Nano Banana.
