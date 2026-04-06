---
name: Observability reviewer in review loop
description: Every review loop must include an observability agent checking logging and tracing for debug purposes
type: feedback
---

Add an **Observability** reviewer to every post-implementation review team (alongside security, docs, plan alignment, code best practices, architecture reviewers).

**Why:** User explicitly requested it. Debug-ability matters for this project.

**How to apply:**
- Spawn a 6th reviewer agent (parallel with the others) after each implementation phase.
- Reviewer prompt: check whether the implemented code has adequate logging/tracing for debug purposes — console.error on error paths, meaningful context in log messages, no silent swallows of errors, no raw `catch (e) {}` without logging, Konva event errors surfaced, store update errors logged.
- PASS if coverage is adequate or the code is simple enough that logging adds no value.
- FAIL if errors are silently swallowed or there are complex async paths with no observability.
