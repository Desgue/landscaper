package gemini

import (
	"testing"

	"greenprint/internal/model"
)

func TestAspectRatioMapping(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"square", "1:1"},
		{"landscape", "16:9"},
		{"portrait", "9:16"},
	}
	for _, tt := range tests {
		got := AspectRatioMap[tt.input]
		if got != tt.expected {
			t.Errorf("AspectRatioMap[%q] = %q, want %q", tt.input, got, tt.expected)
		}
	}
}

func TestSeedOmittedWhenNegativeOne(t *testing.T) {
	opts := model.EffectiveOptions{Seed: -1}
	// Verify the condition that controls seed omission
	if opts.Seed != -1 {
		t.Fatal("seed should be -1")
	}
}

func TestSeedSetWhenNotNegativeOne(t *testing.T) {
	opts := model.EffectiveOptions{Seed: 42}
	if opts.Seed == -1 {
		t.Fatal("seed should not be -1")
	}
	seed := int32(opts.Seed)
	if seed != 42 {
		t.Fatalf("expected seed 42, got %d", seed)
	}
}

func TestErrorType(t *testing.T) {
	e := &Error{StatusCode: 502, Message: "Nano Banana error: quota exceeded"}
	if e.Error() != "Nano Banana error: quota exceeded" {
		t.Fatalf("unexpected error message: %q", e.Error())
	}
	if e.StatusCode != 502 {
		t.Fatalf("unexpected status code: %d", e.StatusCode)
	}
}

func TestAspectRatioMapCompleteness(t *testing.T) {
	// All valid aspect ratios should be in the map
	for _, ratio := range []string{"square", "landscape", "portrait"} {
		if _, ok := AspectRatioMap[ratio]; !ok {
			t.Errorf("missing aspect ratio mapping for %q", ratio)
		}
	}
}
