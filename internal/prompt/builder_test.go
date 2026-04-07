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

func TestBuildSubjectFormatting(t *testing.T) {
	opts := defaultOpts()
	result := Build(nil, opts, false)
	if !strings.HasPrefix(result, "A cottage garden, late summer, golden hour.") {
		t.Fatalf("unexpected subject: %q", result)
	}
}

func TestBuildWithElements(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose Bush"}},
		{Element: model.Element{Type: "structure"}, StructureType: &model.StructureType{Name: "Wooden Pergola"}},
		{Element: model.Element{Type: "terrain"}, TerrainType: &model.TerrainType{Name: "Grass"}},
	}
	result := Build(elements, defaultOpts(), false)
	if !strings.Contains(result, "Rose Bush, Wooden Pergola, Grass") {
		t.Fatalf("expected element names in prompt: %q", result)
	}
}

func TestBuildWithoutElements(t *testing.T) {
	result := Build(nil, defaultOpts(), false)
	// Should be subject + style with no element section
	if strings.Contains(result, ",,") {
		t.Fatal("prompt has double commas indicating empty element list")
	}
	if !strings.Contains(result, "photorealistic") {
		t.Fatal("missing style suffix")
	}
}

func TestBuildPathsExcludedFromElements(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "path"}, PathType: &model.PathType{Name: "Stone Path"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
	}
	result := Build(elements, defaultOpts(), false)
	if strings.Contains(result, "Stone Path") {
		t.Fatal("paths should not appear in prompt elements")
	}
	if !strings.Contains(result, "Rose") {
		t.Fatal("plants should appear in prompt elements")
	}
}

func TestBuildUniqueNames(t *testing.T) {
	elements := []filter.FilteredElement{
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
		{Element: model.Element{Type: "plant"}, PlantType: &model.PlantType{Name: "Rose"}},
	}
	result := Build(elements, defaultOpts(), false)
	count := strings.Count(result, "Rose")
	if count != 1 {
		t.Fatalf("expected Rose to appear once, got %d times in: %q", count, result)
	}
}

func TestBuildPlantCapAt7(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 10; i++ {
		name := "Plant" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:   model.Element{Type: "plant"},
			PlantType: &model.PlantType{Name: name},
		})
	}
	result := Build(elements, defaultOpts(), false)
	// Plants A-G should be present (7), H-J should not
	if strings.Contains(result, "PlantH") {
		t.Fatal("plant cap exceeded — PlantH should not be in prompt")
	}
}

func TestBuildStructureCapAt3(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 5; i++ {
		name := "Struct" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:       model.Element{Type: "structure"},
			StructureType: &model.StructureType{Name: name},
		})
	}
	result := Build(elements, defaultOpts(), false)
	if strings.Contains(result, "StructD") {
		t.Fatal("structure cap exceeded — StructD should not be in prompt")
	}
}

func TestBuildTerrainCapAt2(t *testing.T) {
	var elements []filter.FilteredElement
	for i := 0; i < 4; i++ {
		name := "Terrain" + string(rune('A'+i))
		elements = append(elements, filter.FilteredElement{
			Element:     model.Element{Type: "terrain"},
			TerrainType: &model.TerrainType{Name: name},
		})
	}
	result := Build(elements, defaultOpts(), false)
	if strings.Contains(result, "TerrainC") {
		t.Fatal("terrain cap exceeded — TerrainC should not be in prompt")
	}
}

func TestBuildWithYardPhoto(t *testing.T) {
	result := Build(nil, defaultOpts(), true)
	if !strings.HasPrefix(result, "The first image is a top-down segmentation plan") {
		t.Fatalf("expected yard photo preamble at start: %q", result)
	}
	// Should still have subject and style
	if !strings.Contains(result, "A cottage garden") {
		t.Fatal("missing subject after preamble")
	}
}

func TestBuildWithoutYardPhoto(t *testing.T) {
	result := Build(nil, defaultOpts(), false)
	if strings.Contains(result, "segmentation plan") {
		t.Fatal("preamble should not appear when yard photo is absent")
	}
}

func TestStyleSuffixes(t *testing.T) {
	tests := []struct {
		viewpoint string
		contains  string
	}{
		{"eye-level", "eye-level view"},
		{"elevated", "elevated perspective view"},
		{"isometric", "isometric view"},
	}
	for _, tt := range tests {
		opts := defaultOpts()
		opts.Viewpoint = tt.viewpoint
		result := Build(nil, opts, false)
		if !strings.Contains(result, tt.contains) {
			t.Errorf("viewpoint %q: expected %q in prompt: %q", tt.viewpoint, tt.contains, result)
		}
		if !strings.Contains(result, "not a floor plan") {
			t.Errorf("viewpoint %q: missing 'not a floor plan' directive", tt.viewpoint)
		}
	}
}

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
