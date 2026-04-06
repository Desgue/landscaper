package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// --- helpers ----------------------------------------------------------------

// minimalProject returns a JSON-serialisable project with a valid yardBoundary.
func minimalProject() map[string]any {
	return map[string]any{
		"id": "p1",
		"yardBoundary": map[string]any{
			"vertices": []map[string]any{
				{"x": 0, "y": 0},
				{"x": 100, "y": 0},
				{"x": 100, "y": 100},
			},
		},
		"layers":     []any{},
		"elements":   []any{},
		"registries": map[string]any{"terrain": []any{}, "plants": []any{}, "structures": []any{}, "paths": []any{}},
	}
}

// validBody returns a minimal valid request body as JSON bytes.
func validBody() []byte {
	b, _ := json.Marshal(map[string]any{
		"project": minimalProject(),
	})
	return b
}

// bodyWithOptions returns a request body with the given options merged in.
func bodyWithOptions(opts map[string]any) []byte {
	b, _ := json.Marshal(map[string]any{
		"project": minimalProject(),
		"options": opts,
	})
	return b
}

// doValidate creates an httptest request/recorder and calls validateAndParseWithTime.
func doValidate(body []byte, now time.Time) (*httptest.ResponseRecorder, bool) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	_, _, ok := validateAndParseWithTime(rec, req, now)
	return rec, ok
}


// assertError checks status code and error message in the JSON response.
func assertError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantMsg string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d; want %d", rec.Code, wantStatus)
	}
	var resp map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
	if got := resp["error"]; got != wantMsg {
		t.Errorf("error = %q; want %q", got, wantMsg)
	}
}

// fakeJPEG returns at least 8 bytes starting with JPEG magic, base64-encoded.
func fakeJPEG() string {
	raw := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
	return base64.StdEncoding.EncodeToString(raw)
}

// fakePNG returns at least 8 bytes starting with PNG magic, base64-encoded.
func fakePNG() string {
	raw := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00}
	return base64.StdEncoding.EncodeToString(raw)
}

// summerDate is a northern-hemisphere summer date for deterministic tests.
var summerDate = time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC)

// --- tests ------------------------------------------------------------------

func TestValidRequest_AllOptions(t *testing.T) {
	body := bodyWithOptions(map[string]any{
		"garden_style": "cottage",
		"season":       "winter",
		"time_of_day":  "morning",
		"viewpoint":    "elevated",
		"aspect_ratio": "landscape",
	})
	rec, ok := doValidate(body, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
}

func TestValidRequest_NoOptions(t *testing.T) {
	rec, ok := doValidate(validBody(), summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
}

func TestInvalidJSON(t *testing.T) {
	rec, ok := doValidate([]byte(`{not json`), summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid request body")
}

func TestMissingProject(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"options": map[string]any{},
	})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "project is required")
}

func TestNullProject(t *testing.T) {
	rec, ok := doValidate([]byte(`{"project": null}`), summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "project is required")
}

func TestNullYardBoundary(t *testing.T) {
	proj := minimalProject()
	proj["yardBoundary"] = nil
	body, _ := json.Marshal(map[string]any{"project": proj})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "project has no yard boundary")
}

func TestYardBoundaryTooFewVertices(t *testing.T) {
	proj := minimalProject()
	proj["yardBoundary"] = map[string]any{
		"vertices": []map[string]any{
			{"x": 0, "y": 0},
			{"x": 100, "y": 0},
		},
	}
	body, _ := json.Marshal(map[string]any{"project": proj})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "project has no yard boundary")
}

