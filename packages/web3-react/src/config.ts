import {
  arbitrumSepolia,
  getChainConfig,
} from '@onchain-contract-lab/chain-config';
import type { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

export const arbitrumSepoliaChain = defineChain({
  id: arbitrumSepolia.id,
  name: arbitrumSepolia.name,
  nativeCurrency: arbitrumSepolia.nativeCurrency,
  rpcUrls: {
    default: {
      http: ['https://sepolia-rollup.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: arbitrumSepolia.blockExplorerUrl,
    },
  },
});

export function createLabConnectors(projectId?: string) {
  const connectors: CreateConnectorFn[] = [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'Onchain Contract Lab' }),
  ];

  if (projectId) {
    connectors.push(walletConnect({ projectId, showQrModal: false }));
  }

  return connectors;
}

const chainConfig = getChainConfig(arbitrumSepolia.id);
const rpcUrl = process.env[chainConfig.rpcEnvVar];

export const labConfig = createConfig({
  chains: [arbitrumSepoliaChain],
  connectors: createLabConnectors(
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  ),
  transports: {
    [arbitrumSepoliaChain.id]: http(rpcUrl),
  },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});
