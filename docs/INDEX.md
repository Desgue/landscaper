# Documentation Index

Entry point for navigating this specification. Every doc is listed with its type, role, and key sections. Start here to find where a concept lives.

For writing conventions and doc structure, see [template.md](template.md).

---

## Element Docs

Behavioral specs — one per canvas element type. All follow the same skeleton: Placement → Core Mechanics → Inspector → Built-in Types → Collision Rules.

| Doc | Element | Key Sections |
|-----|---------|--------------|
| [terrain.md](frontend/terrain.md) | Terrain cells (ground layer) | Terrain Brush Tool, Cell Mapping, Drag Painting, Brush Size, Eraser |
| [plants.md](frontend/plants.md) | Plants (icons on canvas) | Placement, Visual Size, Growth Form, Status Lifecycle, Spacing Enforcement |
| [structures.md](frontend/structures.md) | Structures (walls, fences, beds) | Placement, Straight vs Curved, Arc Tool, Rotation, Resize |
| [paths-borders.md](frontend/paths-borders.md) | Paths & borders (brick edging, curves) | Drawing Segments, Segment Model, Segment Conversion, Closed Paths |
| [labels.md](frontend/labels.md) | Labels & annotations (text) | Placement (free by default, Alt enables snap), Editing, Styling |
| [measurement-dimensions.md](frontend/measurement-dimensions.md) | Dimension annotations (persistent measurement lines) | Measurement Tool, Dimension Element, Element Linking, Offset, Area & Perimeter Display, Material Estimates |

---

## System Docs

Cross-cutting mechanics shared by all element types. These own the rules — element docs delegate here.

| Doc | Owns | Key Sections |
|-----|------|--------------|
| [canvas-viewport.md](frontend/canvas-viewport.md) | Coordinate system, render layer order, collision matrix, viewport | Bounded Canvas, Coordinate System, Pan, Zoom, Multi-Resolution Grid, Render Layer Order, Overflow Dimming, Collision Rules, Selection Priority |
| [snap-system.md](frontend/snap-system.md) | Snap behavior (grid + geometry), alt modifier rules | Grid Snap, Geometry Snap, Priority Resolution, Adaptive Tolerance, Snap Guides, Alt Modifier Behavior |
| [selection-manipulation.md](frontend/selection-manipulation.md) | Select, move, delete, copy/paste, resize, rotate, eraser | Select Tool, Box Select, Move, Copy & Paste, Undo & Redo, Resize, Rotation, Eraser Tool, Inspector Panel |
| [layers-groups.md](frontend/layers-groups.md) | Layer visibility/locking, grouping | Layer Model, Layer Panel, Layer Visibility, Layer Locking, Layer Operations, Grouping, Group Behavior, Ungroup |

---

## Reference Docs

Lookup tables, schemas, algorithms. These are SSoT — authoritative and rarely point outward.

| Doc | SSoT For | Key Sections |
|-----|----------|--------------|
| [keyboard-shortcuts.md](frontend/keyboard-shortcuts.md) | All keyboard shortcuts | Tools, Canvas Navigation, Selection & Manipulation, Toggles, Modifiers, Groups |
| [data-schema.md](frontend/data-schema.md) | JSON data shape (export/import, registries, elements) | Export Format, Element Schema, Journal Entry Schema, Registry Schemas, Import Validation & Defaults, Duplicate ID Resolution |
| [spatial-math-specification.md](frontend/spatial-math-specification.md) | Computational geometry and algorithms | Coordinate System, Grid Snapping, Snap System Architecture, Yard Boundary Polygon, Arc Geometry, Path Segment Connectivity, Selection & Hit Testing, Rotation, Plant Visual Size, Journal Element Linking, Measurement & Area Calculations, Dimension Line Rendering |

---

## Feature Docs

Workflows, UI, and non-element features.

| Doc | Feature | Key Sections |
|-----|---------|--------------|
| [yard-setup.md](frontend/yard-setup.md) | Yard boundary creation flow (new project) | Define Boundary, Edge Dimensions, Curved Edges, Boundary as Element, Boundary Deletion |
| [journal.md](frontend/journal.md) | Journal & weather tracking | Entries, Element Linking, Timeline Views, Search & Filter, Weather Integration |
| [persistence-projects.md](frontend/persistence-projects.md) | Project management (save/load/export/import) | Welcome Screen, New Project Flow, Auto-Save, JSON Export, JSON Import, PNG Export |
| [visual-design.md](frontend/visual-design.md) | Cross-cutting visual and interaction design | Design Principles, Layout, Color Palette, Typography, Icons, Responsive, Accessibility, Design Rationale |
| [cost-tracking.md](frontend/cost-tracking.md) | Project cost estimation | Cost Model, Currency Setting, Inspector Integration, Cost Summary Panel, Cost Calculation Rules |
| [image-generation.md](frontend/image-generation.md) | AI image generation UI — Generate button, options panel, loading state, result modal, error handling, request construction | Entry Point, Generate Options Panel, Request Construction, Loading State, Result Modal, Error Handling, Reference Photo |

