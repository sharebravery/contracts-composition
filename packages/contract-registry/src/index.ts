import type { DeploymentRecord } from './schema';

export * from './get-deployment';
export * from './schema';

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const transactionHashPattern = /^0x[0-9a-fA-F]{64}$/;

function hasNonZeroAddress(value: string): boolean {
  return value
    .slice(2)
    .split('')
    .some((character) => character !== '0');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertDeploymentRecord(
  value: unknown,
  index: number,
): asserts value is DeploymentRecord {
  if (!isRecord(value)) {
    throw new Error(`Invalid deployment record at index ${index}: record`);
  }

  if (typeof value.chainId !== 'number' || !Number.isInteger(value.chainId)) {
    throw new Error(`Invalid deployment record at index ${index}: chainId`);
  }

  for (const field of ['lab', 'contractName', 'version'] as const) {
    if (typeof value[field] !== 'string' || value[field].length === 0) {
      throw new Error(`Invalid deployment record at index ${index}: ${field}`);
    }
  }

  if (
    typeof value.address !== 'string' ||
    !addressPattern.test(value.address) ||
    !hasNonZeroAddress(value.address)
  ) {
    throw new Error(`Invalid deployment record at index ${index}: address`);
  }

  if (
    typeof value.deploymentBlock !== 'number' ||
    !Number.isInteger(value.deploymentBlock) ||
    value.deploymentBlock < 0
  ) {
    throw new Error(
      `Invalid deployment record at index ${index}: deploymentBlock`,
    );
  }

  if (
    typeof value.transactionHash !== 'string' ||
    !transactionHashPattern.test(value.transactionHash)
  ) {
    throw new Error(
      `Invalid deployment record at index ${index}: transactionHash`,
    );
  }

  if (typeof value.verified !== 'boolean') {
    throw new Error(`Invalid deployment record at index ${index}: verified`);
  }

  if (value.implementationAddress !== undefined) {
    if (
      typeof value.implementationAddress !== 'string' ||
      !addressPattern.test(value.implementationAddress) ||
      !hasNonZeroAddress(value.implementationAddress)
    ) {
      throw new Error(
        `Invalid deployment record at index ${index}: implementationAddress`,
      );
    }
  }
}

export function parseDeploymentRecords(input: unknown): DeploymentRecord[] {
  if (!Array.isArray(input)) {
    throw new Error('Deployment registry must be an array');
  }

  input.forEach((record, index) => assertDeploymentRecord(record, index));
  return input as DeploymentRecord[];
}
