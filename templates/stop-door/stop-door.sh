#!/usr/bin/env bash
# STOP-door: mechanical enforcement of the project loop's red lines.
# PreToolUse hook for Bash. Reads the tool payload as JSON on STDIN
# (NOT an env var — that's a known dead-hook mistake; see README.md).
# Exit 0 = allow. Exit 2 = BLOCK (stderr is shown to the model as feedback).
# Red lines (owner policy): never merge; never push to <PROD-BRANCH> or to main/master of THIS
# project's repo; never force-push; never delete protected data (keys/backups/DBs); never
# drop/truncate a non-test database; never hard-reset the prod worktree.

# ── PROJECT SLOTS (fill these; keep patterns grep -E compatible) ──────────────────────────
PROD_BRANCH='<PROD-BRANCH>'                 # blocked as a push target EVERYWHERE
PROTECTED_BRANCHES='<PROD-BRANCH>|<DEV-BRANCH>'   # blocked from deletion
REPO_PATTERN='<REPO-DIR-OR-SLUG-REGEX>'     # e.g. '(my-app|acme/my-app)' — scopes the main/master
                                            # push block to THIS repo (other repos stay pushable)
PROD_WORKTREE='<ABSOLUTE-PROD-WORKTREE-PATH>'  # regex-escaped if it contains special chars
DATA_PATTERNS='<PROTECTED-DATA-REGEX>'      # e.g. 'wallets?/|backups?/|\.ssh/|id_rsa|keypair.*\.json|data/[^ ]*\.db'
# ──────────────────────────────────────────────────────────────────────────────────────────

set -u
payload="$(cat 2>/dev/null || true)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -z "$cmd" ] && exit 0

block() { echo "STOP-DOOR BLOCKED: $1 — this is an owner-only red line. Surface it to the owner instead of doing it." >&2; exit 2; }

# Normalize whitespace for matching
c=" $(printf '%s' "$cmd" | tr '\n' ' ' | tr -s ' ') "

# 1) Merging is always the owner's click — CLI and REST API forms alike.
printf '%s' "$c" | grep -qiE 'gh +pr +merge' && block "'gh pr merge' (owner merges every rung)"
printf '%s' "$c" | grep -qiE 'gh +api[^;|&]*/(pulls|pull)/[^;|&]*/merge' && block "PR merge via the REST API (owner merges every rung)"
printf '%s' "$c" | grep -qiE '(curl|wget)[^;|&]*api\.github\.com[^;|&]*/merge' && block "PR merge via raw GitHub API (owner merges every rung)"

# 2) Force-push anywhere; any push to <PROD-BRANCH>/main/master (explicit ref or refspec).
#    Deliberately broad (\bgit\b[^;|&]*\bpush\b tolerates flags like -c/-C/--work-tree between
#    git and push, and quoted branch names): overblocking is acceptable, a bypass is not.
printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b[^;|&]*(--force|--force-with-lease|-f[a-z]* )' && block "force-push"
printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b[^;|&]* \+[^ ;|&]+' && block "force-push via +refspec"
# The prod branch is blocked EVERYWHERE; main/master only for THIS project's repo (other repos
# may be pushed at the owner's request — the owner-merges-every-rung policy is project-scoped).
printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b[^;|&]*( |:|/|\+)['"'"'"]?'"$PROD_BRANCH"'['"'"'"]?( |$|;)' && block "push to prod branch $PROD_BRANCH"
printf '%s' "$c" | grep -qE "$REPO_PATTERN" \
  && printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b[^;|&]*( |:|/|\+)['"'"'"]?(main|master)['"'"'"]?( |$|;)' && block "push to main/master of the project repo"
printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b[^;|&]*:\$' && block "push with a variable refspec target (resolve the branch name literally so the guard can see it)"
# Bare 'git push' executed against the PROD worktree (its checked-out branch IS the prod branch).
printf '%s' "$c" | grep -qE "($PROD_WORKTREE([/ '\"]|\$))" \
  && printf '%s' "$c" | grep -qE '\bgit\b[^;|&]*\bpush\b' && block "git push touching the PROD worktree"

# 3) Destroying protected data (keys / backups / DBs) — DATA paths, not source files or /tmp
#    scratch. (Patterns with a trailing slash = the data dirs; similarly-named source files and
#    /tmp/* test fixtures stay fair game.)
if printf '%s' "$c" | grep -qE '\b(rm|shred|unlink|find[^;|&]*-delete)\b'; then
  printf '%s' "$c" | grep -qE '\b(rm|shred|unlink|find)\b[^;|&]*('"$DATA_PATTERNS"')' \
    && ! printf '%s' "$c" | grep -qE '\b(rm|shred|unlink|find)\b[^;|&]*/tmp/' \
    && block "delete/shred on protected data paths"
fi
# Destructive SQL: the test-exception must live in the dropped OBJECT itself, checked for EVERY
# destructive statement in the command (a leading test-DROP must not whitelist a later live DROP).
if printf '%s' "$c" | grep -qiE '\b(DROP +(DATABASE|TABLE)|TRUNCATE +TABLE)\b'; then
  while IFS= read -r sqlobj; do
    [ -z "$sqlobj" ] && continue
    printf '%s' "$sqlobj" | grep -qiE 'test' || block "destructive SQL on a non-test database/table ($sqlobj)"
  done <<SQLEOF
$(printf '%s' "$c" | grep -oiE '(DROP +(DATABASE|TABLE)( +IF +EXISTS)?|TRUNCATE +TABLE) +[`"'"'"']?[A-Za-z0-9_.$-]+')
SQLEOF
fi

# 4) Rewriting prod history / deleting protected branches.
#    Any hard-reset in a command that references the PROD worktree path. If your dev worktree is
#    the prod path plus a suffix (e.g. "<prod>-dev"), append ([^-]|$) to the pattern so the dev
#    tree stays resettable.
printf '%s' "$c" | grep -qE '\breset\b[^;|&]*--hard' \
  && printf '%s' "$c" | grep -qE "$PROD_WORKTREE"'([^-]|$)' && block "hard-reset touching the prod worktree"
printf '%s' "$c" | grep -qE 'git( +-C +[^ ]+)? +branch +(-D|-d) +('"$PROTECTED_BRANCHES"')( |$)' && block "deleting a protected branch"

exit 0
