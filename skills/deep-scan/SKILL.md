---
name: deep-scan
description: Do a whole-project view-from-above scan of ANY repo or folder — a multi-model fleet maps what's BUILT vs DESIGNED vs TARGET, domain experts (Solana/Jito/DEX-aware when relevant) + architecture + adversarial premortem check the design against the actual code, then converge into a reconciled CONTEXT.md glossary + ADRs + a ≤5-decision grill agenda + a buildable roadmap, and AUTHOR project skills from the decisions. Use to onboard/understand a new repo, rehaul its CONTEXT.md/ADRs, audit a design, or set a project up for autonomous looping. Triggers: "deep-scan", "scan this repo", "view from above", "understand this project", "rehaul the context/ADRs", "do the same scan on <repo>".
---

# Deep-scan — understand a project, lock its design, spin its skills

Reusable version of the whole-project review pattern that produces a project design-lock. Point it at a repo
or folder; it returns a locked, loop-ready understanding. READ-ONLY on source until the owner green-lights
changes; docs/skills only. Read `deep-work` first — this IS deep-work applied to a whole codebase.

Detect the domain first (`grep` for solana/anchor/jito, or the stack's manifest). If it's Solana, wear the
on-chain hat (bundles, tips, blockhash/LVBH, nonces, gRPC commitment, curve mechanics); otherwise adapt the
specialist roles to the real stack. The phases don't change.

## Phase 0 — ground-truth map (parallel readers)
Fan out read-only agents to produce ONE map: every capability tagged **BUILT / DESIGNED / TARGET** with
file:line evidence, and every place the docs (README/ADRs/CONTEXT/design notes) DIVERGE from the code.
Independently confirm the load-bearing numbers yourself (counts, flags, "does X exist"). Ask bluntly: what
actually works end-to-end today?

## Phase 1 — domain-engineer review (grounded in reality AND the code)
Spawn specialists — for Solana: a Jito/bundle+confirm engineer, a per-platform protocol engineer
(pump/meteora/raydium/…), verified against the real IDL + live chain where it matters. Each returns
concrete correctness findings {claim | RIGHT/WRONG/RISKY | reasoning | file:line | severity} and a
buildability verdict. Hunt parity gaps (wired for one path, missing for another).

## Phase 2 — architecture review (two families)
Run the deepening/testability lens (`mp-improve-codebase-architecture` / a principal-engineer subagent) AND
a dual-codex architecture pass (`codex-architecture-review`) on the key seams. Converge to one ranked list
of deepening opportunities + coupling/testability risks. Call out OVER-engineering honestly, not just gaps.

## Phase 3 — whole-design premortem (adversarial, the whole system as one)
codex 5.5 + 5.4 (`mp-codex-review`, stdin bundle) + independent Claude reviewers (strongest available per
`~/.claude/MODELS.md`) premortem ALL the
design docs together. Surface doc↔doc contradictions, unbuildable assumptions, and money/safety holes each
per-PR review missed because it only saw one piece. A premortem that finds nothing is a failed premortem.

## Phase 4 — the owner's real question (pace / proportionality)
Answer bluntly: is this the fastest path to the working product, or is the foundation over-engineered / the
sequencing backwards? Recommend a concrete resequencing if warranted.

## Phase 5 — converge + reconcile
Produce: (1) ONE state-of-project report (verdict + BUILT/DESIGNED map + fastest-path); (2) a reconciled
**CONTEXT.md** (fix every doc↔doc / doc↔code inconsistency — glossary stays a glossary, decisions go to
ADRs; do NOT rewrite an Accepted ADR body standalone — fold fixes into the build PR); (3) a SHORT ranked
list of the **≤5 remaining owner decisions**, each with a recommended answer; (4) a locked roadmap / PR
ladder ready for `mp-to-issues`.

## Phase 6 — AUTHOR skills from the decisions
This is what makes the scan compound. Once decisions crystallize, write them into the project as skills
(`mp-write-a-skill` / the `deep-scan` conventions): a project build-loop (see the `project-loop-template` (in `templates/`)),
a domain-specific reviewer prompt, whatever the decisions imply. New knowledge → a durable, updatable skill,
not a wall of prose that rots.

## Rules / landmines
- Match the fleet size to the ask (a quick understand = a few readers; "lock this for life" = the full
  layered fleet). Owner opts into big fan-out; token cost is not the constraint, correctness is.
- Respect the repo's ownership/permissions model (chown dances, build-as-root) and its merge convention
  (owner merges). Never merge or push source without being asked.
- Report a crisp running synthesis between phases; don't disappear for an hour.

## The one-line universal prompt (paste to kick it off)
See `references/prompt.md` — a copy-paste brief that spins the whole fleet on any target repo/folder.
