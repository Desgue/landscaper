---
name: linear-implement
description: Implement a Linear sub-issue end-to-end. Creates a branch, writes the code, runs tests, commits, and moves the issue to In Review. Use when an agent has a sub-issue to implement, or the user says "implement this issue", "/linear-implement".
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

# Implement a Linear Sub-Issue

Implement the work described in issue `$ARGUMENTS`.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`

## Process

### 1. Read the issue

Use `mcp__linear-server__get_issue` with id `$ARGUMENTS` to get:
- Description ("What to do" and "Done when" sections)
- Parent issue ID (read the parent for broader context if needed)
- `blockedBy` — if any blocker is not Done, **stop and report**

### 2. Move to In Progress (if not already)

If the issue is in Todo (not yet claimed via `/linear-pickup`):
- Use `mcp__linear-server__save_issue` with `id: "$ARGUMENTS"`, `state: "In Progress"`.
- Use `mcp__linear-server__save_comment`: "Taking this."

If already In Progress, skip this step.

### 3. Create worktree and branch

Use a git worktree so other agents can work in parallel on the main repo:

```bash
git fetch origin main
SLUG="$ARGUMENTS-<slug>"   # kebab-case from issue title, 3-5 words max. Example: ENG-43-fix-tree-visibility
WORKTREE_PATH="../landscaper-$SLUG"
git worktree add -b "$SLUG" "$WORKTREE_PATH" origin/main
cd "$WORKTREE_PATH"
```

All subsequent work (editing, testing, committing, pushing) happens inside the worktree directory (`$WORKTREE_PATH`), NOT the main repo checkout.

### 4. Implement

Follow the "What to do" steps in the issue description exactly:
- Read the referenced files before editing
- Make the smallest change that satisfies the requirements
- Do NOT add features, refactor, or "improve" beyond what's asked
- Do NOT add comments or docstrings to code you didn't change

### 5. Verify

Run these checks:
```bash
npm run type-check    # TypeScript strict mode
npm test              # Unit tests
npm run lint          # ESLint
```

Fix any failures before proceeding. All checks must pass.

### 6. Commit

Stage only the files you changed. Write a conventional commit:
```
feat(scope): description    # for new features
fix(scope): description     # for bug fixes
refactor(scope): description # for refactors
```

### 7. Push and create PR

From within the worktree directory:
```bash
git push -u origin $SLUG
gh pr create --title "[$ARGUMENTS] <issue title>" --body "Fixes $ARGUMENTS"
```

### 8. Pre-review gate

Before moving to In Review, spawn 3 reviewer agents in parallel:

1. **Code Reviewer** (subagent_type: `voltagent-qa-sec:code-reviewer`) — check code quality, unnecessary complexity, project style consistency
2. **Security Reviewer** (subagent_type: `voltagent-qa-sec:security-auditor`) — check for injection, XSS, unsafe patterns, secrets exposure
3. **Doc Sync Reviewer** (subagent_type: `voltagent-qa-sec:architect-reviewer`) — check that changes are consistent with docs in `docs/`, no spec drift

Each reviewer reports issues. Fix any issues they find before proceeding. Re-run verification after fixes.

### 9. Move to In Review

Use `mcp__linear-server__save_issue` with `id: "$ARGUMENTS"`, `state: "In Review"`.
Use `mcp__linear-server__save_comment`: "Code ready. All checks pass. Pre-review (code/security/doc-sync) passed. Branch: `$ARGUMENTS-<slug>`. Ready for review."

### 10. Clean up worktree

Return to the main repo and remove the worktree:
```bash
cd /Users/mercor/Code/personal/landscaper
git worktree remove "$WORKTREE_PATH"
```

### 11. Report

Tell the user:
- What was changed (files and summary)
- Test results
- Branch name
- Any concerns or tradeoffs made

## Rules

- Do NOT merge the branch — that happens after review
- Do NOT skip the verify step — all checks must pass before In Review
- If stuck for >30 minutes, post a comment on the issue describing the blocker and ask the user
- If the "What to do" steps are wrong or incomplete, update the sub-issue description with what you found, post a comment explaining the change, then implement
- If you discover the parent issue plan needs updating, post a comment on the parent — do NOT edit the parent description from a sub-issue context
