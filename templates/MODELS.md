# MODEL ROSTER — single source of truth (template)

> Install as `~/.claude/MODELS.md` (or your project's equivalent). Every skill, agent charter, and
> workflow that needs a model writes **"per `~/.claude/MODELS.md`"** — they never hardcode model
> names, tiers, or availability dates. When availability changes, you edit THIS file only.
>
> **The failure this prevents:** a roster hardcoded into 10+ skill files ("model X available until
> <date>") went stale in every one of them simultaneously the day the date passed. Nobody notices a
> stale line buried in a skill until a reviewer seat silently spawns on the wrong model. One file =
> one edit = zero drift.

Updated: <DATE — bump on every edit>

## Current roster (replace the examples with your reality)

| Seat | Model | Notes |
|---|---|---|
| Session / orchestrator | whatever you run the session on — e.g. the strongest available Claude model | subagents INHERIT this unless a role says otherwise |
| Workers (build/integrate) | inherit the session model | never route code/reasoning to a low tier to save tokens; a cheap model is only ever acceptable for a throwaway prose draft |
| Correctness premortem | a second model FAMILY — e.g. codex gpt-5.6-sol + gpt-5.5 at xhigh | cross-family diversity is the point. If your CLI config carries a model-migration/alias notice, preflight model identity before calling a round "dual-model" — two aliases of one model is fake diversity; say so rather than claim it |
| Independent reviewer seats (security / domain / product) | strongest available Claude model in FRESH context | fresh context matters more than the exact tier |
| Architecture | one seat from each family, converge | |

## Rules

1. **Verification gets MORE intelligence than execution**, cross-model, fresh-context. Correctness
   is the constraint, not token cost.
2. **A skill that needs a model writes "per `~/.claude/MODELS.md`"** — never a name, never a date.
   (Dates are fine here, as changelog entries; they are not fine as facts scattered across files.)
3. **Fallback order** for any reviewer seat: list it here explicitly (e.g. strongest → next
   strongest). If a named model errors at spawn, fall back to the next and NOTE the substitution in
   the verdict — never silently drop a seat.
4. **Quota/void rule:** reviewer-quota exhaustion is a VOID round, not a verdict. Output that is a
   prompt echo or a usage-limit notice must never be parsed for findings — mark the round void and
   retry after reset. Resets are typically same-day; schedule around them instead of stalling
   silently.
