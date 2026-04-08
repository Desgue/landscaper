package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"greenprint"
	"greenprint/internal/gemini"
	"greenprint/internal/handler"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// Load .env file if present (silently ignored in production)
	_ = godotenv.Load() //nolint:errcheck // intentionally ignoring: .env is optional

	// Set up structured logging early so all slog calls use JSON
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Read env vars
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY is required")
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = gemini.DefaultModel
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Listen for SIGINT and SIGTERM for graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("POST /api/generate", handler.WithRequestID(handler.Generate))
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true}) //nolint:errcheck // best-effort health response
	})

	// Embedded SPA with index.html fallback
	distFS, err := fs.Sub(greenprint.StaticFiles, "frontend/dist")
	if err != nil {
		return fmt.Errorf("failed to create sub filesystem: %w", err)
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
			if closeErr := f.Close(); closeErr != nil {
				slog.Warn("failed to close embedded file", "path", path, "error", closeErr.Error()) //nolint:gosec // G706: path is from embedded FS, not user input
			}
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
		WriteTimeout: 600 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	errCh := make(chan error, 1)
	go func() {
		slog.Info("server starting", "port", port, "model", model) //nolint:gosec // G706: port and model are from env vars, not user input
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	// Wait for shutdown signal or server error
	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("server failed: %w", err)
		}
	case <-ctx.Done():
		// Re-register default signal behavior so a second signal terminates immediately
		stop()
		slog.Info("shutdown signal received, draining connections...")

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("server forced to shutdown: %w", err)
		}

		// Wait for the ListenAndServe goroutine to finish
		<-errCh

		slog.Info("server shutdown complete")
	}

	return nil
}
