#!/usr/bin/env bash
# Cài cjxl, djxl ghim trong tooling-versions.json (runtimes.libjxl) vào .tooling/libjxl/tools, kiểm SHA-256 trước khi giải nén.
# build-image-variants.mjs tự dùng bản này; chỉ Linux x86_64 (cloud).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
read -r version url sha < <(node -e 'const p=require(process.argv[1]).runtimes.libjxl; console.log(p.version, p.url, p.sha256)' "$root/tooling-versions.json")
dest="$root/.tooling/libjxl"
if "$dest/tools/cjxl" --version 2>/dev/null | grep -q "v$version"; then echo "libjxl $version đã có"; exit 0; fi
mkdir -p "$dest"
curl -fsSL "$url" -o "$dest/libjxl.tar.gz"
echo "$sha  $dest/libjxl.tar.gz" | sha256sum -c --quiet
tar -xzf "$dest/libjxl.tar.gz" -C "$dest" tools/cjxl tools/djxl
rm "$dest/libjxl.tar.gz"
"$dest/tools/cjxl" --version | head -1
