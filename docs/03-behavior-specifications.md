# Behavior Specifications (BDD)

Gherkin scenarios describing expected application behavior. This is the source of truth for how the app should behave — not how it should be implemented.

All coordinates are stored internally in centimeters. User-facing displays show meters.

---

## Feature: Yard Setup

### Scenario: Yard setup appears after project creation
```gherkin
Given the user has created a new project
Then the yard setup screen is displayed before the canvas
And the user sees a blank workspace for defining the yard boundary
```

### Scenario: Define yard boundary by clicking vertices
```gherkin
Given the yard setup screen is displayed
When the user clicks to place vertices on the workspace
Then each click adds a vertex to the boundary polygon
And edges are drawn between consecutive vertices
And the polygon is visually previewed as vertices are added
```

### Scenario: Type edge dimensions during setup
```gherkin
Given the user has placed two or more vertices
Then each edge displays its current length
When the user clicks on an edge length
Then they can type an exact dimension in meters
And the vertex positions adjust to satisfy the entered dimension
```

### Scenario: Correct dimensions after placement
```gherkin
Given the yard boundary polygon is complete
When the user clicks on any edge
Then they can retype the dimension
And the polygon adjusts to satisfy the new dimension
And other edges recompute accordingly
```

### Scenario: Complete yard setup
```gherkin
Given the user has defined a closed boundary polygon with dimensions
When the user confirms the setup
Then the canvas opens with the yard boundary drawn
And the canvas is bounded to the yard dimensions with overflow area
```

### Scenario: Yard boundary is a regular element
```gherkin
Given the canvas is open with a yard boundary
Then the boundary is a selectable, editable element like any other
And the user can move, resize, or adjust individual vertices
And the user can delete the boundary if desired
```

---

## Feature: Bounded Canvas

### Scenario: Canvas bounds match yard dimensions
```gherkin
Given a yard boundary has been defined
Then the canvas working area corresponds to the yard dimensions
And the yard boundary is visually distinct (e.g., a border outline)
```

### Scenario: Overflow — placing elements outside bounds
```gherkin
Given the canvas has a defined yard boundary
When the user places an element outside the yard boundary
Then the element is placed successfully
And the element is fully functional (selectable, editable, movable)
And the area outside the yard boundary is visually differentiated (e.g., dimmed)
```

---

## Feature: Canvas Navigation

### Scenario: Pan canvas with middle-click drag
```gherkin
Given the canvas is displayed
When the user presses and holds the middle mouse button
And drags the mouse in any direction
Then the canvas viewport moves in the same direction as the drag
And all elements maintain their relative positions
```

### Scenario: Pan canvas with Space+drag
```gherkin
Given the canvas is displayed
And any tool is active
When the user holds the Space key
And presses and drags the left mouse button
Then the canvas viewport moves in the same direction as the drag
And the active tool is not triggered
And releasing Space returns to the previously active tool
```

### Scenario: Pan canvas with two-finger drag
```gherkin
Given the canvas is displayed on a trackpad device
When the user drags with two fingers
Then the canvas viewport moves in the same direction as the drag
```

### Scenario: Zoom with Ctrl+scroll
```gherkin
Given the canvas is displayed
When the user holds Ctrl and scrolls up
Then the canvas zooms in toward the cursor position
When the user holds Ctrl and scrolls down
Then the canvas zooms out from the cursor position
```

### Scenario: Zoom with pinch gesture
```gherkin
Given the canvas is displayed on a trackpad or touch device
When the user pinches outward
Then the canvas zooms in toward the center of the pinch
When the user pinches inward
Then the canvas zooms out from the center of the pinch
```

### Scenario: Fit to view
```gherkin
Given the canvas contains one or more elements
When the user presses Ctrl+Shift+1
Then the viewport adjusts to show all elements with padding
And the zoom level is set so all elements fit within the visible area
```

### Scenario: Fit to view via minimap
```gherkin
Given the minimap is visible
And the canvas contains one or more elements
When the user double-clicks the minimap
Then the viewport adjusts to show all elements with padding
```

