#!/usr/bin/env bash
# Installs the pinned Foundry libraries (forge-std, OpenZeppelin) into every lab.
# `lib/` is gitignored, so run this after a fresh clone and in CI before `forge build`.
# Idempotent: skips a dependency that is already present.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FORGE_STD_REF="5cf980eefbf8a54050628334163127ed35453558"
OZ_REF="v5.6.1"
LABS=(airdrop reward-pool vault-lab treasury-lab)

for lab in "${LABS[@]}"; do
  dir="$REPO_ROOT/contracts/$lab"
  echo "==> Installing Foundry libs: $lab"
  (
    cd "$dir"
    [ -d lib/forge-std ] || forge install --no-git "foundry-rs/forge-std@$FORGE_STD_REF"
    [ -d lib/openzeppelin-contracts ] || forge install --no-git "OpenZeppelin/openzeppelin-contracts@$OZ_REF"
    if [ "$lab" = "treasury-lab" ]; then
      [ -d lib/openzeppelin-contracts-upgradeable ] || forge install --no-git "OpenZeppelin/openzeppelin-contracts-upgradeable@$OZ_REF"
    fi
  )
done

echo "Foundry libraries installed."
