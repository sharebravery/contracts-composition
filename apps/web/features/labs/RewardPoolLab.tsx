'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  Check,
  Coins,
  LogOut,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Address } from 'viem';
import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

import {
  ActionButton,
  ContractAddress,
  Field,
  LabPanel,
  LabPanelHeader,
  LabTabs,
  LabTabsContent,
  LabTabsList,
  LabTabsTrigger,
  MetricCell,
  StatusBadge,
} from '@onchain-contract-lab/ui';
import { useTransactionStore } from '@onchain-contract-lab/web3-react';

import { erc20Abi, rewardPoolAbi } from './abis';
import type { LabDeployment } from './registry';
import { parseTokenAmount } from './input-validation';
import { useLabTransaction } from './useLabTransaction';

function displayUnits(value: unknown, decimals: number) {
  return typeof value === 'bigint' ? formatUnits(value, decimals) : '—';
}

function formatDuration(value: unknown) {
  if (typeof value !== 'bigint') return '—';
  const seconds = Number(value);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export function RewardPoolLab({ deployment }: { deployment: LabDeployment }) {
  const { address: account, isConnected } = useAccount();
  const { chainId, run } = useLabTransaction();
  const transaction = useTransactionStore((state) => state.current);
  const [stakeInput, setStakeInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [error, setError] = useState<string>();

  const poolAddress =
    deployment.status === 'live' ? (deployment.address as Address) : undefined;
  const live = Boolean(poolAddress);
  const correctChain = chainId === 421614;

  const { data: stakingTokenAddress } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'stakingToken',
    query: { enabled: live },
  });
  const stakingToken = stakingTokenAddress as Address | undefined;
  const { data: rewardsTokenAddress } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'rewardsToken',
    query: { enabled: live },
  });
  const rewardsToken = rewardsTokenAddress as Address | undefined;
  const { data: stakingDecimals } = useReadContract({
    address: stakingToken,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: Boolean(stakingToken) },
  });
  const { data: rewardDecimals } = useReadContract({
    address: rewardsToken,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: Boolean(rewardsToken) },
  });
  const stakePrecision =
    typeof stakingDecimals === 'number' ? stakingDecimals : 18;
  const rewardPrecision =
    typeof rewardDecimals === 'number' ? rewardDecimals : 18;
  const stakeAmount = useMemo(
    () => parseTokenAmount(stakeInput, stakePrecision),
    [stakeInput, stakePrecision],
  );
  const withdrawAmount = useMemo(
    () => parseTokenAmount(withdrawInput, stakePrecision),
    [withdrawInput, stakePrecision],
  );

  const { data: duration } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'duration',
    query: { enabled: live },
  });
  const { data: periodFinish } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'periodFinish',
    query: { enabled: live },
  });
  const { data: rewardRate } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'rewardRate',
    query: { enabled: live },
  });
  const { data: totalSupply } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'totalSupply',
    query: { enabled: live },
  });
  const { data: paused } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'paused',
    query: { enabled: live },
  });
  const { data: userStake } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: earned } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'earned',
    args: account ? [account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: storedReward } = useReadContract({
    address: poolAddress,
    abi: rewardPoolAbi,
    functionName: 'rewards',
    args: account ? [account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: stakingBalance } = useReadContract({
    address: stakingToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: Boolean(stakingToken && account) },
  });
  const { data: allowance } = useReadContract({
    address: stakingToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: account && poolAddress ? [account, poolAddress] : undefined,
    query: { enabled: Boolean(stakingToken && account && poolAddress) },
  });

  const ready = live && isConnected && correctChain && Boolean(account);

  async function approve() {
    if (!ready || !stakingToken || !poolAddress || stakeAmount === undefined)
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: stakingToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [poolAddress, stakeAmount],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function stake() {
    if (!ready || !poolAddress || stakeAmount === undefined) return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: poolAddress,
          abi: rewardPoolAbi,
          functionName: 'stake',
          args: [stakeAmount],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function withdraw() {
    if (!ready || !poolAddress || withdrawAmount === undefined) return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: poolAddress,
          abi: rewardPoolAbi,
          functionName: 'withdraw',
          args: [withdrawAmount],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function claim() {
    if (!ready || !poolAddress) return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: poolAddress,
          abi: rewardPoolAbi,
          functionName: 'claim',
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function exit() {
    if (!ready || !poolAddress) return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: poolAddress,
          abi: rewardPoolAbi,
          functionName: 'exit',
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="grid gap-3">
      <LabPanel>
        <LabPanelHeader
          eyebrow="Reward telemetry"
          title="Time-weighted reward state"
          detail="The pool exposes cumulative reward accounting and current wallet accrual."
        >
          <StatusBadge tone={live ? 'success' : 'neutral'}>
            {live ? (paused ? 'Paused' : 'Live') : 'Registry pending'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Total staked"
            value={displayUnits(totalSupply, stakePrecision)}
            detail="staking units"
          />
          <MetricCell
            label="Your stake"
            value={displayUnits(userStake, stakePrecision)}
            detail="connected wallet"
          />
          <MetricCell
            label="Earned"
            value={displayUnits(earned, rewardPrecision)}
            detail="claimable estimate"
          />
          <MetricCell
            label="Reward rate"
            value={displayUnits(rewardRate, rewardPrecision)}
            detail="per second"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Wallet stake token"
            value={displayUnits(stakingBalance, stakePrecision)}
            detail="available"
          />
          <MetricCell
            label="Stored reward"
            value={displayUnits(storedReward, rewardPrecision)}
            detail="accounting state"
          />
          <MetricCell
            label="Duration"
            value={formatDuration(duration)}
            detail="reward period"
          />
          <MetricCell
            label="Period finish"
            value={
              typeof periodFinish === 'bigint'
                ? `${periodFinish.toString()} UTC`
                : '—'
            }
            detail="unix timestamp"
          />
        </div>
        <div className="mt-4 grid gap-2 border-t border-lab-line pt-4 text-xs text-lab-muted">
          <div className="flex items-center gap-2">
            <ContractAddress address={stakingToken} />
            <span>staking token</span>
          </div>
          <div className="flex items-center gap-2">
            <ContractAddress address={rewardsToken} />
            <span>rewards token</span>
          </div>
        </div>
      </LabPanel>

      <LabPanel>
        <LabPanelHeader
          eyebrow="Pool operations"
          title="Stake and manage rewards"
          detail="Approval and pool operations share the same simulation and receipt flow."
        >
          <StatusBadge tone={ready && !paused ? 'success' : 'neutral'}>
            {!live
              ? 'Registry pending'
              : !isConnected
                ? 'Connect wallet'
                : !correctChain
                  ? 'Wrong network'
                  : paused
                    ? 'Pool paused'
                    : 'Ready'}
          </StatusBadge>
        </LabPanelHeader>
        <LabTabs className="mt-5" defaultValue="stake">
          <LabTabsList>
            <LabTabsTrigger value="stake">Stake</LabTabsTrigger>
            <LabTabsTrigger value="manage">Manage</LabTabsTrigger>
          </LabTabsList>
          <LabTabsContent value="stake">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
              <div className="grid gap-4">
                <Field
                  htmlFor="reward-stake-amount"
                  label="Stake amount"
                  hint={`decimals ${stakePrecision}`}
                >
                  <input
                    className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                    id="reward-stake-amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      setStakeInput(event.currentTarget.value)
                    }
                    placeholder="100.00"
                    value={stakeInput}
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    disabled={
                      !ready ||
                      paused ||
                      stakeAmount === undefined ||
                      allowance === undefined ||
                      allowance >= stakeAmount
                    }
                    onClick={approve}
                    type="button"
                    variant="secondary"
                  >
                    <Check size={15} aria-hidden="true" />
                    Approve
                  </ActionButton>
                  <ActionButton
                    disabled={
                      !ready ||
                      paused ||
                      stakeAmount === undefined ||
                      allowance === undefined ||
                      allowance < stakeAmount
                    }
                    onClick={stake}
                    type="button"
                  >
                    <ArrowDownToLine size={15} aria-hidden="true" />
                    Stake
                  </ActionButton>
                </div>
              </div>
              <div className="grid gap-2 border border-lab-line bg-lab-soft p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-lab-muted">
                  Allowance
                </span>
                <strong className="font-mono text-xl text-lab-text">
                  {displayUnits(allowance, stakePrecision)}
                </strong>
                <span className="text-xs text-lab-muted">
                  staking token → pool
                </span>
              </div>
            </div>
          </LabTabsContent>
          <LabTabsContent value="manage">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-4">
                <Field
                  htmlFor="reward-withdraw-amount"
                  label="Withdraw amount"
                  hint={`decimals ${stakePrecision}`}
                >
                  <input
                    className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                    id="reward-withdraw-amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      setWithdrawInput(event.currentTarget.value)
                    }
                    placeholder="25.00"
                    value={withdrawInput}
                  />
                </Field>
                <ActionButton
                  disabled={!ready || withdrawAmount === undefined}
                  onClick={withdraw}
                  type="button"
                  variant="secondary"
                >
                  <ArrowUpFromLine size={15} aria-hidden="true" />
                  Withdraw
                </ActionButton>
              </div>
              <div className="grid gap-2 border border-lab-line bg-lab-soft p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-lab-muted">
                  Actions
                </span>
                <ActionButton
                  disabled={!ready || !earned || earned === 0n}
                  onClick={claim}
                  type="button"
                >
                  <BadgeDollarSign size={15} aria-hidden="true" />
                  Claim rewards
                </ActionButton>
                <ActionButton
                  disabled={!ready || !userStake || userStake === 0n}
                  onClick={exit}
                  type="button"
                  variant="secondary"
                >
                  <LogOut size={15} aria-hidden="true" />
                  Exit pool
                </ActionButton>
              </div>
            </div>
          </LabTabsContent>
        </LabTabs>
        {transaction ? (
          <div className="mt-5 border border-lab-line bg-lab-soft p-3 font-mono text-xs text-lab-softText">
            Transaction:{' '}
            <span className="text-lab-text">{transaction.status}</span>
            {transaction.hash ? (
              <span className="ml-2 break-all text-lab-muted">
                {transaction.hash}
              </span>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 break-words text-sm text-lab-danger">{error}</p>
        ) : null}
      </LabPanel>

      <LabPanel className="border-dashed">
        <div className="flex items-start gap-3 text-sm text-lab-softText">
          <Coins
            className="mt-0.5 shrink-0 text-lab-muted"
            size={17}
            aria-hidden="true"
          />
          <div>
            <strong className="font-medium text-lab-text">
              Reward accounting
            </strong>
            <p className="mt-1">
              Reward accrual is calculated by the contract from reward-per-token
              state and the current period.
            </p>
          </div>
        </div>
      </LabPanel>
    </div>
  );
}
