# Image Generation

Frontend spec for the AI image generation feature: multi-stage workflow, options panel, loading state, result view, error handling, and how the frontend builds and sends the API request to the backend.

Backend pipeline (segmentation render, prompt construction, Gemini API) is fully covered in `docs/backend/`. This doc owns only the frontend side.

---

## Architecture

The generate workflow is a multi-feature system accessed via `GenerateShell.tsx`. Users navigate between stages (Generate → Variants → Edit → Refine → Export) via a left sidebar. The **Initial Setup** feature (initial) is the primary entry point for first-time generation.

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: navigation, breadcrumbs                            │
├──────────┬─────────────────────────────────────────────────┤
│ Features │  Workspace (image display)                      │
│ - Initial│                                                 │
│ - Multi- │  [controls for current feature below]           │
│   View   │                                                 │
│ - Etc.   ├─────────────────────────────────────────────────┤
│          │  Feature-specific controls (collapsed variants) │
└──────────┴─────────────────────────────────────────────────┘
```

The **Initial Setup** feature opens automatically on first session, showing the generation options panel below the workspace.

---

## Initial Setup Feature

The **Initial Setup** feature is accessed via "Initial Setup" in the left sidebar (first entry). It displays:

1. **Reference Photo section** (top)
   - Label: "REFERENCE PHOTO (OPTIONAL)"
   - Upload area shows a dashed border drop zone with upload icon
   - After upload: thumbnail display (h-24, cover crop) with filename overlay and remove button (X)
   - Accepts: JPEG and PNG only. File size limit: 3 MB.
   - Validation messages appear as alerts (not inline)

2. **Generation Options card** (middle)
   - White rounded card with border
   - Grid of pill-button groups (segmented controls)
   - Each group has a label (uppercase, small) and 3–4 pill options

3. **Generate button** (bottom)
   - Full-width button
   - Shows "Generate" text with Sparkles icon when ready
   - Disabled and shows message "Set up a yard boundary on the canvas first." if `project.yardBoundary` is null
   - Changes to "Cancel" during loading (same button, different label)

### Generation Options

Available options (all use pill-button groups, no dropdowns):

| Field | Allowed values | Default |
|---|---|---|
| **Style** | contemporary, cottage, japanese, tropical, formal | contemporary |
| **Season** | spring, summer, autumn, winter | summer |
| **Time of Day** | morning, afternoon, golden hour | afternoon |
| **View** | eye-level, elevated, overhead, isometric | eye-level |
| **Aspect Ratio** | square (1:1), landscape (4:3), portrait (3:4) | square |

### Reference Photo Storage

- Stored in `useGenerateStore.yardPhoto` (base64 data URL, session-scoped)
- Stored as `useGenerateStore.yardPhotoName` (original filename)
- Not persisted to the project or IndexedDB — users must re-upload each session
- Stripped of data-URL prefix before sending to backend (via `generateClient.buildRequestBody()`)

### Other Fields

The **imageSize** field is defined in the schema but not currently exposed in the Initial Setup UI. It defaults to "1K" in the store. This is reserved for future UI or programmatic use.

The **includePlanned** field is always set to `true` in the store and not exposed in the UI.

---

## Request Construction

When the user clicks **Generate**, `useGenerateStore.generate()` is called, which:

1. Builds the request body via `generateClient.buildRequestBody()`
2. Sends it to `POST /api/generate` with `Content-Type: application/json`
3. Expects image bytes (`image/png` or `image/jpeg`) on HTTP 200

### Request Body Structure

```typescript
const body = {
  project: {
    // Full project object with registries merged in
    // Stripped fields: yardPhoto, uiState, gridConfig, viewport, groups, journalEntries
    ...project,
    registries,
  },
  yard_photo: "...",  // optional, raw base64 (data-URL prefix stripped)
  options: {
    // snake_case field names; null/undefined values omitted
    garden_style: "contemporary",
    season: "summer",
    time_of_day: "afternoon",
    viewpoint: "eye-level",
    aspect_ratio: "square",
    image_size: "1K",  // optional, defaults to "1K"
    include_planned: true,  // always present
    seed: 12345,  // optional, omitted if null/undefined
  },
};
```

See `src/api/generateClient.ts` for the full implementation. Null values in options are omitted from the request (the backend applies defaults).

---

## Loading State

After the user clicks **Generate**:

1. The `status` in `useGenerateStore` changes to `{ kind: 'loading', startedAt: Date.now() }`
2. The **Workspace** component displays a centered loading state:

```
         [shimmer placeholder]
         
         ⟳ Generating your preview...
         
         Xs elapsed
