package prompt

import (
	"strings"
	"testing"
	"time"

	"greenprint/internal/filter"
	"greenprint/internal/model"
)

func defaultOpts() model.EffectiveOptions {
	return model.EffectiveOptions{
		IncludePlanned: true,
		GardenStyle:    "cottage",
		Season:         "late summer",
		TimeOfDay:      "golden hour",
		Viewpoint:      "eye-level",
		AspectRatio:    "square",
		Seed:           -1,
	}
}

// --- PromptParts structure tests ---

func TestBuild_ReturnsSegmapInstruction(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if parts.SegmapInstruction == "" {
		t.Fatal("SegmapInstruction should never be empty")
	}
	if !strings.Contains(parts.SegmapInstruction, "layout map") {
		t.Error("SegmapInstruction should mention layout map")
	}
}

func TestBuild_SegmapInstructionContainsColorLegend(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.SegmapInstruction, "pink/magenta shapes are plants") {
		t.Error("SegmapInstruction should contain color legend for plants")
	}
	if !strings.Contains(parts.SegmapInstruction, "red/orange shapes are structures") {
		t.Error("SegmapInstruction should contain color legend for structures")
	}
}

func TestBuild_SegmapInstructionContainsProhibitions(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.SegmapInstruction, "NO pink circles") {
		t.Error("SegmapInstruction should contain explicit NO prohibitions")
	}
	if !strings.Contains(parts.SegmapInstruction, "NO geometric shapes") {
		t.Error("SegmapInstruction should prohibit geometric shapes")
	}
}

func TestBuild_WithYardPhoto_HasYardPhotoInstruction(t *testing.T) {
	parts := Build(nil, defaultOpts(), true)
	if parts.YardPhotoInstruction == "" {
		t.Fatal("YardPhotoInstruction should be set when hasYardPhoto is true")
	}
	if !strings.Contains(parts.YardPhotoInstruction, "real photograph") {
		t.Error("YardPhotoInstruction should mention real photograph")
	}
	if !strings.Contains(parts.YardPhotoInstruction, "perspective") {
		t.Error("YardPhotoInstruction should mention perspective matching")
	}
}

func TestBuild_WithoutYardPhoto_EmptyYardPhotoInstruction(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if parts.YardPhotoInstruction != "" {
		t.Error("YardPhotoInstruction should be empty when hasYardPhoto is false")
	}
}

// --- Scene prompt tests ---

func TestBuild_ScenePromptContainsSubject(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "cottage garden, late summer, golden hour") {
		t.Fatalf("ScenePrompt missing subject: %q", parts.ScenePrompt)
	}
}

func TestBuild_ScenePromptContainsStyle(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "landscape photography") {
		t.Error("ScenePrompt should contain photography style")
	}
	if !strings.Contains(parts.ScenePrompt, "24mm") {
		t.Error("eye-level ScenePrompt should contain lens hint")
	}
}

func TestBuild_ScenePromptContainsProhibitions(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "NO floor plan") {
		t.Error("ScenePrompt should contain floor plan prohibition")
	}
	if !strings.Contains(parts.ScenePrompt, "NO top-down diagram") {
		t.Error("ScenePrompt should contain diagram prohibition")
	}
	if !strings.Contains(parts.ScenePrompt, "NO colored circles") {
		t.Error("ScenePrompt should contain colored circles prohibition")
	}
}

func TestBuild_ScenePromptContainsOnlyMapElements(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "Only include elements shown in the layout map") {
		t.Error("ScenePrompt should constrain to layout map elements only")
	}
	if !strings.Contains(parts.ScenePrompt, "NO extra structures") {
		t.Error("ScenePrompt should prohibit extra structures")
	}
}

// --- Element list tests ---

func TestBuild_WithElements_LinkedToMap(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose Bush"}},
		{Element: model.Element{Type: "structure"}, StructureType: &model.StructureType{Name: "Wooden Pergola"}},
		{Element: model.Element{Type: "terrain"}, TerrainType: &model.TerrainType{Name: "Grass"}},
	}
	parts := Build(elements, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "Rose Bush, Wooden Pergola, Grass") {
		t.Fatalf("expected element names in prompt: %q", parts.ScenePrompt)
	}
	if !strings.Contains(parts.ScenePrompt, "positions shown by their corresponding colored shapes") {
		t.Error("elements should be linked to map positions")
	}
}

func TestBuild_WithoutElements_NoElementSection(t *testing.T) {
	parts := Build(nil, defaultOpts(), false)
	if strings.Contains(parts.ScenePrompt, "Place these elements") {
		t.Error("should not contain element section when no elements")
	}
}

