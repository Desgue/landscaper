# Garden Planner — PLAN-H: Image-Based Sprite Loading

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific doc sections into context. Do not read whole spec files unless the task explicitly requires it.
- **Check phase status first.** Scan `## Phases` top-to-bottom and find the first phase that is not `done`. Work within that phase only.
- **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating the Plan

- **After completing a task:** change its status line from `[ ]` to `[x]` and append `— done YYYY-MM-DD` to the task line.
- **After completing a feature:** change `Status:` from `todo` / `in-progress` to `done`.
- **After completing a phase:** change the phase header badge from `[ ]` to `[x]`.
- **When you make an architectural decision:** add an entry to `## Decision Log` in the format shown.
- **When you hit a blocker:** add a `Blocker:` note to the task and set its status checkbox to `[-]` (blocked). Notify via the log.
- **Never rewrite history.** Append to the Agent Log; do not edit previous entries.
- **Keep diffs small.** Only edit the lines that changed. Do not reformat or reorder unrelated sections.

### Status Vocabulary

| Symbol | Meaning |
|--------|---------|
| `[ ]`  | Not started |
| `[~]`  | In progress |
| `[x]`  | Done |
| `[-]`  | Blocked |

---

## Plan Header

| Field | Value |
|-------|-------|
| **Plan ID** | `PLAN-H` |
| **Title** | Image-Based Sprite Loading |
| **Scope** | Replace procedural Canvas2D sprite generators with an async image-asset pipeline that loads PNG/SVG sprites from disk or URL into PixiJS textures. Covers: asset loader service, TextureAtlas integration, fallback-to-procedural, PlantRenderer/StructureRenderer sprite swap, and an initial set of built-in sprite assets. Excludes: terrain textures (keep procedural Simplex noise), new element types, data schema changes (iconUrl/textureUrl fields already exist), UI for uploading custom sprites. |
| **Status** | `todo` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1: Asset Loader Infrastructure · Phase 2: TextureAtlas Integration · Phase 3: Renderer Migration · Phase 4: Built-in Sprite Assets |

### Dependencies

| Dependency | Why |
|------------|-----|
| PLAN-G (done) | PixiJS rendering engine, TextureAtlas, PlantRenderer, StructureRenderer must exist |
| `PlantType.iconUrl` field | Already in schema (`src/types/schema.ts:203`). Currently `''` in builtin registries. Will be populated with asset paths |
| `StructureType.iconUrl` field | Already in schema (`src/types/schema.ts:226`). Currently `''` in builtin registries. Will be populated with asset paths |
| `TerrainType.textureUrl` field | Already in schema (`src/types/schema.ts:189`). Currently `null`. Out of scope for this plan but the loader will support it for future use |

### Execution Rules

PLAN-H starts after PLAN-G is `done`. It can run in parallel with Plans C, D, E, and F since it only modifies rendering internals (textures, renderers) and does not change data models, selection, or UI. No other plan depends on PLAN-H outputs.

---

## Context Map

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `src/canvas-pixi/textures/TextureAtlas.ts` | Central texture cache, LRU eviction, procedural fallback | Full read required |
| `src/canvas-pixi/textures/PlantSprites.ts` | Procedural plant sprite generator (kept as fallback) | Full read — understand what it generates so the image replacements match |
| `src/canvas-pixi/textures/StructureSprites.ts` | Procedural structure sprite generator (kept as fallback) | Full read |
| `src/canvas-pixi/textures/constants.ts` | TILE_SIZE, MAX_ATLAS_SIZE, FALLBACK_COLOR | Full read (short file) |
| `src/canvas-pixi/PlantRenderer.ts` | Plant sprite consumption: `atlas.getPlantSprite(plantTypeId)` | `grep -n "atlas\.\|texture\|sprite" src/canvas-pixi/PlantRenderer.ts` |
| `src/canvas-pixi/StructureRenderer.ts` | Structure sprite consumption — currently uses Graphics, not Sprite | `grep -n "atlas\.\|texture\|sprite\|Graphics\|StructureEntry" src/canvas-pixi/StructureRenderer.ts` |
| `src/canvas-pixi/RenderScheduler.ts` | Render-on-demand loop, `markDirty()`, pre-render callbacks | `grep -n "markDirty\|onRender\|dirty\|preRender" src/canvas-pixi/RenderScheduler.ts` |
| `src/canvas-pixi/CanvasHost.tsx` | Where `createTextureAtlas()` is called (line ~383) and passed to renderers | `grep -n "textureAtlas\|createTextureAtlas\|atlas\|scheduler" src/canvas-pixi/CanvasHost.tsx` |
| `src/canvas-pixi/DisposalManager.ts` | GPU resource cleanup — `registerTexture()` method; instance lives in CanvasHost as `disposalRef.current` | `grep -n "register\|destroy\|texture" src/canvas-pixi/DisposalManager.ts` |
| `src/types/schema.ts` | `PlantType.iconUrl`, `StructureType.iconUrl`, `TerrainType.textureUrl` | Lines 199-231 |
| `src/data/builtinRegistries.ts` | Builtin registry entries — 23 plants, 12 structures, all with empty `iconUrl: ''` | Full read |