func TestInvalidGardenStyle(t *testing.T) {
	body := bodyWithOptions(map[string]any{"garden_style": "zen"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid garden_style")
}

func TestInvalidSeason(t *testing.T) {
	body := bodyWithOptions(map[string]any{"season": "spring"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid season")
}

func TestInvalidTimeOfDay(t *testing.T) {
	body := bodyWithOptions(map[string]any{"time_of_day": "evening"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid time_of_day")
}

func TestInvalidViewpoint(t *testing.T) {
	body := bodyWithOptions(map[string]any{"viewpoint": "aerial"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid viewpoint")
}

func TestInvalidAspectRatio(t *testing.T) {
	body := bodyWithOptions(map[string]any{"aspect_ratio": "wide"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid aspect_ratio")
}

func TestInvalidYardPhoto_BadBase64(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"project":    minimalProject(),
		"yard_photo": "not-valid-base64!!!",
	})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid yard_photo")
}

func TestInvalidYardPhoto_WrongMagicBytes(t *testing.T) {
	// Valid base64 but GIF magic bytes
	gif := []byte{0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00}
	body, _ := json.Marshal(map[string]any{
		"project":    minimalProject(),
		"yard_photo": base64.StdEncoding.EncodeToString(gif),
	})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid yard_photo")
}

func TestValidYardPhoto_JPEG(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"project":    minimalProject(),
		"yard_photo": fakeJPEG(),
	})
	rec, ok := doValidate(body, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
}

func TestValidYardPhoto_PNG(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"project":    minimalProject(),
		"yard_photo": fakePNG(),
	})
	rec, ok := doValidate(body, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
}

func TestBodyTooLarge(t *testing.T) {
	// Create a body just over 10 MB
	huge := strings.Repeat("x", maxBodySize+1)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", strings.NewReader(huge))
	req.Header.Set("Content-Type", "application/json")
	_, _, ok := validateAndParseWithTime(rec, req, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusRequestEntityTooLarge, "request body too large")
}

func TestEffectiveOptionsDefaults(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(validBody()))
	req.Header.Set("Content-Type", "application/json")
	_, eff, ok := validateAndParseWithTime(rec, req, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}

	if !eff.IncludePlanned {
		t.Error("IncludePlanned should default to true")
	}
	if eff.GardenStyle != "garden" {
		t.Errorf("GardenStyle = %q; want %q", eff.GardenStyle, "garden")
	}
	if eff.TimeOfDay != "golden hour" {
		t.Errorf("TimeOfDay = %q; want %q", eff.TimeOfDay, "golden hour")
	}
	if eff.Viewpoint != "eye-level" {
		t.Errorf("Viewpoint = %q; want %q", eff.Viewpoint, "eye-level")
	}
	if eff.AspectRatio != "square" {
		t.Errorf("AspectRatio = %q; want %q", eff.AspectRatio, "square")
	}
	if eff.Seed != -1 {
		t.Errorf("Seed = %d; want -1", eff.Seed)
	}
}

func TestSeasonDerivation_NorthernSummer(t *testing.T) {
	// Jul 15 in northern hemisphere → "summer"
	proj := minimalProject()
	lat := 40.0
	proj["location"] = map[string]any{"lat": lat, "lng": -74.0}
	body, _ := json.Marshal(map[string]any{"project": proj})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	_, eff, ok := validateAndParseWithTime(rec, req, time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC))
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.Season != "summer" {
		t.Errorf("Season = %q; want %q", eff.Season, "summer")
	}
}

func TestSeasonDerivation_SouthernOffset(t *testing.T) {
	// Jul 15 in southern hemisphere → "winter"
	proj := minimalProject()
	lat := -33.0
	proj["location"] = map[string]any{"lat": lat, "lng": 151.0}
	body, _ := json.Marshal(map[string]any{"project": proj})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	_, eff, ok := validateAndParseWithTime(rec, req, time.Date(2026, 7, 15, 12, 0, 0, 0, time.UTC))
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.Season != "winter" {
		t.Errorf("Season = %q; want %q", eff.Season, "winter")
	}
}

func TestSeasonDerivation_NullLocation(t *testing.T) {
	// No location → default "summer"
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(validBody()))
	_, eff, ok := validateAndParseWithTime(rec, req, time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC))
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.Season != "summer" {
		t.Errorf("Season = %q; want %q", eff.Season, "summer")
	}
}

func TestIncludePlanned_FalsePreserved(t *testing.T) {
	body := bodyWithOptions(map[string]any{"include_planned": false})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	_, eff, ok := validateAndParseWithTime(rec, req, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.IncludePlanned {
		t.Error("IncludePlanned should be false when explicitly set")
	}
}

func TestIncludePlanned_OmittedDefaultsTrue(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(validBody()))
	_, eff, ok := validateAndParseWithTime(rec, req, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if !eff.IncludePlanned {
		t.Error("IncludePlanned should default to true")
	}
}

func TestSeasonDerivation_NullLat(t *testing.T) {
	// Location present but lat is null → default "summer"
	proj := minimalProject()
	proj["location"] = map[string]any{"lng": 151.0}
	body, _ := json.Marshal(map[string]any{"project": proj})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	_, eff, ok := validateAndParseWithTime(rec, req, time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC))
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.Season != "summer" {
		t.Errorf("Season = %q; want %q", eff.Season, "summer")
	}
}

func TestInvalidSeed_NonInteger(t *testing.T) {
	body := bodyWithOptions(map[string]any{"seed": "abc"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid seed")
}

func TestInvalidSeed_Float(t *testing.T) {
	body := bodyWithOptions(map[string]any{"seed": 3.5})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid seed")
}

func TestValidSeed_ExplicitValue(t *testing.T) {
	body := bodyWithOptions(map[string]any{"seed": 42})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/generate", bytes.NewReader(body))
	_, eff, ok := validateAndParseWithTime(rec, req, summerDate)
	if !ok {
		t.Fatalf("expected ok; got error: %s", rec.Body.String())
	}
	if eff.Seed != 42 {
		t.Errorf("Seed = %d; want 42", eff.Seed)
	}
}

func TestInvalidIncludePlanned_NonBoolean(t *testing.T) {
	body := bodyWithOptions(map[string]any{"include_planned": "yes"})
	rec, ok := doValidate(body, summerDate)
	if ok {
		t.Fatal("expected failure")
	}
	assertError(t, rec, http.StatusBadRequest, "invalid include_planned")
}

// --- season derivation edge cases -------------------------------------------

func TestSeasonDerivation_NorthernAllRanges(t *testing.T) {
	cases := []struct {
		month time.Month
		day   int
		want  string
	}{
		{time.March, 1, "early spring"},
		{time.March, 31, "early spring"},
		{time.April, 1, "early spring"},
		{time.April, 14, "early spring"},
		{time.April, 15, "late spring"},
		{time.April, 30, "late spring"},
		{time.May, 15, "late spring"},
		{time.June, 1, "summer"},
		{time.July, 15, "summer"},
		{time.August, 31, "summer"},
		{time.September, 1, "late summer"},
		{time.September, 14, "late summer"},
		{time.September, 15, "late summer"},
		{time.September, 30, "late summer"},
		{time.October, 1, "late summer"},
		{time.October, 14, "late summer"},
		{time.October, 15, "autumn"},
		{time.October, 31, "autumn"},
		{time.November, 15, "autumn"},
		{time.December, 1, "winter"},
		{time.January, 15, "winter"},
		{time.February, 28, "winter"},
	}
	for _, tc := range cases {
		got := deriveNorthernSeason(tc.month, tc.day)
		if got != tc.want {
			t.Errorf("deriveNorthernSeason(%v, %d) = %q; want %q", tc.month, tc.day, got, tc.want)
		}
	}
}

func TestSeasonDerivation_SouthernAllRanges(t *testing.T) {
	cases := []struct {
		month time.Month
		day   int
		want  string
	}{
		{time.September, 1, "early spring"},
		{time.September, 30, "early spring"},
		{time.October, 1, "early spring"},
		{time.October, 14, "early spring"},
		{time.October, 15, "late spring"},
		{time.November, 15, "late spring"},
		{time.December, 1, "summer"},
		{time.January, 15, "summer"},
		{time.February, 28, "summer"},
		{time.March, 1, "late summer"},
		{time.March, 14, "late summer"},
		{time.April, 1, "late summer"},
		{time.April, 14, "late summer"},
		{time.April, 15, "autumn"},
		{time.May, 15, "autumn"},
		{time.June, 1, "winter"},
		{time.July, 15, "winter"},
		{time.August, 31, "winter"},
	}
	for _, tc := range cases {
		got := deriveSouthernSeason(tc.month, tc.day)
		if got != tc.want {
			t.Errorf("deriveSouthernSeason(%v, %d) = %q; want %q", tc.month, tc.day, got, tc.want)
		}
	}
}
