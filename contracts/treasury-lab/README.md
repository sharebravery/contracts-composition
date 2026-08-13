# UUPS Treasury Lab

This package demonstrates a role-controlled Treasury behind an ERC-1967 UUPS proxy.

## Scope

- V1 initializer with separate admin, treasurer and upgrade-admin roles
- ETH and ERC-20 deposits
- ETH payments against a rolling one-day limit (V1)
- V2 per-asset accounting: ETH keeps V1's limit slots; each ERC-20 gets its own rolling daily limit, opted in via `setERC20DailyLimit` (default zero, so ERC-20 payments are blocked until configured)
- Allowlisted recipients and batch ETH payments (V2)
- Pause for deposits and payments
- V1 to V2 state-preservation and storage-layout compatibility tests

## Design notes

- **Per-asset limits.** V1 shared one `dailyLimit` across ETH and every ERC-20. V2 separates them: ETH reuses V1's `dailyLimit` / `spentToday` / `dayStart` slots (no migration needed on upgrade), and each ERC-20 token gets an independent `AssetLimit` mapping entry appended at a new storage slot.
- **No underflow on lowering a limit.** `setDailyLimit` / `setERC20DailyLimit` may lower a limit below what has already been spent in the current window. The remainder is clamped to zero (`spent > limit ? 0 : limit - spent`) so `remainingDailyLimit()` never reverts and further payments fail cleanly with `DailyLimitExceeded` until the window rolls over.
- **ReentrancyGuard.** OpenZeppelin 5.6's `ReentrancyGuard` is stateless (it lives in a fixed storage slot via `StorageSlot` and does not appear in the contract storage layout), so it is safe to use directly in an upgradeable contract. The `*Upgradeable` variant is no longer shipped.
- **Storage compatibility.** `pnpm contracts:treasury-layout` runs `contracts/treasury-lab/script/validate-storage-layout.ts`, which asserts V1's storage entries (label/slot/offset/type) are an ordered prefix of V2's. The behavioral upgrade path is covered by `TreasuryUpgrade.t.sol`.

The on-chain Arbitrum Sepolia proxy currently runs V1. V2 is the upgrade target via `script/UpgradeTreasury.s.sol`.

## Local verification

```bash
pnpm contracts:install
forge fmt --root contracts/treasury-lab --check
forge build --root contracts/treasury-lab
forge test --root contracts/treasury-lab
pnpm contracts:treasury-layout
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
