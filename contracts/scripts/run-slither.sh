#!/usr/bin/env bash
# Runs Slither static analysis on every Foundry lab and fails on high-severity findings.
#
# Requires `forge` and `slither` on PATH. Install Slither locally with:
#   python3 -m venv .venv && .venv/bin/pip install slither-analyzer
#   PATH="$PWD/.venv/bin:$PATH" pnpm contracts:slither
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG="$REPO_ROOT/contracts/slither.config.json"
LABS=(airdrop reward-pool vault-lab treasury-lab)

for lab in "${LABS[@]}"; do
  dir="$REPO_ROOT/contracts/$lab"
  echo "==> Slither: $lab"
  forge build --root "$dir"
  (cd "$dir" && slither . --config-file "$CONFIG" --foundry-out-dir out --fail-high)
done

echo "Slither: all labs passed (no high-severity findings)."
