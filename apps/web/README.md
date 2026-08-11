# Web App

Next.js App Router 应用，提供四个 Phase 1 Lab 页面和共享钱包/交易状态。

## Local verification

```bash
pnpm --filter @onchain-contract-lab/web dev
pnpm test:e2e
```

E2E tests use the verified Arbitrum Sepolia Registry records and never sign or
broadcast transactions. Wallet write flows still require a connected wallet.

## Vercel deployment

Run from the repository root with the web app as the framework target:

```bash
vercel --cwd apps/web
vercel --prod --cwd apps/web
```

Set `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` in the Vercel project environment.
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is optional when using injected or
Coinbase wallets.