### Scenario: Hand/Pan tool
```gherkin
Given the Hand/Pan tool is active (H key)
When the user clicks and drags on the canvas
Then the canvas viewport moves in the same direction as the drag
And no elements are selected or modified
And the cursor shows a grab/hand icon
```

---

## Feature: Rulers

### Scenario: Rulers display along canvas edges
```gherkin
Given the canvas is displayed
Then rulers are visible along the top and left edges of the canvas
And the rulers show major measurement markings at 1-meter intervals
And when zoomed in, minor markings appear at 10cm intervals
```

### Scenario: Rulers update with pan and zoom
```gherkin
Given the canvas is displayed with rulers
When the user pans or zooms the canvas
Then the ruler markings update to reflect the current viewport position and scale
```

---

## Feature: Grid System

### Scenario: Multi-resolution grid
```gherkin
Given the canvas is displayed
Then major grid lines are drawn at 1-meter intervals
And major grid lines are always visible at any zoom level
When the user zooms in past a threshold
Then minor grid lines appear at 10cm intervals
And minor grid lines are visually lighter than major grid lines
```

### Scenario: Grid appearance at different zoom levels
```gherkin
Given the canvas is displayed
When the zoom level is low (zoomed out)
Then only major grid lines (1m) are visible and subtle
And minor grid lines (10cm) are hidden
When the zoom level is high (zoomed in)
Then major grid lines are prominent
And minor grid lines are visible
```

### Scenario: Grid display is independent of snap
```gherkin
Given the canvas is displayed
Then grid visibility and snap behavior are independently toggleable
When the user toggles grid visibility off
Then the grid lines are hidden but snapping still functions
When the user toggles snap off
Then elements are placed freely but the grid remains visible
```

---

## Feature: Snap System

### Scenario: Default snap increment is 10cm
```gherkin
Given snapping is enabled
When the user places or moves an element
Then the element's position snaps to the nearest 10cm increment
```

### Scenario: Snap rounding
```gherkin
Given snapping is enabled
When the user clicks at world position 2.74m (274cm)
Then the position snaps to 2.70m (270cm)
When the user clicks at world position 2.76m (276cm)
Then the position snaps to 2.80m (280cm)
When the user clicks at world position 2.75m (275cm)
Then the position snaps to 2.80m (280cm)
```

### Scenario: Disable snapping with Alt
```gherkin
Given any placement tool except Text/Label is active
When the user holds Alt and clicks on the canvas
Then the element is placed at the exact cursor world position
And the element is not snapped to any increment
```

### Scenario: Alt modifier is inverted for labels
```gherkin
Given the Text/Label tool is active
Then labels are placed freely (no snapping) by default
When the user holds Alt and clicks on the canvas
Then the label snaps to the nearest 10cm increment
```

### Scenario: Geometry snapping — edge alignment
```gherkin
Given snapping is enabled
And an element exists on the canvas
When the user places or moves another element near the first element's edge
Then a snap guide appears showing the edge alignment
And the element snaps to align its edge with the nearby element's edge
```

### Scenario: Geometry snapping — perpendicular alignment
```gherkin
Given snapping is enabled
And a straight structure (e.g., a fence) exists on the canvas
When the user places or draws another element meeting the structure at ~90 degrees
Then a snap guide appears showing the perpendicular alignment
And the element snaps to form an exact 90-degree angle
```

### Scenario: Geometry snapping — midpoint alignment
```gherkin
Given snapping is enabled
And an element exists on the canvas
When the user places or moves another element near the first element's midpoint
Then a snap guide appears showing the midpoint alignment
And the element snaps to align with the midpoint
```

### Scenario: Adaptive snap tolerance
```gherkin
Given snapping is enabled
When the user is zoomed in (high zoom level)
Then the snap detection radius is small (precise placement)
When the user is zoomed out (low zoom level)
Then the snap detection radius is larger (easier target acquisition)
```

### Scenario: Snap guides visual feedback
```gherkin
Given snapping is enabled
When an element is being placed or moved near a snap point
Then a visual guide line or indicator appears showing the snap alignment
And the guide disappears when the element moves away from the snap point
```

---

## Feature: Terrain Painting

