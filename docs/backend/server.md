# Server

Go project structure, HTTP routing, embedded SPA, environment variables, timeouts, health check, logging, and build pipeline for the Greenprint backend service.

---

## Go Project Structure

```
garden-planner/
├── cmd/
│   └── server/
│       └── main.go              # Entry point: env config, server start
├── internal/
│   ├── handler/
│   │   └── generate.go          # POST /api/generate handler
│   ├── render/
│   │   └── segmap.go            # 2D segmentation render (fogleman/gg)
│   ├── prompt/
│   │   └── builder.go           # Text prompt construction
│   ├── gemini/
│   │   └── client.go            # Nano Banana API wrapper
│   └── model/
│       └── request.go           # Request/response types (mirrors data-schema.md)
├── frontend/                    # Built React app (git-ignored build output)
│   └── dist/                    # go:embed target — populated by npm run build
├── go.mod
└── go.sum
```

| Package | Responsibility |
|---|---|
| `cmd/server` | Reads env vars, wires handlers, starts `http.Server` |
| `internal/handler` | Parses and validates HTTP requests; orchestrates pipeline stages; writes responses |
| `internal/render` | Produces the 2D segmentation map PNG in memory using `fogleman/gg` |
| `internal/prompt` | Builds the text prompt string from filtered elements and options |
| `internal/gemini` | Wraps the Gemini Go SDK; manages context timeout and response extraction |
| `internal/model` | Shared Go types for request, options, and response; no logic |

`frontend/dist/` is Vite build output copied into the Go module tree before `go build`. The directory is listed in `.gitignore`; CI populates it before compilation.

---

## Tech Stack

| Concern | Library / Package |
|---|---|
| HTTP server | `net/http` (standard library) |
| Static file embedding | `embed` (standard library) |
| Structured logging | `log/slog` (standard library) |
| JSON parsing | `encoding/json` (standard library) |
| 2D segmentation render | [`fogleman/gg`](https://github.com/fogleman/gg) — pure Go 2D graphics context, PNG output |
| Gemini API client | [`google.golang.org/genai`](https://pkg.go.dev/google.golang.org/genai) — official Go SDK |

No CGo, no system graphics dependencies. `fogleman/gg` is pure Go. The service has no external dependencies beyond the Gemini API.

---

## Routes

| Method | Path | Handler | Notes |
|---|---|---|---|
| `POST` | `/api/generate` | `handler.Generate` | See [api-contract.md "## Endpoint"] |
| `GET` | `/api/health` | inline | Returns HTTP 200 `{"ok": true}` |
| `GET` | `/*` | embedded FS | SPA fallback to `index.html` for client-side routing |

All API routes are prefixed `/api/` to avoid colliding with the frontend router.

---

## Embedded React SPA

The compiled React app is embedded in the Go binary at build time:

```go
//go:embed frontend/dist
var staticFiles embed.FS

http.Handle("/", http.FileServer(http.FS(staticFiles)))
```

Any `GET` request that does not match `/api/*` is served from the embedded filesystem. If the requested file does not exist in `frontend/dist/`, `index.html` is returned so that React Router handles client-side routing.

CORS is not configured. The React app is served from the same origin as the API — no cross-origin requests are needed.

---

## Environment Variables

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key for Nano Banana | — |
| `GEMINI_MODEL` | No | Nano Banana model ID | `gemini-3.1-flash-image-preview` |
| `PORT` | No | HTTP listen port | `8080` |

The server refuses to start if `GEMINI_API_KEY` is empty.

---

## HTTP Server Timeouts

```go
srv := &http.Server{
    ReadTimeout:  15 * time.Second,
    WriteTimeout: 90 * time.Second, // must exceed the 60s Nano Banana timeout
    IdleTimeout:  120 * time.Second,
}
```

| Timeout | Value | Rationale |
|---|---|---|
| `ReadTimeout` | 15s | Bounds time to read the full request body; plan exports are at most a few hundred KB |
| `WriteTimeout` | 90s | Must exceed the 60s Gemini context deadline to allow the PNG response to be fully written before the connection is cut |
| `IdleTimeout` | 120s | Keeps alive connections from the browser SPA without holding sockets indefinitely |

---

## Health Check

`GET /api/health` is handled inline — no external dependencies are probed.

```
HTTP 200
Content-Type: application/json
Body: {"ok": true}
```

The endpoint always returns 200 while the process is running. It does not check `GEMINI_API_KEY` validity or network reachability.

---

## Logging

All log output uses `log/slog` (structured JSON). Each request gets a random 8-character hex `request_id` generated at handler entry. All subsequent log lines for that request include the same `request_id`.

| Event | Level | Fields |
|---|---|---|
| Request received | INFO | `method`, `path`, `request_id` |
| Validation passed | INFO | `request_id` |
| Validation failed | WARN | `request_id`, `error` |
| Element filtering complete | INFO | `request_id`, `total`, `included`, `excluded` |
| Segmentation render complete | INFO | `request_id`, `width_px`, `height_px`, `duration_ms` |
| Prompt constructed | INFO | `request_id`, `prompt_length`, `element_count` |
| Nano Banana request sent | INFO | `request_id`, `model`, `aspect_ratio`, `seed` |
| Nano Banana response received | INFO | `request_id`, `duration_ms`, `image_bytes` |
| Response sent | INFO | `request_id`, `status`, `total_duration_ms` |
| Registry miss (element excluded) | WARN | `request_id`, `element_id`, `missing_type_id` |

No request body content or prompt text is logged at INFO level — only metadata.

---

## Build Pipeline

The Go binary embeds the React app. The build must run in this order:

1. `npm run build` — Vite compiles `src/` to `frontend/dist/`
2. `go build ./cmd/server` — embeds `frontend/dist/` via `//go:embed`

`frontend/dist/` is git-ignored. CI is responsible for running step 1 before step 2. Running `go build` without the Vite output produces a binary that serves an empty embedded filesystem — the API routes still work, but the SPA is absent.

In local development, run `npm run build` once (or `npm run dev` separately against the Go server on a different port) before `go run ./cmd/server`.
