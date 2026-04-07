package gemini

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"google.golang.org/genai"
)

// ComplianceScore holds the layout compliance scores for a generated image.
type ComplianceScore struct {
	Spatial          int `json:"spatial"`           // 1-10: elements in correct positions
	Completeness     int `json:"completeness"`      // 1-10: all layout map elements present
	NoHallucinations int `json:"no_hallucinations"` // 1-10: no extra elements added
	Total            int `json:"total"`             // average of the three scores
}

// ScoreCompliance sends a generated image alongside the segmentation map to Gemini
// for layout compliance evaluation. Uses text-only response mode.
func ScoreCompliance(ctx context.Context, generatedImage []byte, imageMIME string, segMapBytes []byte, apiKey, modelName string) (ComplianceScore, *Error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return ComplianceScore{}, &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("scoring client error: %s", err.Error())}
	}

	scoringPrompt := `Compare the generated landscape image (Image 2) against the layout map (Image 1).

Score each criterion from 1 to 10:
1. spatial: Are the garden elements positioned where the layout map shows them?
2. completeness: Are all colored shapes from the layout map represented as real elements?
3. no_hallucinations: Is the image free of structures, plants, or features NOT in the layout map?

Return ONLY a JSON object, no other text:
{"spatial": N, "completeness": N, "no_hallucinations": N, "total": N}

where total is the average of the three scores, rounded to the nearest integer.`

	parts := []*genai.Part{
		{InlineData: &genai.Blob{MIMEType: "image/png", Data: segMapBytes}},
		{InlineData: &genai.Blob{MIMEType: imageMIME, Data: generatedImage}},
		{Text: scoringPrompt},
	}

	contents := []*genai.Content{{Parts: parts}}

	cfg := &genai.GenerateContentConfig{
		ResponseModalities: []string{"TEXT"},
		Temperature:        float32Ptr(0.1), // low temperature for consistent scoring
	}

	resp, err := client.Models.GenerateContent(ctx, modelName, contents, cfg)
	if err != nil {
		return ComplianceScore{}, &Error{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("scoring error: %s", err.Error())}
	}

	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return ComplianceScore{}, &Error{StatusCode: http.StatusBadGateway, Message: "no scoring response"}
	}

	// Extract text from response
	var text string
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.Text != "" {
			text += part.Text
		}
	}

	return parseComplianceScore(text), nil
}

// parseComplianceScore extracts a ComplianceScore from raw Gemini text output.
// Handles markdown code fences and invalid JSON gracefully.
func parseComplianceScore(text string) ComplianceScore {
	// Extract JSON object from response — handles markdown fences and surrounding text
	text = strings.TrimSpace(text)
	if i := strings.Index(text, "{"); i >= 0 {
		if j := strings.LastIndex(text, "}"); j > i {
			text = text[i : j+1]
		}
	}

	var score ComplianceScore
	if err := json.Unmarshal([]byte(text), &score); err != nil {
		// If parsing fails, return a neutral score rather than erroring
		return ComplianceScore{Spatial: 5, Completeness: 5, NoHallucinations: 5, Total: 5}
	}

	// Clamp scores to 1-10 range
	score.Spatial = clamp(score.Spatial, 1, 10)
	score.Completeness = clamp(score.Completeness, 1, 10)
	score.NoHallucinations = clamp(score.NoHallucinations, 1, 10)
	// Recompute total as rounded average
	sum := score.Spatial + score.Completeness + score.NoHallucinations
	score.Total = (sum*10/3 + 5) / 10

	return score
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
