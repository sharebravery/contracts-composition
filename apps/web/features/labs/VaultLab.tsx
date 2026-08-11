'use client';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  FlaskConical,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Address } from 'viem';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

import {
  ActionButton,
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

import { erc20Abi, vaultAbi } from './abis';
import type { LabDeployment } from './registry';
import { useLabTransaction } from './useLabTransaction';

function parseAmount(value: string, decimals: number): bigint | undefined {
  if (!value.trim()) return undefined;
  try {
    const amount = parseUnits(value, decimals);
    return amount > 0n ? amount : undefined;
  } catch {
    return undefined;
  }
}

function displayValue(value: unknown, decimals = 18) {
  return typeof value === 'bigint' ? formatUnits(value, decimals) : '—';
}

export function VaultLab({ deployment }: { deployment: LabDeployment }) {
  const { address: account, isConnected } = useAccount();
  const { chainId, run } = useLabTransaction();
  const transaction = useTransactionStore((state) => state.current);
  const [depositInput, setDepositInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [error, setError] = useState<string>();

  const vaultAddress =
    deployment.status === 'live' ? (deployment.address as Address) : undefined;
  const live = Boolean(vaultAddress);
  const correctChain = chainId === 421614;

  const { data: assetAddress } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'asset',
    query: { enabled: live },
  });
  const asset = assetAddress as Address | undefined;
  const { data: assetDecimals } = useReadContract({
    address: asset,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: Boolean(asset) },
  });
  const { data: vaultDecimals } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'decimals',
    query: { enabled: live },
  });
  const assetPrecision = typeof assetDecimals === 'number' ? assetDecimals : 18;
  const sharePrecision = typeof vaultDecimals === 'number' ? vaultDecimals : 18;

  const depositAmount = useMemo(
    () => parseAmount(depositInput, assetPrecision),
    [assetPrecision, depositInput],
  );
  const withdrawAmount = useMemo(
    () => parseAmount(withdrawInput, assetPrecision),
    [assetPrecision, withdrawInput],
  );
  const redeemAmount = useMemo(
    () => parseAmount(redeemInput, sharePrecision),
    [redeemInput, sharePrecision],
  );

  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'totalAssets',
    query: { enabled: live },
  });
  const { data: totalShares } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'totalSupply',
    query: { enabled: live },
  });
  const { data: userShares } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: live && Boolean(account) },
  });
  const { data: userAssets } = useReadContract({
    address: asset,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: Boolean(asset && account) },
  });
  const { data: allowance } = useReadContract({
    address: asset,
    abi: erc20Abi,
    functionName: 'allowance',
    args: account && vaultAddress ? [account, vaultAddress] : undefined,
    query: { enabled: Boolean(asset && account && vaultAddress) },
  });
  const { data: depositPreview } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'previewDeposit',
    args: depositAmount === undefined ? undefined : [depositAmount],
    query: { enabled: live && depositAmount !== undefined },
  });
  const { data: withdrawPreview } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'previewWithdraw',
    args: withdrawAmount === undefined ? undefined : [withdrawAmount],
    query: { enabled: live && withdrawAmount !== undefined },
  });
  const { data: redeemPreview } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: 'previewRedeem',
    args: redeemAmount === undefined ? undefined : [redeemAmount],
    query: { enabled: live && redeemAmount !== undefined },
  });

  const ready = live && isConnected && correctChain && Boolean(account);

  async function approve() {
    if (!ready || !asset || !vaultAddress || depositAmount === undefined)
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: asset,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, depositAmount],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function deposit() {
    if (!ready || !vaultAddress || depositAmount === undefined || !account)
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'deposit',
          args: [depositAmount, account],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function withdraw() {
    if (!ready || !vaultAddress || withdrawAmount === undefined || !account)
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'withdraw',
          args: [withdrawAmount, account, account],
        });
        return { request: result.request };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function redeem() {
    if (!ready || !vaultAddress || redeemAmount === undefined || !account)
      return;
    setError(undefined);
    try {
      await run(async (client, accountAddress) => {
        const result = await client.simulateContract({
          account: accountAddress,
          address: vaultAddress,
          abi: vaultAbi,
          functionName: 'redeem',
          args: [redeemAmount, account, account],
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
          eyebrow="Vault telemetry"
          title="ERC-4626 share state"
          detail="Reads come directly from the verified vault address."
        >
          <StatusBadge tone={live ? 'success' : 'neutral'}>
            {live ? 'Live' : 'Registry pending'}
          </StatusBadge>
        </LabPanelHeader>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell
            label="Total assets"
            value={displayValue(totalAssets, assetPrecision)}
            detail="underlying units"
          />
          <MetricCell
            label="Total shares"
            value={displayValue(totalShares, sharePrecision)}
            detail="vault units"
          />
          <MetricCell
            label="Share price"
            value={
              totalAssets && totalShares
                ? displayValue(
                    (totalAssets * 10n ** BigInt(assetPrecision)) / totalShares,
                    assetPrecision,
                  )
                : '—'
            }
            detail="assets per share"
          />
          <MetricCell
            label="Your shares"
            value={displayValue(userShares, sharePrecision)}
            detail="connected wallet"
          />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricCell
            label="Your assets"
            value={displayValue(userAssets, assetPrecision)}
            detail="wallet balance"
          />
          <MetricCell
            label="Allowance"
            value={displayValue(allowance, assetPrecision)}
            detail="asset → vault"
          />
        </div>
      </LabPanel>

      <LabPanel>
        <LabPanelHeader
          eyebrow="Operations"
          title="Deposit, withdraw, preview"
          detail="Preview values use the vault's on-chain rounding rules."
        >
          <StatusBadge tone={ready ? 'success' : 'neutral'}>
            {!live
              ? 'Registry pending'
              : !isConnected
                ? 'Connect wallet'
                : !correctChain
                  ? 'Wrong network'
                  : 'Ready'}
          </StatusBadge>
        </LabPanelHeader>
        <LabTabs className="mt-5" defaultValue="deposit">
          <LabTabsList>
            <LabTabsTrigger value="deposit">Deposit</LabTabsTrigger>
            <LabTabsTrigger value="withdraw">Withdraw</LabTabsTrigger>
            <LabTabsTrigger value="preview">Preview</LabTabsTrigger>
          </LabTabsList>

          <LabTabsContent value="deposit">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
              <div className="grid gap-4">
                <Field
                  htmlFor="vault-deposit-amount"
                  label="Asset amount"
                  hint={`decimals ${assetPrecision}`}
                >
                  <input
                    className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                    id="vault-deposit-amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      setDepositInput(
                        (event.currentTarget as HTMLInputElement).value,
                      )
                    }
                    placeholder="0.00"
                    value={depositInput}
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    disabled={
                      !ready ||
                      depositAmount === undefined ||
                      allowance === undefined ||
                      allowance >= depositAmount
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
                      depositAmount === undefined ||
                      allowance === undefined ||
                      allowance < depositAmount
                    }
                    onClick={deposit}
                    type="button"
                  >
                    <ArrowDownToLine size={15} aria-hidden="true" />
                    Deposit
                  </ActionButton>
                </div>
              </div>
              <div className="grid gap-2 border border-lab-line bg-lab-soft p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-lab-muted">
                  Preview shares
                </span>
                <strong className="font-mono text-xl text-lab-text">
                  {displayValue(depositPreview, sharePrecision)}
                </strong>
                <span className="text-xs text-lab-muted">
                  Floor rounding for deposit
                </span>
              </div>
            </div>
          </LabTabsContent>

          <LabTabsContent value="withdraw">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-4">
                <Field
                  htmlFor="vault-withdraw-amount"
                  label="Asset amount"
                  hint={`decimals ${assetPrecision}`}
                >
                  <input
                    className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                    id="vault-withdraw-amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      setWithdrawInput(
                        (event.currentTarget as HTMLInputElement).value,
                      )
                    }
                    placeholder="0.00"
                    value={withdrawInput}
                  />
                </Field>
                <ActionButton
                  disabled={!ready || withdrawAmount === undefined}
                  onClick={withdraw}
                  type="button"
                >
                  <ArrowUpFromLine size={15} aria-hidden="true" />
                  Withdraw
                </ActionButton>
              </div>
              <div className="grid gap-2 border border-lab-line bg-lab-soft p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-lab-muted">
                  Preview shares
                </span>
                <strong className="font-mono text-xl text-lab-text">
                  {displayValue(withdrawPreview, sharePrecision)}
                </strong>
                <span className="text-xs text-lab-muted">
                  Ceil rounding for withdrawal
                </span>
              </div>
              <div className="grid gap-4 lg:col-span-2">
                <Field
                  htmlFor="vault-redeem-amount"
                  label="Share amount"
                  hint={`decimals ${sharePrecision}`}
                >
                  <input
                    className="min-h-11 w-full border border-lab-line bg-lab-soft px-3 font-mono text-sm text-lab-text outline-none transition placeholder:text-lab-muted focus:border-lab-accent focus:ring-2 focus:ring-lab-accent/30"
                    id="vault-redeem-amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      setRedeemInput(
                        (event.currentTarget as HTMLInputElement).value,
                      )
                    }
                    placeholder="0.00"
                    value={redeemInput}
                  />
                </Field>
                <ActionButton
                  disabled={!ready || redeemAmount === undefined}
                  onClick={redeem}
                  type="button"
                  variant="secondary"
                >
                  <FlaskConical size={15} aria-hidden="true" />
                  Redeem shares
                </ActionButton>
                <div className="border border-lab-line bg-lab-soft p-4 text-sm text-lab-softText">
                  Preview assets:{' '}
                  <span className="font-mono text-lab-text">
                    {displayValue(redeemPreview, assetPrecision)}
                  </span>
                </div>
              </div>
            </div>
          </LabTabsContent>

          <LabTabsContent value="preview">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCell
                label="Deposit"
                value={displayValue(depositPreview, sharePrecision)}
                detail="shares / assets"
              />
              <MetricCell
                label="Withdraw"
                value={displayValue(withdrawPreview, sharePrecision)}
                detail="shares / assets"
              />
              <MetricCell
                label="Redeem"
                value={displayValue(redeemPreview, assetPrecision)}
                detail="assets / shares"
              />
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
    </div>
  );
}
