---
name: mp-codex-review
description: Subagent-safe variant of codex-review. Runs gpt-5.6-sol + gpt-5.5 codex exec calls as TWO parallel FOREGROUND Bash calls in ONE message — so a subagent invoking this skill does not exit before the codex calls finish. Use when a subagent is reviewing a PR or plan via codex. Same premortem framing, convergence logic, and verdict semantics as `/codex-review`; the only difference is the invocation pattern.
---

# mp-codex-review

Same dual-model premortem as `/codex-review` (gpt-5.6-sol + gpt-5.5 at xhigh, convergence loop up to 5 rounds). **The only difference**: invocation pattern is **parallel foreground Bash, not background Bash.**

## Why this skill exists

The canonical `/codex-review` skill invokes `codex exec` via `Bash` with `run_in_background: true`, then waits via the completion-notification mechanism. That works when the invoking agent is the main Claude conversation (it doesn't exit while waiting). It does NOT work when the invoking agent is a SUBAGENT — the subagent's harness ends the agent when it emits final text, leaving the background bashes orphaned and the verdicts unreported. Three independent subagents on this project all hit the same failure mode: "Round 1 gpt-5.6-sol done. Waiting on gpt-5.5." (then exits).

This skill avoids that failure mode by issuing both codex calls as **foreground Bash calls in a single tool-use message**. Per the Bash tool's contract, "If the commands are independent and can run in parallel, make multiple Bash tool calls in a single message." That gives true parallel execution without `run_in_background: true`, and both calls block until they return — the subagent stays alive.

## The flow

### Step 1 — build the bundle (write to a temp file)

Construct one stdin payload containing:

1. The premortem framing prompt (template in §"Premortem prompt" below).
2. The target. For PR review:
   - PR title + body: `gh pr view N --json title,body -R <repo>`
   - PR diff: `gh pr diff N -R <repo>`
3. Inlined contents of any source files mentioned in the PR or relevant to the review. Each preceded by `=== FILE: <path> ===`.

**Always pre-inline via stdin** — codex's bwrap sandbox has known failure modes (especially older codex models) where internal filesystem access throws a loopback error and the run exits with no usable output. Bundling sidesteps the whole class of failure.

Write the bundle to a temp file (e.g. `/tmp/mp-codex-review-bundle-<pr-or-id>.txt`) so the Bash invocations can `cat` it without quoting hassle.

### Step 2 — fire TWO parallel FOREGROUND codex exec calls IN ONE MESSAGE

**This is the critical step.** Both Bash calls go in the SAME tool-use message. Do NOT separate them across messages. Do NOT use `run_in_background: true`. Do NOT use shell-background `&`.

```bash
# Tool call 1 (Bash, no run_in_background, timeout 600000ms):
cat /tmp/mp-codex-review-bundle-<id>.txt | codex exec \
  -m gpt-5.6-sol \
  --config model_reasoning_effort="xhigh" \
  --sandbox read-only \
  --skip-git-repo-check \
  > /tmp/mp-codex-review-gpt55-<id>.txt
```

```bash
# Tool call 2 (Bash, no run_in_background, timeout 600000ms):
cat /tmp/mp-codex-review-bundle-<id>.txt | codex exec \
  -m gpt-5.5 \
  --config model_reasoning_effort="xhigh" \
  --sandbox read-only \
  --skip-git-repo-check \
  > /tmp/mp-codex-review-gpt54-<id>.txt
```

Both block. Both return when their codex call finishes. The harness runs them in parallel.

**Timeout**: set Bash `timeout` to 600000 ms (10 minutes, the tool's hard cap). xhigh reasoning at codex commonly takes 3–8 minutes per call.

**Do NOT append `2>/dev/null`.** Stderr carries the bwrap-sandbox diagnostic. Stderr suppression on reviews "wastes a round wondering why output is empty" (per `/codex-review`).

### Step 3 — extract verdict sections

Both calls produce large transcripts with reasoning tokens. Don't dump the full output into your conversation — `grep` the verdict sections:

```bash
echo "===== gpt-5.6-sol verdict ====="
grep -E "^(SHIPPABLE|BLOCKER|SHOULD-FIX|NIT|OVERLAP|RECOMMENDATION|QUESTIONS|  - Q:|  why:|  - )" /tmp/mp-codex-review-gpt55-<id>.txt | head -100
echo ""
echo "===== gpt-5.5 verdict ====="
grep -E "^(SHIPPABLE|BLOCKER|SHOULD-FIX|NIT|OVERLAP|RECOMMENDATION|QUESTIONS|  - Q:|  why:|  - )" /tmp/mp-codex-review-gpt54-<id>.txt | head -100
```

For richer context, also grep `-B 1 -A 5` around each `BLOCKER`/`SHOULD-FIX` line.

### Step 4 — apply convergence + question-surfacing + overlap-halt logic

Same as `/codex-review` Step 4a/4b/4c:

**4a — surface codex's questions to the user.** Parse `QUESTIONS:` sections. Dedupe across the two transcripts. If any survive, halt the loop here and report the questions back to the dispatching agent (it will use `AskUserQuestion`). Do not fold codex's design ambiguities as if they were defects.

**4b — detect oscillation (rounds ≥ 2).** Combine `OVERLAP:` lines. Both `new`: continue. Both `mixed` on round 3: warn. On round 4: halt. Either `repeat`: halt immediately.

**4c — converge or iterate.** Converged when either:
- Both transcripts end with `SHIPPABLE: yes`, OR
- Both end with `SHIPPABLE: conditional N` where N ≥ 7, AND neither raised a NEW BLOCKER unresolved from the prior round.

If not converged and rounds < 5, build the next round's bundle (append a `=== PRIOR ROUND ===` section with the prior round's combined transcript) and repeat from Step 2.

### Step 5 — five-round ceiling

If 5 full rounds have run without convergence, halt and report: the change is probably over-engineered or needs scope reduction. Surface to the dispatching agent.

## Premortem prompt

Use verbatim. Substitute "code change" / "PR" for "plan" if reviewing a PR rather than a written plan.

```
You are running a PREMORTEM on a code change (PR) authored by another AI (Claude).

Assume the change has been merged and the result was a failure. Your job is to
enumerate every plausible cause of that failure — concrete, traceable to a section
or claim in the PR, not generic.

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

QUESTIONS (zero or more — only when a structural decision in the change is genuinely
ambiguous and a wrong guess would invalidate large parts of the review; leave empty
otherwise — do NOT fish for questions):
  - Q: <one-line question the user can answer with a sentence>
    why: <one-line: what hinges on the answer; which sections of the review change either way>

OVERLAP NOTE (only include this if a PRIOR ROUND section is present below):
Compare your findings above to the prior round. Choose exactly one:
  OVERLAP: new      — most findings are new or escalated since last round.
  OVERLAP: mixed    — some new, some restatements.
  OVERLAP: repeat   — findings mostly restate prior round; the change isn't moving.

=== PR TITLE + BODY ===
<pr title + body inlined here>

=== PR DIFF ===
<unified diff inlined here>

=== RELEVANT CODE ===
<each touched/referenced file inlined here, separated by === FILE: <path> ===>

=== PRIOR ROUND ===  (only present on round ≥ 2)
<combined transcript of the previous round's two codex outputs>
```

## Common pitfalls

- **DO NOT use `run_in_background: true`.** This is the exact bug this skill exists to avoid. Background bashes from a subagent get orphaned when the subagent exits.
- **DO NOT split the two Bash calls across messages.** Both must be in ONE tool-use block for the harness to run them in parallel.
- **Set `timeout` to 600000 ms.** xhigh reasoning commonly takes 3–8 minutes per call. The default 120s will preempt good runs.
- **DO NOT append `2>/dev/null`.** Stderr carries the bwrap-sandbox diagnostic; without it you'll burn a round wondering why output is empty.
- **Bundle via stdin, not `--base BRANCH`.** `codex exec review --base BRANCH` triggers bwrap to read repo files, which can fail on some codex models. Pre-inline.
- **Re-bundle prior round into the next round.** Append a `=== PRIOR ROUND ===` section so models can compute their `OVERLAP:` line. Without it, oscillation detection breaks.
- **Don't promote NITs to BLOCKERs across rounds.** Fold once and move on.
- **Don't fold codex's `QUESTIONS:` as if they were defects.** Surface them up to the dispatching agent.
- **Round-N transcripts QUOTE round-(N-1)** (the PRIOR ROUND section echoes back). `grep SHIPPABLE` returns multiple lines — the LAST one is the live verdict, and quoted findings masquerade as fresh ones. Check each finding's citations against the CURRENT tree before treating it as new.
- **Large codex stdout gets persisted** by the harness to a `tool-results/` path instead of your `>` redirect target. Copy it to the expected /tmp file before the extraction step.
- **The harness may BACKGROUND the second of the two parallel calls** (observed on the main conversation, not just subagents): the first returns inline/persisted, the second comes back as "Command running in background with ID ..." and you get a task-notification on completion — copy its `tasks/<id>.output` file to the expected /tmp path. Don't panic and don't re-fire it; just wait for the notification.
- **Extract verdicts from after the LAST `^codex$` marker** (`M=$(grep -n "^codex$" file | tail -1 | cut -d: -f1); awk -v m=$M 'NR>m'`). On round ≥2 the prompt echo contains the full prior-round transcripts, so a bare `grep SHIPPABLE\|BLOCKER` returns mostly quoted history.
- **Each fix round invites fresh review surface** (expect `OVERLAP: new` even when converging). The exit is NOT zero findings: once both verdicts hit the threshold, apply their NAMED conditions in one closure commit and stop. Budget the 5-round ceiling so the closure commit itself gets one verification round (fixes ≤ r3, closure r4, verify r5).
- **Fix-commit claims create falsifiable surface.** Reviewers escalate when a fix overclaims ("bounded", "append-only", "never parks") — write commit/doc claims exactly as narrow as the code, or the next round attacks the claim.

## Quick reference

| Step | Action |
| --- | --- |
| Bundle | `gh pr view N` + `gh pr diff N` + inlined source files into `/tmp/mp-codex-review-bundle-<id>.txt` |
| Run | TWO parallel foreground Bash calls in ONE message; `-m gpt-5.6-sol` and `-m gpt-5.6-sol`; `--config model_reasoning_effort="xhigh"`; `--sandbox read-only`; `--skip-git-repo-check`; `timeout 600000` |
| Extract | `grep -E "^(SHIPPABLE\|BLOCKER\|SHOULD-FIX\|NIT\|OVERLAP\|RECOMMENDATION\|QUESTIONS)" /tmp/mp-codex-review-gpt5{5,4}-<id>.txt` |
| Converge | Both `SHIPPABLE: yes` OR both `conditional ≥ 7` with no new BLOCKERs |
| Iterate | Build next-round bundle with `=== PRIOR ROUND ===` appended; max 5 rounds |
