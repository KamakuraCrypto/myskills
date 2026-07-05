---
name: mp-repo-audit
description: Principal-engineer repository audit in 4 strict phases — discovery/mapping, evidence-based severity-rated audit, improvement strategy, milestone task plan — producing one document with an A–F health grade, file:line-cited findings, and a prioritized execution plan. Read-only, no code changes. Use when the user asks to audit a repo, assess codebase health, find the ugly parts, grade the code, or produce an improvement/refactoring roadmap; triggers on "repo audit", "audit this repo", "codebase health", "improvement plan", "/mp-repo-audit".
---

# mp-repo-audit

Deep repository audit producing a single deliverable document. **Analysis only — never modify code.** Every claim cites `file:line`; unverifiable claims are labeled as such, never guessed.

## Quick start

Run the four phases **in order, no skipping ahead** — read before judging. The full verbatim phase prompts, rules, and deliverable format live in [REFERENCE.md](REFERENCE.md); read it before starting.

1. **Phase 1 — Discovery & Mapping.** Explore systematically before forming opinions: directory map, stack, entry points, data/control flow, manifests/lockfiles/CI/docs, project purpose + maturity, existing conventions. Output: a concise **Repo Map** + surprises.
2. **Phase 2 — Audit.** Eight dimensions (architecture, code quality, security, testing, performance, dependencies, DevEx/ops, documentation). Every finding records: what, where (`file:line`), why it matters (concrete consequence), severity (Critical/High/Medium/Low). Output: **Audit Report** grouped by dimension, sorted by severity, plus a **Strengths** section. Always surface the ugly parts that need utmost priority.
3. **Phase 3 — Improvement Strategy.** 3–5 themes explaining most findings; target state + principle per theme; explicit NOT-fixing trade-offs; measurable "done" signals.
4. **Phase 4 — Task Plan.** Discrete tasks (title, description, files, acceptance criteria, S/M/L/XL effort, change risk, dependencies) ordered into Milestone 0 (safety net) → 1 (critical fixes) → 2 (high-leverage) → 3 (polish). Flag quick wins (high impact, S effort) separately. Implementation sketch for the top 3 tasks.

## Hard rules

- Prefer **15 high-confidence findings over 50 speculative ones**; label facts vs judgments.
- **Calibrate to maturity** — no enterprise infrastructure for a weekend prototype unless the owner's goals demand it.
- Don't pad: a healthy dimension gets one sentence.
- Large repo: depth on the core 20% that does 80% of the work; note lighter-reviewed areas.
- If the project has CLAUDE.md / CONTEXT.md / ADRs or a memory of prior audits, read them first and don't re-litigate documented, owner-locked decisions — flag disagreement explicitly instead.

## Deliverable

One document with sections: **Executive Summary** (≤10 sentences: A–F grade + justification, top 3 risks, top 3 opportunities) → **Repo Map** → **Audit Report** → **Improvement Strategy** → **Task Plan** (milestones + task table + quick wins) → **Open Questions** for the human (product intent, deprecation candidates, performance targets).

Write the document to a file (project docs dir or the user's vault if one exists) and summarize the executive summary + quick wins in chat.

## Delegation

For a large repo, this skill works well as a single background Agent (optionally with a `model` override) given the target repo path and an output path — the phases are sequential by design and need one coherent context. Fan out subagents only inside Phase 1/2 for breadth reads, never for the synthesis phases.
