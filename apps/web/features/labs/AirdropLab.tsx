'use client';

import { CheckCircle2, FileKey2, Gift, ShieldCheck } from 'lucide-react';
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
  MetricCell,
  StatusBadge,
} from '@onchain-contract-lab/ui';
import { useTransactionStore } from '@onchain-contract-lab/web3-react';

import { airdropAbi, erc20Abi } from './abis';
import type { LabDeployment } from './registry';
import { parseBytes32List, parseTokenAmount } from './input-validation';
import { useLabTransaction } from './useLabTransaction';

function parseIndex(value: string): bigint | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  try {
    return BigInt(value.trim());
  } catch {
    return undefined;
  }
}

function formatDate(value: unknown) {
  if (typeof value !== 'bigint') return '—';
  return `${new Date(Number(value) * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function displayUnits(value: unknown, decimals: number) {
  return typeof value === 'bigint' ? formatUnits(value, decimals) : '—';
}

export function AirdropLab({ deployment }: { deployment: LabDeployment }) {
  const { address: account, isConnected } = useAccount();
  const { chainId, run } = useLabTransaction();
  const transaction = useTransactionStore((state) => state.current);
  const [indexInput, setIndexInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [proofInput, setProofInput] = useState('');
  const [error, setError] = useState<string>();

  const airdropAddress =
    deployment.status === 'live' ? (deployment.address as Address) : undefined;
  const live = Boolean(airdropAddress);
  const correctChain = chainId === 421614;
  const index = parseIndex(indexInput);

  const { data: tokenAddress } = useReadContract({
    address: airdropAddress,
    abi: airdropAbi,
    functionName: 'token',
    query: { enabled: live },
  });
  const token = tokenAddress as Address | undefined;
  const { data: tokenDecimals } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: Boolean(token) },
  });
  const { data: tokenSymbol } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: Boolean(token) },
  });
  const decimals = typeof tokenDecimals === 'number' ? tokenDecimals : 18;
  const amount = useMemo(
    () => parseTokenAmount(amountInput, decimals),
    [amountInput, decimals],
  );
  const proof = parseBytes32List(proofInput);

  const { data: merkleRoot } = useReadContract({
    address: airdropAddress,
    abi: airdropAbi,
    functionName: 'merkleRoot',
    query: { enabled: live },
  });
  const { data: deadline } = useReadContract({
    address: airdropAddress,
    abi: airdropAbi,
    functionName: 'deadline',
    query: { enabled: live },
  });
  const { data: isClaimed } = useReadContract({
    address: airdropAddress,
    abi: airdropAbi,
    functionName: 'isClaimed',
    args: index === undefined ? undefined : [index],
    query: { enabled: live && index !== undefined },
  });
  const { data: walletBalance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: Boolean(token && account) },
  });
  const { data: poolBalance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: airdropAddress ? [airdropAddress] : undefined,
    query: { enabled: Boolean(token && airdropAddress) },
  });

  const ready = live && isConnected && correctChain && Boolean(account);

  async function claim() {
    if (
      !ready ||
      !airdropAddress ||
      index === undefined ||
      amount === undefined ||
      proof === undefined
    )
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: airdropAddress,
          abi: airdropAbi,
          functionName: 'claim',
          args: [index, amount, proof],
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
          eyebrow="Distribution telemetry"
          title="Merkle claim state"
          detail="Root, deadline, and balances are read from the verified airdrop address."
        >
          <StatusBadge tone={live ? 'success' : 'neutral'}>
            {live ? 'Live' : 'Registry pending'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Token"
            value={typeof tokenSymbol === 'string' ? tokenSymbol : '—'}
            detail={`${decimals} decimals`}
          />
          <MetricCell
            label="Pool balance"
            value={displayUnits(poolBalance, decimals)}
            detail="claim inventory"
          />
          <MetricCell
            label="Wallet balance"
            value={displayUnits(walletBalance, decimals)}
            detail="connected wallet"
          />
          <MetricCell
            label="Deadline"
            value={formatDate(deadline)}
            detail="UTC"
          />
        </div>
        <div className="mt-2 grid gap-2 border-t border-lab-line pt-4">
          <div className="flex items-start gap-2 text-xs text-lab-muted">
            <FileKey2
              className="mt-0.5 shrink-0"
              size={15}
              aria-hidden="true"
            />
            <span className="break-all font-mono">
              Merkle root:{' '}
              {typeof merkleRoot === 'string' ? merkleRoot : 'Not available'}
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-lab-muted">
            <ContractAddress address={token} />
            <span>distribution token</span>
          </div>
        </div>
      </LabPanel>

      <LabPanel>
        <LabPanelHeader
          eyebrow="Claim operation"
          title="Submit a Merkle proof"
          detail="The proof is simulated before the wallet signature. Values are parsed using token decimals."
        >
          <StatusBadge tone={ready ? 'success' : 'neutral'}>
            {!live
              ? 'Registry pending'
              : !isConnected
                ? 'Connect wallet'
                : !correctChain
                  ? 'Wrong network'
                  : isClaimed
                    ? 'Already claimed'
                    : 'Ready'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field htmlFor="airdrop-index" label="Claim index">
            <input
              className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
              id="airdrop-index"
              inputMode="numeric"
              onChange={(event) => setIndexInput(event.currentTarget.value)}
              placeholder="7"
              value={indexInput}
            />
          </Field>
          <Field
            htmlFor="airdrop-amount"
            label="Claim amount"
            hint={`decimals ${decimals}`}
          >
            <input
              className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
              id="airdrop-amount"
              inputMode="decimal"
              onChange={(event) => setAmountInput(event.currentTarget.value)}
              placeholder="100.00"
              value={amountInput}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field
            htmlFor="airdrop-proof"
            label="Merkle proof"
            hint="bytes32 values, comma or space separated"
          >
            <textarea
              className="min-h-28 w-full resize-y border border-lab-line bg-lab-soft px-3 py-2 font-mono text-xs text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
              id="airdrop-proof"
              onChange={(event) => setProofInput(event.currentTarget.value)}
              placeholder="0x…"
              value={proofInput}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-lab-muted">
              {isClaimed ? (
                <CheckCircle2 size={15} aria-hidden="true" />
              ) : (
                <ShieldCheck size={15} aria-hidden="true" />
              )}
              <span>
                {isClaimed
                  ? 'This index is already claimed'
                  : 'Proof checked on-chain'}
              </span>
            </div>
            <ActionButton
              disabled={
                !ready ||
                Boolean(isClaimed) ||
                index === undefined ||
                amount === undefined ||
                proof === undefined
              }
              onClick={claim}
              type="button"
            >
              <Gift size={15} aria-hidden="true" />
              Claim tokens
            </ActionButton>
          </div>
        </div>
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
    </div>
  );
}
