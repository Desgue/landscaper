# Implementation Roadmap

## Phasing Philosophy

Each phase delivers a usable increment. Phase 1 is the MVP — a functional garden canvas that you'd actually use. Later phases add depth.

---

## Phase 1: Canvas MVP

**Goal**: A working infinite canvas where you can paint terrain and place plants on a grid.

### Milestones

- [ ] **1.1 — Project scaffold**
  - Vite + React + TypeScript setup
  - Tailwind CSS config
  - Project structure (folders, base types)

- [ ] **1.1b — Design tokens & UI foundations**
  - Define primary, secondary, accent color palette
  - Choose font families (UI + canvas labels)
  - Establish icon style (toolbar: outlined monochrome, plants: colored top-down)
  - Set spacing, border radius, and shadow tokens
  - Grid appearance defaults (dotted vs solid, colors)
  - Document tokens in a shared config (CSS variables or Tailwind theme)
  - Tooltip component: every button/icon gets a hover tooltip with name + shortcut

- [ ] **1.2 — Canvas foundation**
  - Blank canvas with pan (drag) and zoom (scroll)
  - Grid rendering (dots or lines, 1m cells)
  - Coordinate system: world ↔ screen transforms
  - Status bar: zoom level, cursor coordinates

- [ ] **1.3 — Terrain painting**
  - Terrain registry loaded from JSON
  - Terrain brush tool: select type, click/drag to paint grid cells
  - Option to disable grid snapping for freeform placement
  - Terrain renders as colored rectangles (textures later)
  - Eraser tool to remove terrain

- [ ] **1.4 — Plant placement**
  - Plant registry loaded from JSON (each herb is a separate entry, no groupings)
  - Side palette with plant list (icons + names)
  - Drag-and-drop or click-to-place plants on canvas
  - Plants render as icons snapped to grid
  - Plant spacing defines the outer box (cell size) on the grid, configurable per plant type

- [ ] **1.4b — Structure placement**
  - Structure registry loaded from JSON (brick walls, fences, raised beds)
  - Structures tab in side palette
  - Drag-and-drop or click-to-place structures on canvas
  - Structures render on canvas between terrain and plant layers

- [ ] **1.5 — Selection & manipulation**
  - Select tool: click to select, box select
  - Move, delete selected elements
  - Inspector panel shows properties of selection
  - Undo/redo (Ctrl+Z / Ctrl+Shift+Z)

- [ ] **1.5b — Labels & annotations**
  - Text/label tool to add annotations on the canvas
  - Labels are selectable, movable, and styled elements
  - Font size and color configurable via inspector

- [ ] **1.6 — Persistence**
  - Auto-save to IndexedDB
  - Save/load named projects
  - Export garden as JSON file
  - Import JSON file

**Deliverable**: You can design a garden layout, save it, and reload it.

---

## Phase 2: Polish & Journal

**Goal**: Refine the canvas UX and add the journal feature.

### Milestones

- [ ] **2.1 — Canvas UX polish**
  - Terrain textures (tiling images instead of flat colors)
  - Better plant icons (top-down illustrations)
  - Grid scale configuration UI
  - Keyboard shortcuts for all tools
  - Minimap

- [ ] **2.2 — Advanced manipulation**
  - Resize terrain regions by dragging edges
  - Copy/paste elements
  - Multi-select operations (move group, delete group)
  - Snap guides and alignment helpers

- [ ] **2.3 — Journal (basic)**
  - Journal panel (slide-in or tab)
  - Create journal entries: date, text, tags (no photo support)
  - Link entries to specific plants/areas/structures
  - Timeline view of entries

- [ ] **2.3b — Weather integration**
  - Open-Meteo API client (no key needed, free for personal use)
  - Auto-fill weather snapshot when creating a journal entry (temp, humidity, condition)
  - Manual override/entry for weather fields
  - Graceful fallback if API is unreachable

- [ ] **2.4 — Plant status tracking**
  - Plant lifecycle: planned → planted → growing → harvested → removed
  - Update status from inspector or journal
  - Visual indicators on canvas (e.g., opacity for planned, icon badge for status)

**Deliverable**: A polished design tool with journaling capability.

---

## Phase 3: Export & Sharing

**Goal**: Get data out of the app and make it shareable.

### Milestones

- [ ] **3.1 — Image export**
  - Export garden as PNG (high-res)
  - Export as SVG
  - Print-friendly layout with legend

- [ ] **3.2 — Garden statistics**
  - Dashboard: total area, breakdown by terrain type
  - Plant inventory list with status
  - Upcoming tasks (based on planting dates + days to harvest)

**Deliverable**: A complete garden planning and tracking tool.

---

## Phase 4: Advanced Features (Future)

- [ ] User accounts + cloud sync
- [ ] Companion planting suggestions / warnings
- [ ] Seasonal planning views (spring vs summer layout)
- [ ] Additional structure types (paths, sheds, pergolas, etc.)
- [ ] Advanced weather features (forecasts, seasonal trends, watering recommendations)
- [ ] Mobile-optimized view
- [ ] Collaboration / sharing gardens

---

## Development Approach

- **Prototype first**: Build a throwaway canvas spike (1-2 days) to validate Konva.js or alternative before committing
- **Vertical slices**: Each milestone is a thin vertical slice — touching canvas, state, and UI
- **Test as we go**: Unit tests for state logic, E2E tests for critical flows (save/load, place plant)
- **Design tokens early**: Establish colors, spacing, icon style before building too many components
