---
name: codex-review-full
description: Use when Claude has written a plan and the user wants codex to verify it against the actual codebase — runs gpt-5.6-sol and gpt-5.5 at xhigh reasoning in parallel with full shell access, iterates until both converge. Strict prompt-level prohibition on destructive operations. Prefer `/codex-review` for fast, deterministic reviews that don't need ground-truth checks.
---

# codex-review-full

A deeper sibling of `/codex-review`. Same dual-codex premortem loop, same convergence machinery — but codex runs with full shell access (read anything, run tests, follow imports, exercise scripts) bounded by a strict prompt-level rule against destroying work. Use this when verification against the actual codebase matters more than speed or determinism.

> **Sibling skill:** `/codex-review` does the same loop with codex pinned to `--sandbox read-only` and the plan piped via stdin. Use that one when speed, reproducibility, or working with sensitive files matters more than ground-truth verification. The skills are exclusive — pick one per review run.

## When to use this

The trigger is a plan that makes specific, checkable claims about the codebase — function names, file paths, library versions, expected test behavior, side effects of touching X. If the user wants codex to *actually verify* those claims (not just reason about the plan in isolation), this is the skill.

Phrasings that should fire it: "have codex check this against the code", "verify the plan against the repo", "deep review", "full check", "/codex-review-full".

Phrasings that should fire `/codex-review` instead: "premortem this", "have codex check this", "/codex-review" — those are the plan-only flow. When in doubt, default to `/codex-review` for speed and switch to this skill on follow-up if the review missed something verifiable.

Out of scope: open-ended chat with codex, code generation, anything that isn't a plan review. See **Escape hatches** for those.

## The default flow: dual premortem

The premise is that one model's verdict has blind spots. Two different models, run in parallel on the same input, surface a wider failure-mode set than either alone. The loop ends when both agree.

### Step 1 — assemble the input bundle

Build a stdin payload containing:

1. The premortem framing prompt (template below, including the `SHELL ACCESS RULES` block).
2. The full plan text.
3. Optionally, a few anchor files — the ones the plan references most heavily — inlined under `=== FILE: <path> ===` markers. This is a hint, not a constraint; codex is expected to fetch the rest from disk itself. Don't try to inline the whole project.

Why this is different from `/codex-review`: in the read-only sibling skill, the stdin bundle is the *only* source codex has. Here it's the *starting* source — codex can and should follow it into the rest of the codebase via the shell.

### Step 2 — fire two `codex exec` calls in parallel

