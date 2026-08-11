import { describe, expect, it } from 'vitest';

import {
  createLabConnectors,
  executeTransaction,
  useTransactionStore,
} from '../src/index';

describe('wallet connectors', () => {
  it('omits WalletConnect when no Project ID is configured', () => {
    expect(createLabConnectors()).toHaveLength(2);
    expect(createLabConnectors('project-id')).toHaveLength(3);
  });
});

describe('executeTransaction', () => {
  it('runs simulation before signing and confirms a successful transaction', async () => {
    const calls: string[] = [];
    useTransactionStore.getState().reset();

    const result = await executeTransaction({
      expectedChainId: 421614,
      actualChainId: 421614,
      simulate: async () => {
        calls.push('simulate');
        return { request: 'simulated-request' };
      },
      send: async (request) => {
        calls.push(`send:${request}`);
        return '0xhash';
      },
      waitForReceipt: async (hash) => {
        calls.push(`wait:${hash}`);
        return { status: 'success' };
      },
    });

    expect(calls).toEqual([
      'simulate',
      'send:simulated-request',
      'wait:0xhash',
    ]);
    expect(result).toEqual({ hash: '0xhash', receipt: { status: 'success' } });
    expect(useTransactionStore.getState().current).toMatchObject({
      status: 'Success',
      hash: '0xhash',
    });
  });

  it('does not simulate or send when the wallet is on the wrong chain', async () => {
    const calls: string[] = [];
    useTransactionStore.getState().reset();

    await expect(
      executeTransaction({
        expectedChainId: 421614,
        actualChainId: 1,
        simulate: async () => {
          calls.push('simulate');
          return { request: 'simulated-request' };
        },
        send: async () => {
          calls.push('send');
          return '0xhash';
        },
        waitForReceipt: async () => ({ status: 'success' }),
      }),
    ).rejects.toThrow('Wrong network');

    expect(calls).toEqual([]);
    expect(useTransactionStore.getState().current).toMatchObject({
      status: 'Failed',
      error: 'Wrong network: expected 421614, got 1',
    });
  });

  it('records simulation failures and does not request a wallet signature', async () => {
    const calls: string[] = [];
    useTransactionStore.getState().reset();

    await expect(
      executeTransaction({
        expectedChainId: 421614,
        actualChainId: 421614,
        simulate: async () => {
          calls.push('simulate');
          throw new Error('insufficient allowance');
        },
        send: async () => {
          calls.push('send');
          return '0xhash';
        },
        waitForReceipt: async () => ({ status: 'success' }),
      }),
    ).rejects.toThrow('insufficient allowance');

    expect(calls).toEqual(['simulate']);
    expect(useTransactionStore.getState().current).toMatchObject({
      status: 'Failed',
      error: 'insufficient allowance',
    });
  });
});
