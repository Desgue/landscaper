package model

import "encoding/json"

// GenerateRequest is the top-level body for POST /api/generate.
// See api-contract.md "## Request Body" for the full field contract.
type GenerateRequest struct {
	Project   ProjectPayload  `json:"project"`
	YardPhoto json.RawMessage `json:"yard_photo,omitempty"` // string (single photo) or []string (multi-photo); base64 JPEG or PNG
	Options   GenerateOptions `json:"options"`
}

// PhotoEntry holds decoded yard photo bytes and detected MIME type.
type PhotoEntry struct {
	Bytes    []byte
	MIMEType string // "image/jpeg" or "image/png"
}

// GenerateOptions mirrors api-contract.md "## Options and Defaults".
// All fields are optional — zero value means "not supplied by client".
// Defaults are applied in the handler after validation; see EffectiveOptions.
type GenerateOptions struct {
	IncludePlanned *bool  `json:"include_planned,omitempty"` // pointer: absent vs false are distinct
	GardenStyle    string `json:"garden_style,omitempty"`
	Season         string `json:"season,omitempty"`
	TimeOfDay      string `json:"time_of_day,omitempty"`
	Viewpoint      string `json:"viewpoint,omitempty"`
	AspectRatio    string `json:"aspect_ratio,omitempty"`
	ImageSize      string `json:"image_size,omitempty"` // "1K", "2K", "4K"; default "1K"
	Seed           *int   `json:"seed,omitempty"`       // pointer: absent vs explicit -1 are distinct
}

// PromptParts holds the structured text parts that get interleaved with images
// in the Gemini request. The client assembles them as:
//
//	[SegmapInstruction, segmap_blob, YardPhotoInstructions[0], photo_0_blob, ..., ScenePrompt]
type PromptParts struct {
	SegmapInstruction     string   // text placed immediately before the segmap image
	YardPhotoInstruction  string   // single-photo instruction (backward compat, used when YardPhotoInstructions is empty)
	YardPhotoInstructions []string // per-photo instructions (one per yard photo); takes precedence over YardPhotoInstruction
	ScenePrompt           string   // main scene description placed after all images
}

// EffectiveOptions is GenerateOptions after all defaults have been applied.
// Produced by the handler after validation passes; passed to render, prompt, and gemini stages.
// No pointer fields — every value is resolved. See api-contract.md "## Options and Defaults".
type EffectiveOptions struct {
	IncludePlanned bool
	GardenStyle    string // e.g. "cottage"
	Season         string // e.g. "summer"
	TimeOfDay      string // e.g. "golden hour"
	Viewpoint      string // e.g. "eye-level"
	AspectRatio    string // e.g. "square"
	ImageSize      string // "1K", "2K", "4K"
	Seed           int    // -1 = random
}

// ProjectPayload is the project object as sent by the frontend in the API request.
//
// Shape note: the frontend project JSON export format has "registries" at the top level,
// sibling to "project". The API request merges them: registries are placed inside the
// project object before the request is sent. See api-contract.md "## Project Field Shape".
type ProjectPayload struct {
	ID           string        `json:"id"`
	Location     *Location     `json:"location,omitempty"`
	YardBoundary *YardBoundary `json:"yardBoundary"`
	Layers       []Layer       `json:"layers"`
	Elements     []Element     `json:"elements"`
	Registries   Registries    `json:"registries"`
}

// Location is used for season derivation. See prompt-construction.md "## Season Derivation".
type Location struct {
	Lat *float64 `json:"lat"`
	Lng *float64 `json:"lng"`
}

// YardBoundary defines the outer polygon of the yard.
// EdgeTypes has the same length as Vertices; EdgeTypes[i] describes the edge from
// Vertices[i] to Vertices[(i+1) % len(Vertices)].
type YardBoundary struct {
	Vertices  []Point    `json:"vertices"`
	EdgeTypes []EdgeType `json:"edgeTypes,omitempty"`
}

// Point is a 2D position in centimeters.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// EdgeType describes one edge of the yard boundary polygon.
type EdgeType struct {
	Type       string   `json:"type"`                 // "line" | "arc"
	ArcSagitta *float64 `json:"arcSagitta,omitempty"` // cm; nil or 0 = treat as line
}

// Layer stores visibility used during element filtering.
// Locked layers are included (locked ≠ hidden). See segmentation-render.md "## Stage 1".
type Layer struct {
	ID      string `json:"id"`
	Visible bool   `json:"visible"`
	Locked  bool   `json:"locked"`
}

