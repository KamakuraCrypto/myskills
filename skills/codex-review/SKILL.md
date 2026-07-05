---
name: codex-review
description: Use when Claude has written a plan and the user wants codex to premortem it — by default runs gpt-5.5 and gpt-5.4 at xhigh reasoning in parallel, iterates until both converge. Also supports single-shot codex runs, resume, and edit/network sandboxes as escape hatches.
---

# codex-review

A skill for handing a plan that Claude just wrote over to `codex exec` for a structured **premortem** — finding everything that could plausibly go wrong before any code is written — and looping until two independent codex models agree the plan is shippable.

> **Sibling skill:** `/codex-review-full` runs the same loop with full shell access (codex can read anything, run tests, follow imports, exercise scripts) bounded by a strict prompt-level destructive-op prohibition. Use that one when ground-truth verification against the actual codebase matters more than speed or determinism. The skills are exclusive — pick one per review run.

## When to use this

The trigger is a plan, not a question. If the user has been planning with Claude and says something like "have codex check this", "premortem this", "verify the plan with codex", or just "/codex-review" — this is the skill.

Out of scope: open-ended chat with codex, code generation as the primary goal, anything that isn't reviewing a written plan. Those still work (see **Escape hatches** below) but they aren't the default flow.

## The default flow: dual premortem

The premise is that one model's verdict has blind spots. Two different models, run in parallel on the same input, surface a wider failure-mode set than either alone. The loop ends when both agree.

### Step 1 — bundle inputs into a single stdin payload

Build one text blob containing:

1. The premortem framing prompt (template below).
2. The full plan text.
3. Inlined contents of any source files the plan touches, each preceded by a `=== FILE: <path> ===` marker.

**Do this every time** — even when the plan refers to files codex could read on its own. Codex's bwrap sandbox has known failure modes (especially on gpt-5.5) where any internal filesystem access throws a loopback error and the run exits with no usable output. Pre-inlining everything sidesteps the whole class of failure.

### Step 2 — fire two `codex exec` calls in parallel

Both via `Bash` with `run_in_background: true`, both fed the same stdin payload:

```bash
cat <bundle> | codex exec \
  -m gpt-5.5 \
  --config model_reasoning_effort="xhigh" \
  --sandbox read-only \
  --skip-git-repo-check
```

```bash
cat <bundle> | codex exec \
  -m gpt-5.4 \
  --config model_reasoning_effort="xhigh" \
  --sandbox read-only \
  --skip-git-repo-check
```

**Do not append `2>/dev/null` on review runs.** Bwrap sandbox failures only show up on stderr. The chatty thinking-token suppression that's nice on edit runs hides the exact diagnostic you need on reviews, and the symptom is "tool finished, output is blank" — burning a round for no reason.

### Step 3 — the premortem prompt

Put this verbatim at the top of the bundle:

```
You are running a PREMORTEM on a plan written by another AI (Claude).

Assume the plan has been carried out and the result was a failure. Your job is to
enumerate every plausible cause of that failure — concrete, traceable to a section
or claim in the plan, not generic.

For each finding, tag it with exactly one severity:

  BLOCKER     — would ship broken, unsafe, or fundamentally wrong; must not merge.
  SHOULD-FIX  — real risk that a careful code review would catch; not a blocker.
  NIT         — phrasing, naming, ordering, style. Never promote a NIT to a BLOCKER.

Be strict about the distinction. Over-tagging BLOCKERs wastes iteration rounds.

End your response with one of these verdict lines, exactly:

  SHIPPABLE: yes
  SHIPPABLE: conditional <0-10> — <one-line condition>
  SHIPPABLE: no — <one-line reason>

Then on the next line:

  RECOMMENDATION: <one-line: of the realistic paths forward, which should Claude take?>

Then, if applicable, two optional sections:

QUESTIONS (zero or more — only when a structural decision in the plan is genuinely
ambiguous and a wrong guess would invalidate large parts of the plan; leave empty
otherwise — do NOT fish for questions):
  - Q: <one-line question the user can answer with a sentence>
    why: <one-line: what hinges on the answer; which sections of the plan change either way>

OVERLAP NOTE (only include this if a PRIOR ROUND section is present below):
Compare your findings above to the prior round. Choose exactly one:
  OVERLAP: new      — most findings are new or escalated since last round.
  OVERLAP: mixed    — some new, some restatements.
  OVERLAP: repeat   — findings mostly restate prior round; the plan isn't moving.

=== PLAN ===
<plan text inlined here>

=== RELEVANT CODE ===
<each touched file inlined here, separated by === FILE: <path> ===>

=== PRIOR ROUND ===  (only present on round ≥ 2)
<combined transcript of the previous round's two codex outputs>
```

