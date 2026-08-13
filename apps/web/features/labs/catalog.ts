export type LabStatus = 'Registry pending' | 'Local Lab' | 'Live';

export type LabEntry = {
  slug: string;
  contractName: string;
  name: string;
  shortName: string;
  capability: string;
  description: string;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3';
  status: LabStatus;
  accent: string;
};

export const labCatalog: readonly LabEntry[] = [
  {
    slug: 'airdrop',
    contractName: 'MerkleAirdrop',
    name: 'Merkle Airdrop',
    shortName: 'Airdrop',
    capability: 'Proofs, bitmaps, delegated claims',
    description:
      'A single-round ERC-20 distribution with replay-safe signatures and expiry recovery.',
    phase: 'Phase 1',
    status: 'Live',
    accent: 'cyan',
  },
  {
    slug: 'reward-pool',
    contractName: 'StakingRewards',
    name: 'Staking Reward Pool',
    shortName: 'Reward Pool',
    capability: 'Time-weighted reward accounting',
    description:
      'A one-stake, one-reward pool built around cumulative reward-per-token accounting.',
    phase: 'Phase 1',
    status: 'Live',
    accent: 'blue',
  },
  {
    slug: 'vault',
    contractName: 'BasicVault',
    name: 'ERC-4626 Vault Lab',
    shortName: 'Basic Vault',
    capability: 'Assets, shares, rounding, safety',
    description:
      'A minimal vault for inspecting share math, preview behavior, and donation resistance.',
    phase: 'Phase 1',
    status: 'Live',
    accent: 'teal',
  },
  {
    slug: 'upgradeable',
    contractName: 'TreasuryProxy',
    name: 'UUPS Upgradeable Treasury',
    shortName: 'Treasury',
    capability: 'Proxy state, roles, controlled upgrades',
    description:
      'A versioned treasury that makes storage preservation visible across a V1 to V2 upgrade.',
    phase: 'Phase 1',
    status: 'Live',
    accent: 'steel',
  },
];

export function getLab(slug: string): LabEntry | undefined {
  return labCatalog.find((lab) => lab.slug === slug);
}
