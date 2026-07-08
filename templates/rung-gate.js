/*
 * rung-gate.js — deterministic review gate for ONE rung (branch/PR) of <PROJECT>.
 *
 * WHAT IT IS
 *   The review gate as a WORKFLOW SCRIPT instead of prose: machines first (verifier), then
 *   tiered reviewer seats (identity-tracked; a dead mandatory seat HALTS), coded convergence
 *   with a typed REFUTED ledger, void-round handling (quota echo / sandbox death), owner-fork
 *   escalation at ANY severity, an open-conditions list that survives into the result, a hard
 *   round cap that recommends splitting scope, and a closure review of fix commits so the last
 *   commit is never left unreviewed. Seats are spawned via CHARTER-FILE ADOPTION (see
 *   templates/agents/README.md), so this works in any session, including headless.
 *
 * RUNTIME CONSTRAINTS (Claude Code workflow sandbox)
 *   - No Date.now()/new Date(), no fs/require/import, no network — the script only orchestrates.
 *   - The harness provides: `args` (caller input — MAY ARRIVE AS A JSON STRING, handled below),
 *     `agent(prompt, {agentType, label, phase, schema})` (spawn a subagent; returns the
 *     schema-validated object or null if the seat died), `parallel([fn,...])`, `phase(name)`,
 *     and `log(msg)`. Top-level `await` and a top-level `return` are allowed.
 *
 * PROVENANCE
 *   Extracted from a live money-path build loop; the machinery encodes measured failure modes
 *   (phantom verdicts from quota echoes, blockers filed against superseded SHAs, rounds ground
 *   past the cap, ledger entries burying live findings). This script was itself verified the way
 *   it verifies: cross-model premortem → 4 fix rounds → dual-codex closure at 10/10 convergence,
 *   and the review of the gate caught real bugs in the gate (seat identity, ledger burial,
 *   closure carry, tier floor) before first use.
 *
 * FILL THE <...> SLOTS BELOW (charter dir, invariants path, tier table, money surfaces).
 */

export const meta = {
  name: 'rung-gate',
  description: 'Deterministic review gate for one <PROJECT> rung: machines -> tiered reviewer seats (identity-tracked, dead seat = halt) -> coded convergence with typed REFUTED ledger, void handling, round cap, closure of fix commits',
  whenToUse: 'After a rung is built and committed. args: {tier: "money"|"logic"|"mech" (REQUIRED — no default), branch, mergeBase, sha, rung, spec, pr?, priorRefuted?: []}. money = <YOUR MONEY TIER — e.g. funds/dispatch/auth/admission/irreversible actions>; logic = state machines & non-money runtime logic; mech = plumbing/wiring/docs/mechanical refactors. The verifier reports touched money surfaces and the gate FORCES money tier when they intersect, regardless of the caller.',
  phases: [
    { title: 'Machines', detail: 'verifier: CI mirror + committed tree + behavior drive + money-surface check' },
    { title: 'Review', detail: 'tiered seats, identity-tracked structured verdicts' },
    { title: 'Fix', detail: 'rung-builder applies surviving blockers' },
    { title: 'Closure', detail: 'review the fix commits; never leave the last commit unreviewed' },
  ],
}

// ── PROJECT SLOTS ────────────────────────────────────────────────────────────
const CHARTER_DIR = '<REPO-PATH>/.claude/agents'                       // the seven charters (from templates/agents/)
const INVARIANTS = '<REPO-PATH>/.claude/docs/PRODUCT-INVARIANTS.md'    // frozen, numbered product invariants
const MONEY_SURFACES = '<MONEY-SURFACES — concrete paths/routes/modules where money, auth, or irreversible actions live>'
const OWNER_FORK = '<OWNER-FORK EXAMPLES — owner choices that change money behavior, e.g. pricing/fee semantics, fund movement, cancel semantics, over-charge risk, retry policy>'
// ─────────────────────────────────────────────────────────────────────────────

const A = (typeof args === 'string') ? JSON.parse(args) : (args || {})
let tier = A.tier
if (!['money','logic','mech'].includes(tier)) return { verdict:'bad-args', mergeVerdict:'HALT: tier is required (money|logic|mech) — no default; when unsure pick the higher tier.' }
const RUNG = A.rung || 'unnamed-rung'
const CAP = 5 // hard round ceiling