---

## Meta Docs

| Doc | Purpose |
|-----|---------|
| [template.md](template.md) | Writing conventions, doc type skeletons, cross-reference format, anti-patterns |
| [INDEX.md](INDEX.md) | This file — entry point and manifest |
| [PLAN_TEMPLATE.md](plans/PLAN_TEMPLATE.md) | AI-first plan template — copy this to create a new implementation plan; includes agent protocol and context map structure |
| [IMPLEMENTATION_PLAN.md](plans/frontend/IMPLEMENTATION_PLAN.md) | Full implementation plan for all features; living document updated by agents throughout development |
| [PLAN-F.md](plans/frontend/PLAN-F.md) | Image generation UI plan — Generate button, options panel, API client, loading overlay, result modal, error handling |

---

## Concept Ownership Map

When looking for where a concept is canonically defined, use this table. The **owner** has the full definition. Other docs carry a summary + cross-ref.

| Concept | Owner | Referenced By |
|---------|-------|---------------|
| Render layer order | canvas-viewport.md "## Render Layer Order" | All element docs (opening line) |
| Collision rules (full matrix) | canvas-viewport.md "## Collision Rules" | All element docs (## Collision Rules) |
| Selection priority | canvas-viewport.md "### Selection Priority" | selection-manipulation.md |
| Grid snap formula | spatial-math-specification.md "## 2. Grid Snapping" | snap-system.md, terrain.md |
| Geometry snap algorithms | spatial-math-specification.md "## 3. Snap System Architecture" | snap-system.md |
| Alt modifier behavior (per tool) | snap-system.md "## Alt Modifier Behavior" | All element docs (## Placement) |
| Arc geometry (sagitta, radius, center) | spatial-math-specification.md "## 5. Arc Geometry" | structures.md, paths-borders.md, yard-setup.md |
| Path segment data model | spatial-math-specification.md "## 6. Path Segment Connectivity" | paths-borders.md, data-schema.md |
| Hit testing (per element type) | spatial-math-specification.md "## 7. Selection & Hit Testing" | selection-manipulation.md, canvas-viewport.md |
| Plant lifecycle state machine | plants.md "## Status Lifecycle" | spatial-math-specification.md "## 10" |
| JSON data shape (all schemas) | data-schema.md | persistence-projects.md, yard-setup.md |
| Import validation & defaults | data-schema.md "## Import Validation & Defaults" | persistence-projects.md |
| Keyboard shortcuts (all) | keyboard-shortcuts.md | canvas-viewport.md, snap-system.md, visual-design.md |
| Journal element linking | spatial-math-specification.md "## 11. Journal Element Linking" | journal.md, data-schema.md |
| Yard boundary polygon math | spatial-math-specification.md "## 4. Yard Boundary Polygon" | yard-setup.md |
| Yard boundary storage | data-schema.md "### Yard Boundary Storage" | yard-setup.md, canvas-viewport.md |
| Dimension line rendering | spatial-math-specification.md "## 13. Dimension Line Rendering" | measurement-dimensions.md "## Dimension Element" |
| Measurement & area formulas | spatial-math-specification.md "## 12. Measurement & Area Calculations" | measurement-dimensions.md "## Area & Perimeter Display" |
| Layer model, visibility, locking | layers-groups.md | cost-tracking.md, canvas-viewport.md |
| Group behavior | layers-groups.md | selection-manipulation.md |
| Layer & Group schemas | data-schema.md "## Layer Schema" | layers-groups.md |
| Cost model & calculation rules | cost-tracking.md | data-schema.md |
| Dimension element | measurement-dimensions.md | data-schema.md "### Dimension Element", spatial-math-specification.md "## 13" |
| Measurement tool | measurement-dimensions.md | keyboard-shortcuts.md |
| Image generation UI (frontend) | frontend/image-generation.md | api-contract.md (request shape), data-schema.md (yardPhoto storage), persistence-projects.md (markDirty) |
| Segmentation render pipeline | backend/segmentation-render.md | backend/api-contract.md, backend/go-types.md |
| Image generation text prompt | backend/prompt-construction.md | backend/api-contract.md |
| Image generation API request format | backend/api-contract.md "## Request Body" | frontend/image-generation.md "## Request Construction", backend/go-types.md |
| Segmentation color assignments | backend/segmentation-render.md "## Segmentation Color Table" | backend/prompt-construction.md |
| Gemini API client | backend/gemini-client.md | backend/api-contract.md |
| Generation panel UI | frontend/image-generation.md | (standalone) |
| Go request types (backend model) | backend/go-types.md | backend/server.md, backend/segmentation-render.md, backend/prompt-construction.md, backend/gemini-client.md |
| yard_photo field (request vs stored) | backend/api-contract.md "## yard_photo Field Disambiguation" | data-schema.md "### Yard Photo Storage", frontend/image-generation.md "## Reference Photo" |
