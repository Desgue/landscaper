# Linear Workflow — Blueprint Garden

> **Purpose:** Define how AI agents interact with Linear to manage all development work for Blueprint Garden (Landscaper).
> 
> **Audience:** Claude Code agents picking up work and managing the issue lifecycle.
> 
> **Last updated:** 2026-04-08

---

## Workspace & Project

| Setting | Value |
|---------|-------|
| Workspace team | Engineering (ENG) |
| Project | Landscaper |
| Workspace name | Blueprint Garden |
| MCP tools | Available for agents to interact with Linear via API |

---

## Workflow States

All Engineering team issues move through a linear lifecycle. States are sequential except where noted.

| State | Meaning | Entry rules | Exit rules | Agent actions |
|-------|---------|-------------|-----------|----------------|
| **Backlog** | Issue created, waiting for prioritization. Parent BAU items start here. | Issue created in Linear. | Assign priority + priority label. | Scan and filter by priority. Pick up if Todo. |
| **Todo** | Issue is ready to work on. No blockers. Assigned agent can start immediately. | Priority assigned. No `blocker` label. | Agent picks up and moves to In Progress. | Read full description. Check blockedBy. Post comment: "Taking this" before moving. |
| **In Progress** | Agent is actively developing. | Agent transitions from Todo. Creates branch (format: `team-key/issue-id-slug`). | Agent creates PR (linked via branch name). Move to In Review. | Implement per description. Push commits. Create draft PR → ready when tests pass. Post progress comment if blocked >1 hour. |
| **In Review** | Code complete. Awaiting reviewer agent approval. | Agent creates PR and transitions issue. | Reviewer approves (→ Done) or requests changes (→ Revise). | Reviewer checks code quality, tests, types, regressions. Post review comment per template. |
| **Revise** | Reviewer requested changes. Agent fixes and re-submits. | Reviewer posts "REVISE" comment and transitions issue. | Agent fixes → pushes to same branch → moves back to In Review. | Read revise comments carefully. Fix in place. Post comment: "Ready for re-review" before transitioning. |
| **Done** | Issue complete. Code merged. | All acceptance criteria met. PR merged. All sub-issues (if parent) are Done. | N/A — issue closed. | Close PR. Confirm merge. No further work. |
| **Canceled** | Issue deprioritized or superseded. Do not implement. | Explicit decision by human. | N/A — issue closed. | Archive. Do not work on. |

### Transition Rules

- **Only forward:** Backlog → Todo → In Progress → In Review → {Done | Revise → In Review → Done}
- **No skipping:** Must pass through In Review before Done (even for trivial fixes).
- **Blocking:** If issue has `blocker` label or is in blockedBy relationship, it stays in Backlog until unblocked.
- **Parent → Done:** Only when all sub-issues are Done AND parent acceptance criteria pass review.

---

## Labels

Labels are minimal and practical. Linear's native fields (priority, estimate, assignee) cover effort/urgency. Labels add context Linear doesn't natively track.

### Category Labels
Create these under "Category" label group:

| Label | When to use | Notes |
|-------|------------|-------|
| `Bug` | Issue is a defect in existing functionality. | Use priority field for severity (Urgent/High/Medium/Low). |
| `Feature` | Issue adds new user-facing capability. | Parent BAU items for new features always get this label. |
| `Refactor` | Internal restructuring without behavior change. | Improves maintainability, performance, or code clarity. |
| `Spike` | Research or prototyping task. Time-boxed. Outputs decision or proof-of-concept. | Must be completed before dependent work can start. |
| `Infrastructure` | Changes to build, deploy, testing, or tooling. | Does not directly affect user features but unblocks development. |
| `UX` | Changes to user experience or interface. | Includes accessibility, usability improvements. |
| `Testing` | Adds or improves test coverage. | Standalone testing work (not bundled with feature implementation). |
| `Cleanup` | Removes dead code, updates docs, or fixes lint. | Low priority. Do last. |

### Status Labels (Informational)
Create under "Status" group for visibility:

| Label | When to use |
|-------|------------|
| `blocker` | Issue is blocked by another issue. Stays in Backlog until unblocked. Transitions out when dependency is Done. |
| `urgent-review` | Issue awaiting review is high-priority. Reviewer agent scans for this and prioritizes. |

