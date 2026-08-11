'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { LogOut, WalletCards, X } from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

import { IconButton } from '@onchain-contract-lab/ui';

export function WalletDialog({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="brand-lockup">
          <a className="brand" href="/">
            CONTRACT LAB
          </a>
          <span className="brand-mark">/ 421614</span>
        </div>
        <nav className="header-nav" aria-label="Primary navigation">
          <a href="/labs">Labs</a>
          <a href="/labs">Registry</a>
          <WalletTrigger />
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        Core MVP / Arbitrum Sepolia / contract behavior over product theater
      </footer>
    </>
  );
}

function WalletTrigger() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending, error } = useConnect();

  if (isConnected && address) {
    return (
      <button
        className="wallet-trigger"
        type="button"
        onClick={() => disconnect()}
        title="Disconnect wallet"
      >
        <LogOut size={15} aria-hidden="true" />
        {`${address.slice(0, 6)}…${address.slice(-4)}`}
      </button>
    );
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="wallet-trigger" type="button">
          <WalletCards size={16} aria-hidden="true" />
          Connect wallet
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content">
          <div className="modal-header">
            <div>
              <Dialog.Title>Connect wallet</Dialog.Title>
              <Dialog.Description className="panel-copy">
                Choose an injected wallet or a supported connector.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close wallet dialog">
                <X size={18} aria-hidden="true" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="connector-list">
            {connectors.map((connector) => (
              <button
                className="connector-button"
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => connect({ connector })}
              >
                <span>{connector.name}</span>
                <span className="mono muted">
                  {isPending ? 'Connecting…' : 'Select'}
                </span>
              </button>
            ))}
          </div>
          {error ? <p className="modal-error">{error.message}</p> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
