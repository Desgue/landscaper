# Garden Planner

Garden Planner is a browser-based landscape design application where users draw 2D garden plans on an interactive canvas — placing terrain, plants, structures, paths, labels, and measurements — then visualize the result as a photorealistic AI-generated image via a Go backend that renders a segmentation map of the plan and sends it to Gemini alongside a structured prompt describing the garden's style, season, and viewpoint. Everything is stored locally in the browser (no accounts), with a journal for tracking garden activity over time, cost estimation per element, weather snapshots, and a rich snap/layer/group system for precise spatial editing.

## Stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS, Konva.js
- **Backend** — Go (`net/http`), Gemini API (`gemini-3.1-flash-image-preview`)

## Development

```bash
# Frontend
npm install
npm run dev

# Backend
GEMINI_API_KEY=... go run ./cmd/server
```

## Docs

See [`docs/INDEX.md`](docs/INDEX.md) for the full specification index.
