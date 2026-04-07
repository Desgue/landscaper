# Garden Planner — PLAN-G: 2.5D Textured Rendering Engine

---

## Agent Protocol

> Agents: read this section every time you open this plan. It defines how to interact with this document correctly.

### Reading the Plan

- **Load only what you need.** Use the grep hints in `## Context Map` to pull specific doc sections into context. Do not read whole spec files unless the task explicitly requires it.
- **Check phase status first.** Scan `## Phases` top-to-bottom and find the first phase that is not `done`. Work within that phase only.
- **Find your task.** Inside the active phase, find a task with status `todo` or `in-progress`. If a task is `blocked`, read its `Blocker:` note and resolve it or escalate.

### Updating the Plan

- **After completing a task:** change its status line from `[ ]` to `[x]` and append `-- done YYYY-MM-DD` to the task line.
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
| **Plan ID** | `PLAN-G` |
| **Title** | 2.5D Textured Rendering Engine (Konva -> PixiJS) |
| **Scope** | Replace the Konva canvas renderer with a PixiJS-based 2.5D engine using textured terrain tiles, sprite-based plants/structures, and 3/4 top-down perspective with height extrusion for walls. Excludes: data model changes, store refactors, inspector/toolbar UI, routing, persistence. |
| **Status** | `todo` |
| **Started** | 2026-04-07 |
| **Last updated** | 2026-04-07 |
| **Phases** | Phase 1: Foundation · Phase 2: Terrain & Boundary · Phase 3: Elements · Phase 4: Interaction (6 sub-features) · Phase 5: Polish |

---

## Context Map

### Document Registry

| Doc | What it owns | Load hint |
|-----|-------------|-----------|
| `docs/frontend/canvas-viewport.md` | Render layer order, coordinate system, collision matrix, zoom rules | Full read recommended |
| `docs/frontend/data-schema.md` | All JSON shapes, field names, types | `grep -n "^##" docs/frontend/data-schema.md` |
| `docs/frontend/visual-design.md` | Layout, colors, typography, UI component positions | `grep -n "## " docs/frontend/visual-design.md` |
| `docs/frontend/terrain.md` | Terrain paint tool, brush, cell rules | Full read |
| `docs/frontend/structures.md` | Structure placement, categories, collision | Full read |
| `docs/frontend/plants.md` | Plant placement, visual sizing, status | Full read |
| `docs/frontend/paths-borders.md` | Path drawing, arc segments, width | Full read |
| `docs/frontend/snap-system.md` | Snap priority, tolerance, Alt modifier | Full read |
| `docs/frontend/selection-manipulation.md` | Select, move, resize, rotate, undo, inspector | Full read |

### Key Source Files (current Konva implementation)

| File | Lines | Migration role |
|------|-------|---------------|
| `src/canvas/CanvasRoot.tsx` | 242 | **Replace entirely** — new PixiJS Application host |
| `src/canvas/TerrainLayer.tsx` | 415 | **Replace rendering** — keep paint logic, swap Konva Rect for tiled sprites |
| `src/canvas/StructureLayer.tsx` | 580 | **Replace rendering** — sprite-based with height extrusion |
| `src/canvas/PlantLayer.tsx` | 415 | **Replace rendering** — illustrated sprites with shadows |
| `src/canvas/PathLayer.tsx` | 464 | **Replace rendering** — textured stroke with edge lines |
| `src/canvas/YardBoundaryLayer.tsx` | 934 | **Replace rendering** — keep geometry, new visual style |
| `src/canvas/SelectionLayer.tsx` | 916 | **Replace rendering** — keep all interaction logic |
| `src/canvas/GridLayer.tsx` | 81 | **Replace** — PixiJS tiling sprite |
| `src/canvas/DimensionLayer.tsx` | 451 | **Replace rendering** — PixiJS Graphics + BitmapText |
| `src/canvas/LabelLayer.tsx` | 404 | **Replace rendering** — PixiJS Text |
| `src/canvas/ScaleBar.tsx` | 108 | **Keep as HTML overlay** (already HTML) |
| `src/canvas/viewport.ts` | 113 | **Keep as-is** — pure math, no Konva deps |
| `src/canvas/geometry.ts` | 276 | **Keep as-is** — pure math |
| `src/canvas/arcGeometry.ts` | 215 | **Keep as-is** — pure math |
| `src/canvas/hitTestAll.ts` | 191 | **Keep as-is** — pure math |
| `src/snap/snapSystem.ts` | 206 | **Keep as-is** — pure math |

---

## Architecture Overview

### Visual Style: 3/4 Top-Down (Stardew Valley / Prison Architect)

The camera is mostly overhead but with a slight southward tilt implied through rendering:
- **Terrain** is flat, viewed from directly above with texture tiles
- **Walls/fences** show a south-facing face strip below their top edge (height extrusion)
- **Structures** show a top face + optional south face for depth
- **Plants** are illustrated sprites with subtle drop shadows
- **Paths** have textured fill with edge lines
- Elements are Y-sorted for correct overlap (things further south draw on top)

### Rendering Engine: PixiJS v8

**Integration model:** `@pixi/react` is used ONLY for the top-level `<Application>` mount. All scene children are rendered imperatively (plain PixiJS classes: `new Container()`, `new Sprite()`, etc.) via `.ts` renderer modules. This avoids React reconciliation overhead on the scene graph — the standard pattern for production PixiJS+React apps.

