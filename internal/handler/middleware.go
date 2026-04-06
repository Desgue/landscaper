package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"
)

type contextKey string

const requestIDKey contextKey = "request_id"

// RequestID returns the request ID from the context, or empty string.
func RequestID(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// Logger returns an slog.Logger with the request_id from the context.
func Logger(ctx context.Context) *slog.Logger {
	return slog.Default().With("request_id", RequestID(ctx))
}

// WithRequestID is HTTP middleware that generates a request_id, injects it
// into the request context, and logs request received/response sent events.
func WithRequestID(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Generate random 8-char hex request ID
		b := make([]byte, 4)
		rand.Read(b)
		reqID := hex.EncodeToString(b)

		// Inject into context
		ctx := context.WithValue(r.Context(), requestIDKey, reqID)
		r = r.WithContext(ctx)

		logger := slog.Default().With("request_id", reqID)

		// Log request received
		logger.Info("request received", "method", r.Method, "path", r.URL.Path)

		start := time.Now()

		// Wrap response writer to capture status code
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next(sw, r)

		// Log response sent
		logger.Info("response sent",
			"status", sw.status,
			"total_duration_ms", time.Since(start).Milliseconds(),
		)
	}
}

// statusWriter wraps http.ResponseWriter to capture the status code.
type statusWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (sw *statusWriter) WriteHeader(code int) {
	if !sw.wroteHeader {
		sw.status = code
		sw.wroteHeader = true
	}
	sw.ResponseWriter.WriteHeader(code)
}

func (sw *statusWriter) Write(b []byte) (int, error) {
	if !sw.wroteHeader {
		sw.wroteHeader = true
	}
	return sw.ResponseWriter.Write(b)
}
