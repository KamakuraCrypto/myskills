---
name: mp-4model-gate
description: Run a 4-model review gate on a PR — codex gpt-5.6-sol + gpt-5.5 xhigh premortems plus two independent Claude reviewer seats (strongest available per ~/.claude/MODELS.md) as Agent-tool reviewers, optional dual-codex architecture review, convergence loop with fix rounds and a verified condition-closure commit. Use when the user wants the full gate / 4-model review on a PR, or for high-risk rungs of a PR ladder (money paths, foundations, hot sell paths); for routine PRs prefer plain /mp-codex-review. Triggers: "4-model gate", "full gate", "run the gate on PR N".
---

# mp-4model-gate

The heavyweight PR gate for high-risk changes (money paths, foundations, hot paths). Codex mechanics (bundle format, premortem prompt, verdict extraction, pitfalls) live in [mp-codex-review](../mp-codex-review/SKILL.md) — read that first; this skill only adds the 4-model orchestration.

## When to use

Foundations, money paths, schema that later work builds on. NOT for test-only or doc PRs — dual-codex (`/mp-codex-review`) suffices there. Each model catches a distinct class (measured on real PRs): one codex model = doc-grounded API contracts, the other = adversarial re-derivation of your claimed math, and the two Claude seats = ground-truth reproduction and ops-reality composition (units/runbooks/code together).

## Round 1 — four independent reviewers, one message

1. Build ONE shared bundle file (`/tmp/gate-bundle-<id>.txt`): premortem prompt (verbatim from mp-codex-review) + **SCOPE NOTE** (what is deferred-by-design to named follow-ups — without it reviewers re-raise deferred items every round) + PR title/body + diff + relevant ADR/design docs + any glossary.
2. In ONE tool-use message fire all four: two codex Bash calls (per mp-codex-review) AND two Agent calls — `model:` set to the two strongest available Claude models per `~/.claude/MODELS.md` (fallback order lives there, not here), `run_in_background: true`, `subagent_type: general-purpose`. Agent prompt: read the bundle file, follow its premortem instructions, ground-truth against the repo read-only, do NOT read other reviewers' outputs (`/tmp/mp-codex-review-*`, `/tmp/gate-*`), final message = the raw review ending in the exact `SHIPPABLE:`/`RECOMMENDATION:` lines.
3. Optionally also fire `/codex-architecture-review` on the touched seam — its [D1-NOW]-style items fold into the fix round; the rest become follow-up notes.

## Convergence

ALL FOUR verdicts `SHIPPABLE: yes` or `conditional ≥ 7`, no unresolved BLOCKER. Consensus findings (3–4 models, independently) are near-certainly real — fix those first, and verify any checkable BLOCKER claim yourself immediately (e.g. `ls build.rs`) before drafting fixes.

Rounds 2+ re-run only the codex pair (Claude verdicts that already pass stand; their conditions must be fixed). Full verification cycle after EVERY fix commit — for this repo: hermetic check → recreate test DBs if the migration changed → gated tests → full suite → release build → service restart + boot-log check.

## Round budget (5-round ceiling)

Fix rounds ≤ 3 → **condition-closure commit at round 4** (apply both models' NAMED conditions in one commit, nothing more) → **round 5 verifies the closure commit** (point the bundle at that commit explicitly: "primary job: did the closure implement the conditions without breaking anything"). The exit is applied-named-conditions, not zero findings — fresh small findings appear every round on foundation code; chasing zero never terminates.

## Report

Verdict table comment on the PR (reviewer / r1 / final / key finding), fix-commit list, deferred-by-design list with where each lives; follow-up notes comment on the tracking epic. Then "ready to merge" — the OWNER merges.