### Scenario: Paint a single terrain cell
```gherkin
Given the Terrain Brush tool is active
And a terrain type is selected (e.g., "Grass")
When the user clicks on the canvas
Then the grid cell under the cursor is filled with the selected terrain type's color
And the terrain element occupies exactly one grid cell (1m x 1m)
And the terrain snaps to the nearest 10cm-aligned cell boundary
```

### Scenario: Paint terrain by dragging
```gherkin
Given the Terrain Brush tool is active
And a terrain type is selected
When the user clicks and drags across the canvas
Then every grid cell the cursor passes through is filled with the selected terrain type
```

### Scenario: Brush size 2x2
```gherkin
Given the Terrain Brush tool is active
And the brush size is set to 2x2
When the user clicks on the canvas
Then a 2x2 area of grid cells (2m x 2m) is painted
And the clicked cell is the top-left cell of the painted area
```

### Scenario: Brush size 3x3
```gherkin
Given the Terrain Brush tool is active
And the brush size is set to 3x3
When the user clicks on the canvas
Then a 3x3 area of grid cells (3m x 3m) is painted
And the clicked cell is the top-left cell of the painted area
```

### Scenario: Terrain overwrites existing terrain
```gherkin
Given a grid cell contains terrain of type "Grass"
And the Terrain Brush tool is active with type "Soil"
When the user clicks on that grid cell
Then the cell's terrain type changes to "Soil"
```

### Scenario: Erase terrain
```gherkin
Given a grid cell contains terrain
And the Eraser tool is active
When the user clicks on that grid cell
Then the terrain is removed from that cell
And the cell returns to the default empty canvas background
```

### Scenario: Erase any element
```gherkin
Given the Eraser tool is active
When the user clicks on any element (plant, structure, path, or label)
Then that element is removed from the canvas
```

### Scenario: Erase by dragging
```gherkin
Given the Eraser tool is active
When the user clicks and drags across the canvas
Then all elements the cursor passes over are removed
```

### Scenario: Terrain fills cell completely
```gherkin
Given a terrain element is placed in a grid cell
Then the terrain's visual bounds exactly match the cell's edges
And there is no gap between adjacent terrain cells of the same type
```

---

## Feature: Plant Placement

### Scenario: Place a plant from the palette
```gherkin
Given the Plant tool is active
And a plant type is selected (e.g., "Tomato" with spacingCm 60)
When the user clicks on the canvas
Then a plant element is placed at the snap-aligned position
And the plant icon is visually centered within its grid cell
```

### Scenario: Plant visual size reflects spacing
```gherkin
Given a plant type has a spacingCm of 60
And the grid cell represents 1 square meter (100cm)
When the plant is rendered on the canvas
Then the plant icon occupies an area proportional to 60cm within the 100cm cell
And the plant icon is centered within the grid cell
And visible space remains between the plant icon and the cell edges
```

### Scenario: Small plant vs large plant
```gherkin
Given a "Carrot" plant has spacingCm of 5
And a "Tomato" plant has spacingCm of 60
When both are placed on the canvas
Then the Carrot icon appears significantly smaller than the Tomato icon
And both are centered within their respective grid cells
```

### Scenario: Drag plant from palette to canvas
```gherkin
Given the side palette is showing the Plants tab
When the user drags a plant type from the palette onto the canvas
Then a preview of the plant follows the cursor
And the preview snaps to the grid as the cursor moves
When the user releases the mouse button
Then the plant is placed at the snapped position
```

### Scenario: Plant placement does not affect terrain
```gherkin
Given a grid cell contains terrain of type "Soil"
When the user places a plant in that cell
Then the plant appears on top of the terrain
And the terrain remains unchanged
```

### Scenario: Plant default status
```gherkin
Given the user places a new plant on the canvas
Then the plant's status is set to "planned"
```

---

## Feature: Structure Placement

### Scenario: Place a straight structure by clicking
```gherkin
Given the Structure tool is active
And a structure type is selected (e.g., "Raised Bed")
When the user clicks on the canvas
Then a structure is placed at the snapped position with default dimensions
And the structure's edges align to 10cm snap increments
```

### Scenario: Place a structure by dragging
```gherkin
Given the Structure tool is active
And a structure type is selected
When the user clicks and drags to define an area
Then a structure is placed spanning the defined area
And the structure's edges align to 10cm snap increments
```

