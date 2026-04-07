package handler

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"greenprint/internal/gemini"
	"greenprint/internal/model"
)

// --- test fixtures -----------------------------------------------------------

// fakePNGBytes returns minimal valid PNG bytes for mocking Gemini responses.
var fakePNGBytes = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}

// minimalValidProject returns a project with a 3-vertex yard boundary,
// one terrain element, one plant element, and minimal registries.
func minimalValidProject() map[string]any {
	return map[string]any{
		"id": "test-project",
		"yardBoundary": map[string]any{
			"vertices": []map[string]any{
				{"x": 0, "y": 0},
				{"x": 500, "y": 0},
				{"x": 500, "y": 500},
			},
		},
		"layers": []any{},
		"elements": []any{
			map[string]any{
				"id": "t1", "type": "terrain", "layerId": "l1",
				"x": 100, "y": 100, "width": 100, "height": 100,
				"terrainTypeId": "grass",
			},
			map[string]any{
				"id": "p1", "type": "plant", "layerId": "l1",
				"x": 200, "y": 200, "width": 50, "height": 50,
				"plantTypeId": "rose", "status": "planted", "quantity": 1,
			},
		},
		"registries": map[string]any{
			"terrain": []any{
				map[string]any{"id": "grass", "name": "Lawn Grass", "category": "natural"},
			},
			"plants": []any{
				map[string]any{
					"id": "rose", "name": "Rose", "growthForm": "shrub",
					"spacingCm": 60,
				},
			},
			"structures": []any{},
			"paths":      []any{},
		},
	}
}

// fullProject returns a project with all element types, multiple layers,
// and all registry types populated.
func fullProject() map[string]any {
	wood := "wood"
	stone := "stone"
	return map[string]any{
		"id": "full-project",
		"location": map[string]any{"lat": 40.0, "lng": -74.0},
		"yardBoundary": map[string]any{
			"vertices": []map[string]any{
				{"x": 0, "y": 0},
				{"x": 1000, "y": 0},
				{"x": 1000, "y": 800},
				{"x": 0, "y": 800},
			},
		},
		"layers": []any{
			map[string]any{"id": "l1", "visible": true, "locked": false},
			map[string]any{"id": "l2", "visible": false, "locked": false},
		},
		"elements": []any{
			// Terrain on visible layer
			map[string]any{
				"id": "t1", "type": "terrain", "layerId": "l1",
				"x": 0, "y": 0, "width": 100, "height": 100,
				"terrainTypeId": "grass",
			},
			// Plant on visible layer
			map[string]any{
				"id": "p1", "type": "plant", "layerId": "l1",
				"x": 200, "y": 200, "width": 60, "height": 60,
				"plantTypeId": "oak", "status": "planted", "quantity": 1,
			},
			// Structure on visible layer
			map[string]any{
				"id": "s1", "type": "structure", "layerId": "l1",
				"x": 400, "y": 100, "width": 200, "height": 100,
				"structureTypeId": "fence", "shape": "straight", "rotation": 0,
			},
			// Path on visible layer
			map[string]any{
				"id": "pa1", "type": "path", "layerId": "l1",
				"x": 0, "y": 0, "width": 0, "height": 0,
				"pathTypeId": "gravel-path", "strokeWidthCm": 60,
				"points": []map[string]any{
					{"x": 100, "y": 400},
					{"x": 300, "y": 400},
					{"x": 500, "y": 400},
				},
			},
			// Label (should be excluded)
			map[string]any{
				"id": "lb1", "type": "label", "layerId": "l1",
				"x": 50, "y": 50, "width": 100, "height": 20,
			},
			// Dimension (should be excluded)
			map[string]any{
				"id": "d1", "type": "dimension", "layerId": "l1",
				"x": 0, "y": 0, "width": 0, "height": 0,
			},
			// Plant on hidden layer (should be excluded)
			map[string]any{
				"id": "p2", "type": "plant", "layerId": "l2",
				"x": 600, "y": 600, "width": 40, "height": 40,
				"plantTypeId": "oak", "status": "planted", "quantity": 1,
			},
		},
		"registries": map[string]any{
			"terrain": []any{
				map[string]any{"id": "grass", "name": "Lawn Grass", "category": "natural"},
			},
			"plants": []any{
				map[string]any{
					"id": "oak", "name": "Oak Tree", "growthForm": "tree",
					"spacingCm": 300, "canopyWidthCm": 400, "trunkWidthCm": 30,
				},
			},
			"structures": []any{
				map[string]any{"id": "fence", "name": "Wooden Fence", "category": "boundary", "material": &wood},
			},
			"paths": []any{
				map[string]any{"id": "gravel-path", "name": "Gravel Path", "material": &stone, "defaultWidthCm": 45},
			},
		},
	}
}