```
React host (CanvasHost.tsx)
  └── pixi.js v8 (WebGL2 renderer) — imperative scene graph
       ├── Sprite            — terrain cells (one per cell), plant sprites
       ├── TilingSprite      — grid pattern, path texture fills
       ├── Graphics          — boundary polygon, selection handles, dashed lines
       ├── Container         — layer grouping (replaces Konva Layer)
       ├── Text              — labels, dimensions (with zoom-dependent resolution)
       └── RenderTexture     — cached terrain chunks for perf
```

**Important PixiJS v8 specifics:**
- Set `eventMode = 'none'` and `interactiveChildren = false` on world container — all hit testing goes through `InteractionManager` using existing pure-math `hitTestAll.ts`
- World-space `Text` objects need `resolution = Math.min(zoom * devicePixelRatio, 4)` (clamped to prevent enormous internal canvases). **Debounce re-rasterization** — during active zoom, use sprite `scale` for GPU scaling; only call `updateText()` after zoom gesture settles (150ms idle)
- No built-in dashed line support — implement a `drawDashedLine()` utility using computed dash segments
- Even-odd fill for boundary overlay → use `Graphics.cut()` API instead
- PNG export `renderer.extract` methods are async in v8 (return Promises)
- **Coordinate conversion:** Use `event.global` (stage-space) + `toWorld()` from `viewport.ts` for world coordinates. Do NOT use `getLocalPosition(worldContainer)` — it returns container-local coords which are wrong when the world container has pan/zoom transforms applied

### Layer Consolidation (12 Konva Layers -> 3 PixiJS Containers)

| PixiJS Container | Contents | eventMode |
|------------------|----------|-----------|
| **world** | Grid, Terrain chunks, Paths, Structures+Plants (Y-sorted), Labels, Dimensions, Overflow dim (topmost) | `'none'` (events go through interaction container) |
| **interaction** | Transparent hit area (full stage), selection handles, box-select rect, snap guides | `'static'` |
| **hud** | (empty — HTML overlays handle this) | `'none'` |

**World sub-containers (draw order, bottom to top):**

| Sub-container | Contents | Sort? |
|---------------|----------|-------|
| `world.grid` | Grid dots/lines | No |
| `world.terrain` | Cached terrain RenderTexture chunks | No |
| `world.paths` | Path strokes | No (flat, always below structures) |
| `world.elements` | Structures + Plants (Y-sorted) | Yes — `sortableChildren = true` (consider PixiJS v8 Render Layers as more performant alternative) |
| `world.labels` | Text labels + dimension lines | No |
| `world.overflowDim` | Boundary outside-dim overlay | No (must be above labels/elements to dim everything outside boundary, matching current Konva layer 10 behavior) |

The `interaction` container needs a transparent hit area sprite covering the full stage to catch clicks on empty space (for box-select start and deselection).

HTML overlays (YardBoundaryHTMLOverlays, LabelHTMLOverlays, MeasurementHTMLOverlays, ScaleBar) remain as-is.

### Coordinate System

**No changes.** World units remain centimeters, Y-axis points DOWN. The PixiJS stage uses the same `panX`, `panY`, `zoom` viewport transform as Konva. `useViewportStore` is unchanged.

### Resource Lifecycle

**PixiJS does NOT garbage-collect GPU resources.** Every `Texture`, `RenderTexture`, and `Graphics` object consumes VRAM until explicitly destroyed. The `DisposalManager` (Phase 1) tracks all allocated resources:

- **Renderers** call `disposalManager.register(resource)` for every created texture/RenderTexture/Graphics
- **On unmount/project-switch:** `disposalManager.destroyAll()` calls `.destroy({ children: true, texture: true })` on everything
- **Store subscriptions** via `connectStore()` return unsubscribe handles; all must be called on teardown
- **VRAM budget:** Terrain chunk pool capped at `MAX_CHUNK_POOL = 24` RenderTextures (~24MB at 512x512). Atlas capped at 2048x2048 (~16MB per page). Total budget target: <64MB VRAM

### Texture Atlas Strategy

All terrain tiles, plant sprites, and structure sprites are packed into a single texture atlas (spritesheet) loaded at app start. Individual textures are referenced by name.

```
src/assets/atlas/
  ├── terrain/        — 100x100px tile textures (grass, mulch, gravel, stone, etc.)
  ├── plants/         — illustrated plant sprites (tree, shrub, flower, herb, etc.)
  ├── structures/     — structure top-face sprites + south-face strips
  └── atlas.json      — TexturePacker-format spritesheet manifest
```

For MVP, use procedurally generated textures (canvas patterns) to avoid asset creation bottleneck. Replace with hand-drawn sprites later.

### Height Extrusion Model

For the 3/4 view depth illusion, elements with "height" (walls, fences, raised beds) render two parts:

```
┌─────────────┐  ← top face (normal color)
│  top face   │
├─────────────┤  ← extrusion line
│ south face  │  ← darkened color, height = heightCm * EXTRUSION_SCALE
│ (depth)     │
└─────────────┘
```

`EXTRUSION_SCALE` = 0.5 (implies 30° camera tilt from horizontal, `sin(30°) = 0.5`). A 180cm fence shows ~90px of south face at zoom=1. This matches Prison Architect / Stardew Valley proportions. Companion constant `EXTRUSION_ANGLE_DEG = 30` documents the implied camera angle. Both constants live in a single config file, not inlined per-renderer.

