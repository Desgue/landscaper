package gemini

import "testing"

func TestClamp(t *testing.T) {
	tests := []struct {
		name     string
		v        int
		min, max int
		want     int
	}{
		{"within range", 5, 1, 10, 5},
		{"at min", 1, 1, 10, 1},
		{"at max", 10, 1, 10, 10},
		{"below min", 0, 1, 10, 1},
		{"above max", 15, 1, 10, 10},
		{"negative", -5, 1, 10, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := clamp(tt.v, tt.min, tt.max)
			if got != tt.want {
				t.Errorf("clamp(%d, %d, %d) = %d; want %d", tt.v, tt.min, tt.max, got, tt.want)
			}
		})
	}
}

func TestParseComplianceScore_ValidJSON(t *testing.T) {
	input := `{"spatial": 8, "completeness": 7, "no_hallucinations": 9, "total": 8}`
	score := parseComplianceScore(input)

	if score.Spatial != 8 {
		t.Errorf("Spatial = %d; want 8", score.Spatial)
	}
	if score.Completeness != 7 {
		t.Errorf("Completeness = %d; want 7", score.Completeness)
	}
	if score.NoHallucinations != 9 {
		t.Errorf("NoHallucinations = %d; want 9", score.NoHallucinations)
	}
	// Total is recomputed: round(24/3) = 8
	if score.Total != 8 {
		t.Errorf("Total = %d; want 8", score.Total)
	}
}

func TestParseComplianceScore_MarkdownFences(t *testing.T) {
	input := "```json\n{\"spatial\": 6, \"completeness\": 7, \"no_hallucinations\": 8, \"total\": 7}\n```"
	score := parseComplianceScore(input)

	if score.Spatial != 6 {
		t.Errorf("Spatial = %d; want 6", score.Spatial)
	}
	if score.Completeness != 7 {
		t.Errorf("Completeness = %d; want 7", score.Completeness)
	}
	if score.NoHallucinations != 8 {
		t.Errorf("NoHallucinations = %d; want 8", score.NoHallucinations)
	}
}

func TestParseComplianceScore_InvalidJSON(t *testing.T) {
	input := "this is not json at all"
	score := parseComplianceScore(input)

	// Should return neutral scores
	if score.Spatial != 5 {
		t.Errorf("Spatial = %d; want 5", score.Spatial)
	}
	if score.Completeness != 5 {
		t.Errorf("Completeness = %d; want 5", score.Completeness)
	}
	if score.NoHallucinations != 5 {
		t.Errorf("NoHallucinations = %d; want 5", score.NoHallucinations)
	}
	if score.Total != 5 {
		t.Errorf("Total = %d; want 5", score.Total)
	}
}

func TestParseComplianceScore_ClampsOutOfRange(t *testing.T) {
	input := `{"spatial": 0, "completeness": 15, "no_hallucinations": -3, "total": 99}`
	score := parseComplianceScore(input)

	if score.Spatial != 1 {
		t.Errorf("Spatial = %d; want 1 (clamped from 0)", score.Spatial)
	}
	if score.Completeness != 10 {
		t.Errorf("Completeness = %d; want 10 (clamped from 15)", score.Completeness)
	}
	if score.NoHallucinations != 1 {
		t.Errorf("NoHallucinations = %d; want 1 (clamped from -3)", score.NoHallucinations)
	}
	// Total recomputed: round(12/3) = 4
	if score.Total != 4 {
		t.Errorf("Total = %d; want 4 (recomputed from clamped values)", score.Total)
	}
}

func TestParseComplianceScore_EmptyString(t *testing.T) {
	score := parseComplianceScore("")
	if score.Total != 5 {
		t.Errorf("Total = %d; want 5 (neutral for empty input)", score.Total)
	}
}
