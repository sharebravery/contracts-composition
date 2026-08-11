# UUPS Treasury Lab

This package demonstrates a role-controlled Treasury behind an ERC-1967 UUPS proxy.

## Scope

- V1 initializer with separate admin, treasurer and upgrade-admin roles
- ETH and ERC-20 deposits
- Single payments with a rolling one-day amount limit
- Pause for deposits and payments
- V2 allowlisted recipients and batch ETH payments
- V1 to V2 state-preservation and storage-layout tests

## Local verification

```bash
forge fmt --root contracts/treasury-lab --check
forge build --root contracts/treasury-lab
forge test --root contracts/treasury-lab
forge inspect TreasuryV1 storage-layout --root contracts/treasury-lab
forge inspect TreasuryV2 storage-layout --root contracts/treasury-lab
```

## Deployment

`DeployTreasury` reads `DEPLOYER_PRIVATE_KEY`, `TREASURY_ADMIN`, `TREASURY_TREASURER`,
`TREASURY_UPGRADE_ADMIN` and `TREASURY_DAILY_LIMIT` at runtime. `UpgradeTreasury`
reads `DEPLOYER_PRIVATE_KEY` and `TREASURY_PROXY` at runtime. No key is stored in the repository.

```bash
DEPLOYER_PRIVATE_KEY=... \
TREASURY_ADMIN=0x... \
TREASURY_TREASURER=0x... \
TREASURY_UPGRADE_ADMIN=0x... \
TREASURY_DAILY_LIMIT=5000000000000000000 \
  forge script contracts/treasury-lab/script/DeployTreasury.s.sol:DeployTreasury \
  --root contracts/treasury-lab \
  --rpc-url "$ARBITRUM_SEPOLIA_RPC_URL" \
  --broadcast
```
