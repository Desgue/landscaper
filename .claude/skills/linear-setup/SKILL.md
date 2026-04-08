---
name: linear-setup
description: One-time setup of the Linear Landscaper project. Creates custom workflow states, labels, and milestones. Use when setting up Linear for the first time or the user says "/linear-setup".
disable-model-invocation: true
---

# Linear Project Setup

Configure the Landscaper project in Linear with the correct labels and milestones.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Full configuration reference:** `docs/LINEAR-WORKFLOW.md`

## Setup Steps

### 1. Create category labels

Use `mcp__linear-server__create_issue_label` for each:

| Label | Color | Description |
|-------|-------|-------------|
| Bug | `#d73a49` | Defect in existing functionality |
| Feature | `#6f42c1` | New user-facing capability |
| Refactor | `#0075ca` | Internal restructuring, no behavior change |
| Spike | `#e4e669` | Time-boxed research or prototyping |
| Infrastructure | `#6e7681` | Build, deploy, testing, or tooling |
| UX | `#d876e3` | User experience or interface change |
| Testing | `#f9a825` | Test coverage improvements |
| Cleanup | `#bfd4f2` | Dead code removal, docs, lint fixes |

### 2. Create status labels

| Label | Color | Description |
|-------|-------|-------------|
| blocker | `#d73a49` | Blocked by another issue |
| urgent-review | `#ff7b72` | High-priority review needed |

### 3. Create milestones

Use `mcp__linear-server__save_milestone` for each:

| Milestone | Project | Description |
|-----------|---------|-------------|
| Critical Blockers | Landscaper | User-facing bugs and crash risks — BAU-19, BAU-20, BAU-2, BAU-3, BAU-4 |
| Foundations | Landscaper | Infrastructure and refactoring that unblocks downstream — BAU-8, BAU-5, BAU-27 |
| UX & Reliability | Landscaper | User feedback and API resilience — BAU-21, BAU-9 |

### 4. Verify

After creating all labels and milestones:
- Use `mcp__linear-server__list_issue_labels` with team "Engineering" to confirm labels exist
- Use `mcp__linear-server__list_milestones` with project "Landscaper" to confirm milestones exist

### 5. Report

Tell the user:
- Labels created (count and names)
- Milestones created (count and names)
- Any that already existed (skipped)
- Note: Custom workflow states (Revise) must be created manually in Linear UI under Settings > Teams > Engineering > Workflow

## Notes

- Workflow states (adding "Revise") cannot be created via API — remind the user to add it manually in Linear Settings > Teams > Engineering > Workflow
- This skill is idempotent — running it again will not create duplicates if labels already exist