**Ambient occlusion at wall bases:** Where a wall/structure meets terrain, draw a soft dark gradient strip on the terrain side (width ~15-20px, alpha 0-25%). This grounds structures and prevents them from looking like they float.

### Y-Sort Depth Ordering

Elements in `world.elements` container use a **two-key sort** for correct depth:

```
sortKey = (TYPE_LAYER_ORDER[el.type], effectiveBottomY(el), el.id)
```

| Element type | TYPE_LAYER_ORDER | effectiveBottomY |
|-------------|-----------------|------------------|
| Terrain | 0 | (not sorted — in `world.terrain` chunk container) |
| Path | 1 | (not sorted — in `world.paths` container, always below) |
| Flat structure (surface, overhead) | 2 | `el.y + el.height` |
| Extruded structure (boundary, feature, furniture) | 3 | `el.y` (top edge — south face hangs below) |
| Plant | 3 | `el.y + el.height` |

**Critical: Plants and extruded structures share TYPE_LAYER_ORDER = 3.** This ensures Y-sorting determines overlap between plants and walls/fences regardless of type. A plant behind a fence (lower Y) correctly draws below it, and a plant in front (higher Y) draws on top. If they were in separate tiers, ALL plants would draw above ALL structures regardless of position, breaking the 2.5D illusion.

**Key insight:** Extruded elements sort by their TOP edge (`el.y`), not bottom edge. The south-face strip extends visually below the sort position, so elements in front of the wall correctly draw on top of the south face. Using the bottom edge would cause the south face to incorrectly overlap elements in front.

**Tiebreaker:** Element ID as tertiary key ensures stable sort order when Y values match, preventing z-order thrash on re-render.

---

## Phases

### Phase 1 -- Foundation [ ]

> Install PixiJS, create the new canvas host component, wire up viewport transforms, and render an empty grid. All existing Konva rendering continues to work during this phase (parallel operation).

#### Feature: PixiJS setup and CanvasHost [ ]

**Status:** `todo`
**Spec:** `docs/frontend/canvas-viewport.md` -> full file

##### Tasks

- [ ] **SPIKE: Verify `@pixi/react` + React 19.2 compatibility.** Test that `<Application>` mounts correctly with React 19 concurrent features. **Must use `@pixi/react` v8** (rebuilt for React 19; v7 is incompatible). If incompatible: remove `@pixi/react` install task, `CanvasHost` uses `useEffect` + `Application.init()` + manual cleanup in return function. All other tasks remain unchanged — the imperative scene graph approach is identical either way. This task MUST complete before all others.
- [ ] Install `pixi.js` v8, `@pixi/react` (if compatible) — add to package.json
- [ ] Install PixiJS DevTools Chrome extension for scene graph debugging
- [ ] Create `src/canvas-pixi/CanvasHost.tsx` — PixiJS Application host with Retina/DPI-aware setup (`resolution: window.devicePixelRatio`, proper `renderer.resize()` on container resize)
- [ ] Register WebGL context loss handler — show "Canvas lost, click to restore" overlay on `webglcontextlost`, re-init on `webglcontextrestored`
- [ ] Wire viewport: read `useViewportStore` (panX, panY, zoom) and apply as PixiJS stage transform
- [ ] Implement pan (hand tool, middle-click) and wheel zoom via PixiJS FederatedPointerEvent
- [ ] Implement cursor world-position tracking (feed `useCursorStore`) — use `event.global` coordinates and apply inverse viewport transform via `toWorld()` from `viewport.ts` (NOT `getLocalPosition()` which returns container-local coords, not world coords)
- [ ] Define cursor management strategy: use wrapper div `style.cursor` (same as current Konva approach), NOT PixiJS `displayObject.cursor`
- [ ] Create `src/canvas-pixi/utils/dashedLine.ts` — `drawDashedLine(graphics, x1, y1, x2, y2, dashArray)` utility that computes dash segments as individual `moveTo/lineTo` calls (~20 LOC)
- [ ] Create `src/canvas-pixi/GridRenderer.ts` — render dot grid using pre-rendered dashed-line Canvas2D pattern as TilingSprite, respecting `gridVisible` and `snapIncrementCm`
- [ ] Create `src/canvas-pixi/DisposalManager.ts` — tracks all created Textures, RenderTextures, and Graphics objects. Provides `register(resource)` and `destroyAll()`. Wire `destroyAll()` to CanvasHost unmount and project-switch events. **PixiJS does NOT garbage-collect GPU resources** — every texture/renderTexture must be explicitly destroyed
- [ ] Create `src/canvas-pixi/connectStore.ts` — `connectStore<T>(store, selector, callback) → unsubscribe` utility for imperative renderer modules to subscribe to Zustand stores. Returns cleanup handle. All renderers must use this pattern (not direct `store.subscribe()`)
- [ ] Wire `ResizeObserver` on container div — calls `app.renderer.resize()`, updates interaction hit area dimensions, and triggers terrain chunk visibility recompute on container size change
- [ ] Add feature flag `USE_PIXI` in app config — when true, render `CanvasHost` via `React.lazy(() => import('./canvas-pixi/CanvasHost'))`; when false, render `CanvasRoot` via `React.lazy(() => import('./canvas/CanvasRoot'))`. Use dynamic `import()` so only the active renderer loads (avoids ~350KB bundle bloat from shipping both)
- [ ] Verify: empty grid renders, pan/zoom works, viewport store stays in sync, Retina displays look crisp

##### Decisions

_None yet._

