import {
  findDeployment,
  parseDeploymentRecords,
  type DeploymentRecord,
} from '@onchain-contract-lab/contract-registry';
import deploymentJson from '@onchain-contract-lab/contract-registry/deployments/421614.json';

const chainId = 421614;
const deploymentRecords = parseDeploymentRecords(deploymentJson as unknown);

export type LabDeployment =
  | {
      status: 'pending';
      chainId: number;
      contractName: string;
    }
  | ({ status: 'live' } & DeploymentRecord);

export function getLabDeployment(
  lab: string,
  contractName: string,
): LabDeployment {
  const record = findDeployment(deploymentRecords, chainId, lab, contractName);

  if (!record || !record.verified) {
    return { status: 'pending', chainId, contractName };
  }

  return { status: 'live', ...record };
}

export function getRegistryRecords(): readonly DeploymentRecord[] {
  return deploymentRecords;
}
