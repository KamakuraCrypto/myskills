---
name: PROJECT-loop
description: "TEMPLATE — copy to <your-repo>/.claude/skills/<project>-loop/ and fill the <...> slots. Autonomously build ONE rung of <PROJECT> end-to-end: detect what merged last, go deep with Opus subagents, verify with a custom cross-model reviewer team, converge, escalate money-path to the owner, then update docs + retro + handoff so the owner /clears and reruns. Triggers: '<project>-loop', 'build next rung', 'next PR'."
---

# <PROJECT>-loop — one rung, end to end, autonomous

Project-specific instance of the `loop-forge` lifecycle (read `loop-forge`, `agent-team`, `deep-work` first).
The owner MERGES each rung; you never merge. This is a TEMPLATE — replace every `<...>`.

## Inputs (fill these in)
- Roadmap / PR ladder: `<path to PRD / roadmap>`
- Design docs / ADRs / glossary: `<paths — e.g. docs/adr/, CONTEXT.md>`
- Tracker: `<gh repo / issue source>`
- Build + verify commands: `<the real CI gate — e.g. "cargo test", "npm test && npm run build">`
- Ownership / branch / merge conventions: `<e.g. owner-owned tree, sudo -u X for git; owner merges to main>`

## Model doctrine (highest intelligence everywhere; more on verification)
- Execution (orchestrator + all workers) = **Opus 4.8**. Workers are Opus subagents — never route
  code/reasoning/review to a low-intelligence model to save tokens.
- Verification (the reviewer seats) = **codex 5.5 + 5.4 (xhigh) + Opus 4.8 (+ Fable 5 if available)**, fresh
  context, cross-model. Architecture review on codex 5.5 AND Opus. Correctness is the constraint, not cost.

## The loop (one iteration = one rung → one PR)
1. **Orient** — handoff prompt if given, else detect what merged last + the next unblocked rung on the ladder.
   Load its slice + the docs it touches. Confirm acceptance criteria. Read the prior `docs/state/loop-state.md`.
2. **Build as a team** — branch; split into worker CARDS (TASK/INPUT/DONE-MEANS/DO-NOT/RETURN/DEVIATIONS);
   Opus workers, one card each, own branch/scope, two never touch one file, you merge. Honor `<landmines>`.
3. **Verify for real** — run `<the real CI gate>` (know your false-greens). Build/typecheck AND drive the
   actual behavior when there's a runtime surface.
4. **Spawn the custom reviewer team** — from `agent-team/references/reviewer-roles.md`, generated from what the
   rung touches (security / domain / architecture / correctness premortem / spec), each fresh-context +
   loaded with its role + skills + the diff + the docs, cross-model. Machines gate first, then reviewers grade
   against DONE-MEANS, PASS/FAIL, reject-not-fix. Feed findings back; re-review; the maker never grades itself.
5. **Converge + escalate** — done when every lens PASSES (or a finding is consciously accepted). Money-path
   fork → options + recommendation, filter once through Fable + codex, then grill the owner. Non-money
   ambiguity you resolve; escalate only after ~5–10 non-converging rounds.
6. **Ship + persist + retro** — leave the PR MERGEABLE (owner merges). Update docs + ADRs + memory. Change
   report + 5-question acceptance quiz for the owner. Retro into `docs/state/loop-state.md` (shipped / failed
   + why / one new brief-rule). Write a handoff so the owner `/clear`s + reruns.

## STOP — red lines (write your own; these are the defaults)
Never: merge, push to main, delete backups/keys/DBs, move funds, deploy, or proceed on a money-path guess —
all owner-only. Uncertain → surface, don't do. Never re-open frozen design contracts.

## Loop hygiene (the five diseases)
Blind (this skill picks the rung, not you) · Tangled (own branch per worker) · Nodding (a SEPARATE reviewer
that actually rejects) · Amnesiac (state on disk — `loop-state.md`) · Manual (a real trigger). Caps when
scheduled: per-run timeout, daily budget, max attempts + a human merge gate. Metric: cost per accepted result
— <50% kept = mis-scoped, split the rung.
