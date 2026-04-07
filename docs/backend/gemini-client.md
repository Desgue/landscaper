# Gemini Client

Stage 4 of the image generation pipeline — wraps the Nano Banana (Gemini) API to send the segmentation map and prompt, and return a PNG image.

## Client Setup

Import: [`google.golang.org/genai`](https://pkg.go.dev/google.golang.org/genai)

Environment variables:

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | Yes | — |
| `GEMINI_MODEL` | No | `gemini-3.1-flash-image-preview` |

A context with a 120-second timeout is created per request, not at package level. The client is initialized inside the request handler and closed when the request completes.

```go
ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
defer cancel()

client, err := genai.NewClient(ctx, &genai.ClientConfig{
    APIKey: os.Getenv("GEMINI_API_KEY"),
})
if err != nil {
    return err
}
defer client.Close()
```

> The parent context must be `r.Context()` (the HTTP request context), not `context.Background()`. This ensures client disconnection cancels the Gemini call. See [server.md "### Request Context Propagation"].

## Request Construction

The request is assembled from structured `PromptParts` (interleaved text instructions + image blobs), the segmentation map, and 0–4 yard photos. Parts are interleaved so each instruction is adjacent to the image it describes:

```go
// Assemble parts: interleave text instructions with their corresponding images
// Order: segmap instruction → segmap blob → [photo N instruction → photo N blob]... → scene prompt
parts := []*genai.Part{
    {Text: promptParts.SegmapInstruction},
    {InlineData: &genai.Blob{MIMEType: "image/png", Data: segMapBytes}},
}
for i, photo := range photos {
    instruction := promptParts.YardPhotoInstruction
    if len(promptParts.YardPhotoInstructions) > i {
        instruction = promptParts.YardPhotoInstructions[i]
    }
    if instruction != "" {
        parts = append(parts,
            &genai.Part{Text: instruction},
            &genai.Part{InlineData: &genai.Blob{MIMEType: photo.MIMEType, Data: photo.Bytes}},
        )
    }
}
parts = append(parts, &genai.Part{Text: promptParts.ScenePrompt})

contents := []*genai.Content{{Parts: parts}}

cfg := &genai.GenerateContentConfig{
    ResponseModalities: []string{"TEXT", "IMAGE"}, // both required for native image gen
    Temperature:        float32Ptr(0.3),           // low temperature for run-to-run consistency
    SystemInstruction: &genai.Content{
        Parts: []*genai.Part{
            {Text: "You are a photorealistic landscape design renderer. ..."},
        },
    },
    ImageConfig: &genai.ImageConfig{
        AspectRatio: geminiAspect, // "1:1" | "4:3" | "3:4"
        ImageSize:   opts.ImageSize, // "1K" | "2K" | "4K"
    },
    ThinkingConfig: &genai.ThinkingConfig{
        ThinkingLevel: genai.ThinkingLevelHigh,
    },
}
if opts.Seed != -1 {
    seed := int32(opts.Seed)
    cfg.Seed = &seed
}

resp, err := client.Models.GenerateContent(ctx, modelName, contents, cfg)
```

- `promptParts` — `PromptParts` struct from [prompt-construction.md "## Full Prompt Assembly"]
- `segMapBytes` — PNG bytes from [segmentation-render.md "## Stage 2: 2D Segmentation Render"]
- `photos` — `[]model.PhotoEntry` of decoded yard photos; empty slice when no photos are provided

Parameters sent to Nano Banana:

| Parameter | Value | Source |
|---|---|---|
| model | `$GEMINI_MODEL` | env var |
| `ResponseModalities` | `["TEXT", "IMAGE"]` | required for native Gemini image generation; both modalities must be specified |
| `Temperature` | `0.3` | low temperature for run-to-run consistency; primary determinism lever (seed is unreliable on autoregressive models) |
| `SystemInstruction` | Fixed grounding text: "You are a photorealistic landscape design renderer..." | persistent instruction that anchors the model to layout-following behavior |
| parts | interleaved text instructions + image blobs; 3 parts when no photos, 3 + 2N parts for N photos | [prompt-construction.md "## Full Prompt Assembly"] |
| `photos []PhotoEntry` | Decoded yard photo bytes and MIME types. 0–4 entries. Each photo is interleaved with its own instruction text. | `request.yard_photos` base64 fields; detected MIME type per entry |
| `ImageConfig.AspectRatio` | `"1:1"` / `"4:3"` / `"3:4"` | derived from `options.aspect_ratio` |
| `ImageConfig.ImageSize` | `"1K"` / `"2K"` / `"4K"` | from `options.image_size` (default `"1K"`) |
| `ThinkingConfig.ThinkingLevel` | `HIGH` | enables internal spatial reasoning before rendering; may be a no-op on some model variants |
| `Seed` | `options.seed` as `*int32` | omitted entirely when `options.seed == -1` |

## Response Extraction

Iterate `resp.Candidates[0].Content.Parts` and find the first part whose `InlineData` field is non-nil and has `MIMEType` of `"image/png"` or `"image/jpeg"`. Return `InlineData.Data` bytes as the HTTP response body with `Content-Type` set to the actual MIME type from the response.

```go
for _, part := range resp.Candidates[0].Content.Parts {
    if part.InlineData != nil && (part.InlineData.MIMEType == "image/png" || part.InlineData.MIMEType == "image/jpeg") {
        return part.InlineData.Data, part.InlineData.MIMEType, nil
    }
}
```

If no matching part is found, return HTTP 502 with body `"no image in Nano Banana response"`.

The handler also applies an explicit MIME allowlist before writing the HTTP `Content-Type` header — only `"image/png"` and `"image/jpeg"` are accepted. Any other MIME type returns HTTP 502 `"unexpected image format"`. This is defense-in-depth independent of the client-side filter.

## Multi-Candidate Generation

The handler generates **3 image candidates concurrently** per request and selects the best one via compliance scoring. This improves layout accuracy at the cost of 3x generation API calls + 3 scoring calls per request.

### Orchestration Flow

1. **Generate** — 3 goroutines each call `gemini.Generate` concurrently with identical parameters. The autoregressive model naturally produces different outputs at temperature 0.3.
2. **Score** — Each successful candidate is scored concurrently via `gemini.ScoreCompliance` (see below). Failed generations are skipped. If the request context is cancelled (client disconnect), scoring is skipped entirely.
3. **Select** — The candidate with the highest `Total` compliance score is returned.

### Graceful Degradation

- If all 3 generations fail: return the first error.
- If scoring fails for a candidate: assign a neutral score (5/5/5/5).
- If all scores are equal: return the first successful candidate.

## Compliance Scoring

`ScoreCompliance` (in `internal/gemini/score.go`) evaluates a generated image against the segmentation map using Gemini's image understanding capability (text-only response mode).

### Scoring Prompt

Sends the segmap (Image 1) and generated image (Image 2) with a prompt that requests JSON scores:

```
Compare the generated landscape image (Image 2) against the layout map (Image 1).
Score each criterion from 1 to 10:
1. spatial: Are the garden elements positioned where the layout map shows them?
2. completeness: Are all colored shapes from the layout map represented as real elements?
3. no_hallucinations: Is the image free of structures, plants, or features NOT in the layout map?
Return ONLY a JSON object: {"spatial": N, "completeness": N, "no_hallucinations": N, "total": N}
```

### Scoring Config

| Parameter | Value |
|---|---|
| `ResponseModalities` | `["TEXT"]` |
| `Temperature` | `0.1` (very low for consistent scoring) |
| Timeout | 30 seconds |

### Score Parsing

The JSON response is extracted by finding the first `{` to last `}` (handles markdown fences and surrounding text). On parse failure, a neutral score (all 5s) is returned. Scores are clamped to 1–10. Total is recomputed as the rounded average of the three criteria.

## Error Handling

No automatic retry on any error.

| Condition | HTTP status | Error message body |
|---|---|---|
| Context deadline exceeded (> 120s) | 504 | `"image generation timed out"` |
| Gemini API error response | 502 | `"Nano Banana error: {upstream message}"` |
| No image/png part in response | 502 | `"no image in Nano Banana response"` |

Error responses follow the format defined in [api-contract.md "## Error Response Format"].

## BDD Scenarios

```
Scenario: Valid segmentation map and prompt returns image
  Given a valid segmentation map PNG in segMapBytes
  And valid PromptParts (SegmapInstruction, ScenePrompt, optional YardPhotoInstruction)
  When the Gemini client sends the request
  Then the response has HTTP status 200
  And the response Content-Type matches the Gemini response MIME type (image/jpeg or image/png)
  And the response body contains the image bytes from the Gemini response

Scenario: Seed value is passed to the API when seed is not -1
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And options.seed is 5
  When the Gemini client sends the request
  Then the GenerationConfig seed field is set to 5

Scenario: Seed parameter is omitted when seed is -1
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And options.seed is -1
  When the Gemini client sends the request
  Then the GenerationConfig seed field is not set

Scenario: Gemini API does not respond within 120 seconds
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And the Gemini API does not respond before the 120-second context deadline
  When the Gemini client sends the request
  Then the response has HTTP status 504
  And the response body is "image generation timed out"

Scenario: Gemini API returns an error response
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And the Gemini API returns an error with message "quota exceeded"
  When the Gemini client sends the request
  Then the response has HTTP status 502
  And the response body is "Nano Banana error: quota exceeded"

Scenario: Gemini API returns a response with no image/png part
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And the Gemini API returns a response containing no part with InlineData.MIMEType "image/png"
  When the Gemini client sends the request
  Then the response has HTTP status 502
  And the response body is "no image in Nano Banana response"

Scenario: aspect_ratio "landscape" maps to Gemini aspect_ratio "4:3"
  Given options.aspect_ratio is "landscape"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "4:3"

Scenario: aspect_ratio "portrait" maps to Gemini aspect_ratio "3:4"
  Given options.aspect_ratio is "portrait"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "3:4"

Scenario: aspect_ratio "square" maps to Gemini aspect_ratio "1:1"
  Given options.aspect_ratio is "square"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "1:1"

Scenario: 1 yard photo sends 5 interleaved parts
  Given a valid segmentation map PNG in segMapBytes
  And valid PromptParts with YardPhotoInstruction set
  And photos contains 1 decoded JPEG PhotoEntry
  When Generate is called
  Then the request contents have 5 parts: segmap instruction text, segmap blob, yard photo instruction text, yard photo blob, scene prompt text
  And the yard photo blob MIMEType is "image/jpeg"

Scenario: 2 yard photos sends 7 interleaved parts
  Given a prompt with segmap instruction and scene prompt
  And 2 decoded yard photos with per-photo instructions
  When Generate is called
  Then the Gemini request contains 7 parts: segmap instruction, segmap blob, photo 1 instruction, photo 1 blob, photo 2 instruction, photo 2 blob, scene prompt

Scenario: 0 yard photos sends 3 interleaved parts
  Given a valid segmentation map PNG in segMapBytes
  And valid PromptParts with empty YardPhotoInstruction
  And photos is an empty slice
  When Generate is called
  Then the request contents have 3 parts: segmap instruction text, segmap blob, scene prompt text
  And no yard photo blob is present

Scenario: ThinkingConfig HIGH is enabled
  When the Gemini client sends any request
  Then the GenerateContentConfig ThinkingConfig.ThinkingLevel is set to HIGH

Scenario: image_size is passed through to ImageConfig
  Given options.image_size is "2K"
  When the Gemini client sends the request
  Then the ImageConfig.ImageSize field is set to "2K"
```