### Scenario: Structure can be straight or curved
```gherkin
Given a structure is placed on the canvas
Then the structure has a shape property: straight (default) or curved (arc)
And the shape property is editable via the inspector panel
```

### Scenario: Curved structure displays as an arc
```gherkin
Given a structure has its shape set to curved
Then the structure renders as an arc between its start and end points
And the arc radius is editable via the inspector or by dragging the arc handle
```

### Scenario: Structure snapping
```gherkin
Given the Structure tool is active
When the user places or resizes a structure
Then the structure edges snap to 10cm increments by default
And geometry snapping (edge, perpendicular, midpoint) is active
When the user holds Alt while placing or resizing
Then snapping is disabled and the structure is positioned freely
```

### Scenario: Structures and plants can overlap
```gherkin
Given a structure (e.g., "Raised Bed") is placed on the canvas
When the user places a plant inside the structure's area
Then the plant is placed successfully
And the plant renders on top of the structure
And the structure remains unchanged
```

### Scenario: Structures and terrain can overlap
```gherkin
Given terrain is painted on the canvas
When the user places a structure over the terrain
Then the structure renders on top of the terrain
And the terrain remains unchanged
```

---

## Feature: Arc Tool

### Scenario: Draw an arc
```gherkin
Given the Arc tool is active
When the user clicks to set the start point
And clicks to set the end point
And drags to set the arc radius
Then an arc is drawn between the start and end points with the specified radius
And the arc snaps to 10cm increments by default
```

### Scenario: Arc preview during creation
```gherkin
Given the Arc tool is active
And the user has placed the start point
When the user moves the cursor to set the end point
Then a straight preview line follows the cursor
After the user clicks the end point and begins dragging
Then an arc preview follows the cursor showing the radius change in real time
```

### Scenario: Arc snapping
```gherkin
Given the Arc tool is active
Then start point, end point, and radius snap to 10cm increments
And geometry snapping (edge, perpendicular) is active for start and end points
When the user holds Alt
Then snapping is disabled for free placement
```

### Scenario: Edit arc after placement
```gherkin
Given an arc element is selected
Then handles are shown for start point, end point, and radius
When the user drags any handle
Then the arc updates in real time
And the handle position snaps to 10cm increments by default
```

---

## Feature: Path & Border Elements

### Scenario: Place a path from the palette
```gherkin
Given the side palette is showing the Paths tab
When the user clicks on a path type (e.g., "Brick Edging")
Then the path tool is activated in stamp mode
And the user can click on the canvas to place path segments
```

### Scenario: Draw a straight path
```gherkin
Given the path tool is active
When the user clicks a start point and clicks an end point
Then a straight path segment is drawn between the two points
And the path snaps to 10cm increments
And geometry snapping is active (edge, perpendicular, midpoint)
```

### Scenario: Draw a curved path
```gherkin
Given the path tool is active
When the user clicks a start point, clicks an end point, and drags to set arc radius
Then a curved path segment is drawn as an arc between the two points
And the path snaps to 10cm increments
```

### Scenario: Path can be straight or curved per segment
```gherkin
Given a path element exists on the canvas
Then each segment of the path can independently be straight or curved
And the user can convert a straight segment to curved (and vice versa) via the inspector
```

### Scenario: Path visual appearance
```gherkin
Given a path element is placed on the canvas
Then the path renders with a visible width proportional to its real-world width
And the path type determines the visual style (e.g., brick pattern, stone, etc.)
```

### Scenario: Path and other elements can overlap
```gherkin
Given a path is placed on the canvas
When the user places terrain, plants, or structures overlapping the path
Then all elements are placed successfully
And render order is maintained (terrain → paths → structures → plants → labels)
```

---

## Feature: Selection & Manipulation

### Scenario: Select a single element
```gherkin
Given the Select tool is active
When the user clicks on an element
Then that element is selected
And the element shows a bounding box with resize handles
And the inspector panel shows that element's properties
```

### Scenario: Add to selection
```gherkin
Given the Select tool is active
And one element is already selected
When the user Shift+clicks on another element
Then both elements are selected
```