---

#### Feature: Texture system bootstrap [ ]

**Status:** `todo`
**Note:** This feature is parallelizable with CanvasHost setup — no dependency between them.

##### Tasks

- [ ] Install `simplex-noise` (~3kb) for organic terrain texture generation
- [ ] Create `src/canvas-pixi/textures/` directory structure
- [ ] Implement `ProceduralTextures.ts` — generate terrain tile textures using simplex noise (not white noise). **Technique requirements:**
  - Grass: 2-3 octave simplex noise with hue/saturation variation (hsl 95-110, sat 45-55%, light 28-38%), NOT brightness-only noise
  - Gravel: random filled circles at varying sizes (Canvas2D arc calls), not pixel noise
  - Mulch: short rotated line segments at random angles (fiber pattern)
  - Stone: rectangular facets with slight color variation
  - Soil: brown simplex noise, lower frequency than grass
  - Water: blue gradient with subtle noise overlay
  - **All tiles MUST be seamless** — use wrapped boundary sampling (noise coordinate modulo tile size) so adjacent tiles blend without visible grid lines
- [ ] Implement `TextureAtlas.ts` — build atlas from procedural textures at startup using `Texture.from(canvas)` where canvas is offscreen Canvas2D
- [ ] Create placeholder plant sprites — SVG-based sprites rendered to textures (middle ground between colored circles and hand-drawn art). Include foreshortened ellipse drop shadow: `shadowOffsetY = canopyRadius * 0.3`, `shadowAlpha = 0.33`, ellipse radii `(canopyRadius * 0.5, canopyRadius * 0.2)`, radial gradient from `rgba(0,0,0,0.33)` to `rgba(0,0,0,0)`
- [ ] Create placeholder structure sprites — colored rectangles with south-face extrusion strip (procedural for MVP)
- [ ] Implement solid-color fallback texture — used when procedural generation fails (canvas allocation failure, OOM) or when a lookup receives an unknown ID. Log a warning on fallback
- [ ] Export `getTerrainTexture(terrainTypeId, neighbors?)`, `getPlantSprite(plantTypeId)`, `getStructureSprite(structureTypeId)` lookup functions — all return fallback texture on unknown ID, never throw. The `neighbors?` parameter on terrain is optional (ignored in MVP) but reserves the API signature for Phase 5 autotiling (16+ Wang tile variants per type require neighbor-aware lookup)

##### Decisions

_None yet._

---

### Phase 2 -- Terrain & Boundary [ ]

> Render terrain cells as textured tiles and the yard boundary as a styled polygon. No interaction yet — just visual output reading from the existing project store.

#### Feature: Shared renderer infrastructure [ ]

**Status:** `todo`
**Note:** Must be completed before any element renderers (terrain, plants, structures, etc.)

##### Tasks

- [ ] Create `src/canvas-pixi/BaseRenderer.ts` — shared utilities for all renderers: dirty tracking (`markDirty()` / `isDirty()`), visibility and locked-opacity handling (0.5 alpha when locked), Y-sort key computation (`computeSortKey(el)`), and zoom-dependent text resolution management (debounced `updateTextResolution()`). All element renderers extend or compose this base
- [ ] Set up visual regression test harness — screenshot comparison tests for terrain rendering, Y-sort ordering, and boundary overlay. Use PixiJS `renderer.extract` to capture snapshots in headless WebGL (e.g., via `@pixi/node` or headless Chrome)

##### Decisions

_None yet._

---

#### Feature: Textured terrain rendering [ ]

**Status:** `todo`
**Spec:** `docs/frontend/terrain.md`

##### Tasks

- [ ] Create `src/canvas-pixi/TerrainRenderer.ts` — reads `project.elements` where `type === 'terrain'`, renders each cell as a 100x100 textured `Sprite` (NOT TilingSprite — each cell can have a different terrain type)
- [ ] Implement terrain chunk caching — group terrain cells into 10x10 chunks, render each chunk to a `RenderTexture` at **fixed 512x512 resolution** (NOT 1:1 world pixels — 1100x1100 at full res = ~4.8MB VRAM per chunk, which exceeds mobile GPU budgets at scale). **Chunks need a 1-cell overlap buffer** to correctly blend transition cells at chunk boundaries
- [ ] Implement chunk pool with LRU eviction — `MAX_CHUNK_POOL = 24` RenderTextures. When pool is full, evict least-recently-used chunks. Register all RenderTextures with `DisposalManager`
- [ ] Implement dirty-chunk tracking — when terrain cells change (paint tool), mark only the affected chunk(s) as dirty and re-render them, NOT all chunks. This is critical for paint tool responsiveness
- [ ] Implement chunk-level viewport culling — compute AABB for each chunk, set `chunk.visible = false` when entirely outside viewport bounds (from `useViewportStore`). ~15 LOC, prevents rendering off-screen chunks. Element-level sub-chunk culling is deferred to Phase 5
- [ ] Implement terrain transition blending — when cell A borders a different terrain type cell B, render B's texture on top of A's with an alpha-gradient mask fading from opaque at center to transparent at the transition edge
- [ ] Handle layer visibility and locked opacity (0.5 when locked)
- [ ] Verify: terrain cells display with textures matching their `terrainTypeId`, transitions blend smoothly

##### Decisions

_None yet._

---

#### Feature: Yard boundary rendering [ ]

**Status:** `todo`
**Spec:** `docs/frontend/yard-setup.md`

##### Tasks

