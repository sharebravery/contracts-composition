# Basic Vault Lab

This package implements a minimal ERC-4626 vault for Arbitrum Sepolia exercises.

## Scope

- OpenZeppelin ERC-4626 deposit, mint, withdraw, redeem and preview methods
- Six-decimal virtual share offset for donation/inflation attack resistance
- Simulated yield by transferring additional assets to the vault
- Owner-controlled pause that blocks only deposit and mint
- No fee, cap, strategy or external protocol integration

## Local verification

```bash
pnpm contracts:install
forge fmt --root contracts/vault-lab --check
forge build --root contracts/vault-lab
forge test --root contracts/vault-lab
```

`test/BasicVaultFuzz.t.sol` fuzzes preview/rounding consistency and donation/inflation behavior. `test/BasicVaultInvariant.t.sol` runs a handler-driven invariant suite asserting vault solvency, non-zero total supply, and ERC-4626 round-trip bounds across random deposit/mint/withdraw/redeem/donate sequences.

## Deployment

The script reads `DEPLOYER_PRIVATE_KEY` at runtime and does not store secrets in the repository.

```bash
DEPLOYER_PRIVATE_KEY=... \
  forge script contracts/vault-lab/script/DeployBasicVault.s.sol:DeployBasicVault \
  --root contracts/vault-lab \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast
```
