package greenprint

import "embed"

// StaticFiles holds the compiled React app, embedded at build time.
// The frontend/dist/ directory is populated by `npm run build` before `go build`.
//
//go:embed frontend/dist
var StaticFiles embed.FS
