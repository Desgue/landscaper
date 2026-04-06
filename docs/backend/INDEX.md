# Backend Docs

Image generation service — Go binary that serves the React SPA and exposes the `/api/generate` endpoint.

## Documents

- [server.md](server.md) — Go project structure, routes, embedded SPA, env vars, timeouts, health check, logging, build pipeline
- [api-contract.md](api-contract.md) — HTTP endpoint, request body, options and defaults, request validation, response spec, BDD scenarios
- [segmentation-render.md](segmentation-render.md) — Stage 1 (element filtering, registry lookups, 2D footprints) + Stage 2 (canvas setup, draw order, color table, arc approximation), BDD scenarios
- [prompt-construction.md](prompt-construction.md) — Stage 3: prompt structure, season derivation algorithm, element collection and cap rules, viewpoint style suffixes
- [gemini-client.md](gemini-client.md) — Stage 4: Nano Banana SDK setup, request construction, response extraction, error handling, BDD scenarios
