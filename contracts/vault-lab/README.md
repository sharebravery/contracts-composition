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
forge fmt --root contracts/vault-lab --check
forge build --root contracts/vault-lab
forge test --root contracts/vault-lab
```

## Deployment

The script reads `DEPLOYER_PRIVATE_KEY` at runtime and does not store secrets in the repository.

```bash
DEPLOYER_PRIVATE_KEY=... \
  forge script contracts/vault-lab/script/DeployBasicVault.s.sol:DeployBasicVault \
  --root contracts/vault-lab \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast
```
