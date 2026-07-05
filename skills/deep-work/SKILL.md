---
name: deep-work
description: Operating manual for hard, multi-step engineering work — how to decompose a big task, verify your own output before reporting, keep context lean, and decide what to do next vs escalate. Read this at the START of any substantial task (a review, a migration, a build spanning many files, a design, an audit, anything that would take a human days). Distilled from Fable 5's working method so a daily model (Opus 4.8) inherits it. Triggers: any complex/multi-step/ambiguous engineering task; "decompose this", "how should I approach", the start of a build/review/audit/design rung.
---

# Deep work — decompose, verify, decide

The job is judgment, not typing. Generation is cheap; what stays scarce is deciding which plan is
right, which claim is actually true, and which line to stop on. Optimize for that.

## 1. Decompose — fan out, don't grind
- Break the task into **independent workstreams** and run them in parallel (subagents / models), not one
  serial pass through a single context. Layered work converges faster: map ground-truth → specialist
  passes → adversarial premortem → converge. Finish and reconcile one layer before the next.
- Give each subagent a **sharp role + the exact files + a concrete deliverable shape** (a schema, a ranked
  list, file:line evidence). Vague fan-out returns mush.
- Use **diverse lenses** for anything high-stakes: different models/prompts catch different failures
  (correctness vs security vs architecture vs on-chain reality). Redundant identical reviewers waste the run.
- One big brief beats twenty messages: put the full context, constraints, and edge cases up front and let
  the decomposition happen once.

## 2. Verify — trust nothing until you've checked it yourself
- **Independently confirm the load-bearing facts** with your own tools before building on them — including
  facts stated in the handoff, the memory, or a subagent's report. Memory and docs go stale; a cited
  file:line may have moved; a "known fact" may be imprecise. Grep the real code, run the real command,
  read the real row. (A "load-bearing fact" stated in a handoff is often subtly wrong — caught only by
  checking the actual code, not by trusting the summary.)
- **Verify behavior, not intent.** "The code looks right" and "I ran it and observed X" are different
  universes. Drive the flow, read the output, check the on-chain/DB truth — don't vibe-check a diff.
- **Adversarial by default.** A premortem that finds nothing is a failed premortem. Before reporting "done",
  try to break it. Before presenting a recommendation, run it once through a skeptical independent reviewer
  ("in THIS scenario is this actually the best option?").
- **Grade with a different agent than the one who wrote it.** An author's context is full of the argument
  for their own output; they read the argument, not the result. Structural separation (maker ≠ checker),
  default skepticism, judge-by-action — not better wording.

## 3. Keep context lean — state on disk, not in the window
- Write findings to a **synthesis file as you go** (`SYNTHESIS.md`, a state table, the ADR). Don't hold the
  whole investigation in the window — it's memory that survives a `/clear`; the window is scratch.
- **Push heavy work off-thread.** Run reviews/searches as subagents and pull back only verdicts + blockers,
  never full transcripts. The main thread stays architectural.
- Watch the budget: past ~100k tokens quality degrades. On long work, cut at a clean seam, write the
  handoff, continue fresh — don't drift into the dumb zone.

## 4. Decide — act on what you have; escalate only what's genuinely not yours
- **When you have enough to act, act.** Don't re-derive settled facts, re-litigate decided calls, or
  narrate options you won't take. Give a recommendation, not a survey.
- **Converge to the minimal set of real decisions.** Collapse a hundred findings into the ≤5 that actually
  need a human, each with a recommended answer. Everything else you resolve.
- **Escalate only the genuinely-owner calls** (money paths, irreversible/outward-facing actions, product
  direction). For those: build the options + a recommendation, filter it through an independent model, then
  ask — with the recommendation, not an open-ended question. Decide the rest yourself and move.
- **Report faithfully.** If a test failed, say so with the output. If you deferred something, say that. If
  it's verified, say it plainly without hedging. Never rubber-stamp your own work.

## 5. Guard rails (the loop diseases — apply even outside a formal loop)
- **Blind** — automating the doing but not the choosing. Let the work-selection live in the skill/plan, not
  in you re-assigning it each time.
- **Nodding** — self-approval. Separate the checker (see §2).
- **Amnesiac** — state only in context. Write it to disk (see §3).
- **Tangled** — parallel agents colliding in one workspace. Isolate (own worktree/scope per agent).
- **Manual** — built but never actually runs itself. Hang it on a real trigger.

Bring understanding and the tools amplify understanding; bring laziness and they amplify laziness. Stay the
engineer — build the loop like someone who intends to keep reading the code, not become its caretaker.
