#!/usr/bin/env bash
# Bản Linux/cloud của invoke-graphify.ps1: cài Graphify đã pin ở lần dùng đầu,
# refresh AST graph khi working tree đổi, rồi chạy query.
#   scripts/tooling/invoke-graphify.sh query "câu hỏi cụ thể"
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

# Chỉ rebuild khi HEAD, tập file dirty hoặc nội dung của chúng đổi kể từ lần refresh trước.
stamp="graphify-out/.cloud-fingerprint"
fingerprint="$( { git rev-parse HEAD; git status --porcelain --untracked-files=all; git diff HEAD; git ls-files -o --exclude-standard -z | xargs -0 -r sha256sum; } | sha256sum | cut -d' ' -f1)"
if [ ! -f graphify-out/graph.json ] || [ "$(cat "$stamp" 2>/dev/null)" != "$fingerprint" ]; then
  graphify update . >&2
  echo "$fingerprint" > "$stamp"
fi

exec graphify "$@"