func TestBuild_PathsExcludedFromElements(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "path"}, PathType: &model.PathType{Name: "Stone Path"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
	}
	parts := Build(elements, defaultOpts(), false)
	if strings.Contains(parts.ScenePrompt, "Stone Path") {
		t.Error("paths should not appear in prompt elements")
	}
	if !strings.Contains(parts.ScenePrompt, "Rose") {
		t.Error("plants should appear in prompt elements")
	}
}

func TestBuild_UniqueNames(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
	}
	parts := Build(elements, defaultOpts(), false)
	count := strings.Count(parts.ScenePrompt, "Rose")
	if count != 1 {
		t.Fatalf("expected Rose to appear once, got %d times in: %q", count, parts.ScenePrompt)
	}
}

func TestBuild_PlantCapAt7(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 10; i++ {
		name := "Plant" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:   model.Element{Type: "plant"},
			PlantType: &model.PlantType{Name: name},
		})
	}
	parts := Build(elements, defaultOpts(), false)
	if strings.Contains(parts.ScenePrompt, "PlantH") {
		t.Error("plant cap exceeded — PlantH should not be in prompt")
	}
}

func TestBuild_StructureCapAt3(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 5; i++ {
		name := "Struct" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:       model.Element{Type: "structure"},
			StructureType: &model.StructureType{Name: name},
		})
	}
	parts := Build(elements, defaultOpts(), false)
	if strings.Contains(parts.ScenePrompt, "StructD") {
		t.Error("structure cap exceeded — StructD should not be in prompt")
	}
}

func TestBuild_TerrainCapAt2(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 4; i++ {
		name := "Terrain" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:     model.Element{Type: "terrain"},
			TerrainType: &model.TerrainType{Name: name},
		})
	}
	parts := Build(elements, defaultOpts(), false)
	if strings.Contains(parts.ScenePrompt, "TerrainC") {
		t.Error("terrain cap exceeded — TerrainC should not be in prompt")
	}
}

// --- Viewpoint tests ---

func TestBuild_AllViewpointsProduceDifferentPrompts(t *testing.T) {
	viewpoints := []string{"eye-level", "elevated", "isometric"}
	prompts := map[string]string{}
	for _, vp := range viewpoints {
		opts := defaultOpts()
		opts.Viewpoint = vp
		parts := Build(nil, opts, false)
		prompts[vp] = parts.ScenePrompt
	}
	if prompts["eye-level"] == prompts["elevated"] {
		t.Error("eye-level and elevated should produce different prompts")
	}
	if prompts["eye-level"] == prompts["isometric"] {
		t.Error("eye-level and isometric should produce different prompts")
	}
	if prompts["elevated"] == prompts["isometric"] {
		t.Error("elevated and isometric should produce different prompts")
	}
}

func TestBuild_EyeLevelContainsLensHint(t *testing.T) {
	opts := defaultOpts()
	opts.Viewpoint = "eye-level"
	parts := Build(nil, opts, false)
	if !strings.Contains(parts.ScenePrompt, "24mm") {
		t.Error("eye-level should contain 24mm lens hint")
	}
}

func TestBuild_ElevatedContainsLensHint(t *testing.T) {
	opts := defaultOpts()
	opts.Viewpoint = "elevated"
	parts := Build(nil, opts, false)
	if !strings.Contains(parts.ScenePrompt, "35mm") {
		t.Error("elevated should contain 35mm lens hint")
	}
}

func TestBuild_IsometricContainsTiltShift(t *testing.T) {
	opts := defaultOpts()
	opts.Viewpoint = "isometric"
	parts := Build(nil, opts, false)
	if !strings.Contains(parts.ScenePrompt, "tilt-shift") {
		t.Error("isometric should contain tilt-shift lens hint")
	}
}

func TestBuild_UnknownViewpointFallsBackToEyeLevel(t *testing.T) {
	opts := defaultOpts()
	opts.Viewpoint = "birds-eye"
	parts := Build(nil, opts, false)
	if !strings.Contains(parts.ScenePrompt, "24mm") {
		t.Error("unknown viewpoint should fall back to eye-level (24mm)")
	}
}

// --- Yard photo + elements combo ---

func TestBuild_WithYardPhotoAndElements(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Lavender"}},
		{Element: model.Element{Type: "structure"}, StructureType: &model.StructureType{Name: "Raised Bed"}},
	}
	parts := Build(elements, defaultOpts(), true)

	if parts.SegmapInstruction == "" {
		t.Error("SegmapInstruction should be set")
	}
	if parts.YardPhotoInstruction == "" {
		t.Error("YardPhotoInstruction should be set when yard photo present")
	}
	if !strings.Contains(parts.ScenePrompt, "Lavender") {
		t.Error("ScenePrompt should contain element names")
	}
	if !strings.Contains(parts.ScenePrompt, "Raised Bed") {
		t.Error("ScenePrompt should contain structure names")
	}
}

// --- Botanical name enrichment tests ---

