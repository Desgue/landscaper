package filter

import (
	"log/slog"

	"greenprint/internal/model"
)

// FilteredElement is an element that passed Stage 1 filtering with its resolved registry entry.
// Exactly one of PlantType, StructureType, TerrainType, or PathType is non-nil,
// matching the element's Type field.
type FilteredElement struct {
	Element       model.Element
	PlantType     *model.PlantType
	StructureType *model.StructureType
	TerrainType   *model.TerrainType
	PathType      *model.PathType
}

// Filter applies Stage 1 element filtering and registry resolution.
// It returns only elements that pass all filtering rules, each with its resolved registry entry.
// Elements that fail registry lookup are excluded and logged at WARN level.
func Filter(project model.ProjectPayload, opts model.EffectiveOptions, logger *slog.Logger) []FilteredElement {
	// Build layer visibility map
	layerVisible := make(map[string]bool, len(project.Layers))
	hasLayers := len(project.Layers) > 0
	for _, l := range project.Layers {
		layerVisible[l.ID] = l.Visible
	}

	// Build registry lookup maps
	terrainByID := make(map[string]*model.TerrainType, len(project.Registries.Terrain))
	for i := range project.Registries.Terrain {
		terrainByID[project.Registries.Terrain[i].ID] = &project.Registries.Terrain[i]
	}
	plantByID := make(map[string]*model.PlantType, len(project.Registries.Plants))
	for i := range project.Registries.Plants {
		plantByID[project.Registries.Plants[i].ID] = &project.Registries.Plants[i]
	}
	structByID := make(map[string]*model.StructureType, len(project.Registries.Structures))
	for i := range project.Registries.Structures {
		structByID[project.Registries.Structures[i].ID] = &project.Registries.Structures[i]
	}
	pathByID := make(map[string]*model.PathType, len(project.Registries.Paths))
	for i := range project.Registries.Paths {
		pathByID[project.Registries.Paths[i].ID] = &project.Registries.Paths[i]
	}

	var result []FilteredElement
	for _, elem := range project.Elements {
		// Always exclude labels and dimensions
		if elem.Type == "label" || elem.Type == "dimension" {
			continue
		}

		// Check layer visibility (empty layers array = all visible)
		if hasLayers {
			if visible, exists := layerVisible[elem.LayerID]; exists && !visible {
				continue
			}
		}

		// Plant-specific filtering rules
		if elem.Type == "plant" {
			if elem.Status == "removed" {
				continue
			}
			if elem.Status == "planned" && !opts.IncludePlanned {
				continue
			}
		}

		// Registry resolution — exclude on miss with WARN log
		fe := FilteredElement{Element: elem}
		switch elem.Type {
		case "terrain":
			t, ok := terrainByID[elem.TerrainTypeID]
			if !ok {
				logger.Warn("registry miss", "element_id", elem.ID, "missing_type_id", elem.TerrainTypeID)
				continue
			}
			fe.TerrainType = t
		case "plant":
			p, ok := plantByID[elem.PlantTypeID]
			if !ok {
				logger.Warn("registry miss", "element_id", elem.ID, "missing_type_id", elem.PlantTypeID)
				continue
			}
			fe.PlantType = p
		case "structure":
			s, ok := structByID[elem.StructureTypeID]
			if !ok {
				logger.Warn("registry miss", "element_id", elem.ID, "missing_type_id", elem.StructureTypeID)
				continue
			}
			fe.StructureType = s
		case "path":
			p, ok := pathByID[elem.PathTypeID]
			if !ok {
				logger.Warn("registry miss", "element_id", elem.ID, "missing_type_id", elem.PathTypeID)
				continue
			}
			fe.PathType = p
		default:
			// Unknown element type — exclude from segmentation map
			continue
		}

		result = append(result, fe)
	}

	return result
}