const VERIFY_SCHEMA = { type:'object', required:['pass','report','touchesMoneySurfaces'], properties:{
  pass:{type:'boolean'}, report:{type:'string', description:'per-step command+exit+tail evidence; first failing step if fail'},
  touchesMoneySurfaces:{type:'boolean', description:'true if the diff touches any of: ' + MONEY_SURFACES} } }

// Severity mapping is defined IN the charters: CRITICAL/HIGH -> blocker, MED -> condition, LOW -> nit.
// ownerFork: resolving the finding requires an owner choice that changes money behavior.
const FINDING = { type:'object', required:['claim','file_line','why','severity','ownerFork'], properties:{
  claim:{type:'string'}, file_line:{type:'string'}, why:{type:'string'},
  severity:{type:'string', enum:['blocker','condition','nit']},
  ownerFork:{type:'boolean'} } }

const CODEX_SCHEMA = { type:'object', required:['models'], properties:{
  models:{type:'array', items:{type:'object', required:['model','status','shippable','score','findings'], properties:{
    model:{type:'string'}, status:{type:'string', enum:['verdict','void:quota','void:sandbox','void:stale']},
    shippable:{type:'string', enum:['yes','no','conditional','void']}, score:{type:'number'},
    findings:{type:'array', items:FINDING} }}},
  adjudication:{type:'string'} } }

const SEAT_SCHEMA = { type:'object', required:['verdict','findings'], properties:{
  verdict:{type:'string', enum:['safe','safe-after-fixes','unsafe','product-clean','product-clean-after-fixes','product-regression','arch-clean','arch-clean-with-defers','arch-blocking']},
  findings:{type:'array', items:FINDING},
  residuals:{type:'array', items:{type:'string'}} } }

const FIX_SCHEMA = { type:'object', required:['applied','commits','notes'], properties:{
  applied:{type:'array', items:{type:'string'}}, commits:{type:'array', items:{type:'string'}}, notes:{type:'string'} } }

const norm = s => (s||'').toLowerCase().replace(/\s+/g,' ').trim()
const key = f => norm(f.file_line) + '|' + norm(f.claim)
// REFUTED ledger: EXACT-match suppression, and ONLY for claims adjudicated as refuted
// (wrong / stale-SHA / re-opens a frozen contract). Fixed blockers are NOT suppressors —
// a partial fix must be allowed to resurface. They go to fixedLog (informational).
// intake validation: a short/empty ledger entry must never become a universal suppressor
const refuted = (A.priorRefuted||[]).map(norm).filter(r => r.length >= 24 && r.includes('|'))
if ((A.priorRefuted||[]).length !== refuted.length) log(`priorRefuted: dropped ${(A.priorRefuted||[]).length - refuted.length} malformed entries (need "file_line|claim" form, >=24 chars)`)
const fixedLog = []
const charter = role => `FIRST ACTION: Read ${CHARTER_DIR}/${role}.md and fully adopt that role charter — it is your system prompt for this task. Then proceed.
STRUCTURED OUTPUT MAPPING (binding): severity maps CRITICAL/HIGH->"blocker", MED->"condition", LOW/NIT->"nit". Set ownerFork=true ONLY when resolving the finding requires an owner choice that changes money behavior (${OWNER_FORK}) — including when a safety fix cannot avoid violating a product invariant.\n`
const ctx = (round, sha, extra) => `RUNG: ${RUNG} (tier=${tier}) round ${round}.
Branch ${A.branch} vs merge-base ${A.mergeBase}; COMMIT UNDER REVIEW (current tip): ${sha}${A.pr ? '; PR #'+A.pr : ''}.${sha !== A.sha ? ` (original tip ${A.sha}; fix commits since then are in scope)` : ''}
SPEC / DONE-MEANS:\n${A.spec}\n${extra||''}
${fixedLog.length ? `FIXED EARLIER THIS GATE (verify the fix, do not re-raise blind): ${fixedLog.join('; ')}\n` : ''}Also load ${INVARIANTS} — findings that re-open frozen contracts are auto-refuted.`