// edgeCaseProject returns a project with edge cases: empty elements, removed plant,
// planned plant, closed path, arc edges.
func edgeCaseProject() map[string]any {
	sag := 30.0
	return map[string]any{
		"id": "edge-project",
		"yardBoundary": map[string]any{
			"vertices": []map[string]any{
				{"x": 0, "y": 0},
				{"x": 500, "y": 0},
				{"x": 500, "y": 500},
				{"x": 0, "y": 500},
			},
			"edgeTypes": []map[string]any{
				{"type": "line"},
				{"type": "arc", "arcSagitta": &sag},
				{"type": "line"},
				{"type": "line"},
			},
		},
		"layers": []any{},
		"elements": []any{
			// Removed plant (should be excluded)
			map[string]any{
				"id": "p-removed", "type": "plant", "layerId": "l1",
				"x": 100, "y": 100, "width": 40, "height": 40,
				"plantTypeId": "rose", "status": "removed", "quantity": 1,
			},
			// Planned plant (included when include_planned=true, default)
			map[string]any{
				"id": "p-planned", "type": "plant", "layerId": "l1",
				"x": 200, "y": 200, "width": 40, "height": 40,
				"plantTypeId": "rose", "status": "planned", "quantity": 1,
			},
		},
		"registries": map[string]any{
			"terrain": []any{},
			"plants": []any{
				map[string]any{
					"id": "rose", "name": "Rose", "growthForm": "shrub",
					"spacingCm": 50,
				},
			},
			"structures": []any{},
			"paths":      []any{},
		},
	}
}

// --- mock Gemini function ----------------------------------------------------

func mockGeminiSuccess(_ context.Context, _ model.PromptParts, _ []byte, _ []model.PhotoEntry, _ model.EffectiveOptions, _ string, _ string) ([]byte, string, *gemini.Error) {
	return fakePNGBytes, "image/png", nil
}

func mockGeminiTimeout(_ context.Context, _ model.PromptParts, _ []byte, _ []model.PhotoEntry, _ model.EffectiveOptions, _ string, _ string) ([]byte, string, *gemini.Error) {
	return nil, "", &gemini.Error{StatusCode: http.StatusGatewayTimeout, Message: "image generation timed out"}
}

func mockGeminiAPIError(_ context.Context, _ model.PromptParts, _ []byte, _ []model.PhotoEntry, _ model.EffectiveOptions, _ string, _ string) ([]byte, string, *gemini.Error) {
	return nil, "", &gemini.Error{StatusCode: http.StatusBadGateway, Message: "Nano Banana error: quota exceeded"}
}

func mockGeminiNoImage(_ context.Context, _ model.PromptParts, _ []byte, _ []model.PhotoEntry, _ model.EffectiveOptions, _ string, _ string) ([]byte, string, *gemini.Error) {
	return nil, "", &gemini.Error{StatusCode: http.StatusBadGateway, Message: "no image in Nano Banana response"}
}

// recordingMock captures the arguments passed to the Gemini function for assertion.
type recordingMock struct {
	promptParts model.PromptParts
	segMapBytes []byte
	photos      []model.PhotoEntry
	opts        model.EffectiveOptions
}

func (rm *recordingMock) generate(_ context.Context, pp model.PromptParts, segMapBytes []byte, photos []model.PhotoEntry, opts model.EffectiveOptions, _ string, _ string) ([]byte, string, *gemini.Error) {
	rm.promptParts = pp
	rm.segMapBytes = segMapBytes
	rm.photos = photos
	rm.opts = opts
	return fakePNGBytes, "image/png", nil
}

// --- helpers -----------------------------------------------------------------

func doGenerate(body []byte) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	Generate(rec, req)
	return rec
}

func marshalBody(project map[string]any, opts map[string]any) []byte {
	m := map[string]any{"project": project}
	if opts != nil {
		m["options"] = opts
	}
	b, _ := json.Marshal(m)
	return b
}

