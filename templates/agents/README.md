# Typed agent charters — the seven seats of the deterministic loop

Seven role charters for an autonomous build loop with a deterministic review gate
(`templates/rung-gate.js`). Copy into `<REPO>/.claude/agents/`, then fill every `<...>` slot with
your project's reality (paths, CI commands, money surfaces, conventions). They encode lessons
mined from ~41 real sessions — keep the load-bearing ideas even where you trim.

| Charter | Seat | The load-bearing idea |
|---|---|---|
| `rung-builder.md` | build | implements ONE worker card, never the whole plan; knows the repo's environment landmines so they're enforced, not remembered |
| `verifier.md` | machine gate | reads the CI CONFIG as truth (prose copies go stale); judges the COMMITTED tree; drives real behavior; returns structured `{pass, report, touchesMoneySurfaces}` — the money-surface report lets the gate FORCE the strictest tier |
| `codex-runner.md` | cross-family premortem | owns the machinery, not opinions: pre-inlined read-only bundles (kills sandbox false blockers), `--output-last-message`/`--output-schema` (kills verdict-parsing archaeology), quota/sandbox VOID detection (kills phantom verdicts), REFUTED ledger, SHA stamping, exact verdict schema incl. the `ownerFork` definition |
| `security-reviewer.md` | security lens | fresh context, assume-broken, verify against the tree not the diff; verdict `safe`/`safe-after-fixes`/`unsafe` |
| `product-guardian.md` | product-intent lens | the seat every safety-only gate is missing: defends a frozen PRODUCT-INVARIANTS file, re-checks the OTHER reviewers' fixes for product regressions, and assembles the accepted-residuals table for the owner |
| `arch-reviewer.md` | architecture lens | scoped to the diff; non-blocking by design — blocks only on frozen-contract breaks or walls the next rung must demolish |
| `doc-scribe.md` | ceremony | hard caps (≤2 artifacts, ≤15-line retro) + the product burn-down; a lesson that is a command/check must land in a machine home the same session |

## Two ways to use them (this matters)

1. **Charter-file adoption — works in ANY session, immediately.** A generic subagent is spawned
   with a prompt that begins: *"FIRST ACTION: Read `<REPO>/.claude/agents/<role>.md` and fully
   adopt that role charter — it is your system prompt for this task. Then proceed."* This is how
   `rung-gate.js` spawns every seat, so the gate works in the session that installed it, in
   headless runs, and in harnesses that don't support typed agents.
2. **Typed `agentType` registration.** Claude Code also registers `.claude/agents/*.md` as native
   agent types — but only for sessions STARTED after the files exist. Fine as a convenience layer;
   never rely on it inside the installing session or in a workflow that must run anywhere.

Rule of thumb: workflows and scripts use pattern 1 (deterministic, portable); humans typing
one-off delegations can use pattern 2.

## Filling the slots

- `<MONEY-SURFACES>` must be a CONCRETE list (paths, routes, modules) — the verifier's
  `touchesMoneySurfaces` check is mechanical (`git diff --name-only`), not vibes.
- A PRODUCT-INVARIANTS file (`.claude/docs/PRODUCT-INVARIANTS.md`) is a prerequisite: a short,
  frozen, NUMBERED list of what the product must remain (latency floors, unconditional paths,
  parity, UX contracts). The product-guardian and every premortem bundle cite it by number.
- Models: charters say "per `~/.claude/MODELS.md`" — install `templates/MODELS.md` and keep the
  roster there, never in these files.
