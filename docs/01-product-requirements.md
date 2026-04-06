# Product Requirements Document (PRD)

## Vision

A web-based garden and landscape planner with a fluid, intuitive canvas experience and domain-specific tools for yard design. Users can visually design their yard transformation on a scaled, accurate canvas — placing terrain, plants, structures, paths, and borders — and maintain a journal to track the project's evolution over time.

## Target Users

- Home owners who want to plan and execute a DIY yard transformation
- People who want a visual, spatial tool with accurate real-world proportions — not a spreadsheet or note app

## Core Features

### F1: Bounded Canvas with Grid

- User defines yard boundary in a setup step (click vertices, type edge dimensions)
- Canvas is bounded to the yard dimensions with overflow (can place elements outside)
- Multi-resolution grid: 1m major lines always visible, 10cm minor lines appear on zoom-in
- All coordinates stored internally in centimeters, displayed in meters
- Pan, zoom, fit-to-view
- Rulers along top and left edges (1m major, 10cm minor markings)
- Minimap for orientation showing yard boundary and elements

### F2: Snap System

- 10cm default snap increment (nearest-round)
- Grid display and snap are independently toggleable
- Geometry snapping in MVP: edge alignment, perpendicular alignment, midpoint alignment
- Adaptive snap tolerance: tighter when zoomed in, looser when zoomed out
- Alt modifier disables snapping for free placement (inverted for labels)
- Visual snap guides show alignment feedback

### F3: Terrain Painting

- Paint terrain types onto grid cells (snap to 10cm increments)
- Configurable brush size (1x1, 2x2, 3x3 in grid cells)
- Built-in types: grass, soil, weed/wild, concrete, gravel, mulch
- Extensible registry — add new terrain types via config
- Terrain fills cells completely, no gaps between adjacent cells

### F4: Plant Placement

- Place plants from a categorized sidebar palette (click-to-stamp or drag-and-drop)
- Built-in plants: cherry tomatoes, tomatoes, onions, eggplant, peppers, basil, lettuce, carrots
- Extensible registry — same pattern as terrain
- Plant spacing (spacingCm) determines the visual size within the grid cell; plant icon is centered in the cell
- Each plant has: name, icon, spacing, season info, category, sun requirement, water need, days to harvest, companion plants

### F5: Selection & Manipulation

- Select, move, delete elements
- Multi-select (box select fully enclosed by default, Shift for partial intersection)
- Copy/paste, undo/redo
- Resize terrain regions and structures (snap to 10cm increments), plants have fixed size
- Structure rotation (only structures can rotate)
- Inspector panel for editing properties of the selected element

### F5b: Structures

- Place structure elements (click for default size, or drag to define extent)
- Structures can be straight or curved (arc property)
- Built-in structures: brick walls, fences, raised beds
- Extensible registry — same pattern as terrain and plants
- Structures, plants, and terrain can freely overlap

### F5c: Arc Tool

- Draw arcs: click start point, click end point, drag to set radius
- Used for curved structures and curved path/border segments
- Snaps to 10cm increments with geometry snapping active
- Editable after placement via handles (start, end, radius)

### F5d: Paths & Borders

- New element type for brick edging, curved borders, freeform paths
- Each segment can independently be straight or curved
- Place from Paths tab in side palette
- Path type determines visual style and width
- Extensible registry — same pattern as other element types

### F5e: Labels & Annotations

- Text/label tool to add annotations on the canvas
- Labels are standalone elements: selectable, movable, resizable text boxes
- Labels placed freely by default (Alt enables snapping — inverted behavior)
- Font size, color, alignment, bold, italic configurable via inspector

### F6: Garden Journal

- Full-screen journal view (replaces canvas temporarily)
- Each entry: date, title, text notes, tags
- Link entries to specific elements (pre-selection from canvas or pick from within the entry)
- Timeline views: chronological list (default) and calendar view
- Filter/search by text or tags
- Weather snapshot per entry (fetched on demand via Open-Meteo API or entered manually)

### F7: Project Management

- Welcome screen on first launch (create new or import)
- New project flow: name → yard setup (boundary polygon) → canvas
- Yard boundary is a regular editable element (not locked)
- Create, save, load, rename, delete projects
- Auto-save on every change (debounced)
- Export as JSON or PNG image
- Import from JSON (duplicate names get a suffix)

## Out of Scope (for MVP)

- Multi-user / real-time collaboration
- Advanced weather/climate integration (forecasting, alerts, seasonal planning)
- AI-powered suggestions
- Mobile-native app (responsive web is fine)
- E-commerce / seed purchasing integration
- Journal photo support (text only)
- Expanded material library (additional pathway materials, paver patterns — future)

## Behavioral Specification

For detailed interaction behaviors, snap rules, placement mechanics, and edge cases, see `docs/03-behavior-specifications.md`.
