package gemini

import (
	"context"
	"errors"
	"fmt"
	"math"
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
// Parts are interleaved: [segmap_instruction, segmap_blob, photo_1_instruction, photo_1_blob, ..., scene_prompt]
// This ordering ensures each instruction text is adjacent to the image it describes.
func Generate(ctx context.Context, promptParts model.PromptParts, segMapBytes []byte, photos []model.PhotoEntry, opts *model.EffectiveOptions, apiKey, modelName string) (imageBytes []byte, mimeType string, genErr *Error) {
	ctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, "", &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("Nano Banana error: %s", err.Error())}
	}

	// Assemble parts: interleave text instructions with their corresponding images
	// Order: segmap instruction → segmap blob → [photo_N instruction → photo_N blob]... → scene prompt
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

	// Build config
	geminiAspect := AspectRatioMap[opts.AspectRatio]
	if geminiAspect == "" {
		geminiAspect = "1:1"
	}

	cfg := &genai.GenerateContentConfig{
		ResponseModalities: []string{"TEXT", "IMAGE"},
		Temperature:        float32Ptr(0.3),
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{
				{Text: "You are a photorealistic landscape design renderer. Your task is to generate a realistic photograph of a garden based on a color-coded layout map and optional yard photographs. Follow the layout map positions exactly. Do not add, remove, or reposition any elements. Every element in your output must correspond to a shape in the layout map."},
			},
		},
		ImageConfig: &genai.ImageConfig{
			AspectRatio: geminiAspect,
			ImageSize:   opts.ImageSize,
		},
		// ThinkingConfig may be a no-op on some model variants; kept for models that support it.
		// When active, it enables internal spatial reasoning before rendering.
		ThinkingConfig: &genai.ThinkingConfig{
			ThinkingLevel: genai.ThinkingLevelHigh,
		},
	}
	if opts.Seed != -1 && opts.Seed >= math.MinInt32 && opts.Seed <= math.MaxInt32 {
		seed := int32(opts.Seed) //nolint:gosec // G115: bounds checked above
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

func float32Ptr(v float32) *float32 { return &v }
