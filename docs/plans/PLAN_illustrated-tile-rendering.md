# Garden Planner — Illustrated Tile Rendering

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-ITR` |
| **Title** | Illustrated Plant & Structure Tile Rendering |
| **Scope** | Upgrade procedural plant sprites and structure rendering from basic geometry/flat fills to illustrated/stylized vector-art with per-type differentiation, texture patterns, and improved shading. Excludes external asset loading, terrain changes, and path rendering. |
| **Status** | `in-progress` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1 · Phase 2 · Phase 3 |

---

## Context Map

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/frontend/data-schema.md` | PlantType, StructureType, element shapes, registry formats | `grep -n "PlantType\|StructureType\|growthForm\|category" docs/frontend/data-schema.md` |
| `docs/frontend/plants.md` | Plant placement, visual sizing, status lifecycle | Full read recommended |
| `docs/frontend/structures.md` | Structure categories, arc tool, extrusion rules | Full read recommended |
| `docs/frontend/canvas-viewport.md` | Render layer order, coordinate system, zoom rules | Full read recommended |

### Key Source Files

| File | What it owns |
|------|-------------|
| `src/canvas-pixi/textures/PlantSprites.ts` | Procedural plant sprite generation (Canvas2D) |
| `src/canvas-pixi/textures/StructureSprites.ts` | Procedural structure sprite generation (Canvas2D) |
| `src/canvas-pixi/textures/TextureAtlas.ts` | Texture caching, type→category resolution, LRU eviction |
| `src/canvas-pixi/textures/ProceduralTextures.ts` | Terrain noise patterns (reference for reusable techniques) |
| `src/canvas-pixi/textures/constants.ts` | TILE_SIZE, EXTRUSION_SCALE, FALLBACK_COLOR |
| `src/canvas-pixi/PlantRenderer.ts` | Plant shadow/sprite/status rendering, viewport culling |
| `src/canvas-pixi/StructureRenderer.ts` | Structure Graphics rendering, extrusion, AO, labels |
| `src/canvas-pixi/BaseRenderer.ts` | Y-sort keys, layer visibility, clearGraphics helper |

---

## Phases

### Phase 1 — Foundation & Plant Sprites [ ]

> Extract shared drawing utilities and upgrade plant sprites from basic shapes to illustrated per-type renderings. This phase has no downstream dependencies and delivers the most visible improvement.

#### Feature: Shared Drawing Utilities [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/DrawingUtils.ts` (new)

##### Tasks

- [ ] Create `DrawingUtils.ts` with extracted color helpers consolidated from PlantSprites.ts, StructureSprites.ts, **and ProceduralTextures.ts**: `hexToRgb` (all three files), `rgbToHex` (StructureSprites + ProceduralTextures only), `lighten` (PlantSprites only), `hslToRgb`/`rgbToHsl` (ProceduralTextures only)
- [ ] Extract `darken` as two distinct functions: `darkenByOffset(hex, amount)` (from PlantSprites — subtracts flat RGB offset) and `darkenByFactor(hex, factor)` (from StructureSprites — multiplies channels by 0-1 factor). **Note:** these have incompatible semantics and must not be unified.
- [ ] Add `hashString(s: string): number` — djb2 hash for deterministic per-type variation seeding
- [ ] Add `seededRandom(seed: number): () => number` — simple PRNG that returns a function producing deterministic floats 0-1
- [ ] Add `drawRimHighlight(ctx, cx, cy, radius, angle?)` — subtle white arc highlight for directional light effect
- [ ] Add `shiftHue(hex: string, degrees: number): string` — shift a hex color's HSL hue by a given amount
- [ ] Update PlantSprites.ts, StructureSprites.ts, and ProceduralTextures.ts to import from DrawingUtils instead of local copies

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | `darken` split into `darkenByOffset` + `darkenByFactor` | PlantSprites uses offset subtraction, StructureSprites uses factor multiplication — incompatible semantics |
| 2026-04-07 | Removed `drawSoftShadow` (8-ring) from DrawingUtils scope | PlantSprites already uses Canvas2D `createRadialGradient` which is smoother and faster than concentric rings; 8-ring only useful for PixiJS Graphics contexts |
| 2026-04-07 | Consolidation includes ProceduralTextures.ts | Has duplicate `hexToRgb`, `rgbToHex`, `hslToRgb`, `rgbToHsl` |

