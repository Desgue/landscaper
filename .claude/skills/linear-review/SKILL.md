---
name: linear-review
description: Review a Linear issue that is In Review. Checks code quality, tests, types, and regressions. Approves (moves to Done) or requests changes (moves to Revise). Use when the user says "review this", "/linear-review", or an issue needs review.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git:*)
  - Bash(npm:*)
argument-hint: "<issue-id e.g. ENG-43>"
---

# Review a Linear Issue

Review issue `$ARGUMENTS` and approve or request changes.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Review templates:** `docs/plans/PLAN_TEMPLATE.md` — "Review: Approve" and "Review: Request Changes" sections
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`

## Process

### 1. Read the issue

Use `mcp__linear-server__get_issue` with id `$ARGUMENTS` to get:
- Description ("What to do" and "Done when" criteria)
- Parent issue (for broader context and acceptance criteria)
- Comments (for implementation notes from the implementing agent)

Confirm the issue is in "In Review" state. If not, **stop and report**.

### 2. Read the code changes

Find the branch from the issue comments (look for "Branch: ..." comment).

```bash
git diff main...<branch-name> --stat     # overview of changes
git diff main...<branch-name>            # full diff
```

### 3. Check against criteria

For each item in "Done when":
- Verify the criterion is actually met by reading the changed code
- Check that tests exist for the change
- Check that no unrelated files were modified

### 4. Run verification

```bash
git checkout <branch-name>
npm run type-check
npm test
npm run lint
```

All must pass.

### 5. Spot-check regressions

- Read files adjacent to the changes (imports, callers, tests)
- Grep for the changed function/variable names to find other call sites
- Verify nothing is broken by the change

### 6. Decide: Approve or Revise

**Approve if ALL true:**
- Code matches the plan / "What to do" steps
- All "Done when" criteria are met
- Tests pass and cover the change
- TypeScript strict mode passes
- No regressions found
- Code is clean (no unnecessary complexity, matches project style)

**Revise if ANY true:**
- "Done when" criteria not met
- Tests missing or failing
- TypeScript errors
- Regressions found
- Code quality issues (unclear logic, missing error handling at boundaries)

### 7. Post review comment

**If approving:**

Use `mcp__linear-server__save_comment` on the issue with the Approve template from `docs/plans/PLAN_TEMPLATE.md`:

```
**APPROVED**

- [x] Code meets project standards
- [x] Tests cover path + error cases
- [x] No regressions detected
- [x] Types pass strict mode

Moving to Done.
```

Then use `mcp__linear-server__save_issue` with `state: "Done"`.

**If requesting changes:**

Use `mcp__linear-server__save_comment` with the Revise template:

```
**REVISE**

1. **[Issue]:** [Problem and fix] — `path/file.ts` line X
2. **[Issue]:** [Problem and fix]

Fix and move back to In Review.
```

Then use `mcp__linear-server__save_issue` with `state: "Revise"`.

### 8. Check parent completion

If this was the last sub-issue and it's now Done:
- Read the parent issue's acceptance criteria
- If ALL parent criteria are met, move parent to "In Review"
- Post comment on parent: "All sub-issues done. Ready for final review."

### 9. Report

Tell the user:
- Approved or Revise, and why
- Key findings from the review
- Whether the parent issue is ready for final review

## Rules

- Do NOT approve code you haven't read — read every changed line
- Do NOT approve if any check fails — types, tests, lint must all pass
- Do NOT edit code during review — only the implementing agent edits
- Be specific in Revise comments — file path, line number, what's wrong, how to fix
- Minor style issues that don't affect correctness: approve with a note, don't Revise
