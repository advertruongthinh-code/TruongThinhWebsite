#!/usr/bin/env bash
# Installs the Playwright browsers named in $BROWSERS for a CI job (ci-test-suites R11): download only (CDN, a few seconds);
# apt runs only when a browser cannot open. Do not use --with-deps: apt-get update from the Azure mirror once hung for
# 11 minutes (PR 581), and a timeout run as a normal user cannot kill apt run via sudo.
set -euo pipefail
pnpm exec playwright install $BROWSERS
probe() { for b in $BROWSERS; do node -e "require('playwright').$b.launch().then(x => x.close())" || return 1; done; }
probe || {
  sudo env "PATH=$PATH" timeout -k 10 240 node_modules/.bin/playwright install-deps $BROWSERS
  probe
}