### Scenario: Box select — fully enclosed
```gherkin
Given the Select tool is active
When the user clicks and drags on empty space to draw a selection box
Then all elements fully enclosed by the box are selected
And elements only partially intersecting the box are not selected
```

### Scenario: Box select — partial intersection with modifier
```gherkin
Given the Select tool is active
When the user holds Shift and drags to draw a selection box
Then all elements that partially intersect the box are selected
```

### Scenario: Deselect
```gherkin
Given one or more elements are selected
When the user clicks on empty canvas space (without Shift)
Then all elements are deselected
And the inspector panel shows "Nothing selected"
```

### Scenario: Move selected elements
```gherkin
Given one or more elements are selected
When the user drags the selection
Then the elements move freely following the cursor
And the elements do not snap during or after the move
```

### Scenario: Move with snapping
```gherkin
Given one or more elements are selected
When the user holds Alt and drags the selection
Then the elements snap to 10cm increments as they move
And geometry snapping is active during the move
```

### Scenario: Delete selected elements
```gherkin
Given one or more elements are selected
When the user presses Delete or Backspace
Then the selected elements are removed from the canvas
```

### Scenario: Copy and paste
```gherkin
Given one or more elements are selected
When the user presses Ctrl+C
Then the selection is copied to the clipboard
When the user presses Ctrl+V
Then the copied elements are placed at the current cursor position
And the pasted elements snap to 10cm increments
And the pasted elements become the active selection
```

### Scenario: Undo
```gherkin
Given the user has performed one or more actions on the canvas
When the user presses Ctrl+Z
Then the last action is reversed
And the canvas returns to its state before that action
```

### Scenario: Redo
```gherkin
Given the user has undone an action
When the user presses Ctrl+Shift+Z
Then the undone action is re-applied
```

### Scenario: Resize terrain
```gherkin
Given a terrain element is selected
When the user drags a resize handle
Then the terrain area expands or contracts
And the edges snap to 10cm increments
```

### Scenario: Resize structure
```gherkin
Given a structure element is selected
When the user drags a resize handle
Then the structure expands or contracts
And the edges snap to 10cm increments by default
```

### Scenario: Plants cannot be resized
```gherkin
Given a plant element is selected
Then no resize handles are shown
And the plant's size is determined solely by its spacingCm property
```

### Scenario: Rotate a structure
```gherkin
Given a structure element is selected
When the user rotates the element (via handle or shortcut)
Then the structure rotates around its center point
And the rotation is preserved when deselected
```

### Scenario: Only structures can be rotated
```gherkin
Given a terrain element is selected
Then no rotation handle is shown
Given a plant element is selected
Then no rotation handle is shown
Given a label element is selected
Then no rotation handle is shown
```

---

## Feature: Labels & Annotations

### Scenario: Place a label
```gherkin
Given the Text/Label tool is active
When the user clicks on the canvas
Then a text input appears at the cursor position
And the label is placed freely without snapping
```

### Scenario: Place a label with snapping
```gherkin
Given the Text/Label tool is active
When the user holds Alt and clicks on the canvas
Then the label snaps to the nearest 10cm increment
```

### Scenario: Edit label text
```gherkin
Given a label is placed on the canvas
When the user double-clicks the label
Then the label enters edit mode
And the user can modify the text
When the user clicks outside the label or presses Escape
Then the edit mode ends and the text is saved
```

### Scenario: Resize label text box
```gherkin
Given a label element is selected
When the user drags a resize handle
Then the text box expands or contracts
And the text wraps within the new bounds
```

### Scenario: Label styling via inspector
```gherkin
Given a label element is selected
Then the inspector panel shows font size, font color, text alignment, bold, and italic options
When the user changes any of these properties
Then the label's appearance updates immediately on the canvas
```

---

## Feature: Inspector Panel

### Scenario: Nothing selected
```gherkin
Given no elements are selected on the canvas
Then the inspector panel displays "Nothing selected"
```

### Scenario: Single element selected
```gherkin
Given a single element is selected
Then the inspector panel shows properties specific to that element's type
```

### Scenario: Terrain selected
```gherkin
Given a terrain element is selected
Then the inspector shows: terrain type, dimensions (in meters)
```