### Do NOT use
- Type prefixes (`type:`, `priority:`, `effort:`) — Linear's native fields handle these better.
- Severity labels — use Linear's priority field instead.
- Team labels (`frontend`, `backend`) — assign to team members instead.

---

## Branch & PR Rules

### Branch Naming

Linear creates branches automatically. If agent creates manually, follow this format:

```
{TEAM-KEY}/{ISSUE_ID}-{slug}
```

| Component | Value | Example |
|-----------|-------|---------|
| TEAM-KEY | `ENG` for Engineering | `ENG` |
| ISSUE_ID | Linear issue ID (e.g., `ENG-42`) | `ENG-42` |
| slug | Kebab-case title, 3–5 words max | `fix-tree-visibility` |

**Full example:** `ENG/ENG-42-fix-tree-visibility`

### PR Requirements

1. **Title:** Copy the issue title. Start with [ENG-42] if not auto-linked.
2. **Link:** Add "Fixes ENG-42" or "Closes ENG-42" in the description so GitHub auto-closes on merge.
3. **Status:** Mark as Draft until ready for review (all tests passing, no TS errors).
4. **Checks:** All GitHub Actions must pass (lint, type-check, tests).
5. **Reviewers:** Tag the reviewer agent as a reviewer on GitHub.

### Auto-Closure

When PR merges:
- GitHub integration moves Linear issue to Done automatically (if configured).
- If not automatic, agent must manually move issue to Done.
- Confirm merge before closing issue.

---

## Agent Operational Rules

### Picking Up Work

1. **Scan Todo items** by priority (Urgent → High → Medium → Low).
2. **Check dependencies:** Read `blockedBy` relationships in the issue. If blockedBy issue is not Done, skip this item.
3. **Check estimate:** If no estimate, add one before starting (1 pt for small, 3 for medium, 5 for large).
4. **Confirm capacity:** Do not pick up work if you have >2 active (In Progress) issues.
5. **Transition:** Move issue from Todo → In Progress. Post comment: "Taking this."
6. **Create branch:** Use naming rules above. Push first commit within 1 hour of starting.

### During Implementation

| Scenario | Action |
|----------|--------|
| **Stuck >1 hour** | Post comment in issue describing blocker + next action. Do NOT wait silently. |
| **Need clarification** | Post comment with specific question + file/line references. Tag issue author if possible. |
| **Found a problem** | Post comment describing the issue (not a fix attempt in comments). If major, escalate to human (see Escalation below). |
| **Updating acceptance criteria** | Update issue description directly. Do NOT re-negotiate scope — if scope expands, create a new sub-issue. |
| **Test failures** | Fix in the same PR. Do not merge until all tests pass. |

### Creating Sub-Issues

For parent BAU items (features):

1. **One sub-issue per atomic task.** Roughly one PR per sub-issue.
2. **Title format:** "[Phase N] Brief action" or "Implement X component" — be specific.
3. **Description:** Use sub-issue template from `docs/plans/PLAN_TEMPLATE.md`.
4. **Link:** Add parent issue as "relates to" and use `blockedBy` for sequential dependencies.
5. **Estimate:** Always set. Parent item's estimate = sum of sub-issues (rough guide).

### Commenting

Post comments for visibility and handoff clarity:

| Scenario | When | What to post |
|----------|------|-------------|
| Picking up work | Immediately upon Todo → In Progress | "Taking this." |
| Blocked | After 1 hour of blocking | Problem, context, blocker type (missing info, external API down, etc.) |
| Ready for review | When pushing final commit | "Code ready. All tests pass. Ready for review." |
| Ready for re-review | After revising per feedback | "Fixed per comments. Ready for re-review." |
| Completing parent | All sub-issues Done | "All sub-issues done. Parent acceptance criteria met. Ready for final review." |

**Guidelines:**
- Keep comments short (2–3 sentences max). Use issue description for detailed context.
- Do NOT comment on design disagreements — escalate to human.
- Do NOT update issue description for every change — only if acceptance criteria or plan changes materially.

### Blockers & Escalation

| Situation | Action |
|-----------|--------|
| **Dependency issue not Done** | Leave issue in Backlog. Do NOT work on it. Re-scan Todo list and pick up other work. |
| **External API or service down** | Post blocker comment. Move issue to Backlog (remove from In Progress). Re-assign if possible. |
| **Missing design or spec** | Post comment with specific question. Wait for clarification. Do not guess. |
| **Technical uncertainty >30 min** | Post comment describing options + rationale. Escalate to human (see Escalation below). |
| **Breaking change risk** | Post comment + escalate to human. Do NOT merge without approval. |

