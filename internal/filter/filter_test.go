package filter

import (
	"bytes"
	"log/slog"
	"testing"

	"greenprint/internal/model"
)

func testLogger(buf *bytes.Buffer) *slog.Logger {
	return slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{Level: slog.LevelWarn}))
}

func baseProject() model.ProjectPayload {
	return model.ProjectPayload{
		ID: "test-project",
		Layers: []model.Layer{
			{ID: "layer-1", Visible: true, Locked: false},
			{ID: "layer-hidden", Visible: false, Locked: false},
			{ID: "layer-locked", Visible: true, Locked: true},
		},
		Registries: model.Registries{
			Plants: []model.PlantType{
				{ID: "rose", Name: "Rose Bush", GrowthForm: "shrub", SpacingCm: 60},
				{ID: "oak", Name: "Oak Tree", GrowthForm: "tree", SpacingCm: 500},
			},
			Structures: []model.StructureType{
				{ID: "pergola", Name: "Wooden Pergola", Category: "overhead", Material: strPtr("wood")},
			},
			Terrain: []model.TerrainType{
				{ID: "grass", Name: "Grass", Category: "natural"},
			},
			Paths: []model.PathType{
				{ID: "stone-path", Name: "Stone Path", Material: strPtr("stone"), DefaultWidthCm: 60},
			},
		},
	}
}

func defaultOpts() model.EffectiveOptions {
	return model.EffectiveOptions{
		IncludePlanned: true,
		GardenStyle:    "garden",
		Season:         "summer",
		TimeOfDay:      "golden hour",
		Viewpoint:      "eye-level",
		AspectRatio:    "square",
		Seed:           -1,
	}
}

func strPtr(s string) *string { return &s }

func TestFilterIncludesVisiblePlant(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-1", PlantTypeID: "rose", Status: "planted"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 1 {
		t.Fatalf("expected 1 element, got %d", len(result))
	}
	if result[0].PlantType == nil || result[0].PlantType.ID != "rose" {
		t.Fatal("expected resolved PlantType rose")
	}
}

func TestFilterExcludesHiddenLayer(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-hidden", PlantTypeID: "rose", Status: "planted"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
}

func TestFilterIncludesLockedLayer(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-locked", PlantTypeID: "rose", Status: "planted"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 1 {
		t.Fatalf("expected 1 element, got %d", len(result))
	}
}

func TestFilterExcludesRemovedPlant(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-1", PlantTypeID: "rose", Status: "removed"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
}

func TestFilterExcludesPlannedWhenNotIncluded(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-1", PlantTypeID: "rose", Status: "planned"},
	}
	opts := defaultOpts()
	opts.IncludePlanned = false
	result := Filter(p, opts, testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
}

func TestFilterIncludesPlannedWhenIncluded(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-1", PlantTypeID: "rose", Status: "planned"},
	}
	opts := defaultOpts()
	opts.IncludePlanned = true
	result := Filter(p, opts, testLogger(&buf))
	if len(result) != 1 {
		t.Fatalf("expected 1 element, got %d", len(result))
	}
}

func TestFilterExcludesLabels(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "label", LayerID: "layer-1"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
}

func TestFilterExcludesDimensions(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "dimension", LayerID: "layer-1"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
}

func TestFilterRegistryMissLogsWarning(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "layer-1", PlantTypeID: "nonexistent", Status: "planted"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
	logOutput := buf.String()
	if !bytes.Contains([]byte(logOutput), []byte("registry miss")) {
		t.Fatal("expected WARN log for registry miss")
	}
	if !bytes.Contains([]byte(logOutput), []byte("nonexistent")) {
		t.Fatal("expected missing_type_id in log")
	}
	if !bytes.Contains([]byte(logOutput), []byte("e1")) {
		t.Fatal("expected element_id in log")
	}
}

func TestFilterEmptyLayersAllVisible(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Layers = nil // empty layers array
	p.Elements = []model.Element{
		{ID: "e1", Type: "plant", LayerID: "any-layer", PlantTypeID: "rose", Status: "planted"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 1 {
		t.Fatalf("expected 1 element with empty layers, got %d", len(result))
	}
}

func TestFilterAllElementTypes(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "terrain", LayerID: "layer-1", TerrainTypeID: "grass"},
		{ID: "e2", Type: "plant", LayerID: "layer-1", PlantTypeID: "rose", Status: "planted"},
		{ID: "e3", Type: "structure", LayerID: "layer-1", StructureTypeID: "pergola"},
		{ID: "e4", Type: "path", LayerID: "layer-1", PathTypeID: "stone-path"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 4 {
		t.Fatalf("expected 4 elements, got %d", len(result))
	}
	if result[0].TerrainType == nil {
		t.Fatal("expected resolved TerrainType")
	}
	if result[1].PlantType == nil {
		t.Fatal("expected resolved PlantType")
	}
	if result[2].StructureType == nil {
		t.Fatal("expected resolved StructureType")
	}
	if result[3].PathType == nil {
		t.Fatal("expected resolved PathType")
	}
}

func TestFilterStructureRegistryMiss(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "structure", LayerID: "layer-1", StructureTypeID: "nonexistent"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements, got %d", len(result))
	}
	if !bytes.Contains(buf.Bytes(), []byte("registry miss")) {
		t.Fatal("expected WARN log for structure registry miss")
	}
}

func TestFilterUnknownTypeExcluded(t *testing.T) {
	var buf bytes.Buffer
	p := baseProject()
	p.Elements = []model.Element{
		{ID: "e1", Type: "unknown", LayerID: "layer-1"},
	}
	result := Filter(p, defaultOpts(), testLogger(&buf))
	if len(result) != 0 {
		t.Fatalf("expected 0 elements for unknown type, got %d", len(result))
	}
}