- [ ] Create `src/canvas-pixi/BoundaryRenderer.ts` — reads `project.yardBoundary`, draws polygon outline using Graphics (dashed stroke, vertex circles)
- [ ] Implement arc edge rendering — use `sampleArc()` from arcGeometry.ts to generate polyline points for arc edges
- [ ] Implement overflow dim overlay — draw full-viewport rect, then `Graphics.cut()` the boundary polygon to create the hole (PixiJS v8 does not expose fill-rule; `cut()` subtracts the last shape from the previous)
- [ ] Render edge length labels using Text objects at edge midpoints
- [ ] Render arc drag handles (small circles at edge midpoints)
- [ ] Render boundary placement mode preview (placed vertices + live edge)

##### Decisions

_None yet._

---

### Phase 3 -- Elements [ ]

> Render all remaining element types with 2.5D visual style. Plants get sprites with shadows, structures get height extrusion, paths get textured strokes.

#### Feature: Plant rendering [ ]

**Status:** `todo`
**Spec:** `docs/frontend/plants.md`

##### Tasks

- [ ] Create `src/canvas-pixi/PlantRenderer.ts` — render plants as illustrated sprites
- [ ] Size sprites based on `canopyWidthCm` (trees) or `spacingCm` (other plants)
- [ ] Add foreshortened drop shadow underneath each plant — ellipse radii `(canopyRadius*0.5, canopyRadius*0.2)`, `shadowOffsetY = canopyRadius * 0.3`, `alpha = 0.33`, radial gradient from `rgba(0,0,0,0.33)` to `rgba(0,0,0,0)` for soft edge
- [ ] Color-code by category (vegetable=green, herb=light-green, fruit=orange, flower=pink, tree=brown, shrub=yellow-green)
- [ ] Show plant status indicator (small icon: planned=dashed outline, planted=solid, growing=leaf, harvested=check, removed=x)
- [ ] Y-sort plants by bottom edge for correct overlap

##### Decisions

_None yet._

---

#### Feature: Structure rendering with height extrusion [ ]

**Status:** `todo`
**Spec:** `docs/frontend/structures.md`

##### Tasks

- [ ] Create `src/canvas-pixi/StructureRenderer.ts` — render structures with top face + optional south face
- [ ] Implement height extrusion: structures with category `boundary`, `feature`, or `furniture` get a south-face strip (darkened color, `EXTRUSION_SCALE=0.5`). Add ambient occlusion gradient at wall base (15-20px wide, alpha 0-25%)
- [ ] `surface` category structures (patios, decks) render flat with texture pattern (no extrusion)
- [ ] `overhead` category structures render semi-transparent with dashed outline
- [ ] Render structure name label centered on top face
- [ ] Handle curved structures — render arc outline using sampleArc()
- [ ] Y-sort structures: extruded categories (boundary, feature, furniture) by top edge (`el.y`), flat categories (surface, overhead) by bottom edge (`el.y + el.height`) — see Architecture Overview Y-Sort section

##### Decisions

_None yet._

---

#### Feature: Path rendering [ ]

**Status:** `todo`
**Spec:** `docs/frontend/paths-borders.md`

##### Tasks

- [ ] Create `src/canvas-pixi/PathRenderer.ts` — render paths as textured strokes
- [ ] Use Graphics to draw path segments with `strokeWidthCm` thickness
- [ ] Apply path type color as tinted texture fill
- [ ] Render arc segments using sampleArc() polyline
- [ ] Add subtle edge lines (1px darker stroke on both sides of path)
- [ ] Handle closed paths (fill interior with semi-transparent texture)

##### Decisions

_None yet._

---

#### Feature: Label and dimension rendering [ ]

**Status:** `todo`
**Spec:** `docs/frontend/labels.md`, `docs/frontend/measurement-dimensions.md`

##### Tasks

- [ ] Create `src/canvas-pixi/LabelRenderer.ts` — render text labels using PixiJS `Text` with matching font/size/color/bold/italic. **Text resolution strategy:** clamp to `Math.min(zoom * devicePixelRatio, 4)` to prevent enormous internal canvases. **Debounce re-rasterization** (150ms after zoom settles) — during active zoom, use sprite `scale` for free GPU scaling (slight blur during animation is acceptable). Only call `updateText()` once zoom gesture completes
- [ ] Create `src/canvas-pixi/DimensionRenderer.ts` — render dimension lines with arrows, offset, and distance text. Same debounced zoom-dependent resolution strategy as LabelRenderer
- [ ] Handle label text alignment (left, center, right)
- [ ] Handle dimension linked endpoints (follow element positions)
- [ ] Consider keeping editable text in HTML overlays (already exist) rather than PixiJS Text for editing UX

##### Decisions

_None yet._

---

### Phase 4 -- Interaction [ ]

> Migrate all tool interactions (terrain paint, structure placement, plant placement, path drawing, selection/manipulation) from Konva event handlers to PixiJS interaction. This is the largest and most complex phase.

#### Feature: InteractionManager and hit testing [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md`

##### Tasks

