# Prompt & Generation Quality Plan

> Prompt tuning and Gemini SDK configuration improvements. Does NOT cover multi-photo (see PLAN-D).
> Based on live testing results and genai v1.52.1 SDK research.

---

## Current State

The prompt was refactored from a single text string to a `PromptParts` struct with interleaved text+image ordering (segmap instruction → segmap blob → yard photo instruction → yard photo blob → scene prompt). This eliminated most framing issues (white backgrounds, plant close-ups) but **green circle artifacts still appear** in output images.

### Remaining Problems
1. Segmentation map shapes (green circles for plant canopies) still bleed into photorealistic output
2. Model hallucinating structures not in the design (pergolas, stone walls)
3. No species-level plant accuracy (generic "lavender" vs actual Lavandula angustifolia)

---

## Key Priorities

### 1. Enable ThinkingConfig (highest impact)

The genai v1.52.1 SDK exposes `ThinkingConfig` on `GenerateContentConfig`:

```go
cfg.ThinkingConfig = &genai.ThinkingConfig{
    ThinkingLevel: "HIGH",  // options: MINIMAL, LOW, MEDIUM, HIGH
}
```

With `HIGH`, the model performs internal spatial reasoning before rendering — it plans composition, understands that segmap shapes are symbolic references, and produces cleaner output. This is the single highest-impact change for the green circle artifact problem.

**Trade-off:** +3-5 seconds latency per request. Acceptable for a generation that already takes 10-15s.

**Implementation:**
- Add `ThinkingConfig` to `GenerateContentConfig` in `internal/gemini/client.go`
- Default to `HIGH` for all generations
- Consider `LOW` for future iterative edit mode (not in scope now)

---

### 2. Botanical Name Enrichment

Currently the prompt lists common names: "Lavender", "Rose Bush", "Japanese Maple". Gemini produces more species-accurate plants with botanical names.

**Target output:**
```
Lavandula angustifolia (Lavender), Rosa 'Knock Out' (Rose Bush), Acer palmatum (Japanese Maple)
```

**Implementation:** Add a `botanicalNames` lookup map in `internal/prompt/builder.go` for the 20+ built-in plants from the frontend registry. No frontend changes needed.

```go
var botanicalNames = map[string]string{
    "tomato":          "Solanum lycopersicum",
    "cherry-tomato":   "Solanum lycopersicum var. cerasiforme",
    "onion":           "Allium cepa",
    "eggplant":        "Solanum melongena",
    "pepper":          "Capsicum annuum",
    "lettuce":         "Lactuca sativa",
    "carrot":          "Daucus carota",
    "basil":           "Ocimum basilicum",
    "rosemary":        "Salvia rosmarinus",
    "mint":            "Mentha spicata",
    "thyme":           "Thymus vulgaris",
    "oak":             "Quercus robur",
    "maple":           "Acer saccharum",
    "birch":           "Betula pendula",
    "fruit-tree":      "Malus domestica",
    "ornamental-pear": "Pyrus calleryana",
    "japanese-maple":  "Acer palmatum",
    "boxwood":         "Buxus sempervirens",
    "lavender":        "Lavandula angustifolia",
    "hydrangea":       "Hydrangea macrophylla",
    "rose-bush":       "Rosa floribunda",
    "holly":           "Ilex aquifolium",
    "privet":          "Ligustrum vulgare",
}
```

When building the element list, if the plant's ID has a botanical name, format as `"Botanical Name (Common Name)"` instead of just `"Common Name"`.

---

### 3. Image Size Tiers

The SDK supports multiple output sizes:

| Value | Resolution | Use case |
|-------|-----------|----------|
| `"512"` | ~512px | Draft preview (fast, cheap) |
| `"1K"` | ~1024px | Current default |
| `"2K"` | ~2048px | High quality final |
| `"4K"` | ~4096px | Print quality |

**Note:** `gemini-3.1-flash-image-preview` may cap at 1K regardless. `gemini-3-pro-image-preview` supports 2K/4K.

**Implementation:**
- Add `image_size` option to API contract (`"512"`, `"1K"`, `"2K"`, `"4K"`, default `"1K"`)
- Pass through to `ImageConfig.ImageSize` in gemini client
- Add to `GenerateOptions` / `EffectiveOptions` in model
- Validate against allowed values

---

### 4. Output Format Control

The SDK supports explicit output MIME type and JPEG compression quality:

```go
cfg.ImageConfig = &genai.ImageConfig{
    OutputMIMEType:           "image/jpeg",
    OutputCompressionQuality: int32Ptr(85),
}
```

Currently we accept whatever Gemini returns (usually JPEG). We should:
- Default to `"image/jpeg"` with quality 85 (good balance of quality/size)
- Set response `Content-Type` header to match what Gemini actually returns (already done)
- Future: let the API caller request PNG for lossless output

---

### 5. Fix Tests for PromptParts Refactor

The `PromptParts` struct change broke prompt and gemini test files. Tests need updating to:
- Work with `PromptParts` return type instead of `string`
- Assert on `ScenePrompt`, `SegmapInstruction`, `YardPhotoInstruction` separately
- Update aspect ratio test expectations (4:3/3:4 instead of 16:9/9:16)
- Update mock signatures to match new `GeminiFunc` type

---

## Implementation Order

1. ~~Fix tests (unblocks everything else)~~ — DONE (tests were already passing)
2. ~~Enable ThinkingConfig HIGH (biggest quality win, one line)~~ — DONE
3. ~~Add botanical names (prompt improvement, no API change)~~ — DONE (23 plant IDs mapped)
4. ~~Add image_size option (API + config change)~~ — DONE (1K/2K/4K; removed "512" per SDK docs)
5. ~~Add output format control (config change)~~ — PARTIAL (OutputMIMEType/CompressionQuality not supported on Gemini API, only Vertex AI; removed)

---

## Out of Scope

- Multi-photo support → PLAN-D
- Google Search grounding → future experiment
- Model routing (Flash vs Pro) → future
- Two-stage draft/final UX → requires frontend
- Outpainting → future
- Conversational editing / inpainting → future