---

#### Feature: Illustrated Plant Sprites [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/PlantSprites.ts`

##### Tasks

- [ ] Change signature to `generatePlantSprite(category, sizePx, typeId?, plantType?)` — optional params for per-type variation, backward compatible
- [ ] Implement per-type variation via `hashString(typeId)`: hue shift ±15°, detail count variation, shape proportion variation
- [ ] Rewrite `drawTree` — 3-7 overlapping leaf-cluster blobs (count from hash), radial dome gradient (dark edge → light center), rim highlight arc on upper-left
- [ ] Rewrite `drawShrub` — 3-5 overlapping ellipses at hash-seeded positions, highlight crescents per lobe, silhouette varies round↔oblong based on hash
- [ ] Rewrite `drawFlower` — 5-8 petals (count from hash), petal vein strokes (darker line down center), varied center dot color (yellow/orange/brown from hash)
- [ ] Replace `drawSquare` with `drawVegetable` — rounded leaf rosette: 4-6 radiating leaf shapes over soil-circle base, per-leaf shade variation
- [ ] Replace `drawTriangle` with `drawHerb` — cluster of 3-5 elongated leaves from central stem, each with center-vein stroke, leaf angle spread varies per type
- [ ] Replace `drawCircle` with `drawFruit` — small tree-like canopy with 2-4 colored fruit dots, fruit dot color derived from type hash
- [ ] Keep `drawDropShadow` as-is — it already uses Canvas2D `createRadialGradient` which produces a smooth, hardware-accelerated shadow. **Do not** replace with concentric rings (that would be a quality downgrade).
- [ ] Remove `PlantRenderer.drawShadow()` (lines 123-136) — it draws a redundant 3-ring Graphics shadow that stacks on top of the shadow already baked into the sprite texture. This eliminates per-element Graphics objects and fixes the double-shadow visual bug.
- [ ] Add radial gradient overlay on all canopy shapes (darker edges, lighter center) for dome lighting effect

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Keep Canvas2D radial gradient shadow in PlantSprites, remove Graphics shadow from PlantRenderer | Avoids double-shadow stacking; the texture shadow is smoother and eliminates per-element Graphics overhead |

---

#### Feature: TextureAtlas Plant Integration [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/TextureAtlas.ts`

##### Tasks

- [ ] Add `resolvePlantTypeObject(plantTypeId): PlantType | undefined` helper (mirrors existing `resolvePlantCategory` pattern)
- [ ] Update `getPlantSprite` to resolve full PlantType and pass `(category, size, typeId, plantType)` to `generatePlantSprite`
- [ ] Verify LRU cache still works correctly (keys are already per-typeId, no change needed)

##### Decisions

_None yet._

---

### Phase 2 — Structure Textures & Shading [ ]

> Add texture patterns to structure sprites and improve the 2.5D shading. Depends on DrawingUtils from Phase 1.

#### Feature: Structure Texture Patterns [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/StructureSprites.ts`

##### Tasks