Both via `Bash` with `run_in_background: true`, both fed the same stdin payload. Set `-C` to the repo root the plan is about (fall back to `pwd` if there's no specific repo):

```bash
cat <bundle> | codex exec \
  -m gpt-5.6-sol \
  --config model_reasoning_effort="xhigh" \
  --sandbox danger-full-access \
  --full-auto \
  -C <repo root> \
  --skip-git-repo-check
```

```bash
cat <bundle> | codex exec \
  -m gpt-5.5 \
  --config model_reasoning_effort="xhigh" \
  --sandbox danger-full-access \
  --full-auto \
  -C <repo root> \
  --skip-git-repo-check
```

`--sandbox danger-full-access` opens read/write/network everywhere; `--full-auto` skips per-command approval prompts. The destructive-op boundary is enforced **only** by the prompt-level `SHELL ACCESS RULES` block — there is no sandbox-level filter for "no `rm`". That trust model is the deliberate trade-off of this skill.

**Do not append `2>/dev/null` on review runs.** Bwrap sandbox failures only show up on stderr. The chatty thinking-token suppression that's nice on edit runs hides the exact diagnostic you need on reviews, and the symptom is "tool finished, output is blank" — burning a round for no reason.

### Step 3 — the premortem prompt

Put this verbatim at the top of the bundle:

```
You are running a PREMORTEM on a plan written by another AI (Claude).

Assume the plan has been carried out and the result was a failure. Identify the
plausible causes — concrete, traceable to a section or claim in the plan, not
generic.

Your output must be tight. Return only the three sections below, in order, with
nothing else (no preamble, no narration, no other findings categories — only
these three plus the optional OVERLAP line at the very end):

BLOCKERS (zero or more — each one independently would ship broken, unsafe, or
fundamentally wrong; the plan must not merge while any blocker stands. Be strict:
real risks only, no nits, no wording, no "consider also …" items):
  - <one-line description; reference the plan section it traces to>
  - <one-line description; …>

CONFIDENCE: <0-10>
  reasoning: <one-line: what would have to be true for this to be wrong>

QUESTIONS (zero or more — structural decisions in the plan that are genuinely
ambiguous; a wrong guess would invalidate substantial parts of the plan. The
orchestrator will route these to the user. Do NOT use this channel for items
that should just be blockers; do NOT fish for questions when none are real):
  - Q: <one-line question the user can answer with a sentence>
    why: <one-line: what hinges on the answer>

OVERLAP (only when a PRIOR ROUND section is present below):
Compare your blockers above to the prior round's blockers. Choose exactly one:
  OVERLAP: new      — most blockers are new or escalated since last round.
  OVERLAP: mixed    — some new, some restatements.
  OVERLAP: repeat   — blockers mostly restate prior round; the plan isn't moving.

Anything outside these sections — should-fixes, nits, style notes, suggestions,
encouragement, summaries — should be omitted. Either it's a blocker, a question,
or it doesn't go in the report.

=== SHELL ACCESS RULES ===
You have full shell access (read, write, network) to verify your findings:
read source files beyond what's inlined below, run tests, check imports,
exercise scripts, install dev dependencies into a scratch directory if you
need them. Use this access — that's why this review is running in the
full-access variant.

You are NOT permitted to run any of the following — they destroy the user's
work and are out of scope for a review:

  - rm, rmdir, unlink, shred, srm, or any other delete command (any flag, any path)
  - git reset --hard, git checkout -- ., git clean -fd, git restore .
  - git push --force, git push -f, git push --force-with-lease, any git push
  - git branch -D, git tag -d, git update-ref -d, git reflog expire
  - DROP TABLE, DROP DATABASE, DROP SCHEMA, TRUNCATE, DELETE FROM ... (no WHERE)
  - kill / pkill / killall against processes you did not start yourself
  - any > or >> redirection that overwrites a tracked file (check with `git ls-files`);
    use /tmp/scratch-codex/ for any writes you need to do
  - any command intended to disable, bypass, or uninstall security tooling
    (chmod -x on protections, removing pre-commit hooks, etc.)
  - chmod / chown that escalates privileges or changes ownership of project files

If a check seems to require one of the above, STOP and call it out as a
finding — do not execute it. The user can decide whether to run it themselves
afterwards. "I couldn't verify X because the check requires Y, which is
prohibited" is a perfectly fine finding.

You may freely write under /tmp/. You may read anything. Network is allowed.

=== PLAN ===
<plan text inlined here>

=== RELEVANT CODE (anchor files only — read others from disk as needed) ===
<each anchor file inlined here, separated by === FILE: <path> ===>

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

From round 2 onwards, each transcript carries an `OVERLAP:` line comparing this round's *blockers* to the prior round's. Combine the two:

- both `new` → progressing normally; continue to Step 4c.
- one `new` + one `mixed` → progressing; continue.
- both `mixed` → **drifting.** On round 3, log it silently and continue. On round 4, halt and ask the user whether to keep going or cut scope.
- either `repeat` → **stuck.** Halt immediately — the same blockers are coming back; more rounds won't shake them loose.

When you halt for drift or stuck, surface it explicitly: list the blockers that keep recurring, say "the loop is restating, not converging," and use `AskUserQuestion` to offer (a) keep iterating, (b) cut scope (recommended), (c) ship as-is with these blockers acknowledged.

### Step 4c — converge, fold, or halt for blockers

If you got here, neither questions nor oscillation halted the loop. Now apply the convergence check using the new 3-output schema:

- **Converged** when both transcripts return zero blockers and both report `CONFIDENCE: ≥ 7`. The plan ships.
- **Low confidence with no blockers** (one or both transcripts: zero blockers, `CONFIDENCE: < 7`): the plan is missing something but neither model could name a concrete blocker. Note the reasoning lines and fold any addressable gaps quietly; if a second consecutive round lands in the same state, treat it like the 5-round ceiling and recommend cutting scope.
- **Blockers exist on either side**: halt the loop, surface the union of blockers to the user (deduped across both transcripts), fold the agreed fixes into the plan, then run another round.

The point of the simplified schema: the user is **only paused on real blockers and on questions**. Should-fixes, nits, style commentary — none of that exists in the report, so none of it generates a popup or a "fold this in?" prompt. Most rounds resolve with no human input at all.

### Step 5 — the 5-round ceiling

The early-halt paths in 4a and 4b handle most degenerate cases. The 5-round ceiling is the hard backstop for the residual case where models keep returning `mixed` overlap and conditional verdicts without ever escalating to `repeat`. If you've run **5 full rounds** and still haven't converged, stop and tell the user the plan is probably over-engineered for what it's trying to do — recommend cutting scope rather than adding more guardrails. Past experience: a plan that took 9 rounds before being scaled back to advisory-only could have been scaled back at round 3 and saved everyone the cycles.

## Escape hatches

These are the non-default paths. They keep the skill useful when the user isn't doing a plan premortem.

### Single-model review

If the user wants only one model (cost, time, deliberate single-voice opinion), drop the parallel launch and run one of the two commands above. Everything else — stdin bundling, no-stderr-suppression, the premortem prompt, the convergence check — still applies, just with N=1.

### Narrow back to read-only

If the plan touches secrets-handling, untrusted user input, or anything where you'd rather codex not have shell access, switch to `/codex-review` instead. That's the read-only sibling — same loop, same outputs, no disk or network access beyond what you inline into the stdin bundle. You can also bounce between the two skills round-by-round: full-access for verification-heavy rounds, read-only for tighter focus on the plan text itself.

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

- **bwrap loopback (older codex models especially).** Symptom: codex exits 0, stdout is blank or near-blank. Cause: codex tried to read a file inside its sandbox and bwrap denied it. This skill is more exposed to it than `/codex-review` because it relies on codex reading from disk. If it hits, switch to `/codex-review` for that round (bundle everything via stdin, no disk reads), then come back here for follow-ups once the loopback clears. Switching `--sandbox` modes within this skill does **not** fix it — the failure is in how the bwrap container is set up, not in the flag.
- **Codex hit the destructive-op rule mid-verification.** Working as intended. The blocked check shows up in the report as a finding ("plan requires destructive operation X to verify; not run from review context"). Don't relax the prohibition to push the review through — the user can run the destructive op themselves after seeing the finding.
- **Codex burned the reasoning budget reading files instead of reviewing.** Symptom: thin verdict, no clear BLOCKER / SHOULD-FIX breakdown, lots of `cat`/`grep` in the transcript but no synthesis. Fix: switch to `/codex-review` for that round with tighter anchor files inlined, then return here for the next round.
- **Stderr suppression on reviews.** `2>/dev/null` is fine for chatty edit runs where thinking tokens are noise. On review runs it hides the bwrap diagnostic and you'll waste a round wondering why output is empty.
- **Re-asking model / effort every invocation.** The defaults are settled: dual gpt-5.6-sol + gpt-5.5 at xhigh for review. Only prompt the user when they explicitly want something else.
- **Asking for permission to use full access.** Invoking `/codex-review-full` is itself the authorization — the user picked this skill over `/codex-review` precisely to grant `danger-full-access` + `--full-auto`. Don't re-prompt about either flag; they're the baseline here.
- **Re-introducing should-fixes or nits to the prompt.** The 3-output schema is deliberate. If you re-add categorize-everything-on-a-3-tier-scale to codex's prompt, you'll get verbose reports back and you'll be paused for human input on every round again. Trust the schema: blockers, confidence, questions. Nothing else.
- **Counting rounds wrong.** A round is one parallel pair, not one model run. Five rounds = ten codex invocations total.
- **Folding codex's questions as if they were defects.** When codex asks "should X be sync or async?", the right move is `AskUserQuestion` — not picking one and pretending it's settled. Settled-by-Claude answers tend to get re-raised in the next round in different wording, and the plan slowly drifts away from the user's actual intent.
- **Looping on `repeat` overlap hoping it resolves.** If both models say this round restates the last, more rounds won't help. Stop and re-scope.

## Quick reference

| Situation                          | Command shape                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Default dual premortem (per model) | `cat bundle.txt \| codex exec -m gpt-5.6-sol --config model_reasoning_effort="xhigh" --sandbox danger-full-access --full-auto -C <repo> --skip-git-repo-check` |
| Narrow back to read-only           | use `/codex-review` instead — that skill is the read-only sibling                                     |
| Resume prior session               | `echo "..." \| codex exec --skip-git-repo-check resume --last`                                        |
| Different working directory        | swap `-C <dir>` value                                                                                 |