---

## Architecture Overview

### URL Resolution Convention

The `iconUrl` / `textureUrl` fields support three formats:

| Format | Example | Resolution |
|--------|---------|------------|
| Empty string `''` | `iconUrl: ''` | Use procedural generator (current behavior, permanent fallback) |
| `builtin:` prefix | `iconUrl: 'builtin:tomato'` | Resolve to `/sprites/plants/tomato.png` under `public/` |
| Absolute URL or path | `iconUrl: '/sprites/custom/my-tree.png'` | Load directly via PixiJS Assets |

**Edge cases:** `builtin:` with no slug → returns `null` (procedural fallback). Unknown prefix like `cdn:foo` → treated as absolute URL, loaded directly. Prefix matching is case-sensitive (`BUILTIN:` is treated as an absolute URL, not a builtin).

### Loading Strategy

```
Renderer requests sprite for plantTypeId
  → TextureAtlas.getPlantSprite(plantTypeId)
    → Check pinned image cache (hit? return immediately)
    → Check LRU procedural cache (hit? return immediately)
    → Resolve iconUrl from registry
    → If iconUrl is empty → generate procedural, store in LRU cache, return
    → If iconUrl is set → check AssetLoader status
      → 'loaded'? Create Texture, store in pinned cache, return
      → 'loading'? Return procedural fallback (temporary)
      → 'idle'? Return procedural fallback, schedule async load
      → 'error'? Return procedural fallback (permanent)
    → On async load complete:
      1. Store image texture in pinned cache (NOT in LRU)
      2. Fire texturesUpdated callback → renderers call rebuildFromStore()
      3. Debounced: coalesce multiple completions within 50ms into single rebuild
```

### Binding Invariants

1. **Zero blocking.** Canvas always renders immediately with procedural sprites, then upgrades to image sprites as they stream in.
2. **New Texture objects only.** When an image load completes, the atlas inserts a **new** `Texture` object into the pinned cache. It never mutates an existing Texture. This ensures renderers detect the swap via reference equality (`entry.sprite.texture !== newTexture`).
3. **Pinned image cache.** Image-backed textures live in a separate `Map<string, Texture>` with **no** LRU eviction, capped at `MAX_PINNED_SPRITES = 200` entries. Builtins use ~30 slots; the cap guards against unbounded growth from projects with many custom `iconUrl` values. When the cap is reached, new image loads are ignored (procedural fallback used) and a warning is logged once. The LRU cache (`MAX_PLANT_CACHE=256`, `MAX_STRUCTURE_CACHE=256`) is reserved for procedural textures only.
4. **Debounced rebuild.** Multiple async load completions within 50ms are coalesced into a single `texturesUpdated` callback + `markDirty()`, preventing rapid-fire rebuilds during startup preload. The flush always calls `onTexturesUpdated()` (which triggers `rebuildFromStore()`) BEFORE `markDirty()` (which schedules the PixiJS render pass). This ordering ensures sprites have updated texture references before the frame renders. If an independent `markDirty()` fires during the 50ms window (e.g., user drags a plant), that render pass will use procedural textures for the pending swaps — this is cosmetically benign (one extra frame with procedural sprites) and intentional.

### Texture Swap → Renderer Rebuild Path

```
AssetLoader resolves image
  → TextureAtlas stores in pinned cache
  → TextureAtlas sets pendingSwap flag
  → 50ms debounce timer fires
    → TextureAtlas calls texturesUpdated callback
      → PlantRenderer.rebuildFromStore() picks up new textures via atlas.getPlantSprite()
      → StructureRenderer.rebuildFromStore() picks up new textures via atlas.getStructureSprite()
    → TextureAtlas calls scheduler.markDirty()
      → RenderScheduler schedules rAF → PixiJS render pass draws updated sprites
```

Note: `markDirty()` alone only schedules a PixiJS render pass — it does NOT trigger `rebuildFromStore()`. The `texturesUpdated` callback is the mechanism that tells renderers to re-read textures from the atlas.

### File Structure (new files)

```
src/canvas-pixi/textures/
├── AssetLoader.ts          (Phase 1 — async image loading service)
├── SpriteManifest.ts       (Phase 1 — builtin: URL resolver + manifest)
├── TextureAtlas.ts          (Phase 2 — modified to use AssetLoader)
├── PlantSprites.ts          (unchanged — kept as fallback)
├── StructureSprites.ts      (unchanged — kept as fallback)
├── ProceduralTextures.ts    (unchanged)
└── constants.ts             (Phase 1 — add sprite-related constants)

public/sprites/
├── plants/                  (Phase 4 — PNG sprite assets)
│   ├── tomato.png
│   ├── basil.png
│   └── ...
└── structures/              (Phase 4 — PNG sprite assets)
    ├── raised-bed.png
    ├── brick-wall.png
    └── ...
```

### Testing Strategy

The vitest config uses `environment: 'node'` with no jsdom. Existing canvas-pixi tests avoid PixiJS APIs. Therefore:

