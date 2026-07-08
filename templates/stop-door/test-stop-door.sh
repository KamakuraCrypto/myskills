#!/usr/bin/env bash
# Test harness for stop-door.sh — the pattern that keeps the hook honest.
#
# RUN AS A FILE:  bash test-stop-door.sh
# NEVER paste these cases into an agent's interactive shell: the hook fires on command
# STRINGS, so the test strings themselves get blocked before they run (this happened live,
# twice, to the harness that first tested the hook). Test suites must live in files.
#
# Fill the same <...> values you used in stop-door.sh before running.

HOOK="$(cd "$(dirname "$0")" && pwd)/stop-door.sh"
pass=0; fail=0

t() { # t BLOCK|ALLOW '<command string>'  — feeds the hook a real PreToolUse JSON payload
  local expect="$1"; shift
  printf '{"tool_input":{"command":%s}}' "$(printf '%s' "$*" | jq -Rs .)" | bash "$HOOK" >/dev/null 2>&1
  local code=$?
  local got=ALLOW; [ "$code" -eq 2 ] && got=BLOCK
  if [ "$got" = "$expect" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL (want $expect, got $got): $*"; fi
}

# ── BLOCK suite: every red line, including the sneaky shapes ─────────────────────────────
t BLOCK 'gh pr merge 42 --squash'
t BLOCK 'gh api -X PUT repos/acme/my-app/pulls/42/merge'
t BLOCK 'curl -X PUT https://api.github.com/repos/acme/my-app/pulls/42/merge'
t BLOCK 'git push --force origin feature-x'
t BLOCK 'git push -f origin feature-x'
t BLOCK 'git push origin +feature-x'                      # +refspec force
t BLOCK 'git push origin <PROD-BRANCH>'
t BLOCK "git push origin '<PROD-BRANCH>'"                 # quoted branch name
t BLOCK 'git -C /some/tree push origin HEAD:<PROD-BRANCH>' # refspec target + flags between git and push
t BLOCK 'cd <REPO-DIR> && git push origin main'           # main/master block is scoped: the command must match REPO_PATTERN
t BLOCK 'git push origin HEAD:$TARGET'                    # variable refspec — must be resolved literally
t BLOCK 'rm -rf <A-PROTECTED-DATA-PATH>'
t BLOCK 'psql -c "DROP TABLE orders"'
t BLOCK 'psql -c "DROP TABLE test_orders; DROP TABLE orders"'  # leading test-DROP must not whitelist the live DROP
t BLOCK 'git -C <ABSOLUTE-PROD-WORKTREE-PATH> reset --hard origin/<PROD-BRANCH>'
t BLOCK 'git branch -D <PROD-BRANCH>'

# ── ALLOW suite: the guard must not strangle normal work ────────────────────────────────
t ALLOW 'git push origin feature/my-rung'
t ALLOW 'git push -u origin rung-d12'
t ALLOW 'git -C /some/other/repo push origin main'        # other repos are out of scope (REPO_PATTERN)
t ALLOW 'rm /tmp/scratch/staged.rs'
t ALLOW 'rm src/wallet_alloc.rs'                          # source files are not data dirs
t ALLOW 'psql -c "DROP TABLE test_orders"'
t ALLOW 'git -C <ABSOLUTE-PROD-WORKTREE-PATH>-dev reset --hard HEAD~1'  # dev worktree stays resettable
t ALLOW 'git branch -d feature/my-rung'
t ALLOW 'git log --oneline -5'

# ── Overblocking-by-design (string matcher, no shell parse): documented, not "fixed" ─────
t BLOCK 'echo "how does gh pr merge work?" > notes.md'    # the phrase itself trips the guard; acceptable cost

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