```

- Spinner icon animates continuously (Loader2 icon from lucide-react)
- Text reads "Generating your preview..."
- Elapsed time counter updates every second
- No progress percentage (the backend does not stream progress)

The **Generate** button in the options panel changes to **Cancel**:
- Clicking cancel calls `abort()` on the AbortController
- The fetch is aborted, loading state clears, no toast or error shown
- User is returned to the options panel (status reverts to `idle`)

Browser tab closure/navigation: the fetch is abandoned silently (native browser behavior).

---

## Result View

On HTTP 200 (successful image response):

1. `useGenerateStore.status` changes to `{ kind: 'success' }`
2. `resultUrl` and `resultMimeType` are stored in the generate store
3. **Workspace** displays the result:

```
              [generated image, max 55vh]
              [max-w-full, rounded, shadowed]
              
    [↺ Generate Again]    [↓ Download]
```

- Image is scaled to fit within max 55vh height, maintain aspect ratio
- **Download** button triggers browser download:
  - Filename: `{project.name}-preview.{ext}`
  - Extension derived from MIME type: `image/jpeg` → `jpg`, else `png`
  - Uses `resultMimeType` from store
- **Generate Again** clears the result and sets `activeFeature` back to `'initial'` to show the options panel again

---

## Error Handling

On non-200 HTTP response or network error:

1. `useGenerateStore.status` changes to `{ kind: 'error', message: "..." }`
2. Loading overlay clears (Workspace shows empty state)
3. **ErrorToast** component displays at top of screen (non-blocking, 8-second auto-dismiss, manually dismissible)

Error mapping via `generateClient.mapErrorToToast()`:

| Condition | HTTP/Error | Toast message |
|---|---|---|
| No yard boundary | 400 w/ `"project has no yard boundary"` | "Set up a yard boundary before generating." |
| Yard photo too large | 400 w/ `"yard photo too large"` | "Your reference photo is too large. Use an image under 3 MB." |
| Invalid request / missing project | 400 w/ `"invalid request body"` or `"project is required"` | "Something went wrong. Please try again." |
| Other 400 | 400 | "Generation failed: check your options and try again." |
| Payload too large | 413 | "Your project is too large to send. Try removing some elements." |
| AI service error | 502 | "The AI service returned an error. Try again in a moment." |
| Timeout | 504 | "Generation timed out. Try again or simplify your garden layout." |
| Other server error | 5xx | "Something went wrong on the server. Please try again." |
| Network error (no response) | TypeError | "Could not reach the server. Check your connection." |
| Client 60s timeout | (AbortError with `isTimeout: true`) | "Generation timed out. Try again or simplify your garden layout." |
| User cancelled | AbortError | No toast shown. |

Raw error messages from the backend are not shown to users. Backend `error` fields may be logged to console for debugging.

---

## Key Implementation Details

### Store Integration

- `useGenerateStore` manages all generation state: options, status, results, yard photo
- `useProjectStore` provides the current project (used for yard boundary check, name)
- Options are NOT persisted to the project — they are session-scoped in the store
- Reference photo is NOT persisted — it's session-scoped in the store

### Reference Photo Validation

Photo upload happens in `InitialGeneration.tsx`:

1. File type check: only `image/jpeg` and `image/png` allowed
   - Invalid type: alert "Please upload a JPEG or PNG image."
2. File size check: max 3 MB
   - Too large: alert "Photo too large. Maximum size is 3 MB."
3. On success: read via `FileReader.readAsDataURL()`, store in `useGenerateStore.setYardPhoto(dataUrl, filename)`

### Photo Stripping

The reference photo is stored as a data URL (with `data:image/jpeg;base64,` prefix). Before sending:

```typescript
// In generateClient.buildRequestBody()
body.yard_photo = yardPhoto.replace(/^data:[^;]+;base64,/, '');
```

This strips the prefix so the backend receives raw base64. The backend also strips defensively.

### Request Cleanup

The request body strips the following fields from the project before sending:
- `yardPhoto`, `uiState`, `gridConfig`, `viewport`, `groups`, `journalEntries`

These are ignored by the backend and reduce payload size.