- [ ] Create `src/canvas-pixi/InteractionManager.ts` — central event handler on the PixiJS interaction container. Listens to `FederatedPointerEvent` and translates to `{worldX, worldY, button, shiftKey, altKey}` commands
- [ ] Implement world-coordinate hit testing — reuse existing `hitTestAll.ts` (pure math, no Konva deps). Use `event.global` + inverse viewport transform via `toWorld()` from `viewport.ts` for world coordinate conversion
- [ ] Implement click-to-select: single click hits elements in priority order, updates `useSelectionStore`
- [ ] Implement box-select: drag from empty space draws selection rectangle, selects enclosed elements
- [ ] Implement multi-select (Shift+click, Shift+drag)
- [ ] Implement Tab key cycle through overlapping elements
- [ ] Verify keyboard shortcuts still work with PixiJS canvas focused (Ctrl+Shift+1 fit-to-view, Delete to remove, etc.)
- [ ] Write integration tests for InteractionManager event routing — verify click-to-select, box-select, multi-select, and coordinate conversion produce correct store updates

##### Decisions

_None yet._

---

#### Feature: SelectionLayer state machine extraction [ ]

**Status:** `todo`
**Spec:** `docs/frontend/selection-manipulation.md`

> **Critical migration task.** The current SelectionLayer.tsx is 916 LOC with a complex DragState machine (6 modes), Konva-specific event APIs, and modifier key tracking. Before porting to PixiJS, extract the interaction logic into a framework-agnostic state machine.

##### Tasks

- [ ] Extract `src/canvas-pixi/SelectionStateMachine.ts` — pure TypeScript class that accepts `{worldX, worldY, button, shiftKey, altKey, type: 'down'|'move'|'up'}` and returns commands (select, deselect, startBoxSelect, updateBoxSelect, startMove, applyMove, startResize, applyResize, startRotate, applyRotate). No Konva or PixiJS imports.
- [ ] Port all DragState modes: `idle`, `box_selecting`, `moving`, `resizing`, `rotating`, `path_point_dragging`
- [ ] Port snap integration during move/resize (calls `snapPoint()` from snap system)
- [ ] Port undo snapshot management (`preOpSnapshot` pattern)
- [ ] Port group editing mode
- [ ] Write unit tests for the state machine (no canvas needed)

##### Decisions

_None yet._

---

#### Feature: Selection overlay rendering [ ]

**Status:** `todo`

##### Tasks

- [ ] Create `src/canvas-pixi/SelectionOverlay.ts` — render selection bounding box, resize handles (8 positions), rotation handle using PixiJS Graphics
- [ ] Wire SelectionStateMachine commands to PixiJS rendering updates
- [ ] Implement element move visual feedback (ghost positions during drag)
- [ ] Implement element resize visual feedback
- [ ] Implement element rotation visual feedback
- [ ] Implement path point dragging visual feedback
- [ ] Render snap guide lines during move/resize

##### Decisions

_None yet._

---

#### Feature: Terrain paint and eraser tools [ ]

**Status:** `todo`
**Spec:** `docs/frontend/terrain.md`

> Parallelizable with selection overlay — only depends on InteractionManager.

##### Tasks

- [ ] Migrate terrain paint tool — mousedown/move/up on canvas paints cells (reuse existing paint logic from TerrainLayer.tsx: worldToCell, traversedCells, brushCells, paintCell)
- [ ] Migrate eraser tool — click to delete terrain cells (with priority check for non-terrain elements)
- [ ] Invalidate dirty terrain chunks on paint/erase

##### Decisions

_None yet._

---

#### Feature: Element placement tools [ ]

**Status:** `todo`
**Spec:** `docs/frontend/structures.md`, `docs/frontend/plants.md`, `docs/frontend/labels.md`, `docs/frontend/measurement-dimensions.md`

> Parallelizable with selection overlay — only depends on InteractionManager.

##### Tasks

- [ ] Migrate structure placement tool — two-click placement with ghost preview
- [ ] Migrate arc tool — 3-step placement (start → end → curvature) with arc preview
- [ ] Migrate plant placement tool — click to place, ghost preview with collision
- [ ] Migrate label tool — click to place, enter edit mode (HTML overlay)
- [ ] Migrate measurement tool — two-click dimension line placement

##### Decisions

_None yet._

---

#### Feature: Path and boundary tools [ ]

**Status:** `todo`
**Spec:** `docs/frontend/paths-borders.md`, `docs/frontend/yard-setup.md`

> Depends on InteractionManager + path point dragging from SelectionStateMachine.

##### Tasks

- [ ] Migrate path drawing tool — multi-click segments, Escape to finish, close detection
- [ ] Migrate boundary placement — vertex-by-vertex polygon drawing, done button
- [ ] Migrate boundary vertex/edge editing — drag vertices, drag arc handles, click edge labels

##### Decisions

_None yet._

---

### Phase 5 -- Polish & Cutover [ ]

> Performance optimization, visual polish, PNG export migration, and removal of Konva dependency.

#### Feature: Performance optimization [ ]

**Status:** `todo`

##### Tasks

- [ ] Profile render performance with 500+ terrain cells, 50+ plants, 20+ structures
- [ ] Implement element-level sub-chunk culling — skip individual elements outside visible viewport within visible chunks (chunk-level AABB culling is implemented in Phase 2)
- [ ] Verify smooth 60fps pan/zoom with full project loaded
- _Note: Terrain chunk batching with dirty-chunk tracking was implemented in Phase 2 (Textured terrain rendering)_

##### Decisions

_None yet._

---

#### Feature: Visual polish [ ]

**Status:** `todo`

##### Tasks

