package handler

import (
	"encoding/json"
	"net/http"
)

// Generate handles POST /api/generate.
// Currently returns HTTP 501 after validation — full pipeline in PLAN-C.
func Generate(w http.ResponseWriter, r *http.Request) {
	_, _, ok := validateAndParse(w, r)
	if !ok {
		return
	}

	Logger(r.Context()).Info("validation passed")

	// Stub: validation passed but pipeline not implemented yet.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "not implemented"})
}
