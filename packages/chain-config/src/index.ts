export type ChainConfig = {
  readonly id: number;
  readonly name: string;
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly rpcEnvVar: string;
  readonly blockExplorerUrl: string;
};

export const arbitrumSepolia = {
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcEnvVar: 'NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL',
  blockExplorerUrl: 'https://sepolia.arbiscan.io',
} as const satisfies ChainConfig;

const chainConfigs = new Map<number, ChainConfig>([
  [arbitrumSepolia.id, arbitrumSepolia],
]);

export function getChainConfig(chainId: number): ChainConfig {
  const config = chainConfigs.get(chainId);

  if (!config) {
    throw new Error(`Unsupported chain id: ${chainId}`);
  }

  return config;
}

export function listChainConfigs(): readonly ChainConfig[] {
  return [...chainConfigs.values()];
}
