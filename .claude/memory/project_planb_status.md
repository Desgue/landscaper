---
name: PLAN-B implementation status
description: Current state of PLAN-B (Spatial Canvas) — what is done, what is pending, key decisions
type: project
---

## What is done (committed on branch `planner-frontend`)

### Phase B1 — Yard & Terrain (commit `1ec6e65`)
- **arcGeometry.ts**: sagitta arc math — arcFromSagitta, sampleArc, segmentsIntersect, arcAABB
- **YardBoundaryLayer.tsx**: vertex placement, arc edges, edge-length editing (fixed-pivot propagation), even-odd overflow dim (slot 10), self-intersection warning, Done button (disabled < 3 verts), hitTest (ray-cast + arc), getAABB; HTML overlays as named export `YardBoundaryHTMLOverlays`
- **TerrainLayer.tsx**: 100cm cell grid, Amanatides-Woo DDA drag traversal, brush sizes 1/2/3, eraser, surface-category collision, hitTest, getAABB; handlers on `<Rect fill="rgba(0,0,0,0.001)">` (not Layer)
- **selectionPriority.ts**: SELECTION_PRIORITY constants
- **TopToolbar.tsx**: replaced letter stubs with lucide-react SVG icons + tooltips
- **builtinRegistries.ts**: 11 terrain, 3 plant, 11 structure (with category), 5 path types; all with costPerUnit

### Phase B2 Plant (commit `f9496c3`)
- **PlantLayer.tsx**: usePlantToolStore, stamp placement (10cm snap, Alt disables), spacing collision ((spacingA+spacingB)/2), structure collision (blocks boundary/surface/feature/furniture), growthForm visuals (herb/tree/shrub/groundcover/climber circles, min 4px screen-space), quantity badge, hitTest (circle), getAABB
- **CanvasRoot.tsx**: wires TerrainLayer (slot 3), YardBoundaryLayer (slot 4), PlantLayer (slot 7), OverflowDimLayer (slot 10), YardBoundaryHTMLOverlays; fit-to-view includes boundary AABB
- **SidePalette.tsx**: terrain swatches + brush size selector; plant type swatches (color by category)

### Phase B2 Structure (commit `f75f8b2`)
- **StructureLayer.tsx**: useStructureToolStore, two-click placement (single-click = defaultW×defaultD, drag = custom size), ghost Rect preview (blue=valid, red=blocked), AABB collision (boundary/feature/furniture block), category fill colors, overhead 50% opacity, structure name label, arc tool wired (sagitta deferred to PLAN-C), hitTest (AABB), getAABB
- **SidePalette.tsx**: structures tab with category-colored swatches

## What is pending (Phase B2 remainder)

- **PathLayer.tsx** (task #17): polyline drawing, arc segment (straight for now), strokeWidthCm world-space rendering, PathHTMLOverlays Done button, hitTest (point-near-line), getAABB; slot 5 in CanvasRoot
- **LabelLayer.tsx** (task #18): click-to-place, inline edit (double-click), Escape/blur saves, resize handles, inspector styling; slot 8 in CanvasRoot
- **Phase B2 review** (task #19): parallel 6-reviewer team (security, docs, plan, bestpractices, arch, observability)
- **Mark PLAN-B done** (task #20): update PLAN-B.md header, commit

## Key architectural decisions
- OverflowDimLayer at slot 10 (above all content) — moves above terrain so dim is effective; spec says slot 2 but that's conceptual
- Boundary committed edges: dashed `dash={[6/zoom, 4/zoom]}`
- pushHistory pattern: `structuredClone(proj)` BEFORE updateProject, push AFTER
- Handlers on `<Rect fill="rgba(0,0,0,0.001)">` — transparent fill alpha=0 = not hit-testable in Konva
- stage.getRelativePointerPosition() = world coords directly (Stage has scaleX/scaleY for zoom)
- Plant colors derived from PlantType.category (no color field in schema)

## Review loop
6 reviewers per phase: security, docs alignment, plan alignment, code best practices (Opus), architecture, **observability** (checks error logging, no silent catch swallows).
Iterate until all PASS before moving to next phase.
