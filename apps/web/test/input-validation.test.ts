import { describe, expect, it } from 'vitest';

import {
  parseAddressList,
  parseBytes32List,
  parseTokenAmount,
} from '../features/labs/input-validation';

describe('lab input validation', () => {
  it('parses positive token amounts using the token decimals', () => {
    expect(parseTokenAmount('1.25', 6)).toBe(1_250_000n);
    expect(parseTokenAmount('0', 18)).toBeUndefined();
    expect(parseTokenAmount('not-a-number', 18)).toBeUndefined();
  });

  it('accepts comma or whitespace separated bytes32 proof values', () => {
    const first = `0x${'11'.repeat(32)}`;
    const second = `0x${'22'.repeat(32)}`;

    expect(parseBytes32List(`${first}, ${second}`)).toEqual([first, second]);
    expect(parseBytes32List('0x1234')).toBeUndefined();
  });

  it('rejects malformed addresses while preserving valid address order', () => {
    const first = '0x0000000000000000000000000000000000000001';
    const second = '0x0000000000000000000000000000000000000002';

    expect(parseAddressList(`${first}\n${second}`)).toEqual([first, second]);
    expect(parseAddressList(`${first}, nope`)).toBeUndefined();
  });
});
