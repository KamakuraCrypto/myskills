# The universal deep-scan kickoff prompt

Copy this into a fresh session opened in the target repo/folder. Fill the two `<...>` slots. Run it on a
strong model (Opus 4.8) with a big fan-out opt-in; it spins the whole fleet and comes back with the locked
understanding + skills.

---

Do a whole-project view-from-above architectural scan + design-lock of `<REPO OR FOLDER PATH>`, then leave
it loop-ready. Read `deep-work` and `deep-scan` first, then run the deep-scan phases as a multi-model fleet
(opt-in confirmed — spawn as many subagents as it takes; correctness over token cost).

Start by detecting the stack and domain (grep the manifests; if it's Solana/Anchor/Jito, wear the on-chain
hat — bundles, tips, blockhash/LVBH, durable nonces, gRPC commitment, curve mechanics). Then:

1. **Ground-truth map** (parallel readers): every capability tagged BUILT / DESIGNED / TARGET with
   file:line, and every doc↔code divergence. Independently verify the load-bearing facts yourself. State
   plainly what works end-to-end today.
2. **Domain-engineer review**: spawn specialists for the real stack (for Solana: a Jito/confirm engineer +
   a protocol engineer per platform, checked against the real IDL + live chain). Concrete findings
   {claim | RIGHT/WRONG/RISKY | reasoning | file:line | severity} + parity gaps.
3. **Architecture review**: the deepening/testability lens + a dual-codex architecture pass on the key
   seams → one ranked list. Flag over-engineering, not just gaps.
4. **Whole-design premortem**: codex 5.5 + 5.4 + independent Claude reviewers (strongest available per
   `~/.claude/MODELS.md`), all the design docs as ONE
   system — contradictions, unbuildable assumptions, money/safety holes. Be adversarial.
5. **Pace check**: bluntly — fastest path to the working product, or over-engineered / backwards? Recommend
   a resequencing if warranted.
6. **Converge**: ONE state-of-project report; a reconciled CONTEXT.md (glossary stays glossary, decisions →
   ADRs, don't rewrite Accepted ADR bodies standalone); the ≤5 remaining owner decisions each with a
   recommended answer; a locked roadmap/PR ladder ready for `mp-to-issues`.
7. **Author skills from the decisions**: once the calls are locked, write them into the repo as project
   skills (a build-loop, a domain reviewer, etc.) — durable and updatable, not prose that rots.

Rules: READ-ONLY on source until I green-light changes (docs/skills only); respect the repo's
ownership/merge conventions; never merge or push source unasked. Report a crisp running synthesis between
phases. Converge to ≤5 decisions for one short grill, then set the tracker + skills up so a `/loop` can
execute.

---

## Notes
- For a lighter pass ("just help me understand this repo"), run phases 0–1 + a short converge, skip the full
  premortem fleet.
- The output that makes the scan compound is Phase 6: the skills. A scan that only produces docs gets read
  once; a scan that produces a build-loop skill keeps paying out.
