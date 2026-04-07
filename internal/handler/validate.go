package handler

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

	"greenprint/internal/model"
)

const maxBodySize = 10 * 1024 * 1024 // 10 MB

// validGardenStyles, validSeasons, etc. — maps for O(1) lookup.
var validGardenStyles = map[string]bool{
	"cottage": true, "formal": true, "tropical": true, "mediterranean": true,
	"japanese": true, "kitchen": true, "native": true, "contemporary": true, "garden": true,
}

var validSeasons = map[string]bool{
	"early spring": true, "late spring": true, "summer": true,
	"late summer": true, "autumn": true, "winter": true,
}

var validTimesOfDay = map[string]bool{
	"morning": true, "midday": true, "golden hour": true, "overcast": true,
}

var validViewpoints = map[string]bool{
	"eye-level": true, "elevated": true, "isometric": true,
}

var validAspectRatios = map[string]bool{
	"square": true, "landscape": true, "portrait": true,
}

var validImageSizes = map[string]bool{
	"1K": true, "2K": true, "4K": true,
}

// Magic byte prefixes for image format detection.
var jpegMagic = []byte{0xFF, 0xD8, 0xFF}
var pngMagic = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}

const maxYardPhotos = 4
const maxPhotoBytes = 3 * 1024 * 1024 // 3 MB decoded per photo

