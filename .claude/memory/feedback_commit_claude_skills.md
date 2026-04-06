---
name: Commit project-local .claude skills
description: Copy skills to .claude/skills/ in the project and commit; keep global copy too
type: feedback
---

When adding or updating Claude Code skills, write them to `.claude/skills/` inside the project repo and commit them alongside the code they support.

**Why:** Skills committed to the repo are shared with all contributors and survive machine migrations.

**How to apply:** After writing a skill to the global `~/.claude/skills/`, also copy it to `/Users/guedes/Code/planner-frontend/.claude/skills/` and include it in the next commit.
