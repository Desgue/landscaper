package gemini

import (
	"testing"
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

func TestAspectRatioMapping_UnknownFallsBackToEmpty(t *testing.T) {
	got := AspectRatioMap["widescreen"]
	if got != "" {
		t.Errorf("AspectRatioMap[%q] = %q; want empty string for unknown key", "widescreen", got)
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

func TestDefaultModelConstant(t *testing.T) {
	if DefaultModel == "" {
		t.Fatal("DefaultModel should not be empty")
	}
	if DefaultModel != "gemini-3.1-flash-image-preview" {
		t.Errorf("DefaultModel = %q; want %q", DefaultModel, "gemini-3.1-flash-image-preview")
	}
}