### Scenario: Plant selected
```gherkin
Given a plant element is selected
Then the inspector shows: plant name, planted date, spacing, status, quantity, notes, sun requirement, water need, season, days to harvest, and companion plants
And the user can edit all of these properties
And changes apply immediately to the element
```

### Scenario: Structure selected
```gherkin
Given a structure element is selected
Then the inspector shows: structure type, dimensions (in meters), shape (straight/curved), and notes
When the shape is curved
Then the inspector also shows the arc radius
```

### Scenario: Path selected
```gherkin
Given a path element is selected
Then the inspector shows: path type, width (in cm), total length (in meters), and segment details
And each segment can be toggled between straight and curved
And curved segments show an editable arc radius
```

### Scenario: Multiple elements selected
```gherkin
Given multiple elements are selected
Then the inspector shows the properties of the first (primary) selected element
```

---

## Feature: Side Palette

### Scenario: Palette tabs
```gherkin
Given the side palette is visible
Then it shows tabs for Terrain, Plants, Structures, and Paths
And each tab displays the available types for that category
```

### Scenario: Click palette item to activate stamp mode
```gherkin
Given the side palette is visible
When the user clicks on a palette item (e.g., a plant type)
Then that item becomes the active stamp
And the corresponding tool is activated (e.g., Plant tool)
And subsequent clicks on the canvas place that item
Until the user presses Escape or switches tools
```

### Scenario: Path tool activation via palette only
```gherkin
Given the side palette is showing the Paths tab
When the user clicks on a path type
Then the path tool is activated
And the user can draw path segments on the canvas
Note: the path tool has no toolbar button or keyboard shortcut — it is activated only via the palette
```

### Scenario: Drag palette item to canvas
```gherkin
Given the side palette is visible
When the user drags an item from the palette onto the canvas
Then a preview follows the cursor
And releasing the mouse places the item at the snapped position
```

### Scenario: Search filters across all tabs
```gherkin
Given the side palette is visible
When the user types in the search field
Then results are filtered across all tabs (terrain, plants, structures, paths)
And results are grouped by tab
And if matches exist only in a non-active tab, the palette auto-switches to that tab
```

### Scenario: Collapse palette
```gherkin
Given the side palette is visible
When the user clicks the collapse button
Then the palette collapses to a narrow strip or hides entirely
And the canvas area expands to fill the freed space
```

---

## Feature: Minimap

### Scenario: Minimap shows yard and elements
```gherkin
Given the canvas contains elements
And a yard boundary is defined
And the minimap is visible
Then the minimap shows the yard boundary outline
And the minimap shows a scaled-down view of all elements
And a rectangle indicates the current viewport position
```

### Scenario: Minimap navigation
```gherkin
Given the minimap is visible
When the user clicks on a position in the minimap
Then the canvas viewport pans to center on that position
```

---

## Feature: Status Bar

### Scenario: Status bar displays zoom level
```gherkin
Given the canvas is displayed
Then the status bar shows the current zoom level as a percentage
```

### Scenario: Status bar displays cursor coordinates
```gherkin
Given the canvas is displayed
When the user moves the cursor over the canvas
Then the status bar shows the cursor's world position in meters (with cm precision)
And the coordinates update in real time as the cursor moves
```

### Scenario: Status bar displays snap and grid state
```gherkin
Given the canvas is displayed
Then the status bar indicates whether grid visibility is on or off
And the status bar indicates whether snapping is on or off
```

---

## Feature: Persistence

### Scenario: Auto-save on change
```gherkin
Given the user has an active project
When the user makes a meaningful change (place, move, delete, edit)
Then the project is automatically saved after a short debounce period (2-3 seconds)
And no user action is required to trigger the save
```

### Scenario: Welcome screen on first launch
```gherkin
Given the user opens the app with no saved projects
Then a welcome screen is displayed
And the welcome screen offers options to create a new project or import a JSON file
And the canvas is not shown until a project is created or loaded
```

### Scenario: Create new project
```gherkin
Given the welcome screen is displayed
When the user chooses to create a new project
Then they are prompted for a project name
And the yard setup screen is displayed
```

