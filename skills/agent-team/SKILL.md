---
name: agent-team
description: Run a task as an AGENT TEAM instead of prompting one model — clarify unknowns with a grill/blindspot pass (grill-with-docs when the task touches a documented domain), write a four-part brief, delegate to cheap workers as isolated worker-cards, gate output through machines-then-a-fresh-context-checker, spend premium models (Fable + codex) on VERIFICATION not grunt work, and retro into a state file. Use for any task big enough to split into independent checkable pieces, or when the user wants to "run a team / orchestrate agents / brief instead of prompt / set up the verify-with-other-models workflow". Triggers: "agent-team", "run a team", "brief the team", "orchestrate this", "barbell", "checker seat", "grill me then build".
---

# Agent-team — stop prompting the worker, brief the team

The highest-leverage thing you type is a **brief**, not a prompt. You design a small org: who does what,
who checks whom, what "done" means and who's allowed to say it. Read `deep-work` for the underlying method;
this is the team mechanics on top. (Combine with `mp-grill-with-docs` for the clarify step on documented
domains — the grill IS the "make the model pull the brief out of you" move.)

## The four seats (every working team has all four)
- **Orchestrator** — the daily driver, **Opus 4.8 on high effort**. Reads the goal, splits it, writes cards,
  integrates results. NEVER does grunt work; the moment it's writing boilerplate you're burning the brain on
  intern work.
- **Workers** — **Opus 4.8 subagents** (highest intelligence; that is the doctrine here — do NOT use Haiku
  for anything that matters; Haiku is only ever acceptable for a throwaway draft of *prose*, never for code,
  reasoning, or review). Each gets ONE narrow card + its own clean context — its task, its files, its
  definition of done, not the whole plan.
- **Checker(s)** — SEPARATE agents, fresh context, zero memory of how the work was made, stricter rules; the
  only job is to REJECT weak output. This is where the **most intelligence + cross-model diversity goes:
  codex gpt-5.5 + gpt-5.4 (xhigh) AND Opus 4.8 (and Fable 5 if you have access)**.
  Different model families catch different failures — run the same review through more than one. Custom
  role-scoped reviewers (security advisor, domain expert, architecture) are spawned per build — see
  "Reviewer-team factory" below.
- **Judge** — for `/goal` runs, an agent that confirms the finish line was actually crossed by reading PROOF
  (a diff, a test result, a file list) — never a worker's "done" claim.

## Intelligence doctrine (NOT a cheap barbell — high intelligence everywhere)
The split here is **execution vs verification**, not cheap vs premium:
- Execution (plan / build / integrate): **Opus 4.8** (orchestrator + workers).
- Verification (the checker seats): **codex 5.5 + 5.4 + Opus 4.8 (and Fable 5 if available)**, fresh context,
  cross-model — always the highest intelligence, and MORE of it on the verify side because that's where the
  money-path risk lives.
- Research/premortem: Opus 4.8 subagents AND codex 5.5/5.4 — use both.
- Architecture review: run `mp-improve-codebase-architecture` on BOTH codex 5.5 AND Opus 4.8, converge.
- Never route anything important to a low-intelligence model to save tokens — correctness is the constraint,
  not cost. **Metric: cost per accepted result** — if you keep <50% of what workers hand back, the task is
  mis-scoped (split it), not "use a bigger model" (you're already on the biggest).

## Reviewer-team factory (spawn custom fresh-context reviewers per build)
Before verification, GENERATE the reviewer team from what's being built — don't reuse one generic reviewer.
For each relevant lens, spawn a fresh-context subagent whose prompt = a role charter + the exact skills it
must use + the specific diff/spec + the project's CONTEXT.md/ADRs. Standard lenses (pick what the build
touches): **security advisor** (keys/funds/auth/injection/at-most-once), **domain expert** (the protocol/
on-chain/business reality), **architecture** (`mp-improve-codebase-architecture`, run on codex 5.5 + Opus),
**correctness premortem** (`mp-codex-review` 5.5 + 5.4), **spec/standards** (`mp-review`). Each reviewer is
LOADED with the skills it needs (it invokes them itself) and its own role .md — see
`references/reviewer-roles.md`. This "create the reviewers based on the build" step is what makes the checker
seat actually thorough instead of a rubber stamp.

## The brief (four parts + the checkpoint clause)
First clarify: `Interview me one question at a time about anything ambiguous; prioritize questions where my
answer changes the plan; stop when you could write the brief yourself.` New domain → a blindspot pass (find
my unknown unknowns). For a documented project, run `mp-grill-with-docs` so the brief is grounded in the real
CONTEXT.md/ADRs and updates them inline.
Then the brief: **CONTEXT** (what/who/why) · **REQUEST** (the outcome, not the steps) · **OUTPUT FORMAT**
(exactly what lands: files, structure, naming) · **CONSTRAINTS** (tone/stack/budget/files-not-to-touch).
Plus the checkpoint clause: *"Run end-to-end, use as many subagents as the job needs. Pause for me only when
it genuinely matters — spending money, sending anything external, or a judgment only I can make. Otherwise
don't stop; show me the finished work."*

## Worker cards + the two shapes (`references/templates.md`)
Every delegated task is a card: **TASK / INPUT / DONE MEANS (objective, checkable) / DO NOT / RETURN
(<10-line summary + deliverable) / DEVIATIONS (take the conservative option, log it, keep going — never
silently improvise)**. Workers see only their card.
**Fan-out (parallel)** when subtasks don't touch each other; **pipeline (sequential)** when order matters
(each stage a fresh subagent seeing only the prior deliverable, any stage failing twice = stop+report).
**Two workers NEVER write the same file** — own folder/branch each, orchestrator merges.

## The checker discipline (`references/templates.md`)
Machines gate FIRST (tests/build/lint/word-count/link-check), the checker judges taste SECOND, you see only
what survived both. Checker prompt: "You did not write this. Grade against the SPEC only, PASS/FAIL per
requirement with one line of evidence; any FAIL fails the whole submission; a false PASS costs money; do NOT
suggest fixes — reject and state why." A checker that never rejects isn't a checker (echo chamber).

## The human gate (yours, not the team's)
Before accepting a big batch: *"Give me a short report of everything that changed + the reasoning +
deviations, then quiz me 5 questions; I only merge when I pass."* If you can't pass the quiz you don't own
the work yet. **Never auto-merge; uncertain → an inbox for you, not a PR.**

## Retro every run (compounding)
`Run a retro into STATE.md: what shipped (paths), what failed and WHY (one line each), one new brief-rule so
this failure can't repeat. <15 lines. Tomorrow reads this first.`

## When a team is a MISTAKE
If the task fits one prompt and one sitting, one model does it faster + cheaper. Teams pay off only when the
work splits into independent pieces, "done" is checkable, and the volume is real. Below that bar, stay solo.

## Failure modes to design against
Echo chamber (no/soft checker) · early victory lap (claims not deliverables — every "done" ships a diff/test/
file) · token fire (workers get narrow slices, only the orchestrator holds the map) · same-file collision
(own branches) · the team that shouldn't exist (solo instead).

Copy-paste kickoff for any project: `references/prompt.md`. Order: run it by HAND once, then delegate, then
schedule — teams that skip to "scheduled" blow up at 2am.