// --- integration tests -------------------------------------------------------

func TestIntegration_MinimalProject_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("Content-Type = %q; want %q", ct, "image/png")
	}
	if !bytes.Equal(rec.Body.Bytes(), fakePNGBytes) {
		t.Error("response body does not match expected PNG bytes")
	}
}

func TestIntegration_FullProject_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(fullProject(), map[string]any{
		"garden_style": "cottage",
		"season":       "summer",
		"time_of_day":  "morning",
		"viewpoint":    "elevated",
		"aspect_ratio": "landscape",
		"seed":         42,
	})
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("Content-Type = %q; want %q", ct, "image/png")
	}
}

func TestIntegration_EdgeCaseProject_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(edgeCaseProject(), nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestIntegration_EmptyElements_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	proj := minimalValidProject()
	proj["elements"] = []any{}
	body := marshalBody(proj, nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestIntegration_WithYardPhoto_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	// JPEG yard photo
	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": base64.StdEncoding.EncodeToString(jpegBytes),
	})
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestIntegration_PlannedExcluded_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(edgeCaseProject(), map[string]any{"include_planned": false})
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
}

func TestIntegration_GeminiTimeout_504(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiTimeout
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusGatewayTimeout {
		t.Fatalf("status = %d; want 504", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "image generation timed out" {
		t.Errorf("error = %q; want %q", resp["error"], "image generation timed out")
	}
}

func TestIntegration_GeminiAPIError_502(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiAPIError
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d; want 502", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "Nano Banana error: quota exceeded" {
		t.Errorf("error = %q; want %q", resp["error"], "Nano Banana error: quota exceeded")
	}
}

func TestIntegration_GeminiNoImage_502(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiNoImage
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d; want 502", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "no image in Nano Banana response" {
		t.Errorf("error = %q; want %q", resp["error"], "no image in Nano Banana response")
	}
}

func TestIntegration_ValidationFailure_400(t *testing.T) {
	// No mock needed — validation fails before Gemini is called
	body, _ := json.Marshal(map[string]any{
		"project": nil,
	})
	rec := doGenerate(body)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "project is required" {
		t.Errorf("error = %q; want %q", resp["error"], "project is required")
	}
}

func TestIntegration_MissingRegistryElement_Success(t *testing.T) {
	old := geminiGenerateFunc
	geminiGenerateFunc = mockGeminiSuccess
	defer func() { geminiGenerateFunc = old }()

	proj := minimalValidProject()
	// Empty registries — element will be excluded via registry miss
	proj["registries"] = map[string]any{
		"terrain": []any{}, "plants": []any{}, "structures": []any{}, "paths": []any{},
	}
	body := marshalBody(proj, nil)
	rec := doGenerate(body)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
}

// --- validation integration tests (BDD scenario coverage) --------------------

func TestIntegration_InvalidJSON_400(t *testing.T) {
	rec := doGenerate([]byte(`{not json`))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid request body" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid request body")
	}
}

func TestIntegration_NullYardBoundary_400(t *testing.T) {
	proj := minimalValidProject()
	proj["yardBoundary"] = nil
	rec := doGenerate(marshalBody(proj, nil))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "project has no yard boundary" {
		t.Errorf("error = %q; want %q", resp["error"], "project has no yard boundary")
	}
}

func TestIntegration_TooFewVertices_400(t *testing.T) {
	proj := minimalValidProject()
	proj["yardBoundary"] = map[string]any{
		"vertices": []map[string]any{
			{"x": 0, "y": 0},
			{"x": 100, "y": 0},
		},
	}
	rec := doGenerate(marshalBody(proj, nil))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "project has no yard boundary" {
		t.Errorf("error = %q; want %q", resp["error"], "project has no yard boundary")
	}
}

func TestIntegration_InvalidGardenStyle_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"garden_style": "zen"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid garden_style" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid garden_style")
	}
}

func TestIntegration_InvalidSeason_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"season": "monsoon"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid season" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid season")
	}
}

func TestIntegration_InvalidAspectRatio_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"aspect_ratio": "widescreen"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid aspect_ratio" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid aspect_ratio")
	}
}

func TestIntegration_InvalidViewpoint_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"viewpoint": "bird"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid viewpoint" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid viewpoint")
	}
}

