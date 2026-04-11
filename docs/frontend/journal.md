# Journal & Weather

The journal tracks the project's evolution over time with entries linked to canvas elements.

## Access

Opening the journal replaces the canvas [canvas-viewport.md "## Bounded Canvas"] with a full-screen journal view. Closing it returns to the canvas with the project intact.

## Entries

Each entry has: date (default today), title, text content (markdown), tags, and an optional weather snapshot.

### Tags

Tags are freeform labels (e.g., "planting", "harvest", "observation"). When creating or editing an entry, the user can select from existing tags or create new ones. Tag input supports autocomplete suggestions from previously used tags.

## Element Linking

Entries can be linked to specific elements on the canvas. Two mechanisms:

**Pre-selection**: if elements are selected on the canvas [selection-manipulation.md "## Select Tool (V)"] when the user opens the journal and creates a new entry, those elements are automatically linked. Links can be removed from within the entry.

**In-entry linking**: while editing an entry, the user can search or pick elements from a list to add links. Search results are filtered by element type and ID.

### Deleted Elements

When a linked element is deleted from the canvas, the link is preserved in the journal entry. The UI shows it as "deleted element" (grayed out, non-clickable). Links are not automatically removed — this preserves journal history.

### Visibility

Links are not visible on the canvas by default. They are visible in the inspector [selection-manipulation.md "## Inspector Panel"] (selecting an element shows its linked journal entries in a dedicated panel) and in the journal view (each entry shows its linked elements).

## Timeline Views

**List view** (default): chronological, sorted by date (newest first) then by creation time. Scrollable with entries shown as cards.

**Calendar view**: entries displayed on a calendar by date. Dates with entries are highlighted. Click a date to filter and see entries for that day.

Toggle between list and calendar views using the toolbar buttons.

## Search & Filter

Filter entries by:
- **Text search**: matches against title and content (markdown)
- **Tag selection**: filter to entries with a specific tag
- **Date filter** (in calendar view): click a date to show only entries from that date

Only matching entries are shown. Multiple filters can be active simultaneously.

## Weather Integration

Each journal entry has an optional weather snapshot: temperature (C), humidity (%), and condition (enum: sunny, partly-cloudy, cloudy, rainy, snowy, windy).

### Fetch on Demand

The entry editor has a "Fetch Weather" button. Clicking it:
1. Attempts to use coordinates from project settings (if set)
2. Falls back to browser geolocation (with user permission) and saves coordinates to project settings
3. Fetches current weather from the Open-Meteo API (free, no key, no signup)

If weather is successfully fetched, it populates the temperature, condition, and humidity fields.

### Location

**Geolocation**: on first use, the browser prompts for permission via `navigator.geolocation.getCurrentPosition()`. If granted, coordinates are stored in project settings for future requests.

**Manual**: the user can set their location (latitude/longitude) in project settings. Used as fallback when geolocation is unavailable or unwanted.

### Error Handling

If location cannot be determined or the API is unreachable: an inline error message displays (e.g., "Location unavailable. Set coordinates in project settings."). Fields remain empty for manual entry.

### Manual Override

The user can always manually enter or override weather fields after fetching:
- **Temperature** (°C, number with 0.1 precision)
- **Condition** (dropdown with 6 weather types)
- **Humidity** (%, 0–100 integer)

Manual values are saved with the entry and can be edited independently of the fetched values.

## Components

The journal view is composed of focused sub-components (as of ENG-63):
- **JournalView**: main orchestrator; manages entry CRUD, search/filter, view mode
- **JournalToolbar**: header and filter controls (search, tag filter, view toggle)
- **CalendarView**: calendar grid with entry date highlighting and date selection
- **EntryCard**: read-only entry display (card-style preview)
- **EntryEditor**: entry creation/editing form with all fields
- **WeatherDisplay**: renders weather icon, temperature, condition, humidity
- **weatherUtils.ts**: `fetchWeather()` function, WMO code mapping, weather icons
- **markdownUtils.ts**: markdown rendering with safety (HTML escaping, link validation)
