# Persistence & Project Management

All data is local. No backend, no user accounts.

## Welcome Screen

Shown when the app opens with no saved projects. Options: create a new project or import a JSON file. The canvas is not shown until a project is created or loaded.

When saved projects exist, the welcome screen shows a project list with options to load, rename, or delete.

## New Project Flow

1. User chooses "Create new project"
2. Prompted for a project name
3. Yard setup screen appears [yard-setup.md "## Define Boundary"]
4. After confirming the yard boundary, the canvas opens. The yard boundary is a regular editable element with no locked status [yard-setup.md "## Boundary as Element"]. When the yard boundary is deleted, the project becomes unbounded — see [yard-setup.md "## Boundary Deletion"]

## Auto-Save

Every meaningful change (place, move, delete, edit) triggers an auto-save after a debounce period of 2 seconds. No user action required. Undo/redo history is also persisted alongside project data — see [## History Storage].

## Save & Load

Projects are persisted locally by name. When the user returns later, they select a project from the list and load it.

## Rename

The user can rename a project from the welcome screen project list or from within the app (via project menu). The new name takes effect immediately. If the new name matches an existing project, a suffix is appended (e.g., "Name (2)").

## Delete

Delete removes the project from the saved list. The user is asked to confirm before deletion.

## JSON Export

Exports the full project data as a downloadable JSON file. See [data-schema.md "## Export Format"] for the exact JSON structure.

## JSON Import

Importing a JSON file creates a new project from the file data and opens it. If the imported file includes `viewport` and `uiState` values, they are restored — the user resumes where they left off. If absent, defaults are applied [data-schema.md "### Viewport defaults"]. If a project with the same name already exists, the imported project is named "Name (2)". If "Name (2)" also exists, increment to "Name (3)", etc. Invalid or missing fields are fixed with safe defaults — see [data-schema.md "## Import Validation & Defaults"] for the full validation table. Imported registries are merged with built-in types — see [data-schema.md "### Import behavior rules"] for merge semantics.

## PNG Export

Exports an image of the full yard extent at 1:1 scale (1cm = 1px), minimum 1920px on the longest side. Includes all visible elements (respecting layer visibility — hidden layers are excluded from export; locked layers are included since locked elements are still visible and rendered normally [layers-groups.md "## Layer Locking"]), the scale bar [canvas-viewport.md "## Scale Bar"], but not the UI chrome (toolbar, palette, inspector, status bar). Cost summary is not included in PNG export.

## History Storage

Undo/redo history is persisted to IndexedDB, keyed by project ID. This allows history to survive page reloads and browser restarts [selection-manipulation.md "## Undo & Redo"].

### Storage Details

- **Store**: IndexedDB database `landscape-planner`, object store `undoHistory`
- **Key**: project UUID
- **Value**: serialized action stack (JSON array of action records)
- **Cap**: last 200 actions. Oldest actions are dropped when the cap is reached.
- **Persistence timing**: history is saved to IndexedDB with the same debounce as auto-save (2 seconds after last change)

### Lifecycle

- **Project load**: restore history from IndexedDB. If the store is missing, corrupted, or the key doesn't exist, start with empty history (no error shown to user).
- **Project delete**: clear the history entry for that project ID.
- **JSON export**: undo history is **not** included in the exported JSON file. History is local-only.
- **JSON import**: imported projects start with empty history.
