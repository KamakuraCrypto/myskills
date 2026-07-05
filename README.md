# myskills — an agent-team workflow lifecycle for Claude Code

A portable set of [Claude Code](https://claude.com/claude-code) **skills** that turn a single chat model into
a small engineering **org**: it clarifies what you actually want, plans it, builds it with a team of
subagents, has *different* high-intelligence models verify the work with fresh eyes, and ships you reviewed,
mergeable results — then remembers what it learned for next time.

It's built around one shift the best builders made in 2026:

> for two years the edge was the prompt. then it was the loop. now it's the **org chart**.
> everyone has the same model. the difference between shipping 40 PRs a day and arguing with a chatbot is
> that one person stopped being an employee and became a manager.

You don't prompt harder here. You **brief a team** and design who checks whom.

---

## Quickstart

```bash
# 1. clone
git clone https://github.com/<you>/myskills ~/myskills

# 2. install the skills (Claude Code auto-discovers ~/.claude/skills/*)
cp -r ~/myskills/skills/* ~/.claude/skills/

# 3. (optional) per-project loop: copy the template into a repo and fill the <...> slots
cp -r ~/myskills/templates/project-loop-template <your-repo>/.claude/skills/<project>-loop
```

Then, in any repo, on your strongest model (Opus 4.8, high effort): paste **The one-run brief** below, or say
*"deep-scan this repo"*, *"run a team on this"*, or *"engineer a loop for this project"*.

---

## The one-run brief — "improve my codebase and my way of working, once"

Open a session **in your repo, on your most capable model** (Opus 4.8 recommended, high effort). Fill the
`<...>` slots and paste the whole thing. In one run it will understand the repo, grill you into a real spec,
review the architecture with two model families, plan the work, build it as a team, verify it with a custom
cross-model reviewer team, ship you mergeable results, and leave behind a reusable project loop so you never
write this brief again.

> You are the **ORCHESTRATOR** of an agent team improving `<PROJECT NAME>` at `<ABSOLUTE REPO PATH>` (stack:
> `<STACK, or "detect it">`; domain: `<DOMAIN>`). Read the skills **`deep-work`, `agent-team`** (+ its
> `references/reviewer-roles.md` and `templates.md`), **`deep-scan`, `loop-forge`** FIRST, then run their
> lifecycle. Your goal this session: `<ONE objective, checkable outcome — e.g. "the first working <feature>
> merged and verified", or "a prioritized improvement plan + the top 3 fixes shipped">`.
>
> **MODEL DOCTRINE — highest intelligence everywhere, MORE on verification (do not deviate).** Execution (you
> as orchestrator + every worker subagent) = **Opus 4.8**; workers are Opus subagents — NEVER route code,
> reasoning, or review to a low-intelligence model to save tokens (a cheap model is only ever acceptable for a
> throwaway prose draft). Verification (the reviewer seats) = **codex gpt-5.5 + gpt-5.4 at xhigh + Opus 4.8,
> plus Fable 5 if you have access** — fresh context, cross-model, because different model families catch
> different failures; put MORE intelligence on the verify side than the make side. Architecture review runs on
> **both codex 5.5 AND Opus**. Correctness is the constraint, not cost.
>
> **PHASE 0 — UNDERSTAND** (skip only if the repo already has a current CONTEXT.md + ADRs). Run a `deep-scan`:
> fan out read-only Opus subagents + codex to produce a **BUILT / DESIGNED / TARGET** map with `file:line`
> evidence, list **every place the docs disagree with the code**, verify the load-bearing facts yourself
> (don't trust a summary), and state plainly **what works end-to-end today**. If the domain has ground truth
> (on-chain, an external API, a spec), check claims against reality, not plausibility. Report a crisp synthesis
> before moving on.
>
> **PHASE 1 — CLARIFY + GRILL** (I'm in the loop here). Run `mp-grill-with-docs`: interview me **one question
> at a time** about anything ambiguous, prioritizing questions whose answer would change the plan; if this area
> is new to me, do a **blindspot pass** first (surface my unknown unknowns). Stress the plan against the
> existing domain model, sharpen terminology, and **update `CONTEXT.md` + `docs/adr/` inline** as decisions
> crystallize (a glossary stays a glossary; decisions become ADRs; don't rewrite an Accepted ADR body
> standalone — fold fixes into the build). Stop when you could write the brief yourself, then hand me a locked
> **four-part brief**: CONTEXT (what/who/why) · REQUEST (the outcome, not the steps) · OUTPUT FORMAT (exact
> files/structure/naming) · CONSTRAINTS (stack/tone/budget/files you may not touch).
>
> **PHASE 2 — ARCHITECTURE.** Run `mp-improve-codebase-architecture` on **codex 5.5 AND Opus 4.8**; converge to
> one ranked list of the seams the work must respect or create, the coupling/testability risks, and the honest
> **over-engineering to avoid**. Sets the shape before any code.
>
> **PHASE 3 — SPEC → TRACKER.** Run `mp-to-prd` (turn the brief into a PRD), then `mp-to-issues` (break it into
> **tracer-bullet vertical slices** — each independently grabbable, each with an objective, checkable
> DONE-MEANS). This is the ladder the loop executes.
>
> **PHASE 4 — BUILD AS A TEAM** (you never do grunt work). Take the next unblocked slice. Split it into worker
> **CARDS** — TASK / INPUT (exact files, nothing else) / DONE-MEANS (objective, checkable) / DO-NOT (files not
> to touch, decisions not to make alone) / RETURN (<10-line summary + deliverable) / DEVIATIONS (take the
> **conservative** option, log it, keep going — never silently improvise). Spawn **Opus workers**, one card
> each, own context, own branch/scope; **two workers NEVER write the same file** — you integrate/merge. Use
> **fan-out** for independent slices, **pipeline** (fresh subagent per stage, sees only the prior deliverable,
> fails-twice = stop) when order matters. Machines gate first: build + tests + lint.
>
> **PHASE 5 — CUSTOM REVIEWER TEAM** (the part that makes it thorough). Do NOT reuse one generic reviewer.
> Look at what this slice touches and **generate the reviewer team** from
> `agent-team/references/reviewer-roles.md`, each a **fresh-context subagent** whose prompt = a role charter +
> the exact skills it must USE + the diff/spec + `CONTEXT.md`/relevant ADRs, run cross-model: **security
> advisor** (Opus + Fable — assume BROKEN until proven safe: keys/funds/auth/injection/at-most-once/permission
> bypass), **domain expert** (Opus + codex — judge vs real mechanics + ground truth, parity gaps), **architecture**
> (`mp-improve-codebase-architecture`, codex 5.5 + Opus), **correctness premortem** (`mp-codex-review` 5.5 + 5.4,
> xhigh — converge to 0 blockers), **spec/standards** (`mp-review` since the merge-base). Each returns ranked
> findings {severity | what | file:line | failure/exploit scenario | fix} + PASS/REJECT against the spec. They
> **reject with reasons; they do NOT fix.** A checker that never rejects isn't reviewing — if every lens passes
> a risky diff first try, double-check, don't rubber-stamp.
>
> **PHASE 6 — CONVERGE + ESCALATE.** Feed reviewer findings back to the workers; re-review each fix; **the maker
> never grades itself.** Done only when every lens PASSES (or a finding is consciously accepted). Any
> **money-path / irreversible / security-critical fork**: build the options + a recommendation, **filter it once
> through Fable + codex** ("is this actually the best option here?"), then escalate to me with
> `mp-grill-with-docs` — options + recommendation, my call. Non-money design ambiguity: resolve it yourself;
> escalate only if reviewers still diverge after ~5–10 rounds. **Never proceed on a money-path guess.**
>
> **PHASE 7 — SHIP + PERSIST + RETRO.** Leave the PR **MERGEABLE** — do NOT merge; I merge every rung. Update
> docs + ADRs + memory. Give me a **change report** (what changed + reasoning + deviations) and **quiz me 5
> questions** on it — I only accept when I pass (if I can't, walk me through it). Retro into
> `docs/state/loop-state.md`: what shipped (PR + paths), what failed and WHY (one line each), one new brief-rule
> so it can't repeat — next run reads it first. Write a handoff so I `/clear` + rerun.
>
> **PHASE 8 — EMIT THE PROJECT LOOP** (first run only). Write `<REPO>/.claude/skills/<project>-loop/SKILL.md`
> (start from `templates/project-loop-template`): capture this repo's inputs (roadmap/PRD paths), landmines,
> ownership/merge/build conventions, the model doctrine above, the reviewer-team factory, and the STOP door —
> so future rungs are one command: `/loop /<project>-loop`.
>
> **CHECKPOINT CLAUSE + STOP DOOR.** Run end-to-end, spawn as many Opus subagents as the job needs. Pause for me
> ONLY when it genuinely matters: spending money, sending anything external, an irreversible/destructive action,
> a money-path fork, or a judgment only I can make. Otherwise don't stop; show me finished, verified work. You
> must **NEVER**: merge, push to main, delete backups/keys/DBs, move funds, deploy, or proceed on a money-path
> guess — anything uncertain → surface it, don't do it. Watch **cost per accepted result**: if I'm keeping under
> half of what the team hands back, the slice is mis-scoped — split it, don't grind. Report a crisp synthesis
> between phases; when you have enough to act, act — recommend, don't survey. Begin with Phase 0 (or Phase 1 if
> the repo is already mapped).

**Lighter variants:** *just understand a repo* → Phase 0 only. *Just review a diff* → Phase 5 only (spawn the
reviewer team on a branch). *Already set up* → `/loop /<project>-loop` runs the whole thing per rung.

---

## What's in here — the skills, explained

### The method + team layer (the new part)
| Skill | What it is |
|---|---|
| **`deep-work`** | The operating manual for hard, multi-step work: decompose (fan out, don't grind) → verify your OWN output before reporting (trust nothing, including handoffs/memory, until you check the real code) → keep context lean (state on disk, reviews off-thread) → decide (act on enough; converge to ≤5 real decisions; escalate only genuinely-owner calls). Read at the start of any big task; every other skill builds on it. |
| **`agent-team`** | The **org chart**: the four seats (orchestrator / workers / checker / judge), the model doctrine (high intelligence everywhere; more on verification), the four-part **brief**, worker **cards**, fan-out vs pipeline, the fresh-context checker discipline (machines gate first, reject-don't-fix), the accept-rate metric, the pre-merge acceptance quiz, and the **reviewer-team factory** (`references/reviewer-roles.md`) that spawns custom security/domain/architecture/correctness/spec reviewers per build. |
| **`deep-scan`** | Point it at any repo/folder → a multi-model fleet maps BUILT/DESIGNED/TARGET, checks the design against the actual code (domain + architecture + adversarial premortem), reconciles CONTEXT.md + ADRs, converges to ≤5 owner decisions + a roadmap, and **authors skills from the decisions**. This is Phase 0–1 as a standalone. |
| **`loop-forge`** | The master lifecycle that ties it all together (grill → architecture → PRD → issues → team build → cross-model reviewer team → converge → ship → retro) and **emits a project-specific loop skill**. The one-run brief above is its handoff prompt. |

### The verification engine (premortem loops)
| Skill | What it is |
|---|---|
| **`codex-review`** | Have OpenAI **codex** (gpt-5.5 + gpt-5.4, xhigh) premortem a plan in parallel until both converge — a second model family, deterministic, read-only. |
| **`codex-review-full`** | Same, with full shell access so codex verifies the plan against the *actual* codebase. |
| **`codex-architecture-review`** | Dual-codex architecture-improvement pass — deepening opportunities, real seams, testability — converged into one ranked list. |
| **`mp-codex-review`** | Subagent-safe variant (foreground parallel calls) so a reviewer subagent doesn't exit before codex finishes. |

### The Matt Pocock toolkit (`mp-*`)
The `mp-*` skills are authored by **[Matt Pocock](https://github.com/mattpocock)** and included here as a
directory (credit + thanks to him). Highlights the lifecycle uses: **`mp-grill-me` / `mp-grill-with-docs`**
(interview you into a real spec, update docs inline), **`mp-improve-codebase-architecture`** (find deepening
opportunities), **`mp-to-prd` / `mp-to-issues`** (spec → tracer-bullet issues), **`mp-review`** (standards +
spec review), **`mp-4model-gate`** (heavyweight PR gate), **`mp-repo-audit`**, **`mp-tdd`**,
**`mp-diagnose`**, **`mp-handoff`**, **`mp-write-a-skill`**, plus writing/productivity skills. See each
skill's `SKILL.md` for its own trigger + usage.

### Template
`templates/project-loop-template/` — a generic, un-tied project loop. Copy into `<repo>/.claude/skills/`, fill
the `<...>` slots, and you have a one-command autonomous builder for that repo.

---

## The lifecycle at a glance

```
understand → grill → architecture → PRD → issues → BUILD (team) → REVIEW (cross-model) → converge → ship → retro
  deep-scan   grill    improve-arch   to-prd  to-issues  agent-team   reviewer-factory    escalate   PR    STATE.md
                                                          (Opus)       (codex+Opus+Fable)  money→you   (you merge)
```

## Model doctrine (why "high intelligence everywhere")
The generic "barbell" says use a cheap model for the volume. This repo **inverts** that for engineering: use
the strongest model to **execute** (Opus 4.8 orchestrator + workers) and *even more* intelligence to **verify**
(codex 5.5 + 5.4 + Opus + Fable, fresh context, cross-model) — because on real code the risk lives in the
verification, and a false PASS costs more than a slow review. Never route code, reasoning, or review to a
low-intelligence model to save tokens; if you're keeping under half of what the team produces, the task is
mis-scoped, not under-powered.

## The canon it's built on (Loop Engineering)
Every turn of a loop has five moves — **Discovery** (a skill decides what's worth doing, not you) → **Handoff**
(isolate: one branch/scope per agent) → **Verification** (a *separate* adversarial reviewer that actually says
"no" — self-grading is structurally broken) → **Persistence** (state on disk, not context) → **Scheduling** (a
real trigger + caps + a human door). Guard against the five diseases: **Blind** (automating the doing but not
the choosing), **Tangled** (agents colliding in one workspace), **Nodding** (self-approval), **Amnesiac**
(state only in context), **Manual** (built but never actually runs). And the four debts: verification debt,
comprehension rot, cognitive surrender, token blowout. Build the loop like someone who intends to **stay the
engineer** — read one sample diff a day; if you can't explain it, your map has fallen behind.

## When a team is a mistake
If the task fits in one prompt and one sitting, one model does it faster and cheaper. Teams pay off only when
the work splits into independent, checkable pieces with real volume. Below that bar, stay solo.

---

## Credits & license
- `mp-*` skills © **Matt Pocock** — included as a directory with thanks; see his work for canonical versions.
- `codex-*` skills wrap the OpenAI **codex** CLI as a second-opinion reviewer.
- `deep-work`, `deep-scan`, `agent-team`, `loop-forge`, and the template are original to this repo.
- Loop-engineering framing distilled from the June 2026 discourse (Steinberger, Ng, Osmani) and community
  field guides.

Use freely. If you extend it, keep the STOP door and the separate checker — they're what make it safe.
