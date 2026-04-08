---
name: linear-plan
description: Explore the codebase and write a detailed implementation plan into a Linear parent issue's description. Creates sub-issues for each atomic task. Use when an agent has picked up a parent issue and needs to plan the work, or the user says "plan this issue", "/linear-plan".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git:*)
  - Agent
argument-hint: "<issue-id e.g. ENG-42>"
---

# Plan a Linear Issue

Explore the codebase and write the implementation plan for issue `$ARGUMENTS`.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Description template:** `docs/plans/PLAN_TEMPLATE.md` — read this first for the exact markdown format
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`

## Process

### 1. Read the issue

Use `mcp__linear-server__get_issue` with id `$ARGUMENTS` to get the current description, title, labels, and priority.

### 2. Explore the codebase

Based on the problem described in the issue:
- Read all files mentioned in the description or context hints
- Use Grep to find related code, error messages, function names
- Use Glob to find relevant test files, types, configs
- Trace the code path from entry point to the bug/gap
- Note exact file paths, line numbers, function names, variable values

### 3. Write the plan

Using the **Parent Issue template** from `docs/plans/PLAN_TEMPLATE.md`, update the issue description with:

**Problem** — Keep the existing problem statement, refine if your investigation found more detail.

**Investigation** — Fill in:
- "What exists today" — current implementation with exact file:line references
- "Root cause / gap" — what you found by reading code, not guessing
- "Constraints" — anything that limits the solution (compat, perf, breaking changes)

**Plan** — Break into phases. Each phase = a logical group of changes. Each step = a specific action with file path and line number.

**Acceptance Criteria** — Testable outcomes. Last item: "All sub-issues complete".

**Context Map** — Table of key files, their purpose, and grep hints to load them.

**Decisions** — Leave empty (filled during implementation).

Use `mcp__linear-server__save_issue` with `id: "$ARGUMENTS"` to update the description.

### 4. Create sub-issues

For each atomic task in the plan:
- Use `mcp__linear-server__save_issue` to create a sub-issue:
  - `title`: "[Phase N] Brief action description"
  - `team`: "Engineering"
  - `project`: "Landscaper"
  - `parentId`: `$ARGUMENTS`
  - `state`: "Todo"
  - `description`: Use the **Sub-Issue template** from `docs/plans/PLAN_TEMPLATE.md`
  - `labels`: Same category label as parent
  - `priority`: Same as parent (or lower for optional tasks)
- Set `blockedBy` relationships between sequential sub-issues
- Set estimates on each sub-issue

### 5. Move parent to In Progress and post comment

Use `mcp__linear-server__save_issue` with `id: "$ARGUMENTS"`, `state: "In Progress"`.
Use `mcp__linear-server__save_comment` on the parent issue:
"Plan finalized. Created N sub-issues: [list issue IDs and titles]. Ready for implementation."

### 6. Report

Tell the user:
- Summary of what you found during investigation
- The plan structure (phases and key tasks)
- Sub-issues created with their IDs
- Any risks or open questions

## Rules

- Do NOT create sub-issues until the plan is fully written in the parent description
- Do NOT guess at file paths or line numbers — verify by reading the code
- Do NOT include workflow instructions in the issue description — only the plan content
- Keep sub-issues atomic: one focused change, roughly one PR each
- If the problem is trivial (single file, single change), skip phases — just one sub-issue is fine
