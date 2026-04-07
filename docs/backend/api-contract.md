# API Contract

Defines the HTTP interface for `POST /api/generate`: request shape, option defaults, response format, validation rules, and BDD scenarios. Route registration is in [server.md "## Routes"].

---

## Endpoint

```
POST /api/generate
Content-Type: application/json
Accept: image/png
```

---

## Request Body

```json
{
  "project":    { "...full JSON export per data-schema.md ## Export Format..." },
  "yard_photo": "string (base64-encoded JPEG or PNG of the real yard) | omit for segmentation-only generation",
  "options": {
    "include_planned": "boolean (default: true)",
    "garden_style":    "cottage | formal | tropical | mediterranean | japanese | kitchen | native | contemporary | garden",
    "season":          "early spring | late spring | summer | late summer | autumn | winter",
    "time_of_day":     "morning | midday | golden hour | overcast",
    "viewpoint":       "eye-level | elevated | isometric",
    "aspect_ratio":    "square | landscape | portrait",
    "image_size":      "1K | 2K | 4K",
    "seed":            "integer | -1 (default: -1 = random)"
  }
}
```

`options` is optional. All `options` fields are optional. `yard_photo` is optional — when omitted, generation uses the segmentation map only. When present, the yard photo is passed to Gemini as a second reference image alongside the segmentation map, grounding the output in the real yard's perspective and lighting. See [data-schema.md "## Export Format"] for the full `project` JSON shape.

---

## Options and Defaults

Defaults are applied after validation passes. Fields present but set to an unrecognized value are rejected before defaults are applied.

| Field | Type | Allowed values | Default |
|---|---|---|---|
| `include_planned` | boolean | `true`, `false` | `true` |
| `garden_style` | string | `cottage`, `formal`, `tropical`, `mediterranean`, `japanese`, `kitchen`, `native`, `contemporary`, `garden` | `"garden"` |
| `season` | string | `early spring`, `late spring`, `summer`, `late summer`, `autumn`, `winter` | derived — see [prompt-construction.md "## Season Derivation"] |
| `time_of_day` | string | `morning`, `midday`, `golden hour`, `overcast` | `"golden hour"` |
| `viewpoint` | string | `eye-level`, `elevated`, `isometric` | `"eye-level"` |
| `aspect_ratio` | string | `square`, `landscape`, `portrait` | `"square"` |
| `image_size` | string | `1K`, `2K`, `4K` | `"1K"` |
| `seed` | integer | any integer; `-1` = random | `-1` |

When `options.season` is omitted: derive from `project.location.lat` and the server date. If `project.location` is null or `lat` is null, default to `"summer"`. Full derivation logic in [prompt-construction.md "## Season Derivation"].

---

## Response Spec

### Success — 200 Image

```
HTTP 200
Content-Type: image/png or image/jpeg (whichever Gemini returns)
Body: raw image bytes
```

Output dimensions per `aspect_ratio`:

| `aspect_ratio` | Dimensions | Gemini aspect_ratio |
|---|---|---|
| `square` | 1024 × 1024 px | `1:1` |
| `landscape` | 1024 × 768 px (4:3) | `4:3` |
| `portrait` | 768 × 1024 px (3:4) | `3:4` |

Output resolution scales with `image_size` (`1K` ≈ 1024px, `2K` ≈ 2048px, `4K` ≈ 4096px on the largest dimension). The Content-Type header reflects whichever format Gemini returns.

### Error — 4xx / 5xx JSON

```
HTTP 4xx / 5xx
Content-Type: application/json
Body: { "error": "string" }
```

---

## Project Field Shape

The `project` field in the request body is **not** the raw JSON export file. The frontend constructs it by merging the project object and registries before sending:

```
JSON export file shape:          API request project field shape:
{                                {
  "version": "1.0",               "id": "...",
  "exportedAt": "...",            "location": { ... },
  "project": {          ──►      "yardBoundary": { ... },
    "id": "...",                  "layers": [ ... ],
    "location": { ... },          "elements": [ ... ],
    "yardBoundary": { ... },      "registries": {         ◄── merged in from top-level
    "layers": [ ... ],              "terrain": [ ... ],
    "elements": [ ... ]             "plants": [ ... ],
  },                               "structures": [ ... ],
  "registries": {                  "paths": [ ... ]
    "terrain": [ ... ],          }
    "plants": [ ... ],         }
    ...
  }
}
```

The frontend reads `project` and `registries` from app state and merges them into one object for the request. Fields not needed by the backend (`version`, `exportedAt`, `gridConfig`, `viewport`, `uiState`, `groups`, `journalEntries`, etc.) may be included or omitted — the backend ignores them.

See [go-types.md "## File: internal/model/request.go"] for the exact Go struct that defines what the backend reads.

---

## yard_photo Field Disambiguation