### Step 4 — wait for both

Wait via the background-completion notification mechanism. Do not poll. Do not sleep.

Read both transcripts. Before deciding convergence, walk through Steps 4a and 4b.

### Step 4a — surface codex's questions to the user

Some findings are actually design ambiguities, not defects. If you fold them as if they were defects, the next round will re-raise the same ambiguity in different words. Instead:

1. Parse each transcript for the `QUESTIONS:` section.
2. Dedupe across the two transcripts — both models often raise the same question in slightly different wording; collapse those.
3. If any survive, **halt the loop here** — do not start the next round yet.
4. Forward the questions to the user via `AskUserQuestion`. Up to 4 per call (the tool's hard cap); if there are more, batch them, most consequential first. For each question, derive 2–4 plausible options from codex's `why` line and what you know about the plan. Mark the safest/most likely default `(Recommended)` and put it first.
5. Fold the user's answers into the plan as **decisions** (not as TODOs), then resume with the next round.

This is the same popup → answer → replan loop Claude uses inside plan mode — the only difference is that codex is the source of the questions, not Claude's own uncertainty. The user is the tiebreaker on structural calls.

### Step 4b — detect oscillation (rounds ≥ 2)

From round 2 onwards, each transcript carries an `OVERLAP:` line. Combine the two:

- both `new` → progressing normally; continue to Step 4c.
- one `new` + one `mixed` → progressing; continue.
- both `mixed` → **drifting.** On round 3, warn the user. On round 4, halt and ask them whether to keep going or cut scope.
- either `repeat` → **stuck.** Halt immediately regardless of round number — the next round will produce more restatements, not progress.

When you halt for drift or stuck, surface it explicitly: list the findings that keep recurring, say "the loop is not converging — it's restating," and use `AskUserQuestion` to offer (a) keep iterating, (b) cut scope (recommended), (c) ship as-is with known caveats.

### Step 4c — converge or iterate

If you got here, neither questions nor oscillation halted the loop. Now apply the convergence check:

**Converged** when EITHER:

- both transcripts end with `SHIPPABLE: yes`, OR
- both end with `SHIPPABLE: conditional N` where N ≥ 7, AND neither raised a BLOCKER that wasn't present (and unresolved) in the previous round. Renamed or rephrased NITs don't count as new findings.

**Not converged** otherwise. Take the union of BLOCKERs and SHOULD-FIXes from both runs, present them to the user (grouped, deduped), fold the agreed fixes into the plan, then run another round.

### Step 5 — the 5-round ceiling

The early-halt paths in 4a and 4b handle most degenerate cases. The 5-round ceiling is the hard backstop for the residual case where models keep returning `mixed` overlap and conditional verdicts without ever escalating to `repeat`. If you've run **5 full rounds** and still haven't converged, stop and tell the user the plan is probably over-engineered for what it's trying to do — recommend cutting scope rather than adding more guardrails. Past experience: a plan that took 9 rounds before being scaled back to advisory-only could have been scaled back at round 3 and saved everyone the cycles.

## Escape hatches

These are the non-default paths. They keep the skill useful when the user isn't doing a plan premortem.

### Single-model review

If the user wants only one model (cost, time, deliberate single-voice opinion), drop the parallel launch and run one of the two commands above. Everything else — stdin bundling, no-stderr-suppression, the premortem prompt, the convergence check — still applies, just with N=1.

### Codex needs to edit files or hit the network

Switch `--sandbox` to `workspace-write` for local edits, or `danger-full-access` for network or broad access. Before using `danger-full-access` or `--full-auto`, confirm once with the user via `AskUserQuestion`. If they've already authorized it for this run ("full access", "let codex edit", "no read-only", etc.), don't ask again.

### Resume a prior session

```bash
echo "<follow-up prompt>" | codex exec --skip-git-repo-check resume --last
```

No flags between `resume` and `--last`. Model, reasoning effort, and sandbox are inherited from the resumed session. If the user wants different settings, start a new session instead.

### Non-plan codex tasks

If the user asks codex to do something that isn't reviewing a plan — write a function, explain code, refactor — skip the premortem framing entirely and pass their prompt through as-is. The bundling-via-stdin discipline still helps avoid sandbox issues, but the verdict-line / convergence machinery is irrelevant.

## Reading codex output critically

Codex runs on OpenAI models. They have a knowledge cutoff and they can be confidently wrong about recent APIs, model names, library versions, or anything that changed after their training. When codex contradicts something you (Claude) can verify directly — current repo state, web search, official docs — say so. Frame it as a peer disagreement, not a correction; either side might be wrong. If it matters, resume the codex session and surface the disagreement explicitly:

```bash
echo "Following up as Claude (<your model id>). I think you're wrong about X because <evidence>. Worth reconsidering?" \
  | codex exec --skip-git-repo-check resume --last
```

Then let the user decide between the two readings.

## Common pitfalls

These are the failures that actually keep happening. Watch for them.

- **bwrap loopback (gpt-5.5 especially).** Symptom: codex exits 0, stdout is blank or near-blank. Cause: codex tried to read a file inside its sandbox and bwrap denied it. Fix: rebundle everything via stdin so codex never has to touch the filesystem. Switching `--sandbox` modes does **not** fix this — the failure is in how the bwrap container is set up, not in the flag.
- **Stderr suppression on reviews.** `2>/dev/null` is fine for chatty edit runs where thinking tokens are noise. On review runs it hides the bwrap diagnostic and you'll waste a round wondering why output is empty.
- **Re-asking model / effort every invocation.** The defaults are settled: dual gpt-5.5 + gpt-5.4 at xhigh for review. Only prompt the user when they explicitly want something else.
- **Re-asking permission mid-loop.** If the user authorized `danger-full-access` for round 1, it stands for the whole convergence loop. Don't re-prompt every round.
- **Promoting NITs to BLOCKERs across rounds.** If both models keep flagging the same wording issue, fold it once and move on — don't let it drive another iteration.
- **Counting rounds wrong.** A round is one parallel pair, not one model run. Five rounds = ten codex invocations total.
- **Folding codex's questions as if they were defects.** When codex asks "should X be sync or async?", the right move is `AskUserQuestion` — not picking one and pretending it's settled. Settled-by-Claude answers tend to get re-raised in the next round in different wording, and the plan slowly drifts away from the user's actual intent.
- **Looping on `repeat` overlap hoping it resolves.** If both models say this round restates the last, more rounds won't help. Stop and re-scope.

## Quick reference

| Situation                         | Command shape                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Default dual premortem (per model) | `cat bundle.txt \| codex exec -m gpt-5.5 --config model_reasoning_effort="xhigh" --sandbox read-only --skip-git-repo-check` |
| Codex edits files                 | add `--sandbox workspace-write --full-auto`                                                            |
| Codex needs network               | add `--sandbox danger-full-access --full-auto` (ask once)                                              |
| Resume prior session              | `echo "..." \| codex exec --skip-git-repo-check resume --last`                                         |
| Different working directory       | add `-C <dir>`                                                                                         |
