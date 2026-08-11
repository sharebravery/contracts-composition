# Contributing

Thanks for improving Onchain Contract Lab.

## Development

1. Install Node.js 22, pnpm 10.6.3, and Foundry.
2. Copy `.env.local.example` to `.env.local` and add only local testnet configuration.
3. Run the relevant unit, contract, and browser tests before opening a pull request.
4. Keep secrets, local deployment artifacts, generated output, and personal environment files out of commits.

## Pull Requests

- Explain the behavior change and the affected lab.
- Include tests for contract behavior and user-facing interaction changes.
- Keep contract changes and deployment metadata updates explicit.
- Do not use real funds or production keys for local development.

## Commit Scope

Avoid unrelated formatting or generated-file changes. Changes should be small enough to review against the affected contract or UI flow.
