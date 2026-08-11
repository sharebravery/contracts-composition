import { ArrowUpRight, Blocks, FlaskConical } from 'lucide-react';

import {
  AppShell,
  LabCard,
  NetworkBadge,
  SectionHeading,
} from '@onchain-contract-lab/ui';

import { labCatalog } from '../features/labs/catalog';

export default function HomePage() {
  return (
    <AppShell>
      <main className="page-frame">
        <section className="hero">
          <div>
            <span className="eyebrow">Smart contract capability index</span>
            <h1>Onchain Contract Lab</h1>
            <p className="hero-copy">
              Four compact experiments for reading proofs, reward math, vault
              shares, and upgrade-safe state on one public testnet.
            </p>
          </div>
          <div className="hero-signal" aria-label="Current network signal">
            <NetworkBadge />
            <div>
              <span className="signal-value">421614</span>
              <span className="signal-label">chain id / core mvp</span>
            </div>
            <div>
              <span className="signal-value">04</span>
              <span className="signal-label">phase 1 labs</span>
            </div>
          </div>
        </section>

        <section aria-labelledby="labs-heading">
          <SectionHeading
            eyebrow="Phase 1 / Core MVP"
            title="Choose an experiment"
          >
            <span>Each lab exposes one contract idea end to end.</span>
          </SectionHeading>
          <div className="lab-grid" id="labs-heading">
            {labCatalog.map((lab) => (
              <LabCard key={lab.slug} {...lab} href={`/labs/${lab.slug}`} />
            ))}
          </div>
        </section>

        <section className="workspace" aria-label="Lab operating model">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Instrument map</span>
                <h2>Read the whole loop</h2>
              </div>
              <FlaskConical
                color="var(--accent)"
                size={22}
                aria-hidden="true"
              />
            </div>
            <p className="panel-copy">
              The page keeps the action, the chain state, and the transaction
              evidence in one frame. No backend indexer or opaque workflow sits
              between the contract and the reader.
            </p>
          </div>
          <div className="panel">
            <div className="data-list">
              <div className="data-row">
                <span>Network</span>
                <span className="mono">Arbitrum Sepolia</span>
              </div>
              <div className="data-row">
                <span>Explorer</span>
                <a
                  className="contract-link"
                  href="https://sepolia.arbiscan.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  Arbiscan <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </div>
              <div className="data-row">
                <span>Architecture</span>
                <span className="mono">Foundry + Next.js</span>
              </div>
              <div className="data-row">
                <span>External protocols</span>
                <span>Not in Core MVP</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
