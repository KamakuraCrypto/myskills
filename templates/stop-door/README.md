# STOP-door — the red lines as a machine, not a memory

A `PreToolUse` hook that mechanically blocks the owner-only actions an autonomous loop must
never take: merging PRs (CLI, REST, and raw-curl forms), pushing to the prod branch or to
main/master of the project repo, force-pushes (including `+refspec` and variable-refspec shapes),
deleting protected data (keys/backups/DBs), destructive SQL on non-test objects, and hard-resets
of the prod worktree.

**Why a hook and not a rule in a skill:** the same red lines lived as prose for weeks — recorded
in memory and retro files repeatedly, and violated again anyway, while the permission allowlist
blanket-approved `git push:*` and `rm:*`. A lesson that is a command or a check must live in a
machine home (hook / verifier / gate / CI), or it WILL repeat. This hook is that home for the
red lines.

## Install

1. `cp stop-door.sh <REPO>/.claude/hooks/stop-door.sh && chmod +x` — fill the slot variables at
   the top (prod branch, repo pattern, prod worktree, protected-data regex).
2. Merge `settings-snippet.json` into `<REPO>/.claude/settings.json` (fix the path).
3. Copy `test-stop-door.sh` next to the hook, fill the same slots, run `bash test-stop-door.sh`
   until the suite is green. Extend both suites whenever a new red line (or a new bypass shape)
   is learned.

Requires `jq`. Two dead-hook mistakes to avoid (both found in the wild): the settings key is
`PreToolUse` (exact casing — `postToolUse`-style typos fail silently), and the payload arrives on
**stdin as JSON** (`.tool_input.command`) — there is no `$CLAUDE_TOOL_INPUT` env var.

## The exit-2 protocol

- Exit `0` = allow the command.
- Exit `2` = BLOCK; whatever the script wrote to **stderr is shown to the model** as feedback.
  Make that message an instruction, not just a refusal: "this is an owner-only red line —
  surface it to the owner instead of doing it." The paired loop skill should also say: a block
  is a feature, not an obstacle; routing around the hook (variables, helper scripts, encodings)
  is itself a red-line violation.

## Honesty clause — put this in your loop skill too

This is **accident-grade string matching, not an adversarial sandbox** — document it that way,
honestly. It stops the realistic failure (an agent absent-mindedly running `gh pr merge` or
`git push origin main` at 2am), not a determined adversary with `base64 | sh`. Overblocking is
acceptable, a bypass is not — hence the deliberately broad patterns (`git … push` tolerating
flags in between, quoted branch names, refspec forms) and the explicit block on
variable-refspec pushes ("resolve the branch name literally so the guard can see it"). If you
need adversarial guarantees, use OS-level permissions, not this.

## Scoping rule that keeps it livable

The prod branch is blocked as a push target **everywhere**, but the main/master block is scoped
to THIS project's repo via `REPO_PATTERN` — otherwise the hook strangles every other repo the
same agent legitimately pushes (a docs repo, a skills repo). Same idea for data deletion: match
data DIRECTORIES (`wallets/`, `backups/`), not similarly-named source files, and exempt `/tmp`
scratch.

## The test-harness lesson (learned live)

The hook fires on command **strings**. An interactive shell that tries to test the hook by
typing the forbidden commands gets blocked by the hook it is testing — the original harness was
blocked twice by its own subject. So: test suites live in FILES (`bash test-stop-door.sh`), the
`t()` function feeds each case to the hook's stdin as a real JSON payload and asserts on the
exit code, and the suite carries three sections — BLOCK (every red line + every bypass shape you
have ever seen), ALLOW (normal work the guard must not strangle), and overblocking-by-design
(documented, deliberate). The original project's suite grew to ~60 cases; every new incident
adds one.