- **Phase 1 tests** (AssetLoader, SpriteManifest): mock `Assets.load` and `Texture.from` at module boundary. Pure logic tests run in node.
- **Phase 2 tests** (TextureAtlas): mock PixiJS APIs. Verify callback wiring, cache behavior, debounce timing.
- **Phase 3/4 verification**: manual visual testing only. Automated integration tests require a browser-based runner (Playwright) and are out of scope for this plan. Each "Verify" task is a manual checklist.

---

## Phases

### Phase 1 — Asset Loader Infrastructure [ ]

> Builds the async image loading service and URL resolution layer. No rendering changes yet — this phase produces utilities that Phase 2 consumes. The two features are independent and can be built in parallel.

#### Feature: AssetLoader Service [ ]

**Status:** `todo`
**Produces:** `src/canvas-pixi/textures/AssetLoader.ts`

##### Tasks

- [ ] Create `AssetLoader` class wrapping PixiJS v8 `Assets.load()` with: single-flight deduplication (same URL only fetched once, both callers get same Texture), error handling returning `null` on failure, and a `preload(urls: string[])` batch method where partial failures are isolated (one 404 does not reject the batch)
- [ ] Add load-state tracking: `'idle' | 'loading' | 'loaded' | 'error'` per URL, with a `getStatus(url)` query method. States must transition `idle → loading → loaded` or `idle → loading → error` in sequence.
- [ ] Add `onLoaded(url, callback): unsubscribe` subscription. Callbacks must NOT fire after `destroy()` is called — guard against stale callbacks from destroyed consumers. Note: PixiJS `Assets.load()` promises are not cancellable, so in-flight loads may complete after destruction; the guard is the only protection.
- [ ] Add `destroy()` method that sets a destroyed flag (preventing future callback invocations), but does NOT call `tex.destroy()` on loaded textures — that is the responsibility of `DisposalManager` or the owning `TextureAtlas`.
- [ ] Validate loaded textures: after `Assets.load()` resolves, check `texture.width > 0 && texture.height > 0` before marking as `'loaded'`. Corrupt images may resolve with a zero-size texture — treat these as `'error'`. Also enforce `MAX_SPRITE_SIZE`: if `texture.width > MAX_SPRITE_SIZE || texture.height > MAX_SPRITE_SIZE`, log a warning and treat as `'error'` (reject oversized textures rather than silently consuming VRAM).
- [ ] Write unit tests (mock `Assets.load` and `Texture`):
  - Two concurrent `load(sameUrl)` calls → mock `Assets.load` invoked exactly once, both callers receive same Texture object
  - `preload([url1, url2, badUrl])` → `getStatus(url1) === 'loaded'`, `getStatus(badUrl) === 'error'`, no unhandled rejection
  - `getStatus(url)` transitions: `'idle'` → `'loading'` → `'loaded'` in sequence (4 sequential assertions)
  - `onLoaded` subscription → `destroy()` called before load resolves → load resolves → callback does NOT fire
  - `destroy()` does not throw when called with no loaded textures (pure error-state entries)
  - Corrupt image: `Assets.load` resolves with `{ width: 0, height: 0 }` → status becomes `'error'`, callback does not fire
  - Oversized image: `Assets.load` resolves with `{ width: 512, height: 512 }` (exceeds `MAX_SPRITE_SIZE=256`) → status becomes `'error'`
  - Idempotent subscriptions: calling `onLoaded(sameUrl, cb)` twice while status is `'loading'` → callback fires exactly once on resolution, not twice
  - `preload([])` (empty array) → no-op, no errors thrown

##### Decisions

_None yet._

---

#### Feature: Sprite URL Resolver [ ]

**Status:** `todo`
**Produces:** `src/canvas-pixi/textures/SpriteManifest.ts`

##### Tasks

- [ ] Create `resolveIconUrl(iconUrl: string, elementType: 'plant' | 'structure')` function: empty string → `null`, `builtin:slug` → `${SPRITE_BASE_PATH}/${elementType}s/${slug}.png`, anything else (including unknown prefixes like `cdn:`) → returned as-is for direct loading
- [ ] Add constants to `constants.ts`: `SPRITE_BASE_PATH = '/sprites'`, `MAX_SPRITE_SIZE = 256` (enforced by AssetLoader — reject oversized textures), `MAX_PINNED_SPRITES = 200` (cap for pinned image cache in TextureAtlas)
- [ ] Write unit tests:
  - `resolveIconUrl('', 'plant')` → `null`
  - `resolveIconUrl('builtin:tomato', 'plant')` → `'/sprites/plants/tomato.png'`
  - `resolveIconUrl('builtin:raised-bed', 'structure')` → `'/sprites/structures/raised-bed.png'`
  - `resolveIconUrl('builtin:', 'plant')` → `null` (empty slug)
  - `resolveIconUrl('/custom/tree.png', 'plant')` → `'/custom/tree.png'` (absolute path passthrough)
  - `resolveIconUrl('cdn:foo.png', 'plant')` → `'cdn:foo.png'` (unknown prefix = passthrough)
  - `resolveIconUrl('BUILTIN:tomato', 'plant')` → `'BUILTIN:tomato'` (case-sensitive, not matched as builtin)

##### Decisions

_None yet._

---

### Phase 2 — TextureAtlas Integration [ ]

