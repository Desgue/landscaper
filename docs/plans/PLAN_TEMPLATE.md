# Linear Issue Description Templates

Copy these templates directly into Linear issue descriptions. For workflow states, labels, and operational rules, see `docs/LINEAR-WORKFLOW.md`.

---

## Parent Issue (Feature or BAU)

Use for tracked work spanning multiple sub-issues. Discover constraints and dependencies before creating sub-issues.

```markdown
## Problem

[2-3 sentences describing what's broken or missing and why it matters]

**Depends on:** [Issue links or "none"]
**Unblocks:** [Issue links or "none"]

## Investigation

### What exists today
[Current implementation or behavior. Reference exact files and line numbers.]

### Root cause / gap
[Why it fails or what's missing. Only include what you verified by reading code.]

### Constraints
[Browser compatibility, API limits, performance budgets, or breaking change risk.]

## Plan

### Phase 1 — [Name]
1. [Specific action: `path/file.ts` line X — what to change]
2. [Specific action]

### Phase 2 — [Name]
1. [Specific action]

## Acceptance Criteria

- [ ] [Testable outcome]
- [ ] [Testable outcome]
- [ ] All sub-issues complete

## Context Map

| File | Purpose | Load via |
|------|---------|----------|
| `src/path/file.ts` | [what it owns] | `grep -n "functionName" src/path/file.ts` |
| `internal/path/file.go` | [what it owns] | Read in full |

## Decisions

[Append entries as work proceeds]
[YYYY-MM-DD · Decision · Rationale]
```

---

## Sub-Issue (Atomic Task)

Use for single focused changes, typically one PR. Linked to a parent issue.

```markdown
## What to do

1. [Specific action: `path/file.ts` line X — change Y to Z]
2. [Specific action]
3. [Specific action]

## Done when

- [ ] [Testable result]
- [ ] [Testable result]
- [ ] Tests pass
- [ ] Type-check passes
```

---

## Review: Approve

```markdown
**APPROVED**

- [x] Code meets project standards
- [x] Tests cover path + error cases
- [x] No regressions detected
- [x] Types pass strict mode

Moving to Done.
```

---

## Review: Request Changes

```markdown
**REVISE**

1. **[Issue]:** [Specific problem and fix] — `path/file.ts` line X
2. **[Issue]:** [Specific problem and fix]

Fix and move back to In Review.
```
