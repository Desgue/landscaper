# Backend Plans

## Coordination

[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — maps all 3 sub-plans, execution rules, and cross-plan contracts.

## Plans

| Plan | File | Owns | Status |
|------|------|------|--------|
| A | [`PLAN-A.md`](PLAN-A.md) | Go module init, request types, HTTP server & routing, request validation, structured logging | `todo` |
| B | [`PLAN-B.md`](PLAN-B.md) | Element filtering, segmentation render, prompt construction, Gemini client | `todo` |
| C | [`PLAN-C.md`](PLAN-C.md) | Pipeline orchestration, contract test fixtures, build pipeline, dev proxy verification | `todo` |

## Execution Order

```
PLAN-A (Foundation) → PLAN-B (Pipeline) → PLAN-C (Integration & Build)
```

A blocks everything. B depends on A. C depends on A + B. See `IMPLEMENTATION_PLAN.md` for full rules.

## Superseded

- [`PLAN-BACKEND.md`](PLAN-BACKEND.md) — original monolithic plan, now split into A/B/C above
