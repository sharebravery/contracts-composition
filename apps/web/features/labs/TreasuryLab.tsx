'use client';

import {
  ArrowUpRight,
  Check,
  ListChecks,
  ShieldCheck,
  Send,
  ServerCog,
} from 'lucide-react';
import { useState } from 'react';
import type { Address } from 'viem';
import { formatEther, isAddress, keccak256, parseEther, toBytes } from 'viem';
import { useAccount, useBalance, useReadContract } from 'wagmi';

import {
  ActionButton,
  DataRow,
  Field,
  LabPanel,
  LabPanelHeader,
  MetricCell,
  StatusBadge,
} from '@onchain-contract-lab/ui';
import { useTransactionStore } from '@onchain-contract-lab/web3-react';

import { treasuryAbi } from './abis';
import type { LabDeployment } from './registry';
import { useLabTransaction } from './useLabTransaction';

const TREASURER_ROLE = keccak256(toBytes('TREASURER_ROLE'));
const UPGRADE_ADMIN_ROLE = keccak256(toBytes('UPGRADE_ADMIN_ROLE'));
const DEFAULT_ADMIN_ROLE = `0x${'0'.repeat(64)}` as `0x${string}`;

function displayEther(value: unknown) {
  return typeof value === 'bigint' ? formatEther(value) : '—';
}

function parseRecipients(value: string): Address[] | undefined {
  const values = value.split(/[\s,]+/).filter(Boolean);
  if (!values.length || values.some((item) => !isAddress(item))) return;
  return values as Address[];
}

function parseAmounts(value: string): bigint[] | undefined {
  const values = value.split(/[\s,]+/).filter(Boolean);
  if (!values.length) return;
  try {
    const amounts = values.map((item) => parseEther(item));
    return amounts.every((item) => item > 0n) ? amounts : undefined;
  } catch {
    return undefined;
  }
}

