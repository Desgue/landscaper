---
name: Blueprint review loop
description: Iterate blueprint reviews until all reviewers approve before implementation
type: feedback
---

After each implementation phase, run a parallel team of reviewers and iterate fixes until all reviewers return PASS before moving to the next phase.

**Why:** Prevents compounding errors across phases; catches spec drift, security issues, and architectural mistakes early.

**How to apply:**
- After each phase, spawn reviewers in parallel: security, docs alignment, plan alignment, code best practices (Opus model), architecture, observability.
- If any reviewer returns FAIL, spawn a fix agent, then re-run all reviewers.
- Only proceed to the next phase when every reviewer returns PASS.
- LOW findings are non-blocking; HIGH and MEDIUM block the phase.