- [ ] Replace procedural textures with hand-drawn tile textures (grass, stone, gravel, mulch, soil, water) — all must be seamless
- [ ] Replace procedural plant sprites with illustrated sprites (trees with trunk+canopy layers, shrubs, flowers, herbs, vegetables)
- [ ] Implement autotiling for terrain transitions (Wang tiles / blob tiles — 16 variants per terrain type for smooth edges). Replaces the MVP alpha-gradient blending
- [ ] Add structure cast shadow (south-east offset, semi-transparent polygon matching structure footprint)
- [ ] Add ambient occlusion gradient at structure/wall bases (soft dark strip, 15-20px, alpha 0-25%)
- [ ] Add overhead structure shadow casting — semi-transparent dark fill of pergola/arbor footprint on terrain layer below
- [ ] Add smooth zoom animation (lerp between zoom levels)
- [ ] Add hover highlight effect on elements (subtle glow or outline)
- [ ] Add water UV scroll animation — shift texture origin by a few pixels per second on water terrain TilingSprite for ripple effect

##### Decisions

_None yet._

---

#### Feature: PNG export migration [ ]

**Status:** `todo`

##### Tasks

- [ ] Migrate `exportPNG.ts` to use PixiJS v8 `renderer.extract` — **note: v8 extract methods are async (return Promises)**, unlike Konva's sync `toDataURL()`. Update export flow to `await renderer.extract.canvas({ target: stage })`
- [ ] Verify exported PNG matches canvas content at correct resolution
- [ ] Support high-DPI export via `resolution` option: `await renderer.extract.canvas({ target: stage, resolution: 2 })`

##### Decisions

_None yet._

---

#### Feature: Konva removal and cutover [ ]

**Status:** `todo`

##### Tasks

- [ ] Remove feature flag — PixiJS is the only renderer
- [ ] Delete all `src/canvas/` Konva layer components (CanvasRoot, GridLayer, TerrainLayer, etc.)
- [ ] Remove `konva` and `react-konva` from package.json
- [ ] Update `src/canvas/exportPNG.ts` to remove Konva stage ref
- [ ] Rename `src/canvas-pixi/` to `src/canvas/`
- [ ] Run full test suite, verify no Konva imports remain
- [ ] Update docs to reflect new rendering architecture

##### Decisions

_None yet._

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `@pixi/react` incompatible with React 19 | Cannot use React bindings | Phase 1 spike task tests this first; fallback is imperative PixiJS mount via `useEffect` |
| PixiJS text rendering blurry at zoom | Labels/dimensions look bad zoomed in | Set `text.resolution = zoom * devicePixelRatio` and re-rasterize on zoom change; keep editable text in HTML overlays |
| Selection/manipulation is 916 LOC of complex interaction logic | Migration may introduce regressions | Extract framework-agnostic state machine first (Phase 4), unit test it, then wire to PixiJS events |
| WebGL context loss under memory pressure | Canvas goes blank | Register context loss/restore handlers in Phase 1; show recovery overlay |
| Procedural textures look bad (white noise, visible tile grid) | Users perceive quality regression | Use simplex noise + seamless tiling; Phase 5 replaces with hand-drawn autotile assets |
| Performance regression with many sprites | Large projects may lag | Terrain chunk batching with dirty-chunk tracking (Phase 2) + chunk-level culling (Phase 2) + element-level culling (Phase 5) |
| VRAM exhaustion on mobile/integrated GPUs | WebGL context loss, app crash | Fixed 512x512 chunk resolution, MAX_CHUNK_POOL=24 with LRU eviction, atlas capped at 2048x2048, total budget <64MB |
| Text re-rasterization thrash during zoom | Frame drops during pinch-zoom with many labels | Debounce updateText() (150ms), use sprite scale during active zoom, clamp resolution to max 4 |
| GPU resource leaks on project switch/unmount | Growing VRAM until context loss | DisposalManager tracks all resources, destroyAll() on unmount/switch |
| Double bundle size from feature flag | ~350KB extra gzipped | Dynamic import() for both renderer paths via React.lazy |
| HTML overlay positioning breaks | Overlays no longer align with canvas | HTML overlays use the same viewport transform — test early in Phase 1 |
| No built-in dashed line support in PixiJS | Grid, boundary outline, snap guides look wrong | Custom `drawDashedLine()` utility in Phase 1 (~20 LOC) |
| Y-sort depth ordering wrong for extruded walls | Plants/structures overlap incorrectly | Two-key sort with type layer priority; extruded elements sort by top edge, not bottom |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-07 | Use 3/4 top-down perspective instead of isometric | Preserves existing cartesian coordinate system, simpler hit detection, measurements stay intuitive, yard boundary polygon renders naturally |
| 2026-04-07 | Use PixiJS v8 instead of raw Canvas2D | WebGL2 hardware acceleration, built-in sprite batching, TilingSprite for grid, mature ecosystem |
| 2026-04-07 | `@pixi/react` for mount only, imperative scene graph | Avoids React reconciliation overhead on hundreds of display objects — standard production pattern |
| 2026-04-07 | Procedural textures for MVP using simplex noise, hand-drawn later | Avoids asset creation bottleneck; simplex noise produces organic-looking terrain vs. white noise |
| 2026-04-07 | Feature flag for parallel Konva/PixiJS operation | Zero-risk migration — can switch back to Konva at any time during development |
| 2026-04-07 | Consolidate 12 Konva Layers into 3 PixiJS Containers with 6 world sub-containers | Fixes Konva layer count warning; clear separation of sorted vs unsorted content |
| 2026-04-07 | Extract SelectionLayer into framework-agnostic state machine before porting | Decouples 916 LOC of interaction logic from rendering library; enables unit testing without canvas |
| 2026-04-07 | EXTRUSION_SCALE = 0.5 (30° camera tilt) | Matches Prison Architect proportions; 0.3 was too flat — walls looked like thin ledges |
| 2026-04-07 | Two-key Y-sort: extruded elements sort by top edge, flat elements by bottom edge | Prevents south-face extrusion from incorrectly overlapping elements in front |
| 2026-04-07 | SVG-based plant sprites as middle-ground texture strategy | Better than colored circles, cheaper than hand-drawn art; bridges MVP to polish phase |
| 2026-04-07 | Plants and extruded structures share Y-sort tier (both TYPE_LAYER_ORDER=3) | Separate tiers caused all plants to draw above all structures regardless of Y position, breaking 2.5D illusion |
| 2026-04-07 | DisposalManager for GPU resource lifecycle | PixiJS does not GC GPU resources; explicit destroy() required on unmount/project-switch to prevent VRAM leaks |
| 2026-04-07 | `connectStore()` utility for imperative Zustand subscriptions | Standardizes how .ts renderer modules subscribe to stores; ensures consistent cleanup handles |
| 2026-04-07 | Terrain texture API signature `getTerrainTexture(id, neighbors?)` | Optional `neighbors` param ignored in MVP but reserves API for Phase 5 autotiling without breaking change |
| 2026-04-07 | Use `event.global` + `toWorld()` for coordinate conversion, NOT `getLocalPosition()` | `getLocalPosition(worldContainer)` returns container-local coords which are wrong when pan/zoom transforms are applied |
| 2026-04-07 | Debounce text re-rasterization (150ms), clamp resolution to max 4 | Prevents 50+ GPU texture uploads per frame during pinch-zoom; sprite scale provides free GPU scaling during animation |
| 2026-04-07 | Fixed 512x512 chunk resolution + MAX_CHUNK_POOL=24 with LRU eviction | 1:1 world-pixel chunks (1100x1100) consume ~4.8MB each; at scale this exceeds mobile VRAM budgets |
| 2026-04-07 | Chunk-level AABB culling in Phase 2, not Phase 5 | Without culling, 10k terrain cells render every frame; ~15 LOC prevents painful Phase 2-4 development |

