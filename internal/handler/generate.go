package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"greenprint/internal/filter"
	"greenprint/internal/gemini"
	"greenprint/internal/model"
	"greenprint/internal/prompt"
	"greenprint/internal/render"
)

// GeminiFunc is the signature for the Gemini image generation call.
// Swappable for testing via geminiGenerateFunc.
type GeminiFunc func(ctx context.Context, promptParts model.PromptParts, segMapBytes []byte, yardPhotoBytes []byte, yardPhotoMIMEType string, opts model.EffectiveOptions, apiKey string, modelName string) ([]byte, string, *gemini.Error)

// geminiGenerateFunc is the Gemini call used by the handler. Tests replace this with a mock.
var geminiGenerateFunc GeminiFunc = gemini.Generate

// Generate handles POST /api/generate.
// Orchestrates the full pipeline: validate → filter → render → prompt → gemini → PNG response.
func Generate(w http.ResponseWriter, r *http.Request) {
	logger := Logger(r.Context())

	// Stage 0: Validate request and apply defaults
	req, eff, photo, ok := validateAndParse(w, r)
	if !ok {
		return
	}
	logger.Info("validation passed")

	// Stage 1: Filter elements with registry resolution
	filtered := filter.Filter(req.Project, eff, logger)
	logger.Info("element filtering complete",
		"total", len(req.Project.Elements),
		"included", len(filtered),
		"excluded", len(req.Project.Elements)-len(filtered),
	)

	// Stage 2: Render segmentation map
	renderStart := time.Now()
	segMapBytes, err := render.Render(filtered, req.Project.YardBoundary, eff.AspectRatio)
	if err != nil {
		logger.Error("segmentation render failed", "error", err.Error())
		writeJSONError(w, http.StatusInternalServerError, "segmentation render failed")
		return
	}
	dims := renderDimensions(eff.AspectRatio)
	logger.Info("segmentation render complete",
		"width_px", dims[0],
		"height_px", dims[1],
		"duration_ms", time.Since(renderStart).Milliseconds(),
	)

	// Stage 3: Construct prompt
	hasPhoto := photo != nil
	promptParts := prompt.Build(filtered, eff, hasPhoto)
	logger.Info("prompt constructed",
		"scene_prompt_length", len(promptParts.ScenePrompt),
		"has_yard_photo_instruction", promptParts.YardPhotoInstruction != "",
		"element_count", len(filtered),
	)

	// Stage 4: Call Gemini
	var photoBytes []byte
	var photoMIME string
	if photo != nil {
		photoBytes = photo.Bytes
		photoMIME = photo.MIMEType
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		modelName = gemini.DefaultModel
	}
	logger.Info("Nano Banana request sent",
		"model", modelName,
		"aspect_ratio", eff.AspectRatio,
		"seed", eff.Seed,
	)
	geminiStart := time.Now()
	imageBytes, imageMIME, gemErr := geminiGenerateFunc(r.Context(), promptParts, segMapBytes, photoBytes, photoMIME, eff, apiKey, modelName)
	if gemErr != nil {
		logger.Error("gemini error", "status", gemErr.StatusCode, "error", gemErr.Message)
		writeJSONError(w, gemErr.StatusCode, gemErr.Message)
		return
	}
	logger.Info("Nano Banana response received",
		"duration_ms", time.Since(geminiStart).Milliseconds(),
		"image_bytes", len(imageBytes),
	)

	// Write image response
	w.Header().Set("Content-Type", imageMIME)
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(imageBytes); err != nil {
		logger.Error("failed to write response", "error", err.Error())
	}
}

// writeJSONError writes a JSON error response. Encode errors are silently
// dropped because the HTTP status has already been sent.
func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// renderDimensions returns [width, height] for logging based on aspect ratio.
func renderDimensions(aspectRatio string) [2]int {
	switch aspectRatio {
	case "landscape":
		return [2]int{1024, 768} // 4:3
	case "portrait":
		return [2]int{768, 1024} // 3:4
	default:
		return [2]int{1024, 1024} // 1:1
	}
}
