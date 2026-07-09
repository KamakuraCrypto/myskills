---
name: codex-architecture-review
description: Run a dual-codex (gpt-5.6-sol + gpt-5.5, xhigh, full shell access) ARCHITECTURE-IMPROVEMENT review of a codebase area — find deepening opportunities (deep modules, real seams, testability), informed by CONTEXT.md + docs/adr, and converge the two models into one ranked list. Use when the user wants codex to find refactoring/architecture improvements (not bugs, not a plan premortem). Triggers: "codex architecture review", "/codex-architecture-review", "have codex find deepening opportunities", "codex improve architecture", "run the architecture skill on codex".
---

# codex-architecture-review

The architecture-improvement sibling of `/codex-review-full`. Same dual-model, full-shell-access,
parallel-then-converge machinery — but the framing is the **`mp-improve-codebase-architecture` lens**
(find **deepening opportunities**: shallow→deep modules, real seams, testability, AI-navigability),
not a plan premortem and not a bug hunt.

Use this when the user wants two strong models to independently walk the real code and propose
architecture improvements, then have the results merged + pruned into one ranked list. For finding
*bugs* use `/code-review`; for premorteming a *plan* use `/codex-review[-full]`; for an interactive
human-led architecture grill use `/mp-improve-codebase-architecture`. This skill is the
codex-driven, evidence-on-disk version of that last one.

## Inputs

- **Target area** (required): a path, module, or "the whole repo." Default to the repo the cwd is in.
- **CONTEXT.md / docs/adr** (auto): the models are told to read these for domain vocabulary + locked
  decisions. ADRs are decisions NOT to re-litigate (flag a conflict only when friction is real).

## The default flow: dual analysis → cross-critique → converge

### Step 1 — assemble the stdin bundle

Build a payload containing, in order:
1. The framing prompt (template below, including the `ARCHITECTURE LENS`, `SHELL ACCESS RULES`, and
   `OUTPUT SCHEMA` blocks).
2. The target-area description + any anchor files worth inlining under `=== FILE: <path> ===`
   (a hint — the models read the rest from disk themselves).
3. On round ≥ 2: a `=== PRIOR ROUND ===` block with both models' previous outputs (for cross-critique).

### Step 2 — fire both models in parallel

Both via `Bash` with `run_in_background: true`, both fed the same stdin, `-C` = repo root.
**Do NOT append `2>/dev/null`** (it hides bwrap sandbox diagnostics; symptom = blank output).

```bash
cat <bundle> | codex exec -m gpt-5.6-sol --config model_reasoning_effort="xhigh" \
  --sandbox danger-full-access --full-auto -C <repo root> --skip-git-repo-check
```
```bash
cat <bundle> | codex exec -m gpt-5.5 --config model_reasoning_effort="xhigh" \
  --sandbox danger-full-access --full-auto -C <repo root> --skip-git-repo-check
```

`--sandbox danger-full-access` + `--full-auto` are the baseline here (the user picked the full-access
skill); don't re-prompt about them. The destructive-op boundary is enforced **only** by the
prompt-level `SHELL ACCESS RULES` block. Wait via the background-completion notification — don't poll.

### Step 3 — the framing prompt (verbatim at the top of the bundle)

