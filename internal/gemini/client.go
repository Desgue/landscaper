package gemini

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"google.golang.org/genai"

	"greenprint/internal/model"
)

// DefaultModel is the fallback Gemini model name when GEMINI_MODEL is not set.
const DefaultModel = "gemini-3.1-flash-image-preview"

// Error sentinel for classifying errors in the handler.
type Error struct {
	StatusCode int
	Message    string
}

func (e *Error) Error() string { return e.Message }

// AspectRatioMap converts API aspect ratio values to Gemini aspect ratio strings.
var AspectRatioMap = map[string]string{
	"square":    "1:1",
	"landscape": "16:9",
	"portrait":  "9:16",
}

// Generate sends the prompt and images to Gemini and returns the generated PNG bytes.
// It creates a new client per request and enforces a 60-second timeout.
func Generate(ctx context.Context, prompt string, segMapBytes []byte, yardPhotoBytes []byte, yardPhotoMIMEType string, opts model.EffectiveOptions, apiKey string, modelName string) ([]byte, *Error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("Nano Banana error: %s", err.Error())}
	}

	// Assemble parts: text prompt, segmap PNG, optional yard photo
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

	// Build config
	geminiAspect := AspectRatioMap[opts.AspectRatio]
	if geminiAspect == "" {
		geminiAspect = "1:1"
	}

	cfg := &genai.GenerateContentConfig{
		ResponseModalities: []string{"IMAGE"},
		ImageConfig: &genai.ImageConfig{
			AspectRatio: geminiAspect,
			ImageSize:   "1K",
		},
	}
	if opts.Seed != -1 {
		seed := int32(opts.Seed)
		cfg.Seed = &seed
	}

	resp, err := client.Models.GenerateContent(ctx, modelName, contents, cfg)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, &Error{StatusCode: http.StatusGatewayTimeout, Message: "image generation timed out"}
		}
		return nil, &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("Nano Banana error: %s", err.Error())}
	}

	// Extract PNG from response
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, &Error{StatusCode: http.StatusBadGateway, Message: "no image in Nano Banana response"}
	}

	for _, part := range resp.Candidates[0].Content.Parts {
		if part.InlineData != nil && part.InlineData.MIMEType == "image/png" {
			return part.InlineData.Data, nil
		}
	}

	return nil, &Error{StatusCode: http.StatusBadGateway, Message: "no image in Nano Banana response"}
}