// validationError writes a JSON error response and logs the failure.
func validationError(w http.ResponseWriter, r *http.Request, status int, message string) {
	Logger(r.Context()).Warn("validation failed", "error", message)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// validateAndParse reads the request body, validates all fields, and returns
// the parsed request, resolved EffectiveOptions, and decoded yard photo data.
// If validation fails, it writes the error response and returns false.
func validateAndParse(w http.ResponseWriter, r *http.Request) (model.GenerateRequest, model.EffectiveOptions, []model.PhotoEntry, bool) {
	return validateAndParseWithTime(w, r, time.Now().UTC())
}

// validateAndParseWithTime is the testable core: same as validateAndParse but
// accepts an explicit "now" for deterministic season derivation in tests.
func validateAndParseWithTime(w http.ResponseWriter, r *http.Request, now time.Time) (model.GenerateRequest, model.EffectiveOptions, []model.PhotoEntry, bool) {
	// 1. Body size limit
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)

	body, err := io.ReadAll(r.Body)
	if err != nil {
		validationError(w, r, http.StatusRequestEntityTooLarge, "request body too large")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// 2. JSON decode — first pass: raw message to detect type errors for seed/include_planned
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		validationError(w, r, http.StatusBadRequest, "invalid request body")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// 3. project required — detect null/missing
	projectRaw, hasProject := raw["project"]
	if !hasProject || string(projectRaw) == "null" {
		validationError(w, r, http.StatusBadRequest, "project is required")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// Validate options.seed and options.include_planned types before full decode
	if optionsRaw, ok := raw["options"]; ok {
		var optFields map[string]json.RawMessage
		if err := json.Unmarshal(optionsRaw, &optFields); err == nil {
			if seedRaw, ok := optFields["seed"]; ok {
				var seed int
				if err := json.Unmarshal(seedRaw, &seed); err != nil {
					validationError(w, r, http.StatusBadRequest, "invalid seed")
					return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
				}
				if seed < math.MinInt32 || seed > math.MaxInt32 {
					validationError(w, r, http.StatusBadRequest, "invalid seed")
					return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
				}
			}
			if ipRaw, ok := optFields["include_planned"]; ok {
				var ip bool
				if err := json.Unmarshal(ipRaw, &ip); err != nil {
					validationError(w, r, http.StatusBadRequest, "invalid include_planned")
					return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
				}
			}
		}
	}

	// Full struct decode
	var req model.GenerateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		validationError(w, r, http.StatusBadRequest, "invalid request body")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// 4. yardBoundary: non-null with >= 3 vertices
	if req.Project.YardBoundary == nil || len(req.Project.YardBoundary.Vertices) < 3 {
		validationError(w, r, http.StatusBadRequest, "project has no yard boundary")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// 5–9. Options enum validation
	if req.Options.GardenStyle != "" && !validGardenStyles[req.Options.GardenStyle] {
		validationError(w, r, http.StatusBadRequest, "invalid garden_style")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}
	if req.Options.Season != "" && !validSeasons[req.Options.Season] {
		validationError(w, r, http.StatusBadRequest, "invalid season")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}
	if req.Options.TimeOfDay != "" && !validTimesOfDay[req.Options.TimeOfDay] {
		validationError(w, r, http.StatusBadRequest, "invalid time_of_day")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}
	if req.Options.Viewpoint != "" && !validViewpoints[req.Options.Viewpoint] {
		validationError(w, r, http.StatusBadRequest, "invalid viewpoint")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}
	if req.Options.AspectRatio != "" && !validAspectRatios[req.Options.AspectRatio] {
		validationError(w, r, http.StatusBadRequest, "invalid aspect_ratio")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}
	if req.Options.ImageSize != "" && !validImageSizes[req.Options.ImageSize] {
		validationError(w, r, http.StatusBadRequest, "invalid image_size")
		return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
	}

	// 10. yard_photo: if present, decode base64 and check magic bytes.
	// Accepts both string (single photo, backward compat) and []string (multi-photo).
	var photos []model.PhotoEntry
	if len(req.YardPhoto) > 0 && string(req.YardPhoto) != "null" {
		photos, err = parseYardPhotos(req.YardPhoto)
		if err != nil {
			validationError(w, r, http.StatusBadRequest, err.Error())
			return model.GenerateRequest{}, model.EffectiveOptions{}, nil, false
		}
	}

	// 11. Resolve EffectiveOptions with defaults
	eff := resolveOptions(req.Options, req.Project.Location, now)

	return req, eff, photos, true
}

// parseYardPhotos handles both string and []string yard_photo formats.
// Returns an error with an appropriate user-facing message on failure.
func parseYardPhotos(raw json.RawMessage) ([]model.PhotoEntry, error) {
	// Try as single string first (backward compat)
	var single string
	if err := json.Unmarshal(raw, &single); err == nil {
		if single == "" {
			return nil, nil
		}
		entry, err := decodePhoto(single)
		if err != nil {
			return nil, err
		}
		return []model.PhotoEntry{entry}, nil
	}

	// Try as array
	var arr []string
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil, fmt.Errorf("invalid yard_photo")
	}

	if len(arr) == 0 {
		return nil, nil
	}
	if len(arr) > maxYardPhotos {
		return nil, fmt.Errorf("too many yard photos (max %d)", maxYardPhotos)
	}

	photos := make([]model.PhotoEntry, 0, len(arr))
	for _, s := range arr {
		entry, err := decodePhoto(s)
		if err != nil {
			return nil, err
		}
		photos = append(photos, entry)
	}
	return photos, nil
}

// decodePhoto decodes a single base64-encoded photo and validates magic bytes.
func decodePhoto(b64 string) (model.PhotoEntry, error) {
	// Pre-check: reject obviously oversized input before allocating decode buffer.
	if base64.StdEncoding.DecodedLen(len(b64)) > maxPhotoBytes {
		return model.PhotoEntry{}, fmt.Errorf("yard photo too large")
	}
	decoded, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return model.PhotoEntry{}, fmt.Errorf("invalid yard_photo")
	}
	if len(decoded) < 8 {
		return model.PhotoEntry{}, fmt.Errorf("invalid yard_photo")
	}
	if len(decoded) > maxPhotoBytes {
		return model.PhotoEntry{}, fmt.Errorf("yard photo too large")
	}
	isJPEG := bytes.HasPrefix(decoded, jpegMagic)
	isPNG := bytes.HasPrefix(decoded, pngMagic)
	if !isJPEG && !isPNG {
		return model.PhotoEntry{}, fmt.Errorf("invalid yard_photo")
	}
	mime := "image/png"
	if isJPEG {
		mime = "image/jpeg"
	}
	return model.PhotoEntry{Bytes: decoded, MIMEType: mime}, nil
}

// resolveOptions applies defaults for all omitted fields.
func resolveOptions(opts model.GenerateOptions, loc *model.Location, now time.Time) model.EffectiveOptions {
	eff := model.EffectiveOptions{
		IncludePlanned: true,
		GardenStyle:    "garden",
		Season:         "summer",
		TimeOfDay:      "golden hour",
		Viewpoint:      "eye-level",
		AspectRatio:    "square",
		ImageSize:      "1K",
		Seed:           -1,
	}

	if opts.IncludePlanned != nil {
		eff.IncludePlanned = *opts.IncludePlanned
	}
	if opts.GardenStyle != "" {
		eff.GardenStyle = opts.GardenStyle
	}
	if opts.Season != "" {
		eff.Season = opts.Season
	} else {
		eff.Season = deriveSeason(loc, now)
	}
	if opts.TimeOfDay != "" {
		eff.TimeOfDay = opts.TimeOfDay
	}
	if opts.Viewpoint != "" {
		eff.Viewpoint = opts.Viewpoint
	}
	if opts.AspectRatio != "" {
		eff.AspectRatio = opts.AspectRatio
	}
	if opts.ImageSize != "" {
		eff.ImageSize = opts.ImageSize
	}
	if opts.Seed != nil {
		eff.Seed = *opts.Seed
	}

	return eff
}

// deriveSeason determines the season from latitude and current date.
func deriveSeason(loc *model.Location, now time.Time) string {
	if loc == nil || loc.Lat == nil {
		return "summer"
	}

	lat := *loc.Lat
	month := now.Month()
	day := now.Day()

	if lat < 0 {
		return deriveSouthernSeason(month, day)
	}
	return deriveNorthernSeason(month, day)
}

// deriveNorthernSeason returns the season for the northern hemisphere.
//
// Date ranges:
//
//	Mar 1  – Apr 14  → "early spring"
//	Apr 15 – May 31  → "late spring"
//	Jun 1  – Aug 31  → "summer"
//	Sep 1  – Oct 14  → "late summer"
//	Oct 15 – Nov 30  → "autumn"
//	Dec 1  – Feb 28/29 → "winter"
func deriveNorthernSeason(month time.Month, day int) string {
	switch month {
	case time.March:
		return "early spring"
	case time.April:
		if day <= 14 {
			return "early spring"
		}
		return "late spring"
	case time.May:
		return "late spring"
	case time.June, time.July, time.August:
		return "summer"
	case time.September:
		return "late summer"
	case time.October:
		if day <= 14 {
			return "late summer"
		}
		return "autumn"
	case time.November:
		return "autumn"
	case time.December, time.January, time.February:
		return "winter"
	}
	return "summer"
}

// deriveSouthernSeason returns the season for the southern hemisphere (6-month offset).
//
// Date ranges:
//
//	Sep 1  – Oct 14  → "early spring"
//	Oct 15 – Nov 30  → "late spring"
//	Dec 1  – Feb 28/29 → "summer"
//	Mar 1  – Apr 14  → "late summer"
//	Apr 15 – May 31  → "autumn"
//	Jun 1  – Aug 31  → "winter"
func deriveSouthernSeason(month time.Month, day int) string {
	switch month {
	case time.September:
		return "early spring"
	case time.October:
		if day <= 14 {
			return "early spring"
		}
		return "late spring"
	case time.November:
		return "late spring"
	case time.December, time.January, time.February:
		return "summer"
	case time.March:
		return "late summer"
	case time.April:
		if day <= 14 {
			return "late summer"
		}
		return "autumn"
	case time.May:
		return "autumn"
	case time.June, time.July, time.August:
		return "winter"
	}
	return "summer"
}
