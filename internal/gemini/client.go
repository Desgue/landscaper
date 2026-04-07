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
// gemini-3.1-flash-image-preview supports: 1:1, 4:1, 1:4, 3:4, 4:3.
var AspectRatioMap = map[string]string{
	"square":    "1:1",
	"landscape": "4:3",
	"portrait":  "3:4",
}

// Generate sends the prompt parts and images to Gemini and returns the generated image bytes and MIME type.
// Parts are interleaved: [segmap_instruction, segmap_blob, photo_instruction?, photo_blob?, scene_prompt]
// This ordering ensures each instruction text is adjacent to the image it describes.
func Generate(ctx context.Context, promptParts model.PromptParts, segMapBytes []byte, yardPhotoBytes []byte, yardPhotoMIMEType string, opts model.EffectiveOptions, apiKey string, modelName string) ([]byte, string, *Error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, "", &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("Nano Banana error: %s", err.Error())}
	}

	// Assemble parts: interleave text instructions with their corresponding images
	// Order: segmap instruction → segmap blob → [yard photo instruction → yard photo blob] → scene prompt
	parts := []*genai.Part{
		{Text: promptParts.SegmapInstruction},
		{InlineData: &genai.Blob{MIMEType: "image/png", Data: segMapBytes}},
	}
	if len(yardPhotoBytes) > 0 && promptParts.YardPhotoInstruction != "" {
		parts = append(parts,
			&genai.Part{Text: promptParts.YardPhotoInstruction},
			&genai.Part{InlineData: &genai.Blob{MIMEType: yardPhotoMIMEType, Data: yardPhotoBytes}},
		)
	}
	parts = append(parts, &genai.Part{Text: promptParts.ScenePrompt})

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
			ImageSize:   opts.ImageSize,
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
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, "", &Error{StatusCode: http.StatusGatewayTimeout, Message: "image generation timed out"}
		}
		return nil, "", &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("Nano Banana error: %s", err.Error())}
	}

	// Extract image from response
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, "", &Error{StatusCode: http.StatusBadGateway, Message: "no image in Nano Banana response"}
	}

	for _, part := range resp.Candidates[0].Content.Parts {
		if part.InlineData != nil && (part.InlineData.MIMEType == "image/png" || part.InlineData.MIMEType == "image/jpeg") {
			return part.InlineData.Data, part.InlineData.MIMEType, nil
		}
	}

	return nil, "", &Error{StatusCode: http.StatusBadGateway, Message: "no image in Nano Banana response"}
}
