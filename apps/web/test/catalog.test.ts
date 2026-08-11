import { describe, expect, it } from 'vitest';

import { labCatalog } from '../features/labs/catalog';

describe('lab catalog', () => {
  it('exposes the four Phase 1 labs in the documented order', () => {
    expect(labCatalog.map((lab) => lab.slug)).toEqual([
      'airdrop',
      'reward-pool',
      'vault',
      'upgradeable',
    ]);
    expect(labCatalog.every((lab) => lab.phase === 'Phase 1')).toBe(true);
  });

  it('does not expose Phase 2 labs as clickable placeholders', () => {
    expect(labCatalog.some((lab) => lab.status === 'Coming soon')).toBe(false);
  });
});