`yard_photo` appears in two places. They are related but distinct:

| Context | Field path | Type | Lifecycle |
|---|---|---|---|
| **API request** | `request.yard_photo` | top-level string (base64) | Per-request; sent by frontend when calling generate |
| **Project storage** | `project.yardPhoto` (frontend schema) | stored in IndexedDB | Persisted with the project; excluded from JSON export |

The frontend reads `project.yardPhoto` from app state and copies it to the top-level `yard_photo` field when building the API request. The backend only sees `request.yard_photo` — it never reads `project.yardPhoto` (that field, if present in the project JSON, is inside the project object and the backend ignores it).

```
Frontend app state                     API request body
──────────────────                     ────────────────
project.yardPhoto  ──(read + copy)──►  yard_photo: "..."    ← top-level
project.elements                       project: {
project.layers                           elements: [...],
...                                      layers: [...],
registries                               registries: {...},
                                         ...
                                       }
```

See [data-schema.md "### Yard Photo Storage"] for how `project.yardPhoto` is stored and why it is excluded from JSON export.

---

## Request Validation

Validated before any rendering begins. All invalid requests return HTTP 400 immediately unless stated otherwise.

| Field | Validation | Error message |
|---|---|---|
| Body | Valid JSON, non-empty | `"invalid request body"` |
| Body size | <= 10 MB | `"request body too large"` (HTTP 413) |
| `project` | Present, non-null object | `"project is required"` |
| `project.yardBoundary` | Non-null, `vertices` array with >= 3 valid `{x, y}` entries | `"project has no yard boundary"` |
| `options.garden_style` | One of 9 allowed values if present | `"invalid garden_style"` |
| `options.season` | One of 6 allowed values if present | `"invalid season"` |
| `options.time_of_day` | One of 4 allowed values if present | `"invalid time_of_day"` |
| `options.viewpoint` | One of 3 allowed values if present | `"invalid viewpoint"` |
| `options.aspect_ratio` | One of 3 allowed values if present | `"invalid aspect_ratio"` |
| `options.image_size` | One of 3 allowed values (`1K`, `2K`, `4K`) if present | `"invalid image_size"` |
| `options.seed` | Integer or omitted; `-1` means random | `"invalid seed"` |
| `options.include_planned` | Boolean or omitted | `"invalid include_planned"` |
| `yard_photo` | Valid base64 string decoding to JPEG or PNG magic bytes if present | `"invalid yard_photo"` |

`project.elements` and `project.registries` are not validated at request time — missing or unknown registry entries are handled during rendering. `yard_photo` magic byte check: JPEG starts with `\xFF\xD8\xFF`; PNG starts with `\x89PNG\r\n\x1a\n`. Validation decodes the base64 and inspects the first 8 bytes only — the full image is not validated.

---

## Error Response Format

All errors return a JSON body with a single `error` field:

```json
{ "error": "string" }
```

Exact error strings per case:

| Condition | HTTP | `error` value |
|---|---|---|
| Body is not valid JSON | 400 | `"invalid request body"` |
| Request body exceeds 10 MB | 413 | `"request body too large"` |
| `project` missing or null | 400 | `"project is required"` |
| `project.yardBoundary` null or < 3 vertices | 400 | `"project has no yard boundary"` |
| `options.garden_style` unrecognized | 400 | `"invalid garden_style"` |
| `options.season` unrecognized | 400 | `"invalid season"` |
| `options.aspect_ratio` unrecognized | 400 | `"invalid aspect_ratio"` |
| `options.image_size` unrecognized | 400 | `"invalid image_size"` |
| `options.viewpoint` unrecognized | 400 | `"invalid viewpoint"` |
| `options.time_of_day` unrecognized | 400 | `"invalid time_of_day"` |
| Segmentation render failure | 500 | `"segmentation render failed"` |
| No image part in Gemini response | 502 | `"no image in Nano Banana response"` |
| Gemini API returns error | 502 | `"Nano Banana error: {upstream message}"` |
| `yard_photo` present but invalid base64 or wrong format | 400 | `"invalid yard_photo"` |
| `options.include_planned` unrecognized | 400 | `"invalid include_planned"` |
| Gemini API timeout (> 60s) | 504 | `"image generation timed out"` |

Gemini error handling is defined in [gemini-client.md "## Error Handling"].

---

## BDD Scenarios

### Scenario: Valid request with all options specified

```
Scenario: Valid request with all options
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options specifying garden_style, season, time_of_day, viewpoint, aspect_ratio, seed, and include_planned
  When POST /api/generate is called
  Then the response status is 200
  And the Content-Type header is image/jpeg or image/png
  And the response body is a valid image
```

### Scenario: Valid request with no options (all defaults applied)

