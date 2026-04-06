# Bug Report — Terrain Painting (PLAN-B)

## Status
Partially fixed. One confirmed bug remains undiagnosed at runtime.

---

## Bug 1: Terrain painting does nothing (UNRESOLVED)

**Symptom:** Clicking/dragging on canvas with terrain tool active produces no painted cells.

**What we know:**
- Native `mousedown` fires on `<canvas>` element ✓
- Build compiles clean, no TypeScript errors ✓
- HTML overlays do NOT block clicks ✓
- Konva hit detection: `_getIntersection` reads the layer's hit canvas (pixelRatio=1), checks `p[3]` for alpha
- Hit Rect: `fill="rgba(0,0,0,0.001)"`, `listening={true}`, handlers attached directly to Rect ✓
- `hasFill()` returns true for both `"transparent"` and `"rgba(0,0,0,0.001)"` — Konva draws both on hit canvas with opaque colorKey
- Layer order in Stage (top→bottom hit check): SnapGuidesLayer → OverflowDimLayer → 5× stubs → YardBoundaryLayer → **TerrainLayer** → stub → GridLayer
- When `boundary=null` and `isPlacing=false`, YardBoundaryLayer returns `null` (no blocking layer)
- When `isPlacing=true`, YardBoundaryLayer renders a full-canvas `fill="transparent"` Rect that DOES intercept all clicks → terrain painting impossible in that state

**Unconfirmed failure paths (need `console.log` to verify):**
1. `isActive=false` — terrain tool not active when clicking (user hit toolbar button without selecting a swatch)
2. `selectedTerrainTypeId=null` — no terrain type selected; painting silently skipped at `if (isTerrainTool && selectedTerrainTypeId)`
3. `handleMouseDown` not firing — hit detection failing for unknown reason
4. `handleMouseDown` fires but `updateProject` results in no re-render

**To diagnose:** add to `handleMouseDown`:
```ts
console.log('[terrain] down', { isActive, selectedTerrainTypeId, isTerrainTool })
```
and to the render body:
```ts
console.log('[terrain] render', { isActive, activeTool, selectedTerrainTypeId })
```

---

## Bug 2: "Done" button doesn't close boundary modal (FIXED)

**Symptom:** Done button visible but clicking it did nothing.

**Root cause:** `onClick` checked `verts.length >= 3` but button was shown regardless.

**Fix applied:** Button is now `disabled={placedVertices.length < 3}` with grey style + `not-allowed` cursor + tooltip. `YardBoundaryLayer.tsx` lines 750–788.

---

## Bug 3: Brush size doesn't work (BLOCKED ON BUG 1)

**Symptom:** Changing brush size (1×1, 2×2, 3×3) has no visible effect.

**Assessment:** Implementation is correct (`brushCells()` expands center cell to NxN). Blocked because painting itself doesn't work. Fix Bug 1 first.

---

## Critical side-note: `isPlacing=true` blocks terrain events

When the user enters boundary placement mode (`isPlacing=true`), YardBoundaryLayer renders a full-canvas Konva Rect above TerrainLayer. This Rect is hittable (Konva draws it on hit canvas despite `fill="transparent"`). All Konva `mousedown`/`click` events go to this Rect — terrain painting is impossible until placement mode exits.

This is by design but a footgun: if the user is stuck in placement mode, nothing else works. The "Done" button fix (Bug 2) mitigates this.
