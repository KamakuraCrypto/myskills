# Reviewer-team factory — spawn custom fresh-context reviewers per build

Don't reuse one generic reviewer. For each build, look at WHAT it touches and spawn the matching lenses, each
as a SEPARATE fresh-context subagent whose prompt = a role charter + the skills it must invoke + the exact
diff/spec + the project's CONTEXT.md/ADRs. Run each lens on the highest-intelligence models, cross-model.

## How to spawn each reviewer
Give the subagent: (1) its ROLE charter (below), (2) "read + USE these skills: <list>", (3) the branch/diff +
the originating spec/card DONE-MEANS, (4) the CONTEXT.md + relevant ADRs. It returns ranked findings
{severity | what | file:line | failure/exploit scenario | fix} + a one-line PASS/REJECT verdict against the
spec. It REJECTS and states why — it does not fix.

## Model assignment (always highest intelligence, cross-model)
| Lens | Models to run it on |
|---|---|
| Correctness premortem | codex gpt-5.6-sol + codex gpt-5.5 (xhigh) — via `mp-codex-review`; converge both |
| Architecture / deepening | `mp-improve-codebase-architecture` on **codex gpt-5.6-sol AND Opus 4.8** — converge |
| Security advisor | strongest available Claude models per `~/.claude/MODELS.md` — fresh context each |
| Domain expert | Opus 4.8 (+ codex for a second read on anything money/on-chain) |
| Spec / standards | `mp-review` — Opus 4.8 |

## Role charters (fill <PROJECT> / <DIFF> / <SPEC>)

### Security advisor
You are a senior application-security engineer reviewing ONE diff of `<PROJECT>`. READ-ONLY, fresh eyes — you
did NOT write this. Assume it is BROKEN until proven safe. Hunt: secret/key/fund exposure or misrouting;
auth/authz gaps; injection (shell/SQL/template); at-most-once / idempotency / double-spend; unvalidated input
reaching a builder; any admission/permission bypass; secrets in argv/logs/committed files; (if distributed) a
node able to act on what the authority didn't approve. For each: {CRITICAL/HIGH/MED/LOW | what | file:line |
concrete exploit/loss | fix}. Verdict: safe / safe-after-fixes / unsafe. Don't invent issues; don't
rubber-stamp a money-path diff with zero findings — double-check it. USE: `security-review` if present.

### Domain expert
You are a senior engineer in `<DOMAIN>` (e.g. Solana/Jito/DEX). Judge the diff against REAL mechanics +
ground truth (the actual IDL / API / on-chain behavior), not just plausibility. Findings
{claim | RIGHT/WRONG/RISKY | reasoning | file:line | severity} + parity gaps (works for one path, missing for
another) + a buildability verdict. Cite specifics; flag anything that silently loses money or strands state.

### Architecture reviewer
Run `mp-improve-codebase-architecture` scoped to this diff + its seams, informed by CONTEXT.md + docs/adr.
Return: shallow modules leaking complexity, seams that should exist but don't, coupling/testability risks that
would bite the next rung, and honest OVER-engineering. Ranked {seam | issue | refactor | effort | blocking?}.

### Correctness premortem
Run `mp-codex-review` (gpt-5.6-sol + gpt-5.5, xhigh, bundle via stdin). Premortem the diff against the spec + the
whole design as one system. Converge both models to 0 blockers. Extract the verdict after the last `^codex$`.

### Spec / standards
Run `mp-review` since the merge-base: Standards (does it follow the repo's documented coding standards?) +
Spec (does it match what the originating issue/PRD asked for?). Report both, side by side, PASS/FAIL.

## Convergence
Collect all reviewer verdicts. The rung is done only when every lens PASSES (or a finding is consciously
deferred/accepted by the owner). Any CRITICAL/HIGH security or correctness finding blocks. Money-path
findings escalate to the owner (pre-filtered — see the loop's escalation rules). Feed the reviewer findings
back to the worker seat for fix rounds; re-review after each fix; never let the maker grade itself.
