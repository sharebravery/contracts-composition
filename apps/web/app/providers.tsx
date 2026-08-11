'use client';

import type { PropsWithChildren } from 'react';

import { Web3Provider } from '@onchain-contract-lab/web3-react';

import { WalletDialog } from '../features/wallet/WalletDialog';

export function Providers({ children }: PropsWithChildren) {
  return (
    <Web3Provider>
      <WalletDialog>{children}</WalletDialog>
    </Web3Provider>
  );
}
