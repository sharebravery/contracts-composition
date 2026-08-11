import { describe, expect, it } from 'vitest';

import { findDeployment, parseDeploymentRecords } from '../src/index';

const validRecord = {
  chainId: 421614,
  lab: 'airdrop',
  contractName: 'MerkleAirdrop',
  address: '0x1111111111111111111111111111111111111111',
  deploymentBlock: 123,
  transactionHash:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  version: '1.0.0',
  verified: true,
} as const;

describe('contract registry', () => {
  it('parses valid deployment records and finds a deployment', () => {
    const records = parseDeploymentRecords([validRecord]);

    expect(findDeployment(records, 421614, 'airdrop', 'MerkleAirdrop')).toEqual(
      validRecord,
    );
  });

  it('rejects malformed or placeholder deployment records', () => {
    expect(() =>
      parseDeploymentRecords([
        {
          ...validRecord,
          address: '0x0000000000000000000000000000000000000000',
        },
      ]),
    ).toThrow('Invalid deployment record at index 0: address');
  });

  it('returns undefined when a deployment is not registered', () => {
    expect(
      findDeployment([], 421614, 'airdrop', 'MerkleAirdrop'),
    ).toBeUndefined();
  });
});
