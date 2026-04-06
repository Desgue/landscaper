# Image Generation

Frontend spec for the AI image generation feature: the Generate button, options panel, loading state, result modal, error handling, and how the frontend builds and sends the API request to the backend.

Backend pipeline (segmentation render, prompt construction, Gemini API) is fully covered in `docs/backend/`. This doc owns only the frontend side.

---

## Entry Point: Generate Button

A **"Generate Preview"** button sits in the top toolbar, right side — visually separated from the tool group by a divider. It is always visible and enabled regardless of active tool.

```
┌────────────────────────────────────────────────────────────────┐
│ Logo  [V][H][B][P][S][A][E][T][M]  [↩][↪]  │  [Generate ▶]  ≡ │
└────────────────────────────────────────────────────────────────┘
```

- Label: "Generate Preview" with a spark/wand icon. Abbreviated to "Generate" at narrower widths.
- Color: blue accent `#1971c2`, filled pill button.
- Disabled state: when `project.yardBoundary` is null. Tooltip reads: "Set up a yard boundary before generating."
- Clicking the button opens the **Generate Options Panel**.

---

## Generate Options Panel

A centered modal dialog. Not a popover — it must not close on outside click because the user may interact with it for a while.

### Layout

```
┌──────────────────────────────────────────┐
│  Generate Garden Preview             [✕] │
├──────────────────────────────────────────┤
│  Reference Photo (optional)              │
│  [Upload photo of your yard…]            │
│  [thumbnail if set]   [Remove]           │
├──────────────────────────────────────────┤
│  Garden Style      [dropdown]            │
│  Season            [dropdown]            │
│  Time of Day       [dropdown]            │
│  Viewpoint         [dropdown]            │
│  Aspect Ratio      [dropdown]            │
├──────────────────────────────────────────┤
│  ▸ Advanced                              │
│  (collapsed by default)                  │
│    Seed            [number input]        │
│    Include Planned [toggle]              │
├──────────────────────────────────────────┤
│                    [Cancel]  [Generate]  │
└──────────────────────────────────────────┘
```

### Fields

| Field | Control | Allowed values | Default shown |
|---|---|---|---|
| Garden Style | Dropdown | cottage, formal, tropical, mediterranean, japanese, kitchen, native, contemporary, garden | "garden" |
| Season | Dropdown | early spring, late spring, summer, late summer, autumn, winter, **Auto (detect)** | "Auto (detect)" |
| Time of Day | Dropdown | morning, midday, golden hour, overcast | "golden hour" |
| Viewpoint | Dropdown | eye-level, elevated, isometric | "eye-level" |
| Aspect Ratio | Dropdown | square (1:1), landscape (16:9), portrait (9:16) | "square" |
| Seed | Number input | any integer; empty = random | empty (random) |
| Include Planned | Toggle | on / off | on |

**Season "Auto (detect)" option**: maps to omitting `season` from the request — the backend derives it from `project.location.lat` and the server date. If `project.location` is null, the backend defaults to `"summer"`. The UI label is "Auto (detect from location)" when `project.location` is set, "Auto (defaults to summer)" when not set.

**Reference Photo**: reads from `project.yardPhoto` (pre-filled if stored). Accepts JPEG and PNG. After upload, show a small thumbnail (max 120×80px, cover crop). Clicking "Remove" clears `project.yardPhoto` from project state and calls `markDirty()`.

### Persisting Options

The last-used options (except seed and reference photo) are stored in `project.uiState.lastGenerateOptions` so the panel re-opens with the same settings. `seed` always resets to empty (random). Reference photo is read from `project.yardPhoto` each time.

`project.uiState.lastGenerateOptions` shape:
```json
{
  "gardenStyle": "string | null",
  "season": "string | null",
  "timeOfDay": "string | null",
  "viewpoint": "string | null",
  "aspectRatio": "string | null",
  "includePlanned": true
}
```

`null` means "use default" — the field is omitted from the API request and the backend applies its own default.

---

## Request Construction

When the user clicks **Generate**, the frontend builds the request body as follows:

```typescript
const requestBody = {
  project: {
    ...project,           // spread the full project object
    registries,           // merge registries inside project (see api-contract.md "## Project Field Shape")
  },
  yard_photo: project.yardPhoto ?? undefined,  // top-level field, not inside project
  options: {
    garden_style:     options.gardenStyle  ?? undefined,
    season:           options.season       ?? undefined,  // null → omit → backend derives
    time_of_day:      options.timeOfDay    ?? undefined,
    viewpoint:        options.viewpoint    ?? undefined,
    aspect_ratio:     options.aspectRatio  ?? undefined,
    include_planned:  options.includePlanned,
    seed:             options.seed ?? undefined,          // empty input → omit → backend uses -1
  },
};
```

`registries` comes from the same app state slice as `project`. They are top-level siblings in app state but are merged into the project object for the API request — matching the Go backend's `ProjectPayload.Registries` field. See [api-contract.md "## Project Field Shape"].

The request is sent as `POST /api/generate` with `Content-Type: application/json`. The response is `image/png` bytes on success.

