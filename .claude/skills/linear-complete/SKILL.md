---
name: linear-complete
description: Finalize a parent Linear issue after all sub-issues are Done. Verifies acceptance criteria, runs final checks, and closes the parent. Use when all sub-issues of a parent are done, or the user says "complete this", "/linear-complete".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git:*)
  - Bash(npm:*)
argument-hint: "<parent-issue-id e.g. ENG-42>"
---

# Complete a Parent Linear Issue

Verify and close parent issue `$ARGUMENTS` after all sub-issues are done.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`

## Process

### 1. Read the parent issue

Use `mcp__linear-server__get_issue` with id `$ARGUMENTS` to get:
- Full description (especially Acceptance Criteria section)
- All sub-issues (list them)

### 2. Verify all sub-issues are Done

Use `mcp__linear-server__list_issues` filtered by parent `$ARGUMENTS`.

For each sub-issue:
- Confirm state is "Done"
- If ANY sub-issue is not Done, **stop and report which ones remain**

### 3. Verify acceptance criteria

Read the "Acceptance Criteria" section of the parent description.

For each criterion:
- Verify it's actually satisfied by reading the current codebase (not just trusting sub-issue completion)
- Run relevant checks: `npm test`, `npm run type-check`
- If a criterion involves visual behavior, note it for the user to manually verify

### 4. Final check

```bash
git checkout main && git pull
npm run type-check
npm test
npm run lint
```

All must pass on main with all sub-issue branches merged.

### 5. Move parent to In Review

Use `mcp__linear-server__save_issue` with `state: "In Review"`.
Use `mcp__linear-server__save_comment`: "All sub-issues complete. All acceptance criteria verified. Moving to In Review for final approval."

The parent now needs a formal review pass (via `/linear-review`). Do NOT skip directly to Done.

### 6. If criteria are NOT met

- Use `mcp__linear-server__save_comment`: "Sub-issues complete but acceptance criteria gaps found: [list gaps]. Creating follow-up sub-issues."
- Create new sub-issues for remaining work
- Parent stays In Progress — do NOT move to In Review

### 7. Report

Tell the user:
- Parent issue status (Done or remaining gaps)
- Summary of what was delivered
- Any follow-up work created

## Rules

- Do NOT close a parent if any sub-issue is not Done
- Do NOT close a parent if any acceptance criterion is unmet — create follow-up sub-issues instead
- Do NOT skip the final test/type-check run on main
