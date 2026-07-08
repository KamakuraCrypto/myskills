---
name: PROJECT-loop
description: "TEMPLATE — copy to <your-repo>/.claude/skills/<project>-loop/ and fill the <...> slots. Autonomously build ONE rung of <PROJECT> end-to-end: orient from the merged tip, batch-grill the owner only if a design fork exists, build with builder agents, gate through the deterministic rung-gate workflow (tiered: money/logic/mech), converge, notify the owner the moment it's mergeable, and persist with a capped retro + product burn-down. Triggers: '<project>-loop', 'build next rung', 'next PR', 'keep looping'."
---

# <PROJECT>-loop — one rung, end to end, autonomous (v2)

Project instance of the `loop-forge` lifecycle, v2 shape: the MACHINERY lives in typed agents
(`.claude/agents/`: rung-builder, verifier, codex-runner, security-reviewer, product-guardian,
arch-reviewer, doc-scribe — from `templates/agents/`) and the deterministic gate
(`.claude/workflows/rung-gate.js` — from `templates/rung-gate.js`). This file is the JUDGMENT
layer only. Model roster: `~/.claude/MODELS.md` (never hardcode model names/dates here; template:
`templates/MODELS.md`). The owner MERGES every rung; the STOP door is machine-GUARDED by
`.claude/hooks/stop-door.sh` (accident-grade string matching, tested block/allow suites — NOT an
adversarial sandbox; the red lines below still bind you where the regex can't see). If the hook
blocks you, that action was an owner-only red line: surface, don't work around — routing around
the hook (variables, helper scripts, encodings) is itself a red-line violation.

**Inputs (fill in):** `docs/state/loop-state.md` (read FIRST — newest rules bind); roadmap/PR
ladder `<ROADMAP-PATH>`; ADRs/design docs `<paths>`; CONTEXT.md;
`.claude/docs/PRODUCT-INVARIANTS.md`; tracker `<issue source — and how much to trust it vs the
ladder>`.

## The loop (one iteration = one rung → one mergeable PR)

1. **Orient (≤15 min).** Handoff given → use it. Else: git log + PR list → what merged last →
   next unblocked rung on the ladder. Read its slice + only the docs it touches. Compute the
   BURN-DOWN (N PRs to the next demo-able milestone) — it opens and closes every session.
2. **Batched grill (ONLY if the rung has a genuine design fork).** ONE options sheet: every open
   decision ranked, each with a recommended default and a one-line tradeoff, in layman terms.
   Include the standing checklist ("anything here retired/forbidden?") and the accepted-residuals
   table. The owner answers once, in one sitting — NEVER one-question-at-a-time serial grilling
   (measured cost: 3 calendar days for 3 hours of work). No fork → skip; the ADRs already decide
   most things.
3. **Size the rung BEFORE building.** >1 seam, more additions than `<your threshold, e.g.
   ~1,500>`, or mixed money+plumbing → SPLIT now. (15+ blockers in gate round 1 = you sized
   wrong.) Batch trivially small rungs 2–3 per session.
4. **Build as a team.** You are the orchestrator — architectural decisions only, no grunt work.
   Split into worker CARDS (TASK/INPUT/DONE-MEANS/DO-NOT/RETURN/DEVIATIONS); spawn `rung-builder`
   agents, one card each, disjoint file scopes (worktree isolation if they must touch neighbors).
   You integrate. Parity across variants is a card-level requirement, not an afterthought.
5. **Machines before reviewers.** Spawn `verifier`. FAIL → fix before any model reads the diff.
6. **Gate = run the workflow, don't improvise it:** `/rung-gate` with
   `{tier, branch, mergeBase, sha, rung, spec, priorRefuted}`.
   - **money** (`<your money tier: funds/dispatch/auth/irreversible>`): full seats — dual codex +
     security-reviewer + product-guardian (+arch r1).
   - **logic** (state machines, non-money runtime): dual codex + arch r1.
   - **mech** (plumbing, wiring, docs, mechanical refactors): single codex round. History shows
     the lean path is safe here.
   The workflow enforces: REFUTED ledger, void-round handling (quota echo / sandbox), SHA
   stamping, 5-round cap → split-scope, closure review of fix commits, owner-fork escalation,
   money-tier floor from the verifier's report. Trust its verdict object; never fabricate a
   verdict from a dead round.
7. **Escalation.** Money-path fork → build options + recommendation, pre-filter once through the
   strongest available independent model + codex (per `~/.claude/MODELS.md`), then grill the
   owner (batched format). Non-money ambiguity → resolve yourself; escalate only after genuine
   reviewer divergence. Never proceed on a money-path guess.
8. **A turn is not done at "built".** Done-for-this-turn = gate LAUNCHED or CONVERGED (a
   committed-but-unreviewed rung once sat ~21h). If anything stalls (API error, killed task,
   reviewer quota) → write `docs/state/resume-<rung>.md` (one line: state + next command) AND
   notify the owner. Never wait silently — a silent crash once cost 6 calendar days.
9. **Finish.** When converged + CI green + MERGEABLE: push (never to prod/main — the hook guards
   this), spawn `doc-scribe` (capped ceremony: ≤2 artifacts, retro ≤15 lines, memory prune,
   burn-down handoff), then NOTIFY the owner immediately: "**PR #N ready to merge** + gate
   verdict + residuals + burn-down". Then either STOP for the merge, or — if the owner has
   authorized pipelining — start the next rung in a worktree branched from the pending tip
   (rebase after the merge). Merge latency, not review, is the measured #1 throughput limiter.
10. **Pace check (every ~5 merged rungs).** One subagent, one question: "are the last 5 rungs
    moving the product toward what the owner can use, or gold-plating?" — cite the burn-down.
    (A gold-plating spiral once ran for weeks before an audit caught it.)

## Landmines (top 5 — the rest live in the agent charters, where they're ENFORCED)
- `<ownership/build choreography>`
- `<CI truth: which config file, which jobs, which subsets are false-greens>`
- `<CI-infrastructure failure modes and remedies>`
- `<toolchain quirks>`
- `<frozen contracts: ADRs / invariants that findings may not re-open>`

## STOP — red lines (machine-enforced by the hook; listed so you never test them)
Never: merge a PR · push to `<PROD-BRANCH>`/main or force-push · delete/overwrite protected data
(keys, backups, DBs) · `<project-specific irreversibles: move funds / deploy prod / …>` · proceed
on a money-path guess · re-open frozen contracts. Uncertain → surface to the owner. The hook
blocking you is a feature, not an obstacle.

## Retro discipline (compounding, with teeth)
Every rung: doc-scribe appends ≤15 lines to `docs/state/loop-state.md`. A lesson that is a
COMMAND or CHECK must also land in its machine home the SAME session (hook / verifier charter /
gate script / CI) — a lesson stored only as prose WILL repeat (measured: three "learned" lessons
all recurred until they became machine checks).
