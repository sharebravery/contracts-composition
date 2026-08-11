import { useTransactionStore } from './store';

export type TransactionStatus =
  | 'Preparing'
  | 'Awaiting Signature'
  | 'Submitted'
  | 'Confirming'
  | 'Success'
  | 'Failed';

export type TransactionSnapshot = {
  status: TransactionStatus;
  hash?: string;
  simulation?: unknown;
  receipt?: unknown;
  error?: string;
};

type Simulation<TRequest> = {
  request: TRequest;
};

export type ExecuteTransactionOptions<TRequest, TReceipt> = {
  expectedChainId: number;
  actualChainId: number;
  simulate: () => Promise<Simulation<TRequest>>;
  send: (request: TRequest) => Promise<string>;
  waitForReceipt: (hash: string) => Promise<TReceipt>;
};

function setStatus(snapshot: TransactionSnapshot): void {
  useTransactionStore.getState().setCurrent(snapshot);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function executeTransaction<TRequest, TReceipt>({
  expectedChainId,
  actualChainId,
  simulate,
  send,
  waitForReceipt,
}: ExecuteTransactionOptions<TRequest, TReceipt>): Promise<{
  hash: string;
  receipt: TReceipt;
}> {
  setStatus({ status: 'Preparing' });

  if (expectedChainId !== actualChainId) {
    const error = new Error(
      `Wrong network: expected ${expectedChainId}, got ${actualChainId}`,
    );
    setStatus({ status: 'Failed', error: error.message });
    throw error;
  }

  try {
    const simulation = await simulate();
    setStatus({ status: 'Awaiting Signature', simulation });

    const hash = await send(simulation.request);
    setStatus({ status: 'Submitted', hash });
    setStatus({ status: 'Confirming', hash });

    const receipt = await waitForReceipt(hash);
    setStatus({ status: 'Success', hash, receipt });

    return { hash, receipt };
  } catch (error) {
    setStatus({ status: 'Failed', error: errorMessage(error) });
    throw error;
  }
}
