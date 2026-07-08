---
name: loop-forge
description: Set up and run the FULL autonomous build lifecycle for any project — combines grill-with-docs (clarify + update CONTEXT/ADRs) → architecture review → PRD → issues → team build (Opus orchestrator + Opus workers) → a custom fresh-context reviewer team (security/domain/architecture/correctness/spec) run cross-model on codex 5.5/5.4 + the strongest available Claude models (per your ~/.claude/MODELS.md roster) → converge → escalate money-path to the owner → ship mergeable + docs + retro + handoff. Use to engineer a repeatable loop for a project, set up autonomous building, or run one rung end-to-end with full verification. Then it emits a project-specific `<project>-loop` skill. Triggers: "loop-forge", "engineer a loop", "set up the loop", "orchestrate the whole lifecycle", "build this project autonomously", "run the full pipeline".
---

# Loop-forge — the whole lifecycle as one orchestrated, cross-model loop

The master orchestration. Ties together the method (`deep-work`), the team mechanics (`agent-team` + its
`reviewer-roles.md` factory), the onboarding scan (`deep-scan`), and the Matt-Pocock skills (grill / improve
-architecture / to-prd / to-issues / review) into one lifecycle a `/loop` can run. Orchestrator = **Opus 4.8,
high effort**. Highest intelligence everywhere; the verification side gets MORE of it, cross-model.

## Model doctrine (non-negotiable)
- Execution (plan / build / integrate): **Opus 4.8** (orchestrator + all workers). Workers are Opus subagents,
  NOT Haiku — never route code/reasoning/review to a low-intelligence model. (Haiku only for a throwaway prose
  draft, never anything that matters.)
- Verification: **codex 5.5 + 5.4 (xhigh) + the strongest available Claude models — roster + fallbacks in
  `~/.claude/MODELS.md` (never hardcode names/dates here; template: `templates/MODELS.md`)**, fresh context,
  cross-model.
- Architecture: `mp-improve-codebase-architecture` on **codex 5.5 AND Opus 4.8**, converge. Premortem: codex
  5.5 + 5.4. Correctness is the constraint, not token cost.

## The lifecycle (each phase names the skill + the models)
1. **Understand** (new/unfamiliar repo only) — run `deep-scan` (or a lighter phase-0/1) to get the BUILT/
   DESIGNED/TARGET map + reconcile CONTEXT.md/ADRs. Skip if the project is already mapped.
2. **Clarify + grill** — `mp-grill-with-docs` on **Opus 4.8**: interview the owner one question at a time
   (prioritize questions whose answer changes the plan; blindspot pass if the area is new to him), stress the
   plan against the domain model, and UPDATE CONTEXT.md/ADRs inline as decisions crystallize. Output: a locked
   four-part brief (CONTEXT / REQUEST / OUTPUT / CONSTRAINTS).
3. **Architecture pass** — `mp-improve-codebase-architecture` on **codex 5.5 + Opus 4.8**; converge to the
   seams the build must respect / create.
4. **Spec → tracker** — `mp-to-prd` then `mp-to-issues`: tracer-bullet vertical slices, each independently
   grabbable, each with an objective DONE-MEANS.
5. **Build the rung as a team** (`agent-team` barbell) — orchestrator (Opus) splits the issue into worker
   CARDS (TASK/INPUT/DONE-MEANS/DO-NOT/RETURN/DEVIATIONS); Opus workers build, each own branch/scope, two
   never touch one file, orchestrator merges. Machines gate first (build/test/lint).
6. **Spawn the reviewer team** (`agent-team/references/reviewer-roles.md`) — GENERATE the reviewers from what
   the rung touches: security advisor, domain expert, architecture, correctness premortem, spec/standards —
   each a FRESH-context subagent loaded with its role charter + the skills it must USE + the diff + CONTEXT/
   ADRs, run cross-model per the table. They REJECT with reasons; they never fix. Feed findings back to the
   workers; re-review each fix; the maker never grades itself.
7. **Converge + escalate** — done only when every lens PASSES (or a finding is consciously accepted). Any
   money-path fork → build options + a recommendation, filter it once through the strongest available
   independent Claude model + codex, then
   `mp-grill-with-docs` the owner. Non-money design ambiguity the loop resolves itself (escalate only if
   reviewers diverge after ~5–10 rounds).
8. **Ship + persist + retro** — leave the PR MERGEABLE (never merge; owner merges). Update docs + ADRs +
   obsidian vault + memory. Give the owner a change report + a 5-question acceptance quiz. Retro into
   `docs/state/loop-state.md` (what shipped / what failed + why / one new brief-rule). Write a handoff so the
   owner `/clear`s and reruns.
9. **Emit the project loop** — the FIRST time loop-forge runs on a project, write a project-specific
   `<project>/.claude/skills/<name>-loop/SKILL.md` (model this on the `project-loop-template` (in `templates/`)) capturing that
   repo's inputs, landmines, ownership/merge conventions, and roadmap, so future runs are one command.
   For the full v2 install — typed agent charters, the deterministic `rung-gate.js` workflow, the STOP-door
   hook, MODELS.md, PRODUCT-INVARIANTS.md, and the cross-model verification of the installed system itself —
   follow PHASE 8 of `references/handoff-prompt.md` (templates in this repo's `templates/`).

## Guard rails
- STOP door (write it into every project loop): never merge / push to main / delete backups-wallets-DBs /
  move money / deploy — all owner-only. Uncertain → surface, don't do. Never re-open frozen contracts.
- Diseases: Blind (skill picks the work) · Tangled (own branch each) · Nodding (separate checker that
  actually rejects) · Amnesiac (state on disk) · Manual (real trigger). Caps when scheduled (per-run
  timeout, daily budget, max attempts) + a human merge gate.
- Solo when the task fits one prompt and one sitting — a team is overhead; use it only when work splits into
  independent checkable pieces with real volume.

## Copy-paste handoff for a NEW project
`references/handoff-prompt.md` — one thorough brief that runs this whole lifecycle on any repo.