func TestIntegration_InvalidTimeOfDay_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"time_of_day": "dusk"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid time_of_day" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid time_of_day")
	}
}

func TestIntegration_InvalidYardPhoto_400(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": "not-valid-base64!!!",
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid yard_photo" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid yard_photo")
	}
}

func TestIntegration_BodyTooLarge_413(t *testing.T) {
	huge := make([]byte, maxBodySize+1)
	for i := range huge {
		huge[i] = 'x'
	}
	rec := doGenerate(huge)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d; want 413", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "request body too large" {
		t.Errorf("error = %q; want %q", resp["error"], "request body too large")
	}
}

// --- Gemini argument verification tests --------------------------------------

func TestIntegration_GeminiReceives_LandscapeAspectRatio(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), map[string]any{"aspect_ratio": "landscape"})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.AspectRatio != "landscape" {
		t.Errorf("AspectRatio = %q; want %q", rm.opts.AspectRatio, "landscape")
	}
}

func TestIntegration_GeminiReceives_PortraitAspectRatio(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), map[string]any{"aspect_ratio": "portrait"})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.AspectRatio != "portrait" {
		t.Errorf("AspectRatio = %q; want %q", rm.opts.AspectRatio, "portrait")
	}
}

func TestIntegration_GeminiReceives_SquareAspectRatio(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), map[string]any{"aspect_ratio": "square"})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.AspectRatio != "square" {
		t.Errorf("AspectRatio = %q; want %q", rm.opts.AspectRatio, "square")
	}
}

func TestIntegration_GeminiReceives_ExplicitSeed(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), map[string]any{"seed": 42})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.Seed != 42 {
		t.Errorf("Seed = %d; want 42", rm.opts.Seed)
	}
}

func TestIntegration_GeminiReceives_DefaultSeedMinusOne(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.Seed != -1 {
		t.Errorf("Seed = %d; want -1", rm.opts.Seed)
	}
}

func TestIntegration_GeminiReceives_YardPhotoBytes(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": base64.StdEncoding.EncodeToString(jpegBytes),
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.photos) != 1 {
		t.Fatalf("expected 1 photo; got %d", len(rm.photos))
	}
	if !bytes.Equal(rm.photos[0].Bytes, jpegBytes) {
		t.Error("yard photo bytes not passed to Gemini")
	}
	if rm.photos[0].MIMEType != "image/jpeg" {
		t.Errorf("yard photo MIME = %q; want %q", rm.photos[0].MIMEType, "image/jpeg")
	}
}

func TestIntegration_GeminiReceives_NoYardPhoto(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.photos) != 0 {
		t.Errorf("expected no photos; got %d", len(rm.photos))
	}
}

func TestIntegration_GeminiReceives_SeasonDerivedFromLocation(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	// Project with lat=40 (northern hemisphere), no explicit season.
	// Season is derived from server UTC date + latitude.
	proj := minimalValidProject()
	proj["location"] = map[string]any{"lat": 40.0, "lng": -74.0}
	body := marshalBody(proj, nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}

	// Compute expected season from current UTC date (same logic as production)
	now := time.Now().UTC()
	expected := deriveNorthernSeason(now.Month(), now.Day())
	if rm.opts.Season != expected {
		t.Errorf("Season = %q; want %q (derived from lat=40, %s %d)", rm.opts.Season, expected, now.Month(), now.Day())
	}
}

func TestIntegration_GeminiReceives_SeasonDefaultsSummer_NullLocation(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	// Project with no location, no explicit season → defaults to "summer"
	proj := minimalValidProject()
	// minimalValidProject has no location field
	body := marshalBody(proj, nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.Season != "summer" {
		t.Errorf("Season = %q; want %q (null location defaults to summer)", rm.opts.Season, "summer")
	}
}

func TestIntegration_GeminiReceives_ImageSize2K(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), map[string]any{"image_size": "2K"})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.ImageSize != "2K" {
		t.Errorf("ImageSize = %q; want %q", rm.opts.ImageSize, "2K")
	}
}

func TestIntegration_GeminiReceives_DefaultImageSize1K(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if rm.opts.ImageSize != "1K" {
		t.Errorf("ImageSize = %q; want %q", rm.opts.ImageSize, "1K")
	}
}

