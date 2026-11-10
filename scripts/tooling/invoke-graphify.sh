#!/usr/bin/env bash
# Linux/cloud version of invoke-graphify.ps1: installs the pinned Graphify on first use,
# refreshes the AST graph when the working tree changes, then runs the query.
#   scripts/tooling/invoke-graphify.sh query "a specific question"
set -euo pipefail

case "${1:-}" in
  query|path|explain) ;;
  *) echo "Usage: $0 query|path|explain <arguments>" >&2; exit 2 ;;
esac

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

pin="$(node -p "require('./tooling-versions.json').python.graphifyy")"
extras="$(node -p "require('./tooling-versions.json').python.graphify_extras")"
installed="$(uv tool list 2>/dev/null | awk '$1 == "graphifyy" { print $2 }')"
if [ "$installed" != "v$pin" ]; then
  uv tool install --quiet --force "graphifyy[$extras]==$pin" >&2
fi
export PATH="$(uv tool dir --bin):$PATH"

# Rebuild only when HEAD, the dirty file set, or their content changed since the last refresh.
stamp="graphify-out/.cloud-fingerprint"
fingerprint="$( { git rev-parse HEAD; git status --porcelain --untracked-files=all; git diff HEAD; git ls-files -o --exclude-standard -z | xargs -0 -r sha256sum; } | sha256sum | cut -d' ' -f1)"
if [ ! -f graphify-out/graph.json ] || [ "$(cat "$stamp" 2>/dev/null)" != "$fingerprint" ]; then
  graphify update . >&2
  echo "$fingerprint" > "$stamp"
fi

exec graphify "$@"
