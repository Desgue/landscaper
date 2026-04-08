---
name: linear-sprint
description: Launch an agentic team to work through Linear issues. Lists current issues, asks the user for prioritization instructions, then orchestrates planning, implementation, pre-review, and review for each issue. Use when the user says "start a sprint", "work through issues", or "/linear-sprint".
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Agent
argument-hint: "[optional: milestone name or label filter]"
---

# Linear Sprint Orchestrator

Launch a coordinated agentic team to work through Linear issues in the Landscaper project.

## Context

- **Team:** Engineering (ENG)
- **Project:** Landscaper
- **Workflow doc:** `docs/LINEAR-WORKFLOW.md`
- **Description templates:** `docs/plans/PLAN_TEMPLATE.md`
- **Skills available:** linear-pickup, linear-plan, linear-implement, linear-review, linear-revise, linear-complete

## Process

### 1. List current issues

Use `mcp__linear-server__list_issues` with `project: "Landscaper"` to get all issues.

Display a summary table to the user:

| ID | Title | State | Priority | Labels | Milestone | Blocked By |
|----|-------|-------|----------|--------|-----------|------------|

Group by state (Todo first, then Backlog, then In Progress, then In Review, then Revise).

### 2. Ask for prioritization

Ask the user:
- Which issues should be worked on this sprint?
- What order? (or "by priority" to use Linear's priority field)
- Any issues to skip or defer?
- Any new issues to create from BAU.md?

Wait for the user's response before proceeding.

### 3. Execute the sprint

For each issue the user prioritized, in order:

#### If the issue is a parent with no plan (Investigation section empty):

1. Launch a **Planner agent** (subagent_type: `voltagent-lang:typescript-pro` for frontend, `voltagent-lang:golang-pro` for backend):
   - Explore the codebase for this issue
   - Write the plan into the Linear issue description using the Parent Issue template
   - Create sub-issues
   - Report findings

#### If the issue is a parent with sub-issues in Todo:

For each sub-issue in Todo (respecting `blockedBy` order):

2. Launch an **Implementer agent** (subagent_type: `voltagent-lang:typescript-pro` or `voltagent-lang:golang-pro`):
   - Read the sub-issue description
   - Move to In Progress
   - Create branch, implement, verify
   - Commit and push

3. Launch 3 **Pre-review agents** in parallel:
   - Code Reviewer (subagent_type: `voltagent-qa-sec:code-reviewer`)
   - Security Reviewer (subagent_type: `voltagent-qa-sec:security-auditor`)
   - Doc Sync Reviewer (subagent_type: `voltagent-qa-sec:architect-reviewer`)
   
   If any issues found, fix them and re-verify.

4. Create PR and move sub-issue to In Review.

5. Launch a **Reviewer agent** (subagent_type: `voltagent-qa-sec:code-reviewer`):
   - Independent review of the changes
   - Approve → Done, or Revise → fix and re-review

6. If Revise: Launch the implementer again to fix, then re-review. Loop until approved.

#### If all sub-issues of a parent are Done:

7. Run the **Completion check**:
   - Verify all acceptance criteria
   - Move parent to In Review
   - Launch a final reviewer on the parent
   - Approve parent → Done

### 4. Report sprint results

After all prioritized issues are processed, report:
- Issues completed (moved to Done)
- Issues still in progress (and why)
- Issues blocked (and on what)
- Any new issues discovered during implementation

## Agent model requirements

- **Implementer and code reviewer agents:** Use Claude Opus for highest quality
- **Security and doc-sync reviewers:** Use Claude Sonnet for efficiency
- **Planner agents:** Use Claude Opus

## Rules

- Always ask the user for prioritization before starting work — do NOT auto-prioritize
- Process one parent issue at a time (sub-issues within a parent can be parallelized if independent)
- Never skip the pre-review gate (code/security/doc-sync) before In Review
- If an issue is blocked, skip it and move to the next — report it at the end
- If implementation takes more than 3 sub-issues failing pre-review on the same parent, pause and ask the user for guidance
- Post a comment on each issue as it's picked up and completed for Linear audit trail
