# Gemini Client

Stage 4 of the image generation pipeline — wraps the Nano Banana (Gemini) API to send the segmentation map and prompt, and return a PNG image.

## Client Setup

Import: [`google.golang.org/genai`](https://pkg.go.dev/google.golang.org/genai)

Environment variables:

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | Yes | — |
| `GEMINI_MODEL` | No | `gemini-3.1-flash-image-preview` |

A context with a 60-second timeout is created per request, not at package level. The client is initialized inside the request handler and closed when the request completes.

```go
ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
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

The request is assembled from a text prompt, the segmentation map, and an optional yard photo. All parts are sent via `client.Models.GenerateContent`. The segmentation map is always first; the yard photo, when present, is second. Gemini receives them in this order and the prompt preamble (see [prompt-construction.md "## Yard Photo Preamble"]) references them by position.

```go
parts := []*genai.Part{
    {Text: prompt},
    {InlineData: &genai.Blob{MIMEType: "image/png", Data: segMapBytes}},
}
if len(yardPhotoBytes) > 0 {
    parts = append(parts, &genai.Part{
        InlineData: &genai.Blob{MIMEType: yardPhotoMIMEType, Data: yardPhotoBytes},
    })
}

contents := []*genai.Content{{Parts: parts}}

cfg := &genai.GenerateContentConfig{
    ResponseModalities: []genai.Modality{genai.ModalityImage},
    ImageConfig: &genai.ImageConfig{
        AspectRatio: aspectRatio, // "1:1" | "16:9" | "9:16"
        ImageSize:   "1K",
    },
}
if options.Seed != -1 {
    cfg.Seed = int32(options.Seed)
}

resp, err := client.Models.GenerateContent(ctx, os.Getenv("GEMINI_MODEL"), contents, cfg)
```

- `prompt` — constructed string from [prompt-construction.md "## Full Prompt Assembly"]
- `segMapBytes` — PNG bytes from [segmentation-render.md "## Stage 2: 2D Segmentation Render"]
- `yardPhotoBytes` — decoded bytes from `request.yard_photo` base64 field; empty slice when field is absent
- `yardPhotoMIMEType` — `"image/jpeg"` or `"image/png"`, detected from magic bytes during validation

Parameters sent to Nano Banana:

| Parameter | Value | Source |
|---|---|---|
| model | `$GEMINI_MODEL` | env var |
| prompt | constructed string | [prompt-construction.md "## Full Prompt Assembly"] |
| parts[1] | segmentation map PNG bytes | [segmentation-render.md "## Stage 2: 2D Segmentation Render"] |
| parts[2] | yard photo bytes (JPEG or PNG) | `request.yard_photo` — omitted when field is absent |
| `ImageConfig.AspectRatio` | `"1:1"` / `"16:9"` / `"9:16"` | derived from `options.aspect_ratio` |
| `ImageConfig.ImageSize` | `"1K"` | fixed default; upgrade to `"2K"` or `"4K"` when performance allows |
| `Seed` | `options.seed` as `int32` | omitted entirely when `options.seed == -1` |

## Response Extraction

Iterate `resp.Candidates[0].Content.Parts` and find the first part whose `InlineData` field is non-nil and has `MIMEType == "image/png"`. Return `InlineData.Data` bytes as the HTTP response body with `Content-Type: image/png`.

```go
for _, part := range resp.Candidates[0].Content.Parts {
    if part.InlineData != nil && part.InlineData.MIMEType == "image/png" {
        return part.InlineData.Data, nil
    }
}
```

If no matching part is found, return HTTP 502 with body `"no image in Nano Banana response"`.

## Error Handling

No automatic retry on any error.

| Condition | HTTP status | Error message body |
|---|---|---|
| Context deadline exceeded (> 60s) | 504 | `"image generation timed out"` |
| Gemini API error response | 502 | `"Nano Banana error: {upstream message}"` |
| No image/png part in response | 502 | `"no image in Nano Banana response"` |

Error responses follow the format defined in [api-contract.md "## Error Response Format"].

## BDD Scenarios

```
Scenario: Valid segmentation map and prompt returns PNG
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  When the Gemini client sends the request
  Then the response has HTTP status 200
  And the response Content-Type is "image/png"
  And the response body contains the PNG bytes from the Gemini response

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

Scenario: Gemini API does not respond within 60 seconds
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And the Gemini API does not respond before the 60-second context deadline
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

Scenario: aspect_ratio "landscape" maps to Gemini aspect_ratio "16:9"
  Given options.aspect_ratio is "landscape"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "16:9"

Scenario: aspect_ratio "portrait" maps to Gemini aspect_ratio "9:16"
  Given options.aspect_ratio is "portrait"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "9:16"

Scenario: aspect_ratio "square" maps to Gemini aspect_ratio "1:1"
  Given options.aspect_ratio is "square"
  When the Gemini client sends the request
  Then the GenerationConfig aspect_ratio field is set to "1:1"

Scenario: yard_photo present adds second blob to request parts
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And yardPhotoBytes contains a decoded JPEG image
  When the Gemini client sends the request
  Then the request contents have 3 parts: prompt text, segmentation map blob, yard photo blob
  And the yard photo blob MIMEType is "image/jpeg"
  And the yard photo blob is at parts index 2

Scenario: yard_photo absent sends only segmentation map
  Given a valid segmentation map PNG in segMapBytes
  And a valid constructed prompt string
  And yardPhotoBytes is empty
  When the Gemini client sends the request
  Then the request contents have 2 parts: prompt text and segmentation map blob
  And no yard photo blob is present
```