**Escalating to human:**

Post comment in issue with:
1. What you're stuck on (concise).
2. What you've tried (1–2 approaches).
3. What you need (decision, spec, approval, etc.).
4. Tag human reviewer/author if known.

Do NOT wait for response before picking up other work.

### Updating Issue Descriptions

| Update type | When | How |
|-------------|------|-----|
| **Acceptance criteria change** | Before moving to In Review | Edit description directly. Post comment: "Updated acceptance criteria — see description." |
| **Investigation findings** | As you code | Edit Investigation section in parent issue. Keep detailed (file paths, line numbers). |
| **Decisions log** | As you make architectural choices | Append to Decisions section in parent issue. Format: `[YYYY-MM-DD · Decision · Rationale]` |
| **Plan refinement** | If original plan proves wrong | Edit Plan section. Post comment: "Plan adjusted — see description." Explain why. |
| **Status snapshot** | Do not do this | Use comments instead. Comments are time-ordered; edits are not. |

---

## Review Protocol

### Reviewer Agent Responsibilities

When an issue moves to In Review:

1. **Read the issue description** to understand the problem and acceptance criteria.
2. **Check the PR:**
   - Code quality: No unnecessary complexity. Matches project style (see codebase).
   - Tests: Happy path + error case covered. All existing tests still pass.
   - Types: No TypeScript errors. Strict mode passes.
   - Regressions: Spot-check related modules for breaking changes.
3. **Post review comment** using template below.

### Approve vs. Revise Criteria

| Criteria | Approve | Revise |
|----------|---------|--------|
| **Code matches plan** | Yes, or minor improvements | No, deviates significantly from plan |
| **Tests pass** | All pass locally and in CI | Failing or gaps in coverage |
| **Types pass** | No errors in strict mode | Any TypeScript errors |
| **Acceptance criteria met** | All checkboxes complete | Some criteria not met |
| **No regressions** | Spot-check confirms safe | Found issues in related modules |
| **Comment quality** | Code is self-explanatory or well-commented | Obscure logic without explanation |

### Review Comment Templates

Both templates are in `docs/plans/PLAN_TEMPLATE.md` under "Review Comments" section. Post one of these exactly (no customization needed unless specified):

**Template: Approve**
```
**APPROVED**

- [ ] Code quality — no unnecessary complexity
- [ ] Tests cover happy path + error case
- [ ] No regressions (spot-checked)
- [ ] Types pass strict mode

Moving to Done.
```

**Template: Request Changes (Revise)**
```
**REVISE**

1. **[What]:** [Problem and fix] — `src/path/file.ts` line X
2. **[What]:** [Problem and fix]

Fix and move back to In Review.
```

### Merging

After posting Approve comment:

1. **Transition issue** from In Review → Done.
2. **Merge PR** to main branch (or create merge commit as per project convention).
3. **Confirm merge:** Issue should auto-close via GitHub integration. If not, manually verify and close.

---

## Parent Issue Lifecycle

### From Creation to Implementation

| Phase | State | Who | Action |
|-------|-------|-----|--------|
| 1. Creation | Backlog | Human or agent | Create parent issue with brief problem. |
| 2. Planning | Backlog | Agent | Read problem. Explore codebase. Write detailed plan into description (use PLAN_TEMPLATE.md). |
| 3. Planning | Todo | Agent | Create sub-issues (one per atomic task). Link to parent via "relates to" + `blockedBy`. Set parent state to Todo. |
| 4. Execution | In Progress | Agent(s) | Pick up sub-issues sequentially or in parallel per dependency graph. Implement per sub-issue plan. |
| 5. Review | In Review (sub-issues) | Reviewer agent | Review and approve/revise each sub-issue. Move sub-issues to Done. |
| 6. Final review | In Review (parent) | Reviewer agent | All sub-issues Done. Check parent acceptance criteria. Approve parent. |
| 7. Done | Done | System | Issue closed. Parent feature shipped. |

### When All Sub-Issues Are Done

1. **Check acceptance criteria** in parent issue description.
2. **Verify each sub-issue** is actually Done (not just marked Done).
3. **If any criteria not met:** Create a new sub-issue for remaining work. Parent stays In Progress.
4. **If all criteria met:** Post parent review comment (Approve template). Transition parent to Done.

