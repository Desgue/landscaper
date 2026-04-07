package prompt

import (
	"fmt"
	"strings"
	"time"

	"greenprint/internal/filter"
	"greenprint/internal/model"
)

// segmapInstruction explains the segmap role with color legend and explicit prohibitions.
// Placed immediately before the segmap blob so the model reads it in context.
const segmapInstruction = `This image is a top-down color-coded layout map of a garden. ` +
	`Each colored shape represents an element: ` +
	`pink/magenta shapes are plants, red/orange shapes are structures, neon green shapes are paths, cyan is lawn, gold is soil/mulch. ` +
	`These colors are intentionally artificial — they exist ONLY to mark positions. ` +
	`Use this map ONLY to understand where each element is positioned and its approximate size. ` +
	`NO neon colors in the output. NO pink circles. NO geometric shapes from this map. NO flat diagram overlays. ` +
	`The output must be a photorealistic photograph, not a diagram.`

// yardPhotoInstruction explains the yard photo role.
// Placed immediately before the yard photo blob.
const yardPhotoInstruction = `This image is a real photograph of the yard. ` +
	`Match the perspective, camera angle, lighting, ground textures, fences, walls, and surroundings from this photo. ` +
	`Place the garden elements from the layout map into this real scene.`

// viewpointPhrases maps viewpoint to camera/lens description.
var viewpointPhrases = map[string]string{
	"eye-level": "eye-level perspective, 24mm wide-angle lens, ground-level viewpoint, horizon at mid-frame",
	"elevated":  "elevated three-quarter view looking down at an angle, 35mm lens, slightly above fence height",
	"isometric": "isometric perspective, tilt-shift lens effect, uniform scale across the scene",
}

// Cap rules per element category.
const (
	maxPlants     = 7
	maxStructures = 3
	maxTerrain    = 2
)

// botanicalNames maps plant registry IDs to botanical names for species-accurate prompts.
var botanicalNames = map[string]string{
	"tomato":          "Solanum lycopersicum",
	"cherry-tomato":   "Solanum lycopersicum var. cerasiforme",
	"onion":           "Allium cepa",
	"eggplant":        "Solanum melongena",
	"pepper":          "Capsicum annuum",
	"lettuce":         "Lactuca sativa",
	"carrot":          "Daucus carota",
	"basil":           "Ocimum basilicum",
	"rosemary":        "Salvia rosmarinus",
	"mint":            "Mentha spicata",
	"thyme":           "Thymus vulgaris",
	"oak":             "Quercus robur",
	"maple":           "Acer saccharum",
	"birch":           "Betula pendula",
	"fruit-tree":      "Malus domestica",
	"ornamental-pear": "Pyrus calleryana",
	"japanese-maple":  "Acer palmatum",
	"boxwood":         "Buxus sempervirens",
	"lavender":        "Lavandula angustifolia",
	"hydrangea":       "Hydrangea macrophylla",
	"rose":            "Rosa gallica",
	"rose-bush":       "Rosa floribunda",
	"holly":           "Ilex aquifolium",
	"privet":          "Ligustrum vulgare",
}

// Build assembles the structured prompt parts from filtered elements and effective options.
// The returned PromptParts are interleaved with image blobs by the Gemini client.
func Build(elements []filter.FilteredElement, opts model.EffectiveOptions, hasYardPhoto bool) model.PromptParts {
	subject := buildSubject(opts)
	elemStr := buildElementList(elements)
	style := buildStyle(opts.Viewpoint)
	prohibitions := buildProhibitions(opts.Viewpoint)

	// Scene prompt: SCHEMA order — Style → Composition → Subject → Mandatory elements → Prohibitions
	var scene strings.Builder

	// Style + Composition (merged — viewpoint phrase includes lens)
	scene.WriteString(style)
	scene.WriteString(" ")

	// Subject
	scene.WriteString(subject)
	scene.WriteString(". ")

	// Mandatory elements with map-position linking
	if elemStr != "" {
		scene.WriteString("Place these elements at the positions shown by their corresponding colored shapes in the layout map: ")
		scene.WriteString(elemStr)
		scene.WriteString(". ")
	}

	// Constraint: only what's in the map
	scene.WriteString("Only include elements shown in the layout map. NO extra structures, furniture, or decorations not in the plan. ")

	// Prohibitions
	scene.WriteString(prohibitions)

	parts := model.PromptParts{
		SegmapInstruction: segmapInstruction,
		ScenePrompt:       scene.String(),
	}

	if hasYardPhoto {
		parts.YardPhotoInstruction = yardPhotoInstruction
	}

	return parts
}

func buildSubject(opts model.EffectiveOptions) string {
	return "A " + opts.GardenStyle + " garden, " + opts.Season + ", " + opts.TimeOfDay
}

func buildStyle(viewpoint string) string {
	phrase, ok := viewpointPhrases[viewpoint]
	if !ok {
		phrase = viewpointPhrases["eye-level"]
	}
	return fmt.Sprintf(
		"High-end residential landscape photography, %s, natural lighting, rich textures, sharp detail.",
		phrase,
	)
}

func buildProhibitions(viewpoint string) string {
	base := "NO floor plan. NO top-down diagram. " +
		"NO colored circles or geometric overlays. NO cartoon or illustrated style. " +
		"NO watermarks. NO text overlays. NO close-up of a single plant."
	// "NO bird's-eye view" conflicts with isometric which is a top-down variant,
	// so only add it for eye-level and elevated viewpoints.
	if viewpoint != "isometric" {
		base = "NO bird's-eye view. " + base
	}
	return base
}

func buildElementList(elements []filter.FilteredElement) string {
	var plantNames, structNames, terrainNames []string
	seenPlants := make(map[string]bool)
	seenStructs := make(map[string]bool)
	seenTerrain := make(map[string]bool)

	for _, fe := range elements {
		switch fe.Element.Type {
		case "plant":
			if fe.PlantType != nil && !seenPlants[fe.PlantType.Name] {
				seenPlants[fe.PlantType.Name] = true
				plantNames = append(plantNames, enrichPlantName(fe.PlantType.ID, fe.PlantType.Name))
			}
		case "structure":
			if fe.StructureType != nil && !seenStructs[fe.StructureType.Name] {
				seenStructs[fe.StructureType.Name] = true
				structNames = append(structNames, fe.StructureType.Name)
			}
		case "terrain":
			if fe.TerrainType != nil && !seenTerrain[fe.TerrainType.Name] {
				seenTerrain[fe.TerrainType.Name] = true
				terrainNames = append(terrainNames, fe.TerrainType.Name)
			}
		// Paths are intentionally excluded from prompt element collection
		}
	}

	// Apply caps
	if len(plantNames) > maxPlants {
		plantNames = plantNames[:maxPlants]
	}
	if len(structNames) > maxStructures {
		structNames = structNames[:maxStructures]
	}
	if len(terrainNames) > maxTerrain {
		terrainNames = terrainNames[:maxTerrain]
	}

	// Priority order: plants first, then structures, then terrain
	all := make([]string, 0, len(plantNames)+len(structNames)+len(terrainNames))
	all = append(all, plantNames...)
	all = append(all, structNames...)
	all = append(all, terrainNames...)

	return strings.Join(all, ", ")
}

// enrichPlantName returns "Botanical Name (Common Name)" if a botanical name is known,
// otherwise just the common name.
func enrichPlantName(id, commonName string) string {
	if botanical, ok := botanicalNames[id]; ok {
		return botanical + " (" + commonName + ")"
	}
	return commonName
}

// DeriveSeason determines the season from latitude and date.
func DeriveSeason(loc *model.Location, now time.Time) string {
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