> Wire the AssetLoader into TextureAtlas so that `getPlantSprite()` and `getStructureSprite()` attempt image loading before falling back to procedural generation. This phase also adds regression tests for terrain.

#### Feature: Async-Aware TextureAtlas [ ]

**Status:** `todo`
**Modifies:** `src/canvas-pixi/textures/TextureAtlas.ts`, `src/canvas-pixi/CanvasHost.tsx`

##### Tasks

- [ ] Change `createTextureAtlas()` signature to accept an optional options object: `createTextureAtlas(opts?: { assetLoader?: AssetLoader, onTexturesUpdated?: () => void })`. All fields optional with defaults (`assetLoader: null` → pure procedural mode, `onTexturesUpdated: () => {}` → no-op). This preserves backward compatibility for tests and terrain-only usage. Update CanvasHost.tsx (line ~383) to pass both arguments — `assetLoader` created before atlas, `onTexturesUpdated` wired to trigger `rebuildFromStore()` on all renderers + `scheduler.markDirty()`
- [ ] Add a pinned image cache (`pinnedPlantTextures: Map<string, Texture>`, `pinnedStructureTextures: Map<string, Texture>`) separate from the LRU procedural caches. Image textures are never evicted. LRU eviction only applies to procedural textures.
- [ ] Modify `getPlantSprite(plantTypeId)`: check pinned cache first → if hit, return. Otherwise resolve `iconUrl` from `useProjectStore.getState().registries.plants.find(p => p.id === plantTypeId)?.iconUrl`. If empty → generate procedural (existing path, stored in LRU). If non-empty → check `assetLoader.getStatus(resolvedUrl)`: if `'loaded'`, create Texture from asset, pin it, return; if `'loading'`, return procedural fallback; if `'idle'`, return procedural fallback and call `assetLoader.load(url)` + subscribe `onLoaded`; if `'error'`, return procedural fallback permanently.
- [ ] Modify `getStructureSprite(structureTypeId)`: same async-aware pattern as plants, using `registries.structures` for iconUrl resolution and the pinned structure cache.
- [ ] Add debounced `texturesUpdated` firing: when an `onLoaded` callback fires and a new pinned texture is stored, set a pending flag and schedule `setTimeout(flushPendingSwaps, 50)`. The flush calls `opts.onTexturesUpdated()` once, regardless of how many textures completed in the window.
- [ ] Add `TextureAtlas.preloadAll()` method: resolve all non-empty iconUrls from current registries, call `assetLoader.preload(urls)`. Call this once after atlas creation, deferred by one tick (`setTimeout(atlas.preloadAll, 0)`) so it does not compete with the initial render frame.
- [ ] Update `TextureAtlas.destroy()`: unsubscribe all `onLoaded` callbacks, clear pending debounce timer, destroy pinned textures via `tex.destroy(true)`, destroy LRU textures (existing behavior). The atlas exclusively owns pinned texture lifecycle — do NOT register pinned textures with DisposalManager (avoids double-destroy risk).
- [ ] Update CanvasHost.tsx cleanup (lines ~503-551): destroy atlas FIRST (unsubscribes callbacks), THEN destroy AssetLoader. This ordering prevents in-flight load completions from firing callbacks into a partially-destroyed atlas.

##### Decisions

_None yet._

---

#### Feature: TextureAtlas Regression Tests [ ]

**Status:** `todo`
**Produces:** test file alongside existing tests

##### Tasks

- [ ] Write regression tests (mock PixiJS APIs) to ensure Phase 2 changes do not break terrain:
  - `getTerrainTexture('grass')` returns a non-null, non-fallback texture after atlas creation
  - `getTerrainTexture('unknown-id')` returns the fallback texture and emits a console warning (not a throw)
  - `destroy()` succeeds when no plant/structure sprites were ever requested (pure terrain use case)
  - `createTextureAtlas()` without arguments (no opts) still works — terrain path must not depend on AssetLoader
- [ ] Write async swap integration test (mock PixiJS): call `getPlantSprite('tomato')` when iconUrl is set → returns procedural texture → mock AssetLoader resolves → wait 50ms debounce → `onTexturesUpdated` fires exactly once → second call to `getPlantSprite('tomato')` returns image texture (different object reference)

##### Decisions

_None yet._

---

### Phase 3 — Renderer Migration [ ]

> Update PlantRenderer and StructureRenderer to handle the async texture swap gracefully. Verify visual correctness via manual testing.

#### Feature: PlantRenderer Sprite Swap [ ]

**Status:** `todo`
**Modifies:** `src/canvas-pixi/PlantRenderer.ts`

##### Tasks

