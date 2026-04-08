---
name: linear-revise
description: Handle a Linear issue in Revise state. Reads reviewer feedback, fixes the code, re-verifies, and moves back to In Review. Use when an issue has been sent back for changes, or the user says "/linear-revise".
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
argument-hint: "<issue-id e.g. ENG-43>"
---

# Fix a Revised Linear Issue

Address reviewer feedback on issue `$ARGUMENTS` and resubmit for review.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`

## Process

### 1. Read the issue and feedback

Use `mcp__linear-server__get_issue` with id `$ARGUMENTS`.
- Confirm the issue is in "Revise" state. If not, **stop and report**.

Use `mcp__linear-server__list_comments` to find the most recent **REVISE** comment.
- Extract each numbered change request (file path, line number, what to fix).

### 2. Move to In Progress

Use `mcp__linear-server__save_issue` with `state: "In Progress"`.

### 3. Check out the existing branch

The branch already exists from the original implementation. Find it from previous comments or:
```bash
git branch -a | grep $ARGUMENTS
```
Check it out and pull latest.

### 4. Fix each issue

For each change request in the REVISE comment:
- Read the referenced file and line
- Make the fix as described
- If the fix requires a different approach than what the reviewer suggested, post a comment explaining why

### 5. Verify

```bash
npm run type-check
npm test
npm run lint
```

All must pass.

### 6. Commit and push

```bash
git add <changed-files>
git commit -m "fix(scope): address review feedback for $ARGUMENTS"
git push
```

### 7. Move to In Review

Use `mcp__linear-server__save_comment`: "Fixed per review comments. Ready for re-review."
Use `mcp__linear-server__save_issue` with `state: "In Review"`.

### 8. Report

Tell the user:
- What was fixed (summary per change request)
- Test results
- Any disagreements with reviewer feedback (explained in comments)
