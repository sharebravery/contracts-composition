# Onchain Contract Lab

A practical EVM contract laboratory with four focused examples: Merkle airdrops, time-based staking rewards, ERC-4626 vault accounting, and an upgradeable treasury.

The project is deployed to Arbitrum Sepolia for public testnet inspection. It is educational software and is not intended for production funds.

## Included Labs

- **Merkle Airdrop**: bitmap claims, Merkle proofs, EIP-712 relayed claims, nonces, and deadlines.
- **Reward Pool**: time-based rewards, multiple stakers, share accounting, pause behavior, and reward-period rollover.
- **Basic Vault**: ERC-4626 deposits, withdrawals, previews, rounding, and donation/inflation behavior.
- **Upgradeable Treasury**: UUPS proxy upgrades, role checks, daily limits, allowlists, and batch payments.

Each lab includes Solidity contracts, Foundry tests, deployment scripts, verified deployment metadata, and a browser interface.

## Network

The active deployment network is Arbitrum Sepolia, chain ID `421614`.

| Lab         | Contract         | Address                                                                                            |
| ----------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| Airdrop     | `MerkleAirdrop`  | [`0x30ca...b34b2`](https://sepolia.arbiscan.io/address/0x30CA98D4fcd46c8Da135236a052c54ddDfbb34b2) |
| Reward Pool | `StakingRewards` | [`0x4821...5033`](https://sepolia.arbiscan.io/address/0x4821a93178ACcbC632E69Bf1a53d569147D95033)  |
| Vault       | `BasicVault`     | [`0x84e1...0550`](https://sepolia.arbiscan.io/address/0x84e1d9A19FE4F2f7694D6293175cBE6da5aF0550)  |
| Treasury    | `TreasuryProxy`  | [`0x5af5...cC25`](https://sepolia.arbiscan.io/address/0x5af5083a2e144Ca0527708266BA930E65d16cC25)  |

Deployment metadata is stored in `packages/contract-registry/deployments/421614.json`.

## Requirements

- Node.js 22 or newer
- pnpm 10.6.3
- Foundry for Solidity builds and tests

## Local Setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Set `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` in `.env.local` before opening the web app. WalletConnect is optional when using an injected wallet or Coinbase Wallet.

The app is available at `http://localhost:3000`.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm registry:validate
pnpm --filter @onchain-contract-lab/web build
pnpm test:e2e

pnpm contracts:fmt
pnpm contracts:test
pnpm contracts:reward-test
pnpm contracts:vault-test
pnpm contracts:treasury-test
pnpm contracts:treasury-layout
```

The browser tests read the verified testnet deployments and never sign or broadcast transactions.

## License

MIT. See [LICENSE](LICENSE).