---

## Agent Log

```
2026-04-07 — Plan initialized. Architecture defined: PixiJS v8, 3/4 top-down, textured tiles, height extrusion, Y-sort depth ordering. 5 phases, ~50 tasks.
2026-04-07 — Plan reviewed by 3 specialist agents (Architecture, PixiJS Expert, 2.5D Rendering). All approved with notes. Major revisions applied:
  - Added React 19 compatibility spike as first task
  - Changed to imperative PixiJS scene graph (not React component tree)
  - Added Retina/DPI setup, WebGL context loss handling, dashed line utility
  - Fixed terrain rendering: Sprite per cell (not TilingSprite), dirty-chunk tracking moved to Phase 2
  - Fixed boundary overlay: Graphics.cut() instead of even-odd fill
  - Fixed text: zoom-dependent resolution for crisp world-space labels
  - Raised EXTRUSION_SCALE 0.3→0.5, added ambient occlusion at wall bases
  - Replaced single Y-sort key with two-key sort (type layer + effective bottom Y)
  - Added simplex-noise, seamless tiling, terrain transition blending requirements
  - Specified concrete plant shadow parameters (offset, opacity, foreshortened ellipse)
  - Split Phase 4 into 6 parallelizable sub-features; added SelectionLayer state machine extraction
  - Added 4 new risks to mitigation table
2026-04-07 — Plan reviewed by 5 specialist agents (Architecture, Security, Code Quality, Performance, API Accuracy). 3 critical, 7 high, 7 medium issues identified and fixed:
  CRITICAL:
  - Fixed Y-sort: plants and extruded structures now share tier 3 (were separate tiers 3/4, causing all plants to draw above all structures)
  - Fixed coordinate conversion: replaced getLocalPosition(worldContainer) with event.global + toWorld() (3 locations)
  - Removed duplicate terrain chunk caching task from Phase 5 (already in Phase 2)
  HIGH:
  - Added DisposalManager for GPU resource lifecycle (Phase 1)
  - Fixed terrain VRAM: chunks now 512x512 fixed resolution + MAX_CHUNK_POOL=24 with LRU eviction
  - Added connectStore() utility for imperative Zustand subscriptions (Phase 1)
  - Fixed overflowDim layer order: moved to after labels (was incorrectly below elements)
  - Added text resolution debounce (150ms) + clamp (max 4) to prevent zoom thrashing
  - Moved chunk-level AABB culling from Phase 5 to Phase 2
  - Added fallback texture for generation failures + unknown IDs
  MEDIUM:
  - Added @pixi/react v8 requirement + imperative fallback instructions to spike task
  - Added ResizeObserver wiring task (Phase 1)
  - Future-proofed texture API: getTerrainTexture(id, neighbors?) for autotiling
  - Added visual regression test harness (Phase 2) + InteractionManager integration tests (Phase 4)
  - Added BaseRenderer shared infrastructure (Phase 2, before element renderers)
  - Fixed contradictory Y-sort task in Phase 3 structures
  - Changed feature flag to use dynamic import() for code splitting
  - Added Resource Lifecycle section to architecture overview
  - Added 9 new decision log entries, 5 new risks to mitigation table
```
