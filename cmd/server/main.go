package main

import (
	"encoding/json"
	"io/fs"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"greenprint"
	"greenprint/internal/gemini"
	"greenprint/internal/handler"
)

func main() {
	// Read env vars
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY is required")
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = gemini.DefaultModel
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Set up structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("POST /api/generate", handler.WithRequestID(handler.Generate))
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	// Embedded SPA with index.html fallback
	distFS, err := fs.Sub(greenprint.StaticFiles, "frontend/dist")
	if err != nil {
		log.Fatal("failed to create sub filesystem: ", err)
	}
	fileServer := http.FileServer(http.FS(distFS))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file directly
		path := r.URL.Path
		if path == "/" {
			path = "/index.html"
		}

		// Check if file exists in embedded FS
		f, err := distFS.Open(strings.TrimPrefix(path, "/"))
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for client-side routing
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 90 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	slog.Info("server starting", "port", port, "model", model)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal("server failed: ", err)
	}
}
