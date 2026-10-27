#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): format the touched file with Prettier and lint it with ESLint.
# Remaining ESLint errors are reported back to Claude (exit 2) so it can fix them.

file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[ -z "$file" ] && exit 0

project="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$file" in
  "$project"/*) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "$project" || exit 0

# Prettier formats every supported type (TS/TSX, JS, MD, CSS, JSON...) and skips the rest.
npx --no-install prettier --write --ignore-unknown --log-level warn "$file" >/dev/null 2>&1

case "$file" in
  *.js | *.jsx | *.mjs | *.cjs | *.ts | *.tsx | *.mts | *.cts)
    if ! out=$(npx --no-install eslint --fix --no-warn-ignored "$file" 2>&1); then
      echo "ESLint found problems in $file:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