- [ ] Change signature to `generateStructureSprite(color, widthPx, heightPx, category?, typeId?, material?)` — backward compatible; material enables texture dispatch within a category
- [ ] Add `MAX_STRUCTURE_TEX_DIM = 256` constant to `constants.ts` — cap texture generation size to prevent GPU memory blowout on large elements; PixiJS Sprite scales up from capped texture
- [ ] Implement `drawBoundaryTexture(ctx, w, h, color, rng, material?)` — branch on material: masonry → brick-row pattern with mortar gaps and half-brick offset; wood → plank fence pattern; metal → smooth with rivet dots; stone → irregular stone pattern; default → brick
- [ ] Implement `drawContainerTexture(ctx, w, h, color, rng, material?)` — wood plank grain on sides (sinusoidal noise lines), soil-noise fill on top face; masonry variant for stone planters
- [ ] Implement `drawSurfaceTexture(ctx, w, h, color, rng)` — stone tile grid with thin mortar lines and per-tile hue variation
- [ ] Implement `drawOverheadTexture(ctx, w, h, color, rng)` — crosshatch lattice lines over semi-transparent fill
- [ ] Implement `drawFeatureTexture(ctx, w, h, color, rng)` — concentric ripple rings for water features, warm radial gradient for fire pits
- [ ] Implement `drawFurnitureTexture(ctx, w, h, color, rng, material?)` — wood → horizontal grain with knot patterns; metal → brushed steel lines
- [ ] Add south-face vertical gradient (light top → dark bottom) instead of flat `darkenByFactor`
- [ ] Add 1px highlight line along top edge of top face (bevel/edge catch)

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Cap texture generation at `MAX_STRUCTURE_TEX_DIM = 256` px per axis | Prevents GPU memory explosion from large elements (e.g. 400px raised bed = 640KB per texture). PixiJS scales up gracefully; pattern quality is acceptable at 2x. |
| 2026-04-07 | Use `material` field from StructureType to sub-dispatch texture within each category | A brick wall and a wood fence are both `boundary` but should look very different. The schema already carries this data. |

---

#### Feature: TextureAtlas Structure Integration [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/textures/TextureAtlas.ts`

##### Tasks

- [ ] Add `resolveStructureType(structureTypeId): StructureType | undefined` helper
- [ ] Add `CATEGORY_HEX_COLORS` map converting numeric `CATEGORY_COLORS` (from StructureRenderer) to hex strings for Canvas2D `fillStyle`
- [ ] Update `getStructureSprite` to accept element dimensions, resolve StructureType (for category + material), clamp dims to `MAX_STRUCTURE_TEX_DIM`, and pass `(color, w, h, category, typeId, material)` to generator
- [ ] Change structure cache key from `structureTypeId` to `${structureTypeId}:${wBucket}x${hBucket}` where wBucket/hBucket are quantized to nearest power-of-2 (e.g. 32, 64, 128, 256). This prevents cache thrashing on drag-resize while still generating dimension-appropriate textures for brick/grain patterns.
- [ ] Fix cache eviction naming: rename `evictOldest` comments/docs from "LRU" to "FIFO" to reflect actual behavior (evicts by insertion order, does not re-order on access). Optionally upgrade to true LRU by re-inserting on cache hit.

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Structure cache key includes power-of-2 bucketed dimensions | Same typeId at different sizes produces different textures (brick scale); exact-pixel keys would thrash on resize; power-of-2 bucketing limits cache entries to ~4 per typeId |
| 2026-04-07 | Acknowledge FIFO eviction (not true LRU) | Pre-existing; low risk with ≤256 entries and ~30-80 realistic types; document accurately |

---

### Phase 3 — Renderer Integration & Polish [ ]

> Wire the improved textured sprites into the StructureRenderer and verify the complete visual pipeline.

#### Feature: StructureRenderer Sprite Top Face [ ]

**Status:** `todo`
**File:** `src/canvas-pixi/StructureRenderer.ts`

##### Tasks

- [ ] Change `topFace` type to `Graphics | Sprite` in `StructureEntry` interface, with a discriminant or type guard
- [ ] In `createStructureEntry`: branch on `el.shape` — **rectangular** structures get a `Sprite` top-face from `atlas.getStructureSprite(el.structureTypeId, w, h)`; **curved** structures (those with `arcSagitta`) retain `Graphics` top-face (a Sprite is a rectangular quad and cannot represent arc polygons natively)
- [ ] Remove `void atlas` placeholder (line 117) — atlas is now actively used
- [ ] Keep southFace, aoGradient, castShadow, outline, **overheadShadow** as Graphics (need dynamic sizing per element)
- [ ] Update `updateStructureEntry` to handle the mixed `topFace` type: Sprite path updates texture/dimensions; Graphics path continues using `drawTopFace` calls
- [ ] Improve AO gradient from 5 → 6 strips for smoother falloff
- [ ] Add 1px highlight stroke along top edge of top-face Sprite position (rectangular structures only)

##### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Curved structures keep Graphics topFace; only rectangular structures use Sprite | A PixiJS Sprite is a rectangular textured quad — it cannot represent arc-based polygons. Keeping Graphics for curved structures avoids mask complexity while still gaining perf for the common rectangular case. |

---

#### Feature: Visual Verification & Polish [ ]

**Status:** `todo`

##### Tasks

- [ ] Verify plant sprites render correctly for all 6 categories with per-type variation (place multiple types per category)
- [ ] Verify structure textures render for all 6 categories (boundary, container, surface, overhead, feature, furniture)
- [ ] Verify zoom in/out — sprites stay crisp, no blurring or pop-in artifacts
- [ ] Verify Y-sort ordering still works correctly between plants and extruded structures
- [ ] Verify layer visibility and locked-opacity still applied correctly
- [ ] Run `npm run lint && npm run typecheck` — zero regressions
- [ ] Performance check: place 100+ mixed elements, confirm smooth pan/zoom

##### Decisions

_None yet._

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | All rendering stays procedural Canvas2D — no external image assets | Keeps the app self-contained, avoids asset loading/CDN complexity, and the FIFO texture cache architecture already works well |
| 2026-04-07 | Per-type differentiation via djb2 hash of typeId seeding a PRNG | Deterministic (same type always looks the same), no user-facing config needed, trivial to implement |
| 2026-04-07 | Structure top-face switches from Graphics to Sprite **(rectangular only)** | Graphics redraws on every update; Sprite with cached texture is more performant. Curved/arc structures retain Graphics since Sprites are rectangular quads. |
| 2026-04-07 | Keep Canvas2D radial gradient shadow; remove PlantRenderer Graphics shadow | PlantSprites already has a smooth `createRadialGradient` shadow. PlantRenderer's 3-ring Graphics shadow is redundant and stacks visually. Removing it also eliminates per-element Graphics objects. |
| 2026-04-07 | `darken` split into `darkenByOffset` + `darkenByFactor` | PlantSprites subtracts flat RGB offset; StructureSprites multiplies by 0-1 factor. Incompatible semantics; naive unification would silently break rendering in one file. |
| 2026-04-07 | Structure cache key includes power-of-2 bucketed dimensions | Same typeId at different sizes needs different textures (brick patterns stretch). Exact-pixel keys would thrash on resize; bucketing to powers of 2 limits entries to ~4 per typeId. |
| 2026-04-07 | Use `material` field from StructureType schema to sub-dispatch texture | A brick wall and wood fence are both `boundary` category but need distinct textures. The schema already carries `material` (wood/metal/masonry/stone/other). |
| 2026-04-07 | Cap structure texture generation at `MAX_STRUCTURE_TEX_DIM = 256` px | A 400px raised bed texture is 640KB GPU memory. Capping at 256px and letting PixiJS scale keeps quality acceptable while preventing memory blowout. |

---

## Agent Log

```
2026-04-07 — plan-init — Plan initialized. Analyzed PlantSprites.ts, StructureSprites.ts, PlantRenderer.ts, StructureRenderer.ts, TextureAtlas.ts, BaseRenderer.ts. Identified 4 improvement axes: richer sprites, texture patterns, per-type differentiation, better shading.
2026-04-07 — team-review — 3-agent review (architect, code-sync, performance). Found 8 issues: double shadow stacking (high), curved Sprite mismatch (high), structure cache key ignores dimensions (high), darken() incompatibility (med), color helper scope incomplete (med), material field unused (med), cache is FIFO not LRU (low), overheadShadow omitted (low). All resolved in plan refinement pass.
```
