# Staking Reward Pool

Phase 1 Core MVP lab for time-based reward distribution, multi-user share accounting, reward-period rollover, and pause behavior.

## Contract

`StakingRewards` uses the cumulative `rewardPerToken` model with these explicit accounting fields:

```text
rewardPerTokenStored
userRewardPerTokenPaid
rewards
lastUpdateTime
rewardRate
periodFinish
```

The administrator must fund the pool with reward tokens before calling `notifyRewardAmount`. The function refuses to create a period when the pool balance cannot cover the resulting reward rate. Calling it during an active period merges the remaining scheduled rewards with the new amount.

Pause only blocks new `stake` calls. `withdraw`, `claim`, and `exit` remain available so users can leave or collect rewards during an operational pause.

## Accounting safeguards

- **Fee-on-transfer staking tokens.** `stake` credits the amount actually received (`balanceAfter - balanceBefore`), not the nominal `amount`, so a fee-on-transfer token cannot inflate `balanceOf` / `totalSupply` beyond real holdings and drain the pool. Outgoing transfers (`withdraw`, `claim`) on fee-on-transfer tokens leave dust in the pool favorably (the contract never owes more than it holds). Rebasing or non-standard tokens are out of scope.
- **Stake token == reward token.** When the two tokens are the same, staked principal sits in the same balance as reward backing. `notifyRewardAmount` subtracts `totalSupply` from the reward-token balance before the sufficiency check, so principal is never counted as reward backing and claims cannot drain deposits.

## Local verification

```bash
pnpm contracts:install
pnpm contracts:reward-fmt
pnpm contracts:reward-build
pnpm contracts:reward-test
```

## Deployment inputs

`script/DeployRewardPool.s.sol` reads these environment variables at runtime:

```text
DEPLOYER_PRIVATE_KEY
REWARD_FUNDING_AMOUNT
REWARD_DURATION
```

Do not put these values in the repository or documentation. The deployment script uses mock tokens for the public teaching lab and prints addresses after a successful broadcast.
