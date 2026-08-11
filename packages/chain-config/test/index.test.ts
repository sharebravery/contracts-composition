import { describe, expect, it } from 'vitest';

import { arbitrumSepolia, getChainConfig } from '../src/index';

describe('chain config', () => {
  it('exposes the canonical Arbitrum Sepolia configuration', () => {
    expect(arbitrumSepolia).toMatchObject({
      id: 421614,
      name: 'Arbitrum Sepolia',
      rpcEnvVar: 'NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL',
      blockExplorerUrl: 'https://sepolia.arbiscan.io',
    });
  });

  it('resolves a configured chain by id', () => {
    expect(getChainConfig(421614)).toBe(arbitrumSepolia);
  });

  it('rejects chains that are not configured', () => {
    expect(() => getChainConfig(1)).toThrow('Unsupported chain id: 1');
  });
});