func TestBuild_BotanicalNameEnrichment_KnownPlant(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{ID: "lavender", Name: "Lavender"}},
	}
	parts := Build(elements, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "Lavandula angustifolia (Lavender)") {
		t.Fatalf("expected botanical name enrichment; got: %q", parts.ScenePrompt)
	}
}

func TestBuild_BotanicalNameEnrichment_UnknownPlant(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{ID: "custom-plant", Name: "My Custom Plant"}},
	}
	parts := Build(elements, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "My Custom Plant") {
		t.Fatal("unknown plant should use common name")
	}
	if strings.Contains(parts.ScenePrompt, "(My Custom Plant)") {
		t.Error("unknown plant should not have parenthesized format")
	}
}

func TestBuild_BotanicalNameEnrichment_MultiplePlants(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{ID: "oak", Name: "Oak Tree"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{ID: "basil", Name: "Basil"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{ID: "unknown-shrub", Name: "Mystery Shrub"}},
	}
	parts := Build(elements, defaultOpts(), false)
	if !strings.Contains(parts.ScenePrompt, "Quercus robur (Oak Tree)") {
		t.Errorf("missing oak botanical name in: %q", parts.ScenePrompt)
	}
	if !strings.Contains(parts.ScenePrompt, "Ocimum basilicum (Basil)") {
		t.Errorf("missing basil botanical name in: %q", parts.ScenePrompt)
	}
	if !strings.Contains(parts.ScenePrompt, "Mystery Shrub") {
		t.Errorf("missing unknown plant common name in: %q", parts.ScenePrompt)
	}
}

func TestEnrichPlantName_AllKnownIDs(t *testing.T) {
	for id, botanical := range botanicalNames {
		got := enrichPlantName(id, "Common")
		expected := botanical + " (Common)"
		if got != expected {
			t.Errorf("enrichPlantName(%q, %q) = %q; want %q", id, "Common", got, expected)
		}
	}
}

// --- Season derivation tests ---

func TestDeriveSeasonNorthern(t *testing.T) {
	lat := 40.0
	loc := &model.Location{Lat: &lat}
	tests := []struct {
		date     string
		expected string
	}{
		{"2026-03-15", "early spring"},
		{"2026-04-10", "early spring"},
		{"2026-04-20", "late spring"},
		{"2026-05-15", "late spring"},
		{"2026-06-15", "summer"},
		{"2026-07-15", "summer"},
		{"2026-09-10", "late summer"},
		{"2026-10-10", "late summer"},
		{"2026-10-20", "autumn"},
		{"2026-11-15", "autumn"},
		{"2026-12-15", "winter"},
		{"2026-01-15", "winter"},
	}
	for _, tt := range tests {
		d, _ := time.Parse("2006-01-02", tt.date)
		got := DeriveSeason(loc, d)
		if got != tt.expected {
			t.Errorf("Northern %s: got %q, want %q", tt.date, got, tt.expected)
		}
	}
}

func TestDeriveSeasonSouthern(t *testing.T) {
	lat := -33.0
	loc := &model.Location{Lat: &lat}
	tests := []struct {
		date     string
		expected string
	}{
		{"2026-09-10", "early spring"},
		{"2026-10-10", "early spring"},
		{"2026-10-20", "late spring"},
		{"2026-11-15", "late spring"},
		{"2026-12-15", "summer"},
		{"2026-01-15", "summer"},
		{"2026-03-10", "late summer"},
		{"2026-04-10", "late summer"},
		{"2026-04-20", "autumn"},
		{"2026-05-15", "autumn"},
		{"2026-06-15", "winter"},
		{"2026-08-15", "winter"},
	}
	for _, tt := range tests {
		d, _ := time.Parse("2006-01-02", tt.date)
		got := DeriveSeason(loc, d)
		if got != tt.expected {
			t.Errorf("Southern %s: got %q, want %q", tt.date, got, tt.expected)
		}
	}
}

func TestDeriveSeasonNilLocation(t *testing.T) {
	got := DeriveSeason(nil, time.Now())
	if got != "summer" {
		t.Errorf("nil location: got %q, want %q", got, "summer")
	}
}

func TestDeriveSeasonNilLat(t *testing.T) {
	loc := &model.Location{Lat: nil}
	got := DeriveSeason(loc, time.Now())
	if got != "summer" {
		t.Errorf("nil lat: got %q, want %q", got, "summer")
	}
}

func TestDeriveSeasonEquator(t *testing.T) {
	lat := 0.0
	loc := &model.Location{Lat: &lat}
	// Latitude 0 uses northern hemisphere logic
	d, _ := time.Parse("2006-01-02", "2026-06-15")
	got := DeriveSeason(loc, d)
	if got != "summer" {
		t.Errorf("equator June: got %q, want %q", got, "summer")
	}
}