- [ ] Verify that `updatePlantEntry()` line ~191 (`entry.sprite.texture !== texture`) correctly picks up new Texture objects from the atlas after a swap. Since the atlas inserts a NEW Texture object (Binding Invariant #2), this reference check is sufficient — no version counter needed. Document this verification in the Decision Log.
- [ ] Wire `onTexturesUpdated` callback from CanvasHost into PlantRenderer: when fired, call `rebuildFromStore()` which re-reads all textures from the atlas via `getPlantSprite()`. This is the mechanism that replaces procedural textures with image textures on Sprites. Note: `markDirty()` alone is NOT sufficient — it only schedules a PixiJS render pass without re-reading atlas textures.
- [ ] Manual test: place a plant with a `builtin:` iconUrl → verify procedural sprite appears immediately → verify image sprite replaces it after load completes (single visual swap, no flicker)
- [ ] Manual test: place a plant with an invalid/missing iconUrl → verify procedural fallback persists permanently with exactly one console warning (no repeated warnings on subsequent rebuilds)
- [ ] Manual test: load project from `testdata/quintal-imaginario.json` which uses `builtin:japanese-maple` etc. → procedural sprites visible while loading → image sprites replace them once loaded (or graceful fallback if PNGs not yet created)

##### Decisions

_None yet._

---

#### Feature: StructureRenderer Sprite Swap [ ]

**Status:** `todo`
**Modifies:** `src/canvas-pixi/StructureRenderer.ts`

**Complexity note:** StructureRenderer currently uses `Graphics` objects exclusively (topFace, southFace, aoGradient, etc.). Adding a Sprite-based path requires changes to the `StructureEntry` interface. The current entry has ~7 Graphics objects. The plan below adds an optional `sprite: Sprite | null` field to `StructureEntry` rather than creating a separate entry type, to minimize disruption to existing code.

##### Tasks

- [ ] Extend `StructureEntry` interface with optional `sprite: Sprite | null` field (default `null`). When `sprite` is set, it replaces the `topFace` Graphics for rendering, but `southFace`, `aoGradient`, and `castShadow` Graphics remain for the 2.5D extrusion effect beneath the Sprite.
- [ ] In `createStructureEntry()`: resolve the structure type's `iconUrl`. If non-empty and the atlas returns an image texture (not procedural), create a `Sprite` from it and set `entry.sprite`. Position the Sprite at the same location as the topFace Graphics. Set `topFace.visible = false` to hide it (keep it allocated for fallback swap-back).
- [ ] In `updateStructureEntry()`: re-check the atlas texture on each rebuild. If the texture changed (image loaded async), swap from Graphics topFace to Sprite (or vice versa on error fallback). Apply the same transforms: position, width, height, rotation, alpha, visible.
- [ ] Ensure z-ordering: `castShadow.zIndex < southFace.zIndex < sprite.zIndex < aoGradient.zIndex` (sprite replaces topFace in the z-stack). Both Graphics-only and Sprite+Graphics entries must participate in the same Y-sort within the shared `elementsContainer`. Note: StructureRenderer uses `sortableChildren` on the container for Y-sorting — verify that per-child `zIndex` within a single structure entry does not conflict with container-level sorting. If it does, use a per-structure sub-container that is itself Y-sorted. Document the resolution as a Decision Log entry.
- [ ] Wire `onTexturesUpdated` callback into StructureRenderer (same pattern as PlantRenderer): call `rebuildFromStore()` when new textures are available.
- [ ] Manual test: place mixed structures — some with `iconUrl` (Sprite path), some without (Graphics path) — verify correct rendering, 2.5D extrusion, Y-sort ordering, layer visibility, and locked-opacity on both types.

##### Decisions

_None yet._

---

### Phase 4 — Built-in Sprite Assets [ ]

> Add PNG sprite images to `public/sprites/` and populate `iconUrl` fields in builtin registries. Sprites are sourced from free asset packs where available and custom-created for gaps. Procedural fallbacks remain for any sprite that cannot be sourced.

#### Sprite Sourcing Research (2026-04-07)

> Comprehensive search of Kenney.nl, itch.io, OpenGameArt, CraftPix, and TonyTextures. Key finding: **no single free pack covers all needs**. The free game asset ecosystem provides generic sprites, not botanically-specific ones. Approximately 21 of 40 required sprites have no viable free source.

##### Approved Source Packs

| Pack | License | Use For | Notes |
|------|---------|---------|-------|
| [TonyTextures — Top-View Trees](https://www.tonytextures.com/top-view-trees-cutout-plan-view-tree-library-for-architecture-design-png/) | Free commercial, no redistribution of raw assets | All 6 tree species (oak, maple, birch, fruit tree, ornamental pear, japanese maple) | 270 images across 30 species, 4000x4000px → downscale to 256x256. Architectural plan-view style. Primary source for trees |
| [TonyTextures — Top-View Plants](https://www.tonytextures.com/top-view-plants-01-cutout-plan-view-plant-graphics-png-for-landscape-design/) | Free commercial, no redistribution of raw assets | Shrubs (boxwood, holly, privet — match from hedge/bush variants), ground cover | 80 cutout graphics. Same style as tree pack. Primary source for shrubs |

##### Coverage Matrix

| Sprite | Source | Strategy |
|--------|--------|----------|
| **Trees** | | |
| `oak.png` | TonyTextures Top-View Trees | Download, select best oak canopy, downscale to 256x256 |
| `maple.png` | TonyTextures Top-View Trees | Download, select maple/fall-color variant, downscale |
| `birch.png` | TonyTextures Top-View Trees | Download, select lighter-canopy deciduous, downscale |
| `fruit-tree.png` | TonyTextures Top-View Trees | Download, select compact flowering/fruiting variant, downscale |
| `ornamental-pear.png` | TonyTextures Top-View Trees | Download, select columnar/upright deciduous, downscale |
| `japanese-maple.png` | TonyTextures Top-View Trees | Download, select small red/purple-leaf canopy, downscale |
| **Shrubs** | | |
| `boxwood.png` | TonyTextures Top-View Plants | Download, select dense rounded hedge variant, downscale |
| `lavender.png` | Custom | Create illustrated overhead — purple-tinted low mounding shrub |
| `hydrangea.png` | Custom | Create illustrated overhead — large rounded bloom clusters |
| `rose-bush.png` | Custom | Create illustrated overhead — thorny bush with bloom dots |
| `holly.png` | TonyTextures Top-View Plants | Download, select dense evergreen bush variant, downscale |
| `privet.png` | TonyTextures Top-View Plants | Download, select hedge/screening shrub variant, downscale |
| **Vegetables** | | |
| `tomato.png` | Custom | Create illustrated overhead — bushy green plant, small red dots |
| `cherry-tomato.png` | Custom | Create illustrated overhead — smaller variant of tomato |
| `onion.png` | Custom | Create illustrated overhead — upright green shoots from bulb |
| `eggplant.png` | Custom | Create illustrated overhead — broad dark-green leaves |
| `pepper.png` | Custom | Create illustrated overhead — compact bushy plant |
| `lettuce.png` | Custom | Create illustrated overhead — rosette of light-green leaves |
| `carrot.png` | Custom | Create illustrated overhead — feathery green tops |
| **Herbs** | | |
| `basil.png` | Custom | Create illustrated overhead — rounded green leaf clusters |
| `rosemary.png` | Custom | Create illustrated overhead — narrow needle-like leaves |
| `mint.png` | Custom | Create illustrated overhead — spreading oval leaves |
| `thyme.png` | Custom | Create illustrated overhead — tiny dense leaf clusters |
| **Structures** | | |
| `brick-wall.png` | Custom | Create illustrated overhead — brick-pattern linear element |
| `fence.png` | Custom | Create illustrated overhead — wood slat pattern, narrow depth |
| `retaining-wall.png` | Custom | Create illustrated overhead — stone/concrete linear element with shadow |
| `raised-bed.png` | Custom | Create illustrated overhead — wood-frame rectangle, soil fill |
| `planter-box.png` | Custom | Create illustrated overhead — smaller wood container |
| `patio.png` | Custom | Create illustrated overhead — stone/tile pattern surface |
| `deck.png` | Custom | Create illustrated overhead — wood plank pattern surface |
| `pergola.png` | Custom | Create illustrated overhead — semi-transparent lattice/beam pattern |
| `water-feature.png` | Custom | Create illustrated overhead — circular water with stone edge |
| `fire-pit.png` | Custom | Create illustrated overhead — circular stone ring |
| `bench.png` | Custom | Create illustrated overhead — rectangular wood slat seat |
| `table.png` | Custom | Create illustrated overhead — rectangular/round tabletop |

**Summary:** ~9 sprites (6 trees + 3 shrubs) sourceable from TonyTextures. ~26 need custom creation in matching architectural illustration style. All custom sprites must match TonyTextures visual language: soft shadows, natural muted colors, subtle texture, transparent background, directly overhead perspective.

##### Style Strategy Decision — DECIDED: Architectural Illustration (Option B)

**Chosen style: Professional landscape architecture plan view.** Clean illustrated overhead sprites matching the visual language used by real landscape designers and architects. NOT pixel art, NOT game-aesthetic. This produces a professional planner look appropriate for the app's target audience.

**Primary source: TonyTextures overhead packs** (free commercial use, no redistribution of raw assets):
- [Top-View Trees](https://www.tonytextures.com/top-view-trees-cutout-plan-view-tree-library-for-architecture-design-png/) — 270 images, 30 tree species, 4000x4000px → downscale to 256x256
- [Top-View Plants](https://www.tonytextures.com/top-view-plants-01-cutout-plan-view-plant-graphics-png-for-landscape-design/) — 80 images, hedges/shrubs/ground cover, same resolution

**For gaps (vegetables, herbs, structures):** Custom-create in the same clean illustrated overhead style. Characteristics: soft shadows, natural color palette, slight texture detail, transparent background, viewed from directly above.

**Rejected alternatives:**
- ~~Option A: Pixel art style~~ — game aesthetic, unprofessional for a planner app
- ~~Option C: Enhanced procedural only~~ — misses the opportunity for visual quality upgrade; Phases 1-3 still support custom `iconUrl` for future use

---

#### Feature: Plant Sprite Assets [ ]

**Status:** `todo`
**Produces:** `public/sprites/plants/*.png`, modifies `src/data/builtinRegistries.ts`

##### Tasks

- [x] Decide on style strategy — Option B (architectural illustration) selected 2026-04-07
- [ ] Create `public/sprites/plants/` directory
- [ ] Source/create top-down PNG sprites (64-256px, transparent background, max 256x256 per `MAX_SPRITE_SIZE`) for all 23 builtin plant types. Filenames must exactly match registry IDs: `tomato.png`, `cherry-tomato.png`, `onion.png`, `eggplant.png`, `pepper.png`, `lettuce.png`, `carrot.png`, `basil.png`, `rosemary.png`, `mint.png`, `thyme.png`, `oak.png`, `maple.png`, `birch.png`, `fruit-tree.png`, `ornamental-pear.png`, `japanese-maple.png`, `boxwood.png`, `lavender.png`, `hydrangea.png`, `rose-bush.png`, `holly.png`, `privet.png`
- [ ] For sourced sprites: download from approved packs, resize to max 256x256, ensure transparent background, verify license compliance, add attribution file if required (CC-BY packs)
- [ ] For custom sprites: create in the chosen style, matching the visual weight and color palette of sourced sprites
- [ ] Update `builtinRegistries.ts` to set `iconUrl: 'builtin:<slug>'` for each plant type (slug = the ID, matching filename without extension)
- [ ] Add `public/sprites/ATTRIBUTION.md` documenting source pack, license, and attribution for each sourced sprite
- [ ] Manual verify: start the app → all plants on canvas render with image sprites instead of procedural shapes → delete one PNG file → reload → that plant gracefully falls back to procedural while others show images

##### Decisions

_None yet._

---

#### Feature: Structure Sprite Assets [ ]

**Status:** `todo`
**Produces:** `public/sprites/structures/*.png`, modifies `src/data/builtinRegistries.ts`

##### Tasks

- [ ] Create `public/sprites/structures/` directory
- [ ] Source/create top-down PNG sprites (max 256x256) for all 12 builtin structure types. Filenames must exactly match registry IDs: `brick-wall.png`, `fence.png`, `retaining-wall.png`, `raised-bed.png`, `planter-box.png`, `patio.png`, `deck.png`, `pergola.png`, `water-feature.png`, `fire-pit.png`, `bench.png`, `table.png`
- [ ] For sourced sprites: download, resize, verify license, add to `ATTRIBUTION.md`
- [ ] For custom sprites: create in the chosen style consistent with plant sprites
- [ ] Update `builtinRegistries.ts` to set `iconUrl: 'builtin:<slug>'` for each structure type
- [ ] Manual verify: start the app → all structures with iconUrl render with image sprites → 2.5D extrusion still works on top of the sprite → mixed canvas with plants and structures renders correctly

##### Decisions

_None yet._

---

## Known Edge Cases

> Documented for awareness. These do not require explicit tasks but implementers should handle them gracefully.

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Registry update while image load is in-flight | Benign: `onLoaded` writes to pinned cache for a type that may no longer exist. Wasted cache entry, no crash. |
| Rapid tool switching triggering repeated `rebuildFromStore()` | Each rebuild calls `getPlantSprite()` which returns from cache (fast). `onLoaded` subscriptions must be idempotent — do not stack duplicate callbacks for the same URL. |
| Project import with unknown `iconUrl` (e.g., `builtin:japanese-maple` but PNG missing) | AssetLoader gets a 404 → status `'error'` → permanent procedural fallback. Single console warning. |
| Switching projects while preload is in progress | Old atlas `destroy()` sets destroyed flag → old `onLoaded` callbacks are guarded and do not fire → new atlas creates new AssetLoader and starts fresh preload. |
| Browser tab backgrounded during load | Browsers throttle fetch on backgrounded tabs. Extends load time but procedural fallback remains visible. No correctness issue. |
| CORS error on external URL | Fails identically to a 404 in PixiJS — rejected promise → `'error'` state → procedural fallback. No separate handling needed. |
| WebGL context loss during load | The `contextlost`/`contextrestored` cycle is handled by PixiJS Application (existing CanvasHost code). `AssetLoader.destroy()` must be tolerant of invalid textures. |

---

## Decision Log

> Record every architectural or behavioral decision made during implementation that is not already in the spec.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Zero-blocking async loading with procedural fallback | Canvas must never stall waiting for image loads. Procedural sprites render instantly; image sprites replace them when ready. This matches the existing render-on-demand architecture |
| 2026-04-07 | Keep all procedural generators as permanent fallbacks | Removing procedural code would make the app dependent on image assets loading successfully. Network failures, missing files, and custom user types without sprites all need a visual representation |
| 2026-04-07 | Use `builtin:` prefix convention (already in test fixtures) | Test data in `testdata/quintal-imaginario.json` already uses `builtin:japanese-maple` etc. Adopting this convention means existing fixture data works without changes |
| 2026-04-07 | Terrain textureUrl out of scope | Procedural Simplex noise terrain is visually superior to static image tiles and supports seamless blending. Image-based terrain would be a regression. The textureUrl field remains for future user-custom terrains |
| 2026-04-07 | New Texture objects on swap, never mutate | Atlas inserts a new Texture object when an image loads. Never mutates existing Texture. Renderers detect swaps via reference equality (`sprite.texture !== newTex`). Eliminates ambiguity in the swap detection path |
| 2026-04-07 | Pinned image cache, LRU for procedural only | Image textures are bounded by registry size (~30). Pinning them avoids costly network re-fetches on LRU eviction. Procedural textures remain in size-capped LRU since re-generation is ~1ms CPU |
| 2026-04-07 | 50ms debounce on texturesUpdated callback | During startup preload, ~30 images may complete in rapid succession. Without debounce, each triggers a full rebuildFromStore() (O(n) over 500 plants). 50ms coalesces the burst into a single rebuild — imperceptible delay, eliminates visible flicker |
| 2026-04-07 | texturesUpdated callback drives renderer rebuild, not markDirty() alone | markDirty() only schedules a PixiJS render pass — it does NOT call rebuildFromStore(). Without an explicit callback, Sprites would keep stale texture references. The onTexturesUpdated callback is the mechanism that triggers renderers to re-read atlas textures |
| 2026-04-07 | PixiJS v8 Assets.load() returns Texture directly | Assets.load(url) returns a ready-to-use Texture for image URLs. No additional Texture.from() call needed. AssetLoader should not double-wrap |
| 2026-04-07 | Image sprites improve draw call batching | Multiple Sprites sharing the same PNG URL share one BaseTexture in PixiJS, enabling BatchRenderer to group them into a single draw call. This is a net performance improvement over procedural sprites (unique BaseTexture per canvas) |
| 2026-04-07 | `createTextureAtlas()` opts parameter is optional | Backward compatibility for tests and terrain-only usage. When called without args, atlas operates in pure procedural mode (existing behavior). AssetLoader defaults to `null`, onTexturesUpdated defaults to no-op |
| 2026-04-07 | Atlas exclusively owns pinned texture lifecycle | Pinned textures are NOT registered with DisposalManager. Atlas `destroy()` calls `tex.destroy(true)` directly. Avoids double-destroy risk between two owners |
| 2026-04-07 | Cleanup order: atlas destroyed before AssetLoader | Atlas `destroy()` unsubscribes all callbacks first, then AssetLoader `destroy()` sets the destroyed flag. Prevents in-flight loads from firing callbacks into a partially-destroyed atlas |
| 2026-04-07 | Pinned cache capped at MAX_PINNED_SPRITES=200 | Guards against unbounded VRAM growth from projects with many custom iconUrl values. ~30 builtins fit comfortably; cap warns and falls back to procedural if exceeded |
| 2026-04-07 | MAX_SPRITE_SIZE enforced by AssetLoader | Textures exceeding 256x256 are rejected (marked as error). Prevents accidental VRAM overconsumption from oversized source images |
| 2026-04-07 | Debounce flush order: rebuildFromStore() before markDirty() | Ensures sprites have updated texture references before the frame renders. Independent markDirty() during the debounce window is benign (one extra frame with procedural textures) |
| 2026-04-07 | Sprite sourcing research: no single free pack covers all needs | Searched Kenney.nl, itch.io (CC0 + top-down tags), OpenGameArt, CraftPix freebies, TonyTextures. ~12/35 sprites sourceable from free packs, ~23 require custom creation. Free game asset ecosystem provides generic sprites, not botanically-specific species |
| 2026-04-07 | Style strategy decided: architectural illustration (Option B) | User confirmed professional planner aesthetic, not game aesthetic. TonyTextures overhead plan-view packs as primary source for trees/shrubs. Custom sprites for vegetables, herbs, structures in matching illustrated style. Pixel art options (CraftPix, LPC, Cainos) rejected |
| 2026-04-07 | Attribution tracking required for non-CC0 sourced sprites | CraftPix (royalty-free, no redistribution of raw assets), Cottage Pack (CC-BY 4.0, attribution required), TonyTextures (no redistribution). Must add `public/sprites/ATTRIBUTION.md` documenting sources |

---

## Agent Log

> Append-only. Record significant events: phase completions, blockers encountered, decisions escalated to human, unexpected spec gaps discovered.

```
2026-04-07 — Plan initialized. 4 phases covering asset loader, atlas integration, renderer migration, and sprite assets. Procedural generators preserved as permanent fallbacks.
2026-04-07 — Plan refined after 5-agent review (architect, code, performance, technical-writer, QA). Critical fixes: corrected plant/structure asset IDs to match actual registry, added pinned image cache (no LRU eviction for images), added texturesUpdated callback path (markDirty alone insufficient), added 50ms debounce, added terrain regression tests, expanded test cases, documented edge cases, added RenderScheduler to context map, added execution rules.
2026-04-07 — Second review pass (5 agents). All critical issues confirmed resolved. Minor fixes applied: optional opts parameter for createTextureAtlas(), MAX_SPRITE_SIZE enforcement in AssetLoader, explicit cleanup ordering (atlas before AssetLoader), DisposalManager ownership clarified (atlas owns pinned textures exclusively), pinned cache capped at 200, debounce flush ordering documented, StructureRenderer z-sort spike noted, 4 additional test cases added (oversized image, idempotent subscriptions, empty preload, no-arg atlas creation).
2026-04-07 — Sprite sourcing research completed. Searched 8 sites (Kenney, itch.io, OpenGameArt, CraftPix, TonyTextures). No single pack covers all 35 plant+structure sprites. Three style strategies documented.
2026-04-07 — Style strategy decided: Option B (architectural illustration). User confirmed professional planner aesthetic over game aesthetic. TonyTextures packs approved as primary source for trees/shrubs (~9 sprites). ~26 custom sprites needed in matching style. Phase 4 features unblocked.
```