### Scenario: Save and load named projects
```gherkin
Given the user has a project open
When the user saves the project
Then it is persisted locally with its name
When the user returns to the app later
Then they can select the project from a list and load it
```

### Scenario: Export project as JSON
```gherkin
Given the user has a project open
When the user exports the project
Then a JSON file is downloaded containing the full project data
```

### Scenario: Import project from JSON
```gherkin
Given the user has a JSON project file
When the user imports the file
Then a new project is created from the file data
And the imported project is opened on the canvas
```

### Scenario: Import with duplicate name
```gherkin
Given a project named "My Garden" already exists
When the user imports a JSON file with the name "My Garden"
Then a new project is created named "My Garden (2)"
And the existing project is not modified
```

### Scenario: Export project as image
```gherkin
Given the user has a project with elements on the canvas
When the user exports as PNG
Then a high-resolution image is downloaded
And the image includes all visible elements but not the UI chrome
```

### Scenario: Rename project
```gherkin
Given the user has a project open or is on the welcome screen project list
When the user renames a project
Then they can type a new name
And the project is saved with the new name
```

### Scenario: Delete project
```gherkin
Given the user has multiple saved projects
When the user deletes a project
Then the project is removed from the saved list
And the user is asked to confirm before deletion
```

---

## Feature: Journal

### Scenario: Access the journal
```gherkin
Given the user has a project open
When the user opens the journal
Then the canvas is replaced by the journal view
And the journal shows a list of entries for this project
```

### Scenario: Return to canvas from journal
```gherkin
Given the journal view is displayed
When the user closes the journal
Then the canvas is displayed again with the project intact
```

### Scenario: Create a journal entry
```gherkin
Given the journal view is displayed
When the user creates a new entry
Then a new entry is created with today's date
And the user can enter a title, text content, and tags
And the entry includes an optional weather snapshot section
```

### Scenario: Link elements to journal entry via pre-selection
```gherkin
Given the user has selected elements on the canvas
When the user opens the journal and creates a new entry
Then the selected elements are automatically linked to the new entry
And the user can see which elements are linked
And the user can remove links from within the entry
```

### Scenario: Link elements from within the journal entry
```gherkin
Given the user is editing a journal entry
When the user adds element links
Then they can search or pick elements from a list
And the selected elements are linked to the entry
```

### Scenario: Journal timeline — list view
```gherkin
Given the journal view is displayed
Then entries are shown as a chronological list (newest first)
And the user can scroll through all entries
```

### Scenario: Journal timeline — calendar view
```gherkin
Given the journal view is displayed
When the user switches to calendar view
Then entries are displayed on a calendar by their date
And the user can click a date to see entries for that day
```

### Scenario: Filter and search journal
```gherkin
Given the journal view is displayed
When the user enters a search term or selects a tag filter
Then only matching entries are shown
```

### Scenario: Journal entry tags
```gherkin
Given the user is creating or editing a journal entry
Then the user can add tags (e.g., "planting", "harvest", "observation")
And tags are selectable from existing tags or created as new
```

---

## Feature: Weather Integration

### Scenario: Fetch weather on demand
```gherkin
Given the user is creating or editing a journal entry
When the user clicks the "Fetch weather" button
Then the app requests the user's location
And fetches current weather data from the weather API
And pre-fills the weather fields (temperature, humidity, condition)
```

### Scenario: Location via geolocation
```gherkin
Given the user clicks "Fetch weather" for the first time
When the browser prompts for geolocation permission
And the user grants permission
Then the app uses the device's coordinates to fetch weather
And the location is remembered for future requests
```

### Scenario: Location via manual entry
```gherkin
Given the user has not granted geolocation permission
Or the user wants to set a specific location
When the user opens project settings
Then they can enter their location (city or coordinates)
And this location is used for weather requests
```

### Scenario: Weather API unavailable
```gherkin
Given the user clicks "Fetch weather"
When the weather API is unreachable or returns an error
Then an inline message displays "Weather unavailable"
And the weather fields remain empty for manual entry
```

### Scenario: Manual weather entry
```gherkin
Given the user is editing a journal entry
Then the user can manually enter or override weather fields (temperature, humidity, condition)
And manual values are saved with the entry
```
