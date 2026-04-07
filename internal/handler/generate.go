package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"

	"greenprint/internal/filter"
	"greenprint/internal/gemini"
	"greenprint/internal/model"
	"greenprint/internal/prompt"
	"greenprint/internal/render"
)

// GeminiFunc is the signature for the Gemini image generation call.
// Swappable for testing via geminiGenerateFunc.
type GeminiFunc func(ctx context.Context, promptParts model.PromptParts, segMapBytes []byte, photos []model.PhotoEntry, opts *model.EffectiveOptions, apiKey, modelName string) ([]byte, string, *gemini.Error)

// geminiGenerateFunc is the Gemini call used by the handler. Tests replace this with a mock.
var geminiGenerateFunc GeminiFunc = gemini.Generate

// ScoreFunc is the signature for compliance scoring. Swappable for testing.
type ScoreFunc func(ctx context.Context, generatedImage []byte, imageMIME string, segMapBytes []byte, apiKey, modelName string) (gemini.ComplianceScore, *gemini.Error)

// scoringFunc is the scoring call used by the handler. Tests replace with a mock.
var scoringFunc ScoreFunc = gemini.ScoreCompliance

// numCandidates is the number of image candidates to generate and score.
const numCandidates = 3

// candidate holds a single generation result and its compliance score.
type candidate struct {
	imageBytes []byte
	mimeType   string
	score      gemini.ComplianceScore
	err        *gemini.Error
}

// Generate handles POST /api/generate.
// Orchestrates the full pipeline: validate → filter → render → prompt → gemini → PNG response.
func Generate(w http.ResponseWriter, r *http.Request) {
	logger := Logger(r.Context())

	// Stage 0: Validate request and apply defaults
	req, eff, photos, ok := validateAndParse(w, r)
	if !ok {
		return
	}
	logger.Info("validation passed")

	// Stage 1: Filter elements with registry resolution
	filtered := filter.Filter(&req.Project, &eff, logger)
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
	promptParts := prompt.Build(filtered, &eff, len(photos))
	logger.Info("prompt constructed",
		"scene_prompt_length", len(promptParts.ScenePrompt),
		"has_yard_photo_instruction", promptParts.YardPhotoInstruction != "",
		"yard_photo_count", len(photos),
		"element_count", len(filtered),
	)

	// Stage 4: Generate candidates concurrently and score for layout compliance
	apiKey := os.Getenv("GEMINI_API_KEY")
	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		modelName = gemini.DefaultModel
	}
	logger.Info("generating candidates",
		"model", modelName,
		"candidates", numCandidates,
		"aspect_ratio", eff.AspectRatio,
		"seed", eff.Seed,
		"yard_photos", len(photos),
	)

	geminiStart := time.Now()
	candidates := make([]candidate, numCandidates)
	var wg sync.WaitGroup
	for i := 0; i < numCandidates; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			imgBytes, mime, genErr := geminiGenerateFunc(r.Context(), promptParts, segMapBytes, photos, &eff, apiKey, modelName)
			candidates[idx] = candidate{imageBytes: imgBytes, mimeType: mime, err: genErr}
		}(i)
	}
	wg.Wait()

	genDuration := time.Since(geminiStart).Milliseconds()

	// Count successful candidates
	var successCount int
	for i := range candidates {
		if candidates[i].err == nil && len(candidates[i].imageBytes) > 0 {
			successCount++
		}
	}

	if successCount == 0 {
		// All candidates failed — return the first error
		for _, c := range candidates {
			if c.err != nil {
				logger.Error("all candidates failed", "error", c.err.Message)
				writeJSONError(w, c.err.StatusCode, c.err.Message)
				return
			}
		}
		writeJSONError(w, http.StatusBadGateway, "no image in Nano Banana response")
		return
	}

	logger.Info("candidates generated",
		"successful", successCount,
		"total", numCandidates,
		"duration_ms", genDuration,
	)

	// Score successful candidates — skip scoring if client already disconnected
	scoreStart := time.Now()
	if r.Context().Err() != nil {
		logger.Warn("client disconnected before scoring, skipping")
	} else {
		var scoreWg sync.WaitGroup
		for i := range candidates {
			if candidates[i].err != nil || len(candidates[i].imageBytes) == 0 {
				continue
			}
			scoreWg.Add(1)
			go func(idx int) {
				defer scoreWg.Done()
				score, scoreErr := scoringFunc(r.Context(), candidates[idx].imageBytes, candidates[idx].mimeType, segMapBytes, apiKey, modelName)
				if scoreErr != nil {
					// Scoring failure is non-fatal — assign neutral score
					logger.Warn("scoring failed for candidate", "candidate", idx, "error", scoreErr.Message)
					candidates[idx].score = gemini.ComplianceScore{Spatial: 5, Completeness: 5, NoHallucinations: 5, Total: 5}
				} else {
					candidates[idx].score = score
				}
			}(i)
		}
		scoreWg.Wait()
	}

	logger.Info("candidates scored",
		"duration_ms", time.Since(scoreStart).Milliseconds(),
	)

	// Pick the best candidate by total score
	bestIdx := -1
	bestScore := -1
	for i := range candidates {
		if candidates[i].err != nil || len(candidates[i].imageBytes) == 0 {
			continue
		}
		logger.Info("candidate score",
			"candidate", i,
			"spatial", candidates[i].score.Spatial,
			"completeness", candidates[i].score.Completeness,
			"no_hallucinations", candidates[i].score.NoHallucinations,
			"total", candidates[i].score.Total,
		)
		if candidates[i].score.Total > bestScore {
			bestScore = candidates[i].score.Total
			bestIdx = i
		}
	}

	imageBytes := candidates[bestIdx].imageBytes
	imageMIME := candidates[bestIdx].mimeType

	logger.Info("best candidate selected",
		"candidate", bestIdx,
		"score", bestScore,
		"image_bytes", len(imageBytes),
		"total_duration_ms", time.Since(geminiStart).Milliseconds(),
	)

	// Write image response — explicit MIME allowlist independent of client.go filter
	switch imageMIME {
	case "image/png", "image/jpeg":
		w.Header().Set("Content-Type", imageMIME)
	default:
		logger.Error("unexpected image MIME type", "mime", imageMIME)
		writeJSONError(w, http.StatusBadGateway, "unexpected image format")
		return
	}
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
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message}) //nolint:errcheck // best-effort error response
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
