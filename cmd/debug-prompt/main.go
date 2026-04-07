package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"

	"greenprint/internal/filter"
	"greenprint/internal/model"
	"greenprint/internal/prompt"
	"greenprint/internal/render"
)

type ExportFile struct {
	Project    model.ProjectPayload `json:"project"`
	Registries model.Registries     `json:"registries"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: debug-prompt <testdata-file.json> [output-dir]")
		os.Exit(1)
	}
	inputFile := os.Args[1]
	outDir := "scripts/output-v2"
	if len(os.Args) >= 3 {
		outDir = os.Args[2]
	}
	os.MkdirAll(outDir, 0755)

	data, err := os.ReadFile(inputFile)
	if err != nil {
		fmt.Fprintln(os.Stderr, "read error:", err)
		os.Exit(1)
	}
	var ef ExportFile
	json.Unmarshal(data, &ef)
	ef.Project.Registries = ef.Registries

	eff := model.EffectiveOptions{
		IncludePlanned: true,
		GardenStyle:    "cottage",
		Season:         "summer",
		TimeOfDay:      "golden hour",
		Viewpoint:      "eye-level",
		AspectRatio:    "landscape",
		Seed:           -1,
	}

	logger := slog.Default()
	filtered := filter.Filter(ef.Project, eff, logger)
	fmt.Printf("Filtered: %d elements (from %d total)\n", len(filtered), len(ef.Project.Elements))
	for _, fe := range filtered {
		name := ""
		switch fe.Element.Type {
		case "plant":
			if fe.PlantType != nil {
				name = fe.PlantType.Name
			}
		case "structure":
			if fe.StructureType != nil {
				name = fe.StructureType.Name
			}
		case "terrain":
			if fe.TerrainType != nil {
				name = fe.TerrainType.Name
			}
		case "path":
			if fe.PathType != nil {
				name = fe.PathType.Name
			}
		}
		fmt.Printf("  [%s] %s id=%s\n", fe.Element.Type, name, fe.Element.ID)
	}

	segMapBytes, err := render.Render(filtered, ef.Project.YardBoundary, eff.AspectRatio)
	if err != nil {
		fmt.Fprintln(os.Stderr, "render error:", err)
		os.Exit(1)
	}
	segFile := outDir + "/debug-segmap.png"
	os.WriteFile(segFile, segMapBytes, 0644)
	fmt.Printf("\nSegmap saved: %s (%d bytes)\n", segFile, len(segMapBytes))

	parts := prompt.Build(filtered, eff, true)

	promptFile := outDir + "/debug-prompt.txt"
	f, _ := os.Create(promptFile)
	fmt.Fprintln(f, "=== PART 1: SEGMAP INSTRUCTION ===")
	fmt.Fprintln(f, parts.SegmapInstruction)
	fmt.Fprintln(f, "\n=== PART 2: [segmap.png blob] ===")
	fmt.Fprintln(f, "\n=== PART 3: YARD PHOTO INSTRUCTION ===")
	fmt.Fprintln(f, parts.YardPhotoInstruction)
	fmt.Fprintln(f, "\n=== PART 4: [yard-photo blob] ===")
	fmt.Fprintln(f, "\n=== PART 5: SCENE PROMPT ===")
	fmt.Fprintln(f, parts.ScenePrompt)
	f.Close()
	fmt.Printf("Prompt saved: %s\n", promptFile)

	fmt.Println("\n--- SCENE PROMPT ---")
	fmt.Println(parts.ScenePrompt)
}