### Parent Description Structure

Reference `docs/plans/PLAN_TEMPLATE.md` for exact format. Parent description must contain:

- **Problem** — User pain or missing feature.
- **Investigation** — What exists, root cause, constraints (filled after codebase exploration).
- **Plan** — Phased breakdown. Each phase = 1–3 sub-issues.
- **Acceptance Criteria** — Testable checklist. Last item: "[ ] All sub-issues done".
- **Context Map** — Key files and how to read them.
- **Decisions** — Append as you implement.

Do NOT create sub-issues until parent description is complete and approved by you (agent).

---

## Issue Templates in Linear

When creating a new issue in Linear, Linear may prompt for a template. Use:

- **Parent issue template:** Fill in Problem section only. Add rest after codebase exploration.
- **Sub-issue template:** Use PLAN_TEMPLATE.md "Sub-Issue" section.
- **Spike template:** Problem + acceptance criteria only (no plan until spike is done).

If Linear does not have templates configured, copy-paste from `docs/plans/PLAN_TEMPLATE.md` directly into description.

---

## Dependency Management

### Blocking Relationships

Use Linear's native `blockedBy` relationship:

- **If A blocks B:** A and B must be in same project. A must be Done before B moves out of Backlog.
- **Check before starting:** Always verify no `blockedBy` issues exist before moving Todo → In Progress.
- **Unblock on completion:** When blocking issue moves to Done, dependent issues automatically show as unblocked.

### Cross-Team Coordination

If issue blocks a different team:

1. Post comment in issue describing what they need from you and timeline.
2. Link the issue in their project if cross-project dependency exists.
3. If blocking >3 business days, escalate to human.

### Parallel Execution

Parent issues should have sub-issues with clear dependency chains. Parallel sub-issues (no `blockedBy` relationship) can be picked up by different agents simultaneously.

---

## Workspace Hygiene

### Keeping Linear Clean

| Task | Frequency | Rules |
|------|-----------|-------|
| **Archive old Done issues** | Monthly | Move Done issues >30 days old to Completed view. Keep Open view clean. |
| **Review Backlog** | Weekly | Human updates priorities. Remove Canceled issues. Groom descriptions. |
| **Update BAU.md** | When status changes | Sync status in `docs/plans/BAU.md` with Linear. Single source of truth is Linear; BAU.md is a snapshot. |
| **Close stale Backlog items** | Quarterly | Items not started in 6+ months → Canceled (with reason comment). |

### Renaming & Consolidation

If two issues are duplicates:

1. Post comment in both noting the merge.
2. Close the secondary issue with reason: "Duplicate of ENG-X."
3. Consolidate any unique context into the primary issue.

---

## Reporting & Metrics

Agents do not manually generate reports. Linear provides:

- **Velocity:** Sum of estimates completed per sprint (if sprints are enabled).
- **Cycle time:** Time from Todo → Done (set "Start" and "Closed" dates).
- **Burndown:** Visual progress on project.

**For humans:**

Scan Linear weekly:
- How many issues moved from Todo → Done?
- Any issues stuck in In Progress >5 days?
- Any blockers or escalations pending?

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Can't find my assigned issues** | Filter: state:Todo assignee:me. Or scan by priority. |
| **Merged PR but issue didn't auto-close** | Manually move issue from In Review → Done. Check GitHub integration status with human. |
| **Blocker on external dependency** | Post comment, move to Backlog, pick up other Todo work. Re-check blocker daily. |
| **Don't understand acceptance criteria** | Post comment with specific questions. Wait for clarification. Do not guess. |
| **Issue description was wrong** | Update description with findings. Post comment: "Plan updated — see description." Move on. |
| **Estimate was wrong** | Adjust estimate mid-task. Post comment: "Updating estimate due to X." Learn for next estimate. |
| **Need to escalate but can't reach human** | Post detailed comment in issue + tag all known humans. Do not block yourself waiting. |

---

## References

- **Issue templates:** `docs/plans/PLAN_TEMPLATE.md`
- **BAU backlog:** `docs/plans/BAU.md`
- **Project memory:** `.claude/memory/MEMORY.md`
- **Linear workspace:** https://linear.app/dg-tech/project/landscaper-6662fbc66670