```
You are doing an ARCHITECTURE-IMPROVEMENT review of a codebase, as a peer to another AI (Claude).
Your job is to find DEEPENING OPPORTUNITIES — refactors that turn shallow modules into deep ones, so
the codebase is more testable and easier for both humans and AIs to navigate. This is NOT a bug hunt
and NOT a plan premortem. Surface real architectural friction, backed by evidence you read on disk.

=== ARCHITECTURE LENS (use this vocabulary exactly) ===
- Module: anything with an interface + an implementation. Interface: everything a caller must know
  (types, invariants, error modes, ordering, config) — not just the signature. Implementation: the
  code inside.
- Depth: a lot of behaviour behind a small interface. DEEP = high leverage. SHALLOW = interface nearly
  as complex as the implementation.
- Seam: where an interface lives; a place behaviour can change without editing in place. (Say "seam",
  not "boundary".) Adapter: a concrete thing satisfying an interface at a seam.
- Leverage: what callers get from depth. Locality: change/bugs/knowledge concentrated in one place.
- DELETION TEST: imagine deleting the module. If complexity vanishes, it was a pass-through (shallow).
  If complexity reappears across N callers, it was earning its keep (deep). A "concentrates" is the win.
- The interface is the test surface. One adapter = hypothetical seam; two adapters = real seam.

First READ the project's CONTEXT.md (domain vocabulary) and any docs/adr/*.md in the area. Use the
CONTEXT.md domain terms for domain things and the lens vocabulary for architecture. ADRs are LOCKED
decisions — only flag a candidate that contradicts an ADR when the friction is real enough to warrant
reopening it, and mark it clearly. Do not list every refactor an ADR forbids.

=== SHELL ACCESS RULES ===
You have full shell access (read, write to /tmp only, network) to verify findings: read source,
run tests, check imports, trace call sites. Use it — read the real code, don't theorize.
You are NOT permitted to run any of: rm/rmdir/unlink/shred, git reset --hard, git checkout -- .,
git clean, git restore ., any git push, git branch -D, git tag -d, DROP/TRUNCATE/DELETE-without-WHERE,
kill/pkill against processes you didn't start, any >/>> overwrite of a tracked file (use /tmp/ only),
anything disabling security tooling, privilege-escalating chmod/chown. If a check needs one of these,
STOP and report it as a note. You may write under /tmp/, read anything, use network.

=== OUTPUT SCHEMA (return ONLY this, ranked by leverage, highest first) ===
OPPORTUNITIES:
  - TITLE: <short name of the deepening>
    MODULES: <files/paths involved, with key file:line evidence>
    PROBLEM: <the friction today — why it's shallow / leaky / untestable; cite code>
    DELETION TEST: <what happens if you delete/merge it — concentrates or just moves?>
    DEEPENING: <the proposed deeper module/seam in plain English; what sits behind the seam>
    BENEFIT: <leverage + locality + how tests improve>
    EFFORT: <S | M | L>   CONFIDENCE: <0-10>
    ADR CONFLICT: <none | "contradicts ADR-NNNN — worth reopening because …">
COMPLETENESS: <one line: what area you did NOT get to / would examine with more time>

On a PRIOR ROUND being present: also add, at the end,
CRITIQUE: for each opportunity in the prior round's OTHER model, mark KEEP / PRUNE (shallow or wrong,
say why) / MERGE (same as one of yours). Then OVERLAP: new | mixed | repeat (vs the prior round).
Return only these sections — no preamble, no encouragement, no bug reports.
```

### Step 4 — merge, prune, converge

Read both transcripts. Then:

1. **Merge + dedupe** the two `OPPORTUNITIES` lists by MODULES+TITLE. Where both models raised the
   same deepening, that's a high-signal item — rank it up.
2. **Prune** anything the cross-critique (round ≥ 2) marked PRUNE with a sound reason, or that fails
   the deletion test on inspection (a "just moves complexity" is not an opportunity).
3. **Rank** by leverage × confidence ÷ effort. Surface the ranked list to the user with the per-item
   evidence.
4. **Converged** when a round adds no new KEEP-worthy opportunity and both models' `OVERLAP: repeat`
   (the list has stabilized). Most useful reviews are **one round** (analysis) + optionally **one**
   cross-critique round to prune. Do NOT loop more than ~3 rounds — architecture opportunities are a
   ranked list, not a pass/fail gate, so diminishing returns hit fast. If the user wants depth on one
   opportunity, hand it to `/mp-improve-codebase-architecture`'s interactive grill instead.

### Step 5 — present + optionally act

Present the ranked opportunities. For each: modules, problem, deepening, benefit, effort/confidence,
any ADR conflict. Then ask which the user wants to pursue. Do NOT start refactoring unprompted — this
skill *finds* opportunities; implementing one is a separate, user-approved step (and large ones should
go through `/mp-improve-codebase-architecture` + a plan + `/codex-review`).

## Reading codex output critically

Codex runs on OpenAI models with a knowledge cutoff; they can be confidently wrong about recent APIs
or the repo's own conventions. When codex contradicts something you can verify directly, say so as a
peer disagreement and let the user decide. A "deepening" that ignores a locked ADR for no real reason
is noise — prune it.

## Common pitfalls

- **bwrap blank output** (esp. older codex models): exits 0, stdout empty → it tried to read a file the sandbox
  denied, or wrote its verdict to the task log not the redirect file. Check the task `.output` tail
  before assuming failure. If truly blank, re-run that model or inline more anchor files via stdin.
- **2>/dev/null on review runs** hides the bwrap diagnostic — never use it here.
- **Treating this like a bug review** — it isn't. Reject bug/nit findings from the models; only
  deepening opportunities belong in the output.
- **Over-looping** — this is a ranked list, not a converge-to-zero gate. One or two rounds is right.
- **Asking permission for full access** — invoking this skill IS the authorization.

## Quick reference

| Situation | Command shape |
|---|---|
| Dual analysis (per model) | `cat bundle.txt \| codex exec -m gpt-5.6-sol --config model_reasoning_effort="xhigh" --sandbox danger-full-access --full-auto -C <repo> --skip-git-repo-check` |
| Cross-critique round | rebuild bundle with `=== PRIOR ROUND ===` appended, re-fire both |
| Interactive deep-dive on one opportunity | hand off to `/mp-improve-codebase-architecture` |
| Read-only (no disk writes by codex) | swap `--sandbox danger-full-access` → `--sandbox read-only` and inline anchor files |