// ---- Phase 1: machines gate first ----
phase('Machines')
const m0 = await agent(charter('verifier') + ctx(0, A.sha) + `\nRun the full machine gate on this branch. Also report touchesMoneySurfaces per the schema.`,
  { agentType:'general-purpose', label:'machines:pre', phase:'Machines', schema:VERIFY_SCHEMA })
if (!m0) return { verdict:'seat-died', mergeVerdict:'HALT: verifier seat died — rerun the gate; never review unverified code.' }
if (!m0.pass) return { verdict:'machines-failed', mergeVerdict:'DO NOT REVIEW — machines red', report: m0.report }
if (m0.touchesMoneySurfaces && tier !== 'money') { log(`tier floor: verifier saw money surfaces — forcing tier money (caller said ${tier})`); tier = 'money' }

// ---- Rounds ----
const log_ = [], residuals = []
let converged = false, escalation = null, needClosure = false, currentSha = A.sha
let carryBlockers = null // closure findings carried into the next Fix
let archBlocked = false  // arch-blocking verdict re-seats the arch reviewer until it clears
let archNeeded = false   // mid-gate tier upgrade (mech->money) must still get an arch look
const openConditions = [] // every condition survives into the return object — nothing vanishes

for (let round = 1; round <= CAP && !converged && !escalation; round++) {
  let blockers
  if (carryBlockers) { blockers = carryBlockers; carryBlockers = null }
  else {
    phase('Review')
    const ledger = refuted.length ? `\nREFUTED LEDGER (adjudicated wrong/settled; do not re-raise without NEW evidence):\n- ${refuted.join('\n- ')}` : ''
    const seatDefs = [
      { name:'codex', mandatory:true, schema:CODEX_SCHEMA,
        prompt: charter('codex-runner') + ctx(round, currentSha, ledger) + `\nRun ONE codex premortem round per your charter. MODE: ${tier === 'mech' ? 'single-model (primary model only; return one models[] entry)' : 'dual-model (both models per ~/.claude/MODELS.md)'}. Commit SHA to stamp: ${currentSha}.` },
    ]
    if (tier === 'money') {
      seatDefs.push({ name:'security', mandatory:true, schema:SEAT_SCHEMA,
        prompt: charter('security-reviewer') + ctx(round, currentSha, ledger) + `\nSecurity-review the diff per your charter.` })
      seatDefs.push({ name:'product', mandatory:true, schema:SEAT_SCHEMA,
        prompt: charter('product-guardian') + ctx(round, currentSha, ledger) + `\nProduct-guardian review per your charter. In fix rounds, re-check the applied fixes for product regressions.` })
    }
    if ((round === 1 || archBlocked || archNeeded) && tier !== 'mech') {
      // once arch has said arch-blocking, its re-check seat is MANDATORY: a dead re-check
      // must halt, not silently clear the block
      // both re-check (archBlocked) and first-look-after-upgrade (archNeeded) seats are
      // MANDATORY: a dead seat halts rather than silently skipping the arch look
      seatDefs.push({ name:'arch', mandatory: archBlocked || archNeeded, schema:SEAT_SCHEMA,
        prompt: charter('arch-reviewer') + ctx(round, currentSha, ledger) + `\nArchitecture review per your charter (${archBlocked ? 're-check: your prior round said arch-blocking — verify the fix commits resolved it' : archNeeded ? 'first arch look: this rung was upgraded to money tier mid-gate after fixes touched money surfaces' : 'round 1 only; defers are non-blocking'}).` })
      archNeeded = false
    }
    const raw = await parallel(seatDefs.map(d => () =>
      agent(d.prompt, { agentType:'general-purpose', label:`${d.name}:r${round}`, phase:'Review', schema:d.schema })))
    // identity-tracked: seat i result = raw[i]; a dead MANDATORY seat halts the gate.
    const seats = seatDefs.map((d, i) => ({ ...d, result: raw[i] }))
    const deadMandatory = seats.filter(s => s.mandatory && !s.result)
    if (deadMandatory.length) { escalation = { round, reason: 'mandatory-seat-died: ' + deadMandatory.map(s=>s.name).join(',') }; break }

    const codex = seats.find(s => s.name === 'codex').result
    const others = seats.filter(s => s.name !== 'codex' && s.result).map(s => ({ name: s.name, ...s.result }))

    blockers = []; const nonCleanConds = []; let conditions = 0, nits = 0; const voided = []
    for (const m of codex.models) {
      if (m.status !== 'verdict') { voided.push(m.model + ' ' + m.status); continue }
      for (const f of (m.findings||[])) {
        if (refuted.includes(key(f))) continue
        if (f.severity === 'blocker') blockers.push(f)
        else if (f.severity === 'condition') { conditions++; openConditions.push(f); if (m.shippable !== 'yes') nonCleanConds.push(f) }
        else nits++
      }
    }
    for (const s of others) {
      const afterFixes = s.verdict.endsWith('-after-fixes')
      const clean = ['safe','product-clean','arch-clean','arch-clean-with-defers'].includes(s.verdict)
      for (const f of (s.findings||[])) {
        if (refuted.includes(key(f))) continue
        // an '-after-fixes' verdict means its findings must actually be FIXED before convergence
        if (f.severity === 'blocker' || (afterFixes && f.severity === 'condition')) blockers.push(f)
        else if (f.severity === 'condition') { conditions++; openConditions.push(f); if (!clean) nonCleanConds.push(f) }
      }
      for (const r of (s.residuals||[])) if (!residuals.includes(r)) residuals.push(r)
    }
    const seen = new Set(); blockers = blockers.filter(f => { const k = key(f); if (seen.has(k)) return false; seen.add(k); return true })
    if (voided.length) log(`round ${round}: voided codex models: ${voided.join(', ')}`)

    const codexAllVoid = codex.models.every(m => m.status !== 'verdict')
    if (codexAllVoid) { escalation = { round, reason: 'both-codex-void: ' + voided.join(',') + ' — do not fabricate a verdict; retry after quota reset' }; break }
    const codexOk = codex.models.every(m => m.status !== 'verdict' ? true :
      (m.shippable === 'yes' || (m.shippable === 'conditional' && m.score >= 7 && !(m.findings||[]).some(f => f.severity === 'blocker' && !refuted.includes(key(f))))))
    const CLEAN = ['safe','product-clean','arch-clean','arch-clean-with-defers']
    const seatsClean = others.every(s => CLEAN.includes(s.verdict))
    // only a LIVE arch verdict may change the arch-blocked state (a missing seat keeps it)
    const archSeat = others.find(s => s.name === 'arch')
    if (archSeat) archBlocked = archSeat.verdict === 'arch-blocking'
    log_.push({ round, sha: currentSha, blockers: blockers.map(key), conditions, nits, voided, seatVerdicts: others.map(s => s.name + '=' + s.verdict) })

    // owner-fork escalation checks ALL findings (any severity) — never proceed on a money guess.
    const forks = []
    for (const m of codex.models) for (const f of (m.findings||[])) if (f.ownerFork && !refuted.includes(key(f))) forks.push(f)
    for (const s of others) for (const f of (s.findings||[])) if (f.ownerFork && !refuted.includes(key(f))) forks.push(f)
    if (forks.length) { escalation = { forks, round }; break }

    if (!blockers.length && codexOk && seatsClean && !archBlocked) {
      if (!needClosure) { converged = true; break }
      // fixes were applied earlier: closure round on the fix commits before declaring convergence
      phase('Closure')
      const cl = await agent(charter('codex-runner') + ctx(round, currentSha, ledger) + `\nCLOSURE round: review ONLY the fix commits between ${A.sha} and ${currentSha}. Do not re-open settled items. MODE: ${tier === 'mech' ? 'single-model' : 'dual-model'}.`,
        { agentType:'general-purpose', label:'codex:closure', phase:'Closure', schema:CODEX_SCHEMA })
      if (!cl) { escalation = { round, reason: 'closure-seat-died' }; break }
      // a void/non-reviewing closure must never certify the fix commits
      if (cl.models.every(m => m.status !== 'verdict')) { escalation = { round, reason: 'closure-all-void — fix commits are UNREVIEWED; retry closure after quota/sandbox recovery' }; break }
      const clBlockers = [], clConds = [], clForks = []
      let clShippableOk = true
      for (const m of cl.models) { if (m.status !== 'verdict') continue
        if (!(m.shippable === 'yes' || (m.shippable === 'conditional' && m.score >= 7))) clShippableOk = false
        for (const f of (m.findings||[])) {
          if (refuted.includes(key(f))) continue
          if (f.ownerFork) clForks.push(f)                       // ownerFork at ANY severity escalates, in closure too
          if (f.severity === 'blocker') clBlockers.push(f)
          else if (f.severity === 'condition') {
            clConds.push(f)
            // closure conditions must reach the owner-facing OPEN CONDITIONS list like any other
            if (!openConditions.some(o => key(o) === key(f))) openConditions.push(f)
          }
        } }
      if (clForks.length) { escalation = { forks: clForks, round }; break }
      if (!clBlockers.length && clShippableOk) { converged = true; break }
      // shippable:'no' with only conditions still needs a repair path — feed the conditions to the fixer
      const carry = clBlockers.length ? clBlockers : clConds
      if (!carry.length) { escalation = { round, reason: 'closure-non-clean-verdict-with-no-findings (contract violation) — orchestrator must read the closure transcript' }; break }
      log(`closure found ${carry.length} real issue(s) in the fix commits — carrying into a fix round`)
      carryBlockers = carry; needClosure = false
      blockers = carry
    }
    if (converged || escalation) break
    if (round === CAP) break
    // a non-clean round with zero blocker-severity findings still needs a repair path (or a halt)
    if (!blockers.length) {
      if (nonCleanConds.length) { log(`round ${round}: non-clean verdicts carried ${nonCleanConds.length} condition(s) into the fix queue`); blockers = nonCleanConds }
      else { escalation = { round, reason: 'non-clean-verdict-with-no-findings (contract violation) — orchestrator must read the seat transcripts' }; break }
    }
  }

  // ---- Fix ----
  phase('Fix')
  const fix = await agent(charter('rung-builder') + ctx(round, currentSha) + `\nApply fixes for these adjudicated blockers (one commit per logical fix, on the rung branch):\n${JSON.stringify(blockers, null, 1)}\nConservative option + log deviations. Report the new tip SHA in commits[].`,
    { agentType:'general-purpose', label:`fix:r${round}`, phase:'Fix', schema:FIX_SCHEMA })
  if (!fix) { escalation = { round, reason: 'fix-agent-died' }; break }
  needClosure = true
  carryBlockers = null
  if (fix.commits && fix.commits.length) currentSha = fix.commits[fix.commits.length - 1]
  const mre = await agent(charter('verifier') + ctx(round, currentSha) + `\nRe-run the full machine gate after fixes (tip ${currentSha}).`,
    { agentType:'general-purpose', label:`machines:r${round}`, phase:'Fix', schema:VERIFY_SCHEMA })
  if (!mre || !mre.pass) { escalation = { round, reason: 'machines-red-after-fix', report: mre && mre.report }; break }
  // tier floor applies to FIX commits too — a fix that wanders onto money surfaces arms the money seats
  if (mre.touchesMoneySurfaces && tier !== 'money') { log(`tier floor: fix commits touched money surfaces — forcing tier money`); if (tier === 'mech') archNeeded = true; tier = 'money' }
  for (const f of blockers) fixedLog.push(key(f).slice(0, 100))
}

const verdictLine = converged
  ? `MERGE VERDICT: nothing blocks — ready for owner merge. (tier=${tier}, rounds=${log_.length}, residuals=${residuals.length}${openConditions.length ? `, OPEN CONDITIONS: ${openConditions.length} — fix-or-consciously-accept before notifying the owner, then re-verify machines` : ''})`
  : escalation
    ? (escalation.forks && escalation.forks.length
        ? `ESCALATE TO OWNER: ${escalation.forks.length} money-path fork(s) — pre-filter then batched grill. NOT mergeable until answered.`
        : `HALTED (${escalation.reason}) at round ${escalation.round} — orchestrator decision needed; nothing was rubber-stamped.`)
    : `NOT CONVERGED after ${CAP} rounds — the rung is over-scoped: SPLIT IT (do not grind).`

return { verdict: converged ? 'converged' : (escalation ? 'escalate' : 'split-scope'),
  mergeVerdict: verdictLine, tier, rounds: log_, escalation, residuals,
  openConditions, refutedLedger: refuted, fixedThisGate: fixedLog, finalSha: currentSha }
