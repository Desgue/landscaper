# Backend Plans

## Coordination

[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — maps all 3 sub-plans, execution rules, and cross-plan contracts.

## Plans

| Plan | File | Owns | Status |
|------|------|------|--------|
| A | [`PLAN-A.md`](PLAN-A.md) | Go module init, request types, HTTP server & routing, request validation, structured logging | `done` |
| B | [`PLAN-B.md`](PLAN-B.md) | Element filtering, segmentation render, prompt construction, Gemini client | `done` |
| C | [`PLAN-C.md`](PLAN-C.md) | Pipeline orchestration, contract test fixtures, build pipeline, dev proxy verification | `done` |
| D | [`PLAN-D.md`](PLAN-D.md) | Multi-photo yard input (1–4 yard photos per request) | `done` |
| E | [`PLAN-E.md`](PLAN-E.md) | Local CI pipeline: Makefile caching, golangci-lint, lefthook hooks, `make ci` | `in-progress` |

## Execution Order

```
PLAN-A (Foundation) → PLAN-B (Pipeline) → PLAN-C (Integration & Build)
                                        → PLAN-D (Multi-Photo, depends on C)
PLAN-E (Local CI) — standalone, no code dependencies
```

A blocks B and C. D depends on C. E is standalone tooling. See `IMPLEMENTATION_PLAN.md` for full rules.

## Superseded

- [`PLAN-BACKEND.md`](PLAN-BACKEND.md) — original monolithic plan, now split into A/B/C above
