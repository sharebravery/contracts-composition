import type { DeploymentRecord } from './schema';

export function findDeployment(
  records: readonly DeploymentRecord[],
  chainId: number,
  lab: string,
  contractName: string,
): DeploymentRecord | undefined {
  return records.find(
    (record) =>
      record.chainId === chainId &&
      record.lab === lab &&
      record.contractName === contractName,
  );
}