---

## Loading State

After the user clicks **Generate**:

1. The options panel closes immediately.
2. A **full-screen loading overlay** appears (semi-transparent dark background, centered content):

```
┌────────────────────────────────┐
│                                │
│      [spinning ring icon]      │
│   Generating your preview…     │
│   This may take up to 60s      │
│                                │
│         [Cancel]               │
│                                │
└────────────────────────────────┘
```

- The spinner animates continuously. No progress percentage (the backend does not stream progress).
- **Cancel** button sends `AbortController.abort()` to cancel the fetch. On abort: overlay closes, no result modal shown, no error shown. The user returns to the canvas as if nothing happened.
- If the browser tab is closed or navigated away while generating, the request is abandoned silently.

---

## Result Modal

On HTTP 200 (successful PNG response):

1. Loading overlay closes.
2. A **result modal** opens, centered, with the generated image:

```
┌──────────────────────────────────────────────────────────┐
│  Your Garden Preview                                 [✕] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              [generated image, max 80vh]                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [↺ Generate Again]                      [↓ Download]   │
└──────────────────────────────────────────────────────────┘
```

- The image is displayed at its natural resolution, scaled to fit within the modal (max 80vh, maintain aspect ratio). A click expands it to full screen.
- **Download** triggers a browser file download of the PNG with filename `{project.name}-preview.png`.
- **Generate Again** closes the result modal and reopens the Generate Options Panel with the same settings pre-filled (so the user can tweak and retry).
- **[✕]** closes the modal. The generated image is not stored — if the user closes without downloading, it is gone.

---

## Error Handling

On non-200 HTTP response:

1. Loading overlay closes.
2. An **error toast** appears at the top of the screen (non-blocking, 8-second auto-dismiss, also manually dismissible):

| Condition | HTTP | Toast message |
|---|---|---|
| No yard boundary | 400 `"project has no yard boundary"` | "Set up a yard boundary before generating." |
| Other 400 | 400 | "Generation failed: check your options and try again." |
| Gemini error | 502 | "The AI service returned an error. Try again in a moment." |
| Timeout | 504 | "Generation timed out (60s). Try again or simplify your garden layout." |
| Network error (no response) | — | "Could not reach the server. Check your connection." |
| Abort (user cancelled) | — | No toast shown. |

The toast does not show raw error messages from the backend. The `error` field in the JSON response body may be logged to the browser console for debugging but is not shown to the user verbatim.

---

## Reference Photo

`project.yardPhoto` is managed in two places:

1. **Generate Options Panel** — upload / remove during the generation flow.
2. **Inspector or Project Settings** — a dedicated "Yard Reference Photo" section for managing it outside of the generate flow (upload once, persists across generate sessions).

When a new photo is uploaded (either place):
- Validate file type: accept `image/jpeg` and `image/png` only. Other types show inline error: "Please upload a JPEG or PNG image."
- Validate file size: max 5 MB. Larger files show: "Photo too large. Maximum size is 5 MB."
- Convert to base64 string and store in `project.yardPhoto`.
- Call `markDirty()` to trigger auto-save.

When removed:
- Set `project.yardPhoto = null`.
- Call `markDirty()`.

`project.yardPhoto` is stored in IndexedDB but **excluded from JSON export**. See [data-schema.md "### Yard Photo Storage"].

---

## BDD Scenarios

```
Scenario: Generate button disabled when no yard boundary
  Given a project with yardBoundary: null
  When the canvas renders the top toolbar
  Then the "Generate Preview" button is disabled
  And hovering it shows tooltip "Set up a yard boundary before generating."

Scenario: Options panel opens with last-used settings
  Given a project where uiState.lastGenerateOptions.gardenStyle is "cottage"
  When the user clicks "Generate Preview"
  Then the options panel opens with Garden Style pre-selected to "cottage"

Scenario: Season "Auto" omits season from request
  Given the user leaves Season set to "Auto (detect)"
  When the request is built
  Then the request options object has no "season" field

Scenario: User cancels during loading
  Given the loading overlay is showing
  When the user clicks "Cancel"
  Then the fetch is aborted
  And the loading overlay closes
  And no result modal or error toast appears

Scenario: Successful generation shows result modal
  Given a valid project with a yard boundary
  And POST /api/generate returns HTTP 200 with PNG bytes
  When the generation completes
  Then the loading overlay closes
  And the result modal opens displaying the generated image

Scenario: 504 timeout shows specific toast
  Given POST /api/generate returns HTTP 504
  When the generation completes
  Then the loading overlay closes
  And a toast appears with message containing "timed out"
  And the toast auto-dismisses after 8 seconds

Scenario: Uploading an invalid file type shows inline error
  Given the user attempts to upload a GIF as the reference photo
  Then the file is rejected
  And an inline error reads "Please upload a JPEG or PNG image."

Scenario: yardPhoto included as top-level field in request
  Given project.yardPhoto is a non-null base64 string
  When the request body is constructed
  Then the top-level "yard_photo" field equals project.yardPhoto
  And the "project" field does not contain a "yardPhoto" key
```
