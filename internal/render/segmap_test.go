package render

import (
	"math"
	"testing"

	"greenprint/internal/filter"
	"greenprint/internal/model"
)

func strPtr(s string) *string   { return &s }
func f64Ptr(f float64) *float64 { return &f }

func TestBoundaryAABB(t *testing.T) {
	verts := []model.Point{
		{X: 100, Y: 200},
		{X: 500, Y: 200},
		{X: 500, Y: 600},
		{X: 100, Y: 600},
	}
	minX, minY, maxX, maxY := boundaryAABB(verts)
	if minX != 100 || minY != 200 || maxX != 500 || maxY != 600 {
		t.Fatalf("AABB wrong: got (%v,%v)-(%v,%v)", minX, minY, maxX, maxY)
	}
}

func TestOutputDimensions(t *testing.T) {
	tests := []struct {
		ratio string
		w, h  int
	}{
		{"square", 1024, 1024},
		{"landscape", 1024, 576},
		{"portrait", 576, 1024},
	}
	for _, tt := range tests {
		w, h := outputDimensions(tt.ratio)
		if w != tt.w || h != tt.h {
			t.Errorf("outputDimensions(%q) = (%d,%d), want (%d,%d)", tt.ratio, w, h, tt.w, tt.h)
		}
	}
}

func TestApproximateArc(t *testing.T) {
	p0 := model.Point{X: 0, Y: 0}
	p1 := model.Point{X: 100, Y: 0}
	sagitta := 20.0

	pts := approximateArc(p0, p1, sagitta)
	if len(pts) != 13 {
		t.Fatalf("expected 13 arc points, got %d", len(pts))
	}

	// First point should be near p0, last near p1
	if math.Abs(pts[0].X-p0.X) > 0.01 || math.Abs(pts[0].Y-p0.Y) > 0.01 {
		t.Errorf("first arc point (%v,%v) not near p0 (0,0)", pts[0].X, pts[0].Y)
	}
	if math.Abs(pts[12].X-p1.X) > 0.01 || math.Abs(pts[12].Y-p1.Y) > 0.01 {
		t.Errorf("last arc point (%v,%v) not near p1 (100,0)", pts[12].X, pts[12].Y)
	}

	// Mid point should be offset by approximately sagitta from chord midpoint
	midPt := pts[6]
	chordMidY := 0.0
	if math.Abs(math.Abs(midPt.Y-chordMidY)-sagitta) > 1.0 {
		t.Errorf("mid arc point Y offset %v not close to sagitta %v", math.Abs(midPt.Y-chordMidY), sagitta)
	}
}