```
Scenario: Valid request with no options
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And the request body contains no options object
  When POST /api/generate is called
  Then the response status is 200
  And the Content-Type header is image/jpeg or image/png
  And the response body is a valid image
```

### Scenario: Body is not valid JSON

```
Scenario: Invalid JSON body
  Given a request body that is not parseable as JSON
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid request body" }
```

### Scenario: project field is missing

```
Scenario: Missing project field
  Given a valid JSON body that contains no project field
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "project is required" }
```

### Scenario: project.yardBoundary is null

```
Scenario: Null yard boundary
  Given a valid project JSON where yardBoundary is null
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "project has no yard boundary" }
```

### Scenario: project.yardBoundary.vertices has fewer than 3 entries

```
Scenario: Yard boundary with fewer than 3 vertices
  Given a valid project JSON where yardBoundary.vertices contains 2 entries
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "project has no yard boundary" }
```

### Scenario: options.garden_style has an unrecognized value

```
Scenario: Invalid garden_style
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options.garden_style is set to an unrecognized value (e.g. "prairie")
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid garden_style" }
```

### Scenario: options.season has an unrecognized value

```
Scenario: Invalid season
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options.season is set to an unrecognized value (e.g. "monsoon")
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid season" }
```

### Scenario: options.aspect_ratio has an unrecognized value

```
Scenario: Invalid aspect_ratio
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options.aspect_ratio is set to an unrecognized value (e.g. "widescreen")
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid aspect_ratio" }
```

### Scenario: options.viewpoint has an unrecognized value

```
Scenario: Invalid viewpoint
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options.viewpoint is set to an unrecognized value (e.g. "bird's-eye")
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid viewpoint" }
```

### Scenario: options.time_of_day has an unrecognized value

```
Scenario: Invalid time_of_day
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And options.time_of_day is set to an unrecognized value (e.g. "dusk")
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid time_of_day" }
```

### Scenario: Request body exceeds 10 MB

```
Scenario: Oversized request body
  Given a request body larger than 10 MB
  When POST /api/generate is called
  Then the response status is 413
  And the response body is { "error": "request body too large" }
```

### Scenario: options.season omitted and project.location has a valid lat

```
Scenario: Season derived from location
  Given a valid project JSON with project.location.lat set to a valid number
  And options does not include a season field
  When POST /api/generate is called
  Then the season is derived from project.location.lat and the server date
  And the response status is 200
  And the response body is a valid PNG
```

See [prompt-construction.md "## Season Derivation"] for the derivation rules.

### Scenario: options.season omitted and project.location is null

```
Scenario: Season defaults to summer when location is null
  Given a valid project JSON where project.location is null
  And options does not include a season field
  When POST /api/generate is called
  Then season defaults to "summer"
  And the response status is 200
  And the response body is a valid PNG
```

### Scenario: Gemini API times out

```
Scenario: Gemini API timeout
  Given a valid request that passes all validation
  And the Gemini API does not respond within 60 seconds
  When POST /api/generate is called
  Then the response status is 504
  And the response body is { "error": "image generation timed out" }
```

See [gemini-client.md "## Error Handling"] for timeout configuration.

### Scenario: Gemini API returns an error

```
Scenario: Gemini API error
  Given a valid request that passes all validation
  And the Gemini API returns an error response
  When POST /api/generate is called
  Then the response status is 502
  And the response body is { "error": "Nano Banana error: {upstream message}" }
```

See [gemini-client.md "## Error Handling"] for upstream error propagation.

### Scenario: yard_photo provided

```
Scenario: yard_photo provided alongside project
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And yard_photo is a valid base64-encoded JPEG of the real yard
  When POST /api/generate is called
  Then the segmentation map and yard photo are both sent to Gemini as reference images
  And the prompt includes the dual-image context preamble
  And the response status is 200
  And the response body is a valid PNG
```

See [prompt-construction.md "## Yard Photo Preamble"] and [gemini-client.md "## Request Construction"].

### Scenario: yard_photo omitted

```
Scenario: yard_photo omitted
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And the request body contains no yard_photo field
  When POST /api/generate is called
  Then only the segmentation map is sent to Gemini as a reference image
  And the response status is 200
  And the response body is a valid PNG
```

### Scenario: yard_photo is invalid base64

```
Scenario: Invalid yard_photo
  Given a valid project JSON with a yard boundary of >= 3 vertices
  And yard_photo is set to a string that is not valid base64
  When POST /api/generate is called
  Then the response status is 400
  And the response body is { "error": "invalid yard_photo" }
```

### Scenario: options.include_planned is false

```
Scenario: Planned plants excluded
  Given a valid project JSON containing plant elements with status "planned"
  And options.include_planned is false
  When POST /api/generate is called
  Then plants with status "planned" are excluded from the segmentation map and prompt
  And the response status is 200
  And the response body is a valid PNG
```