func TestIntegration_InvalidImageSize_400(t *testing.T) {
	rec := doGenerate(marshalBody(minimalValidProject(), map[string]any{"image_size": "8K"}))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "invalid image_size" {
		t.Errorf("error = %q; want %q", resp["error"], "invalid image_size")
	}
}

func TestIntegration_GeminiReceives_SegMapBytes(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body := marshalBody(minimalValidProject(), nil)
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	// Segmap should be a valid PNG (starts with PNG magic bytes)
	if len(rm.segMapBytes) < 8 {
		t.Fatal("segmap too short")
	}
	pngHeader := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if !bytes.HasPrefix(rm.segMapBytes, pngHeader) {
		t.Error("segmap does not start with PNG magic bytes")
	}
}

// --- multi-photo integration tests -------------------------------------------

func TestIntegration_MultiPhoto_2Photos_Success(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	pngBytes := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	body, _ := json.Marshal(map[string]any{
		"project": minimalValidProject(),
		"yard_photo": []string{
			base64.StdEncoding.EncodeToString(jpegBytes),
			base64.StdEncoding.EncodeToString(pngBytes),
		},
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.photos) != 2 {
		t.Fatalf("expected 2 photos passed to Gemini; got %d", len(rm.photos))
	}
	if !bytes.Equal(rm.photos[0].Bytes, jpegBytes) {
		t.Error("photo[0] bytes mismatch")
	}
	if rm.photos[0].MIMEType != "image/jpeg" {
		t.Errorf("photo[0] MIME = %q; want image/jpeg", rm.photos[0].MIMEType)
	}
	if !bytes.Equal(rm.photos[1].Bytes, pngBytes) {
		t.Error("photo[1] bytes mismatch")
	}
	if rm.photos[1].MIMEType != "image/png" {
		t.Errorf("photo[1] MIME = %q; want image/png", rm.photos[1].MIMEType)
	}
}

func TestIntegration_MultiPhoto_PromptHasPerPhotoInstructions(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	body, _ := json.Marshal(map[string]any{
		"project": minimalValidProject(),
		"yard_photo": []string{
			base64.StdEncoding.EncodeToString(jpegBytes),
			base64.StdEncoding.EncodeToString(jpegBytes),
			base64.StdEncoding.EncodeToString(jpegBytes),
		},
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.promptParts.YardPhotoInstructions) != 3 {
		t.Fatalf("expected 3 yard photo instructions; got %d", len(rm.promptParts.YardPhotoInstructions))
	}
	if !strings.Contains(rm.promptParts.YardPhotoInstructions[0], "photo 1 of 3") {
		t.Errorf("instruction[0] should say 'photo 1 of 3'; got %q", rm.promptParts.YardPhotoInstructions[0])
	}
	if !strings.Contains(rm.promptParts.YardPhotoInstructions[2], "photo 3 of 3") {
		t.Errorf("instruction[2] should say 'photo 3 of 3'; got %q", rm.promptParts.YardPhotoInstructions[2])
	}
}

func TestIntegration_MultiPhoto_TooMany_400(t *testing.T) {
	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	b64 := base64.StdEncoding.EncodeToString(jpegBytes)
	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": []string{b64, b64, b64, b64, b64},
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d; want 400", rec.Code)
	}
	var resp map[string]string
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["error"] != "too many yard photos (max 4)" {
		t.Errorf("error = %q; want %q", resp["error"], "too many yard photos (max 4)")
	}
}

func TestIntegration_MultiPhoto_EmptyArray_NoPhotos(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": []string{},
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.photos) != 0 {
		t.Errorf("expected no photos; got %d", len(rm.photos))
	}
}

func TestIntegration_MultiPhoto_SingleStringStillWorks(t *testing.T) {
	rm := &recordingMock{}
	old := geminiGenerateFunc
	geminiGenerateFunc = rm.generate
	defer func() { geminiGenerateFunc = old }()

	jpegBytes := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	body, _ := json.Marshal(map[string]any{
		"project":    minimalValidProject(),
		"yard_photo": base64.StdEncoding.EncodeToString(jpegBytes),
	})
	rec := doGenerate(body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d; want 200; body: %s", rec.Code, rec.Body.String())
	}
	if len(rm.photos) != 1 {
		t.Fatalf("expected 1 photo; got %d", len(rm.photos))
	}
}
