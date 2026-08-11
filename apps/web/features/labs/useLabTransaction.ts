'use client';

import { executeTransaction } from '@onchain-contract-lab/web3-react';
import type { Address } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';

export function useLabTransaction() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  async function run<TRequest>(
    simulate: (
      client: NonNullable<typeof publicClient>,
      account: Address,
    ) => Promise<{ request: TRequest }>,
  ) {
    if (!publicClient || !address) {
      throw new Error('Connect a wallet before submitting a transaction.');
    }

    return executeTransaction<
      TRequest,
      Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>>
    >({
      expectedChainId: 421614,
      actualChainId: chainId ?? 0,
      simulate: () => simulate(publicClient, address),
      send: (request) => writeContractAsync(request as never),
      waitForReceipt: (hash) =>
        publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }),
    });
  }

  return { address, chainId, run };
}
