---
name: implement
description: Orchestrates a coordinated team of specialized agents to implement plans sequentially from a given plans directory. Handles partial, missing, and complete plan states. Enforces a mandatory multi-reviewer loop (Code Reviewer, Doc Sync Reviewer, Security Audit Reviewer) after each phase before advancing. Use when the user says "implement", "/implement", or asks to implement plans from a directory.
arguments:
  - name: plans_path
    description: Path to the directory containing the implementation plan files (e.g. @docs/frontend/plans/ or @docs/backend/plans/)
    required: true
---

Create a coordinated team of specialized agents to implement the plans in $ARGUMENTS, starting with Plan A and proceeding sequentially.

1. If a plan has partial missing features: implement ONLY the missing features, then proceed to the next plan.
2. If a plan has no implementation (all features pending): implement it fully and STOP. Do not proceed to any subsequent plans.
3. If a plan is fully implemented: skip it and proceed to the next plan.

Agent Model Requirements:
- Code agents and code review agents MUST use Claude Opus.
- All other reviewer agents (doc sync reviewers, security audit reviewers) MUST use Claude Sonnet.

Review Process (mandatory after each plan phase is implemented):
- Spawn the following reviewers after each phase: Code Reviewer, Doc Sync Reviewer, Security Audit Reviewer.
- Reviewers MUST loop until ALL reviewers unanimously approve before advancing to the next phase.
- Do NOT advance until full consensus is reached.