export function TreasuryLab({ deployment }: { deployment: LabDeployment }) {
  const { address: account, isConnected } = useAccount();
  const { chainId, run } = useLabTransaction();
  const transaction = useTransactionStore((state) => state.current);
  const [recipientInput, setRecipientInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [allowlistRecipientInput, setAllowlistRecipientInput] = useState('');
  const [batchRecipientsInput, setBatchRecipientsInput] = useState('');
  const [batchAmountsInput, setBatchAmountsInput] = useState('');
  const [error, setError] = useState<string>();

  const treasuryAddress =
    deployment.status === 'live' ? (deployment.address as Address) : undefined;
  const live = Boolean(treasuryAddress);
  const correctChain = chainId === 421614;
  const amount = (() => {
    try {
      return amountInput.trim() ? parseEther(amountInput) : undefined;
    } catch {
      return undefined;
    }
  })();
  const recipient = isAddress(recipientInput) ? recipientInput : undefined;
  const allowlistRecipient = isAddress(allowlistRecipientInput)
    ? allowlistRecipientInput
    : undefined;
  const batchRecipients = parseRecipients(batchRecipientsInput);
  const batchAmounts = parseAmounts(batchAmountsInput);

  const { data: balance } = useBalance({
    address: treasuryAddress,
    query: { enabled: live },
  });
  const { data: version } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'version',
    query: { enabled: live },
  });
  const isV2 = typeof version === 'bigint' && version >= 2n;
  const { data: dailyLimit } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'dailyLimit',
    query: { enabled: live },
  });
  const { data: spentToday } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'spentToday',
    query: { enabled: live },
  });
  const { data: remainingLimit } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'remainingDailyLimit',
    query: { enabled: live },
  });
  const { data: isTreasurer } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'hasRole',
    args: account ? [TREASURER_ROLE, account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: isUpgradeAdmin } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'hasRole',
    args: account ? [UPGRADE_ADMIN_ROLE, account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: isDefaultAdmin } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'hasRole',
    args: account ? [DEFAULT_ADMIN_ROLE, account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: allowlisted } = useReadContract({
    address: treasuryAddress,
    abi: treasuryAbi,
    functionName: 'isAllowlisted',
    args: allowlistRecipient ? [allowlistRecipient] : undefined,
    query: { enabled: live && isV2 && Boolean(allowlistRecipient) },
  });

  const ready =
    live &&
    isConnected &&
    correctChain &&
    Boolean(account) &&
    Boolean(isTreasurer);

  async function pay() {
    if (
      !ready ||
      !treasuryAddress ||
      !account ||
      !recipient ||
      amount === undefined
    )
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: 'payETH',
          args: [recipient as Address, amount],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function updateAllowlist() {
    if (
      !ready ||
      !isV2 ||
      !isDefaultAdmin ||
      !treasuryAddress ||
      !allowlistRecipient
    )
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: 'setAllowlisted',
          args: [allowlistRecipient, !allowlisted],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function batchPay() {
    if (
      !ready ||
      !isV2 ||
      !treasuryAddress ||
      !batchRecipients ||
      !batchAmounts ||
      batchRecipients.length !== batchAmounts.length
    )
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: treasuryAddress,
          abi: treasuryAbi,
          functionName: 'batchPayETH',
          args: [batchRecipients, batchAmounts],
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
          eyebrow="Proxy telemetry"
          title="UUPS Treasury state"
          detail="Proxy and implementation metadata come from the verified Registry record."
        >
          <StatusBadge tone={live ? 'success' : 'neutral'}>
            {live ? 'Live' : 'Registry pending'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Version"
            value={typeof version === 'bigint' ? version.toString() : '—'}
            detail="proxy view"
          />
          <MetricCell
            label="Treasury ETH"
            value={balance ? formatEther(balance.value) : '—'}
            detail="native balance"
          />
          <MetricCell
            label="Daily limit"
            value={displayEther(dailyLimit)}
            detail="payment window"
          />
          <MetricCell
            label="Remaining"
            value={displayEther(remainingLimit)}
            detail="current window"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricCell
            label="Spent today"
            value={displayEther(spentToday)}
            detail="rolling state"
          />
          <MetricCell
            label="Upgrade admin"
            value={isUpgradeAdmin ? 'Connected' : '—'}
            detail="role status"
          />
        </div>
        <div className="mt-5 grid gap-2 border-t border-lab-line pt-5">
          <DataRow
            label="Proxy"
            value={
              <span className="break-all font-mono text-xs text-lab-softText">
                {treasuryAddress ?? 'Not deployed'}
              </span>
            }
          />
          <DataRow
            label="Implementation"
            value={
              <span className="break-all font-mono text-xs text-lab-softText">
                {deployment.status === 'live'
                  ? (deployment.implementationAddress ?? 'Not recorded')
                  : 'Not deployed'}
              </span>
            }
          />
        </div>
      </LabPanel>

      <LabPanel>
        <LabPanelHeader
          eyebrow="Treasurer operation"
          title="Send ETH"
          detail="Only the on-chain Treasurer role can submit payments."
        >
          <StatusBadge tone={ready ? 'success' : 'neutral'}>
            {!live
              ? 'Registry pending'
              : !isConnected
                ? 'Connect wallet'
                : !correctChain
                  ? 'Wrong network'
                  : !isTreasurer
                    ? 'Treasurer role required'
                    : 'Ready'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field htmlFor="treasury-recipient" label="Recipient">
            <input
              className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
              id="treasury-recipient"
              onChange={(event) =>
                setRecipientInput(
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
              placeholder="0x…"
              value={recipientInput}
            />
          </Field>
          <Field htmlFor="treasury-amount" label="Amount" hint="ETH">
            <input
              className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
              id="treasury-amount"
              inputMode="decimal"
              onChange={(event) =>
                setAmountInput((event.currentTarget as HTMLInputElement).value)
              }
              placeholder="0.00"
              value={amountInput}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-lab-muted">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Simulation runs before signature</span>
          </div>
          <ActionButton
            disabled={
              !ready || !recipient || amount === undefined || amount <= 0n
            }
            onClick={pay}
            type="button"
          >
            <Send size={15} aria-hidden="true" />
            Send payment
          </ActionButton>
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

      <LabPanel className="border-dashed">
        <LabPanelHeader
          eyebrow="Version 2 surface"
          title="Allowlist and batch payments"
          detail="These controls remain read-only until the verified proxy reports version 2."
        >
          <StatusBadge tone={isV2 ? 'success' : 'neutral'}>
            {isV2 ? 'V2 active' : 'V2 pending'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4 border border-lab-line bg-lab-soft p-4">
            <div className="flex items-center gap-2 text-sm text-lab-text">
              <ServerCog size={16} aria-hidden="true" />
              <strong className="font-medium">Recipient allowlist</strong>
            </div>
            <Field htmlFor="treasury-allowlist-recipient" label="Recipient">
              <input
                className="min-h-11 w-full border border-lab-line bg-lab-bg px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                id="treasury-allowlist-recipient"
                onChange={(event) =>
                  setAllowlistRecipientInput(
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
                placeholder="0x…"
                value={allowlistRecipientInput}
              />
            </Field>
            <div className="flex items-center justify-between gap-3 text-xs text-lab-muted">
              <span>
                {allowlisted === undefined
                  ? 'No allowlist state loaded'
                  : allowlisted
                    ? 'Currently allowlisted'
                    : 'Currently blocked'}
              </span>
              <ActionButton
                disabled={
                  !ready || !isV2 || !isDefaultAdmin || !allowlistRecipient
                }
                onClick={updateAllowlist}
                type="button"
                variant="secondary"
              >
                <Check size={15} aria-hidden="true" />
                {allowlisted ? 'Remove' : 'Allow'}
              </ActionButton>
            </div>
          </div>

          <div className="grid gap-4 border border-lab-line bg-lab-soft p-4">
            <div className="flex items-center gap-2 text-sm text-lab-text">
              <ListChecks size={16} aria-hidden="true" />
              <strong className="font-medium">Batch payment</strong>
            </div>
            <Field
              htmlFor="treasury-batch-recipients"
              label="Recipients"
              hint="comma or space separated"
            >
              <textarea
                className="min-h-24 w-full resize-y border border-lab-line bg-lab-bg px-3 py-2 font-mono text-xs text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                id="treasury-batch-recipients"
                onChange={(event) =>
                  setBatchRecipientsInput(
                    (event.currentTarget as HTMLTextAreaElement).value,
                  )
                }
                placeholder="0x…\n0x…"
                value={batchRecipientsInput}
              />
            </Field>
            <Field
              htmlFor="treasury-batch-amounts"
              label="Amounts"
              hint="ETH, same order"
            >
              <input
                className="min-h-11 w-full border border-lab-line bg-lab-bg px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                id="treasury-batch-amounts"
                inputMode="decimal"
                onChange={(event) =>
                  setBatchAmountsInput(
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
                placeholder="0.01, 0.02"
                value={batchAmountsInput}
              />
            </Field>
            <ActionButton
              disabled={
                !ready ||
                !isV2 ||
                !batchRecipients ||
                !batchAmounts ||
                batchRecipients.length !== batchAmounts.length
              }
              onClick={batchPay}
              type="button"
            >
              <Send size={15} aria-hidden="true" />
              Send batch
            </ActionButton>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 text-xs text-lab-muted">
          <ArrowUpRight
            className="mt-0.5 shrink-0"
            size={15}
            aria-hidden="true"
          />
          <span>
            Each batch recipient must be allowlisted by the V2 implementation.
          </span>
        </div>
      </LabPanel>
    </div>
  );
}
