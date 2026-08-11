import { isAddress, parseUnits } from 'viem';
import type { Address, Hex } from 'viem';

const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/;

export function parseTokenAmount(
  value: string,
  decimals: number,
): bigint | undefined {
  if (!value.trim()) return undefined;
  try {
    const amount = parseUnits(value.trim(), decimals);
    return amount > 0n ? amount : undefined;
  } catch {
    return undefined;
  }
}

export function parseBytes32List(value: string): Hex[] | undefined {
  const values = value.split(/[\s,]+/).filter(Boolean);
  if (!values.length || values.some((item) => !bytes32Pattern.test(item))) {
    return undefined;
  }
  return values as Hex[];
}

export function parseAddressList(value: string): Address[] | undefined {
  const values = value.split(/[\s,]+/).filter(Boolean);
  if (!values.length || values.some((item) => !isAddress(item))) {
    return undefined;
  }
  return values as Address[];
}