func TestTerrainColor(t *testing.T) {
	tests := []struct {
		name     string
		tt       *model.TerrainType
		expected string
	}{
		{"grass by ID", &model.TerrainType{ID: "grass", Category: "natural"}, ColorLawnGrass},
		{"soil by ID", &model.TerrainType{ID: "soil", Category: "natural"}, ColorSoilMulch},
		{"mulch by ID", &model.TerrainType{ID: "mulch", Category: "mulch"}, ColorSoilMulch},
		{"bark by ID", &model.TerrainType{ID: "bark", Category: "mulch"}, ColorSoilMulch},
		{"gravel by ID", &model.TerrainType{ID: "gravel", Category: "hardscape"}, ColorGravelStone},
		{"concrete by ID", &model.TerrainType{ID: "concrete", Category: "hardscape"}, ColorGravelStone},
		{"wood-decking by ID", &model.TerrainType{ID: "wood-decking", Category: "hardscape"}, ColorWoodDecking},
		{"decking-surface by ID", &model.TerrainType{ID: "decking-surface", Category: "hardscape"}, ColorWoodDecking},
		{"water by ID", &model.TerrainType{ID: "water", Category: "water"}, ColorWater},
		{"unknown ID, natural category", &model.TerrainType{ID: "custom-lawn", Category: "natural"}, ColorLawnGrass},
		{"unknown ID, hardscape category", &model.TerrainType{ID: "custom-pave", Category: "hardscape"}, ColorGravelStone},
		{"unknown ID, water category", &model.TerrainType{ID: "custom-pond", Category: "water"}, ColorWater},
		{"unknown ID, mulch category", &model.TerrainType{ID: "custom-mulch", Category: "mulch"}, ColorSoilMulch},
		{"unknown ID, other category", &model.TerrainType{ID: "custom-other", Category: "other"}, ColorBareSoil},
		{"nil terrain", nil, ColorBareSoil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := terrainColor(tt.tt)
			if got != tt.expected {
				t.Errorf("terrainColor() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestPathColor(t *testing.T) {
	tests := []struct {
		name     string
		pt       *model.PathType
		expected string
	}{
		{"stone", &model.PathType{Material: strPtr("stone")}, ColorPathStone},
		{"gravel", &model.PathType{Material: strPtr("gravel")}, ColorPathStone},
		{"brick", &model.PathType{Material: strPtr("brick")}, ColorPathBrick},
		{"wood", &model.PathType{Material: strPtr("wood")}, ColorPathWood},
		{"concrete", &model.PathType{Material: strPtr("concrete")}, ColorPathConcrete},
		{"other", &model.PathType{Material: strPtr("other")}, ColorPathOther},
		{"nil material", &model.PathType{Material: nil}, ColorNoMaterial},
		{"nil path type", nil, ColorNoMaterial},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := pathColor(tt.pt)
			if got != tt.expected {
				t.Errorf("pathColor() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestStructureColor(t *testing.T) {
	tests := []struct {
		name     string
		st       *model.StructureType
		expected string
	}{
		{"wood", &model.StructureType{Material: strPtr("wood")}, ColorStructWood},
		{"metal", &model.StructureType{Material: strPtr("metal")}, ColorStructMetal},
		{"masonry", &model.StructureType{Material: strPtr("masonry")}, ColorStructMasonry},
		{"stone", &model.StructureType{Material: strPtr("stone")}, ColorStructStone},
		{"other material", &model.StructureType{Material: strPtr("other")}, ColorStructOther},
		{"nil material", &model.StructureType{Material: nil}, ColorNoMaterial},
		{"water feature", &model.StructureType{ID: "fountain", Category: "feature", Material: strPtr("other")}, ColorWaterFeature},
		{"fire feature", &model.StructureType{ID: "fire-pit", Category: "feature", Material: strPtr("stone")}, ColorFireFeature},
		{"nil struct type", nil, ColorStructOther},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := structureColor(tt.st)
			if got != tt.expected {
				t.Errorf("structureColor() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestPlantColor(t *testing.T) {
	tests := []struct {
		form     string
		expected string
	}{
		{"shrub", ColorShrub},
		{"herb", ColorHerb},
		{"groundcover", ColorGroundcover},
		{"climber", ColorClimber},
		{"unknown", ColorHerb},
	}
	for _, tt := range tests {
		t.Run(tt.form, func(t *testing.T) {
			got := plantColor(tt.form)
			if got != tt.expected {
				t.Errorf("plantColor(%q) = %q, want %q", tt.form, got, tt.expected)
			}
		})
	}
}

func TestRenderProducesPNG(t *testing.T) {
	boundary := &model.YardBoundary{
		Vertices: []model.Point{
			{X: 0, Y: 0},
			{X: 1000, Y: 0},
			{X: 1000, Y: 1000},
			{X: 0, Y: 1000},
		},
	}
	canopy := 200.0
	elements := []filter.FilteredElement{
		{
			Element:   model.Element{ID: "t1", Type: "terrain", X: 100, Y: 100, TerrainTypeID: "grass"},
			TerrainType: &model.TerrainType{ID: "grass", Category: "natural"},
		},
		{
			Element:   model.Element{ID: "p1", Type: "plant", X: 200, Y: 200, Width: 60, Height: 60, PlantTypeID: "rose", Status: "planted"},
			PlantType: &model.PlantType{ID: "rose", GrowthForm: "shrub", SpacingCm: 60, CanopyWidthCm: &canopy},
		},
	}

	data, err := Render(elements, boundary, "square")
	if err != nil {
		t.Fatalf("Render failed: %v", err)
	}

	// Check PNG magic bytes
	if len(data) < 8 {
		t.Fatal("output too small to be a PNG")
	}
	pngMagic := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	for i, b := range pngMagic {
		if data[i] != b {
			t.Fatalf("output is not a valid PNG (byte %d: got %02x, want %02x)", i, data[i], b)
		}
	}
}

func TestRenderEmptyElements(t *testing.T) {
	boundary := &model.YardBoundary{
		Vertices: []model.Point{
			{X: 0, Y: 0},
			{X: 500, Y: 0},
			{X: 500, Y: 500},
			{X: 0, Y: 500},
		},
	}
	data, err := Render(nil, boundary, "square")
	if err != nil {
		t.Fatalf("Render with empty elements failed: %v", err)
	}
	if len(data) < 8 {
		t.Fatal("output too small")
	}
}

func TestRenderLandscapeAspect(t *testing.T) {
	boundary := &model.YardBoundary{
		Vertices: []model.Point{
			{X: 0, Y: 0},
			{X: 1000, Y: 0},
			{X: 1000, Y: 500},
			{X: 0, Y: 500},
		},
	}
	data, err := Render(nil, boundary, "landscape")
	if err != nil {
		t.Fatalf("Render landscape failed: %v", err)
	}
	if len(data) < 8 {
		t.Fatal("output too small")
	}
}
