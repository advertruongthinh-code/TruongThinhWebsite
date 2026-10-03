#!/usr/bin/env bash
# Linux/cloud counterpart of invoke-graphify.ps1: installs the pinned Graphify on first
# use, refreshes the AST graph when the working tree changed, then runs the query.
#   scripts/tooling/invoke-graphify.sh query "specific question"
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

# Rebuild only when HEAD or the dirty file set changed since the last refresh.
stamp="graphify-out/.cloud-fingerprint"
fingerprint="$( { git rev-parse HEAD; git status --porcelain --untracked-files=all; } | sha256sum | cut -d' ' -f1)"
if [ ! -f graphify-out/graph.json ] || [ "$(cat "$stamp" 2>/dev/null)" != "$fingerprint" ]; then
  graphify update . >&2
  echo "$fingerprint" > "$stamp"
fi

exec graphify "$@"
