export type HexAddress = `0x${string}`;
export type HexTransactionHash = `0x${string}`;

export type DeploymentRecord = {
  chainId: number;
  lab: string;
  contractName: string;
  address: HexAddress;
  deploymentBlock: number;
  transactionHash: HexTransactionHash;
  version: string;
  implementationAddress?: HexAddress;
  verified: boolean;
};

export type ExternalAddressRecord = {
  chainId: number;
  protocol: string;
  contractName: string;
  address: HexAddress;
  source: string;
  verifiedAt: string;
};
