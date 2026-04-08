---
name: linear-pickup
description: Scan the Linear Landscaper project for the next available issue to work on. Checks Todo items by priority, verifies dependencies are met, claims the issue, and reports what to do next. Use when an agent needs to find work or the user says "pick up work", "what's next", or "/linear-pickup".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git:*)
argument-hint: "[optional: label filter e.g. Bug, Spike]"
---

# Pick Up Work from Linear

Find the next issue to work on in the Landscaper project.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`
- **Description templates:** `docs/plans/PLAN_TEMPLATE.md`

## Process

### 1. Scan Todo issues

Use `mcp__linear-server__list_issues` to find issues:
- Filter: `state: "Todo"`, `project: "Landscaper"`
- If `$ARGUMENTS` is provided, also filter by label name matching `$ARGUMENTS`
- Sort by priority (Urgent=1 first, then High=2, Medium=3, Low=4)

### 2. Check dependencies

For each candidate issue (highest priority first):
- Use `mcp__linear-server__get_issue` to read full details
- Check the `blockedBy` field — if any blocking issue is NOT in "Done" state, **skip this issue**
- Check if the issue has a `blocker` label — if yes, **skip**

### 3. Claim the issue

Once a valid issue is found:
- Use `mcp__linear-server__save_issue` to set `state: "In Progress"`
- Use `mcp__linear-server__save_comment` to post: "Taking this."
- If the issue has no estimate, add one (1=small, 3=medium, 5=large based on description complexity)

### 4. Report

Tell the user:
- Issue ID and title
- Priority and labels
- Brief summary of what needs to be done
- Whether this is a **parent issue** (needs planning via `/linear-plan`) or a **sub-issue** (ready for `/linear-implement`)
- Any dependencies or related issues

## Rules

- Do NOT pick up work if there are already 2+ issues assigned to you in "In Progress" state
- Do NOT pick up "Backlog" issues — only "Todo"
- Do NOT pick up "Canceled" issues
- If no Todo issues exist, report "No available work" and suggest the user check Backlog for items to promote