// Element is a single flat struct for all element types.
// Only the fields relevant to the backend pipeline are declared.
// Type-specific fields are zero/nil when the element is a different type.
// See data-schema.md "## Element Schema" for per-type field definitions.
type Element struct {
	// Base — present on all element types
	ID       string  `json:"id"`
	Type     string  `json:"type"`     // "terrain" | "plant" | "structure" | "path" | "label" | "dimension"
	LayerID  string  `json:"layerId"`
	X        float64 `json:"x"`        // cm, top-left of bounding box
	Y        float64 `json:"y"`        // cm, top-left of bounding box
	Width    float64 `json:"width"`    // cm
	Height   float64 `json:"height"`   // cm
	Rotation float64 `json:"rotation"` // degrees [0, 360); structures only

	// Terrain
	TerrainTypeID string `json:"terrainTypeId,omitempty"`

	// Plant
	PlantTypeID string `json:"plantTypeId,omitempty"`
	Status      string `json:"status,omitempty"`   // "planned" | "planted" | "growing" | "harvested" | "removed"
	Quantity    int    `json:"quantity,omitempty"`

	// Structure
	StructureTypeID string   `json:"structureTypeId,omitempty"`
	Shape           string   `json:"shape,omitempty"`          // "straight" | "curved"
	ArcSagitta      *float64 `json:"arcSagitta,omitempty"`     // cm; curved structures only

	// Path
	PathTypeID    string    `json:"pathTypeId,omitempty"`
	Points        []Point   `json:"points,omitempty"`
	Segments      []Segment `json:"segments,omitempty"`
	StrokeWidthCm float64   `json:"strokeWidthCm,omitempty"` // cm
	Closed        bool      `json:"closed,omitempty"`
}

// Segment describes one segment of a path (line or arc).
// Segments[i] connects Points[i] to Points[i+1].
// See data-schema.md "### Path Element" for the indexing rule.
type Segment struct {
	Type       string   `json:"type"`                 // "line" | "arc"
	ArcSagitta *float64 `json:"arcSagitta,omitempty"` // cm; nil or 0 = treat as line
}

// Registries holds all four type registries.
// Only the fields used by the segmentation renderer and prompt builder are declared.
type Registries struct {
	Terrain    []TerrainType   `json:"terrain"`
	Plants     []PlantType     `json:"plants"`
	Structures []StructureType `json:"structures"`
	Paths      []PathType      `json:"paths"`
}

// TerrainType is a terrain registry entry.
// Category is the segmentation color fallback when the ID is not a known built-in.
// See segmentation-render.md "## Segmentation Color Table" for fallback rules.
type TerrainType struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"` // "natural" | "hardscape" | "water" | "mulch" | "other"
}

// PlantType is a plant registry entry.
// GrowthForm determines shape (circle vs dual-circle), SpacingCm is the default radius source.
// See segmentation-render.md "## Element 2D Footprints" for the full size derivation rules.
type PlantType struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	GrowthForm    string   `json:"growthForm"`              // "herb" | "shrub" | "tree" | "groundcover" | "climber"
	SpacingCm     float64  `json:"spacingCm"`
	CanopyWidthCm *float64 `json:"canopyWidthCm,omitempty"` // preferred over SpacingCm for shrubs/trees when set
	TrunkWidthCm  *float64 `json:"trunkWidthCm,omitempty"`  // tree trunk circle; fallback 20cm when nil
}

// StructureType is a structure registry entry.
// Material drives the segmentation color. Category and ID drive special-case colors
// (water features, fire features). See segmentation-render.md "## Segmentation Color Table".
type StructureType struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Category string  `json:"category"`           // "boundary" | "container" | "surface" | "overhead" | "feature" | "furniture"
	Material *string `json:"material,omitempty"` // "wood" | "metal" | "masonry" | "stone" | "other" | null
}

// PathType is a path registry entry.
// Material drives the segmentation color. DefaultWidthCm is the fallback strokeWidthCm
// when the element's StrokeWidthCm is zero. See segmentation-render.md "## Segmentation Color Table".
type PathType struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Material       *string `json:"material,omitempty"` // "stone" | "gravel" | "brick" | "wood" | "concrete" | "other" | null
	DefaultWidthCm float64 `json:"defaultWidthCm"`
}
