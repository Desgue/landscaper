package prompt

import (
	"strings"
	"time"

	"greenprint/internal/filter"
	"greenprint/internal/model"
)

// Style suffixes per viewpoint. All include "not a floor plan" directive.
var styleSuffixes = map[string]string{
	"eye-level": "photorealistic, eye-level view, garden photography, natural lighting, high detail, not a floor plan",
	"elevated":  "photorealistic, elevated perspective view, garden photography, natural lighting, high detail, not a floor plan",
	"isometric": "photorealistic, isometric view, garden photography, natural lighting, high detail, not a floor plan",
}

const yardPhotoPreamble = "The first image is a top-down segmentation plan of the garden layout. The second image is the real yard. Generate a photorealistic view showing the planned garden in the real yard's perspective and lighting."

// Cap rules per element category.
const (
	maxPlants     = 7
	maxStructures = 3
	maxTerrain    = 2
	maxTotal      = 12
)

// Build assembles the prompt string from filtered elements, effective options, and project location.
// The now parameter is used for season derivation when options.Season was derived from date.
func Build(elements []filter.FilteredElement, opts model.EffectiveOptions, hasYardPhoto bool) string {
	subject := buildSubject(opts)
	elemStr := buildElementList(elements)
	style := styleSuffix(opts.Viewpoint)

	var parts []string
	if hasYardPhoto {
		parts = append(parts, yardPhotoPreamble)
	}

	if elemStr != "" {
		parts = append(parts, subject+". "+elemStr+". "+style+".")
	} else {
		parts = append(parts, subject+". "+style+".")
	}

	return strings.Join(parts, " ")
}

func buildSubject(opts model.EffectiveOptions) string {
	return "A " + opts.GardenStyle + " garden, " + opts.Season + ", " + opts.TimeOfDay
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
				plantNames = append(plantNames, fe.PlantType.Name)
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

	// Apply total cap
	if len(all) > maxTotal {
		all = all[:maxTotal]
	}

	return strings.Join(all, ", ")
}

func styleSuffix(viewpoint string) string {
	if s, ok := styleSuffixes[viewpoint]; ok {
		return s
	}
	return styleSuffixes["eye-level"]
}

// DeriveSeason determines the season from latitude and date.
// This is re-exported for use by the handler when options.Season is empty.
// Note: the actual season derivation is already done in handler/validate.go resolveOptions.
// This function is provided for completeness if needed by other callers.
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
