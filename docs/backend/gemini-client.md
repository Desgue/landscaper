# Gemini Client

Stage 4 of the image generation pipeline — wraps the Nano Banana (Gemini) API to send the segmentation map and prompt, and return a PNG image.

## Client Setup

Import: [`google/generative-ai-go`](https://github.com/google/generative-ai-go)

Environment variables:

| Variable | Required | Default |
|---|---|---|
| `GEMINI_API_KEY` | Yes | — |
| `GEMINI_MODEL` | No | `gemini-2.0-flash-exp-image-generation` |

A context with a 60-second timeout is created per request, not at package level. The client is initialized inside the request handler and closed when the request completes.

```go
ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
defer cancel()

client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
if err != nil {
    return err
}
defer client.Close()

model := client.GenerativeModel(os.Getenv("GEMINI_MODEL"))
model.SetTemperature(1)
model.ResponseMIMEType = "image/png"
```

## Request Construction

The request is assembled from two parts: a text prompt and the segmentation map as an inline image blob.

```go
parts := []genai.Part{
    genai.Text(prompt),
    genai.Blob{MIMEType: "image/png", Data: segMapBytes},
}

resp, err := model.GenerateContent(ctx, parts...)
```

- `prompt` — constructed string from [prompt-construction.md "## Prompt Assembly"]
- `segMapBytes` — PNG bytes from [segmentation-render.md "## Stage 2: 2D Segmentation Render"]

Parameters sent to Nano Banana:

| Parameter | Value | Source |
|---|---|---|
| model | `$GEMINI_MODEL` | env var |
| prompt | constructed string | [prompt-construction.md "## Prompt Assembly"] |
| reference_image | segmentation map PNG bytes | [segmentation-render.md "## Stage 2: 2D Segmentation Render"] |
| aspect_ratio | `"1:1"` / `"16:9"` / `"9:16"` | derived from `options.aspect_ratio` |
| seed | `options.seed` | omit parameter entirely when seed is `-1` |

`aspect_ratio` and `seed` are passed via `GenerationConfig` fields if supported by the model version. Consult the Gemini Go SDK changelog — these fields are experimental and may change between model revisions.

## Response Extraction

Iterate `resp.Candidates[0].Content.Parts` and find the first `genai.Blob` with `MIMEType == "image/png"`. Return its `.Data` bytes as the HTTP response body with `Content-Type: image/png`.

If no `image/png` part is found in the response, return HTTP 502 with body `"no image in Nano Banana response"`.

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
  And the Gemini API returns a response containing no genai.Blob with MIMEType "image/png"
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
```
