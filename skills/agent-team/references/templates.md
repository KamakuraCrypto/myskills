# Agent-team templates — cards, shapes, checker, three teams

> **Model doctrine (this operator):** workers = strongest-available Claude subagents; checkers = **codex
> gpt-5.6-sol + gpt-5.5 + the strongest available Claude models** (roster + fallbacks: `~/.claude/MODELS.md`; template:
> `templates/MODELS.md` in this repo), fresh context, cross-model. Where the generic templates below say
> "cheap tier", read the strongest available model — never route important work (code/reasoning/review) to
> Haiku. Haiku is only ever OK for a throwaway prose draft.

## Worker card (give the orchestrator this format once)
```
For every task you delegate, write the assignment as a card. Workers see ONLY their card:
TASK:       one sentence, one outcome
INPUT:      exactly which files/data the worker gets — nothing else
DONE MEANS: an objective, checkable line
DO NOT:     files not to touch, decisions not to make alone
RETURN:     a summary under 10 lines + the deliverable itself
DEVIATIONS: if an edge case forces a change of plan, take the CONSERVATIVE option,
            log it under "deviations" in the return, and keep going — never silently improvise
```

## Fan-out (parallel) — subtasks don't touch each other
```
GOAL: <outcome> with checkable receipts.
1. split into 3-5 independent sub-tasks
2. one worker per sub-task, each in its own context / folder / branch
3. every result returns as {claim/deliverable + evidence + source}
4. a fresh-context checker (cross-model, per the roster) attacks every result; only survivors reach me
```

## Pipeline (sequential) — one stage's output is the next's input
```
PIPELINE: ship a feature end to end.
STAGE 1 builder: implement per the card → code + diff
STAGE 2 tester:  write+run tests against the SPEC (not the code) → results + every failure
STAGE 3 fixer:   fix only what stage 2 failed, no refactoring beyond it
STAGE 4 documenter: update readme/changelog from the final diff
RULES: each stage is a FRESH subagent seeing only the prior deliverable (not the chat history);
       any stage failing twice = stop and report, don't push through.
```

## Checker prompt (the seat that makes it real)
```
You are the reviewer. You did NOT write this work and don't care who did.
SPEC: <paste the original brief / card DONE-MEANS>
Grade the work against the SPEC only. For each requirement: PASS or FAIL + one line of evidence.
Any FAIL = the whole submission fails. A false PASS costs money. Do NOT suggest fixes — reject and
state why.
```
Put objective gates in FRONT of the checker: test suite, build, linter, size guard, link/quote validator.
Machines gate first → checker judges taste → you see only what survived both.

## Three ready teams (paste, fill brackets, run)
```
# CONTENT DESK
/goal 5 posts in /ready that pass both checks, by tonight.
- orchestrator (you): pull topics, one card per post
- writer (cheap): drafts per card, voice rules in /skills/voice.md
- checker (separate, strict): grades against voice.md, pass/fail
FLOW: draft → check → fail returns with reason → pass lands in /ready
STOP WHEN: 5 passed OR 20 attempted · ON STOP: log passing + failing patterns to STATE.md

# RESEARCH DESK
/goal a sourced brief on [topic] in /research, under 800 words.
- orchestrator (you): split into 4 sub-questions
- 4 scouts (cheap, parallel): one surface each (social/docs/pricing/long-reads), receipts only: claim+link+date
- skeptic (separate): attack every claim, kill single-source hype, surface contradictions
- you: write the brief from SURVIVING receipts only
STOP WHEN: brief written OR 2h · ON STOP: unresolved contradictions = next week's questions

# CODEBASE JANITOR (nightly)
/loop nightly 3am: keep the repo clean while I sleep.
- orchestrator (you): read open issues + yesterday's diff, pick 3 smallest high-value chores
- fixer (cheap): one chore per subagent, own branch each
- gate: the test suite — red = branch dies, no exceptions
- checker: reviews green branches against the issue, pass/fail
STOP WHEN: 3 done OR 15 attempts · ON STOP: one PR per passed chore, diff + one-line summary. NEVER merge without me.
```

## Two-hats fallback (no subagents available — one model, roles strictly separated)
```
ROLE A MAKER produces the work. ROLE B CHECKER (did NOT make it) grades brutally pass/fail per criterion.
TASK: <what you want>   CRITERIA: <3-5 strict checkable lines>
PROTOCOL: MAKER produces → print "HANDOFF" → CHECKER grades → any FAIL = MAKER fixes only what failed →
repeat until every criterion passes. Never let the MAKER grade.
```
