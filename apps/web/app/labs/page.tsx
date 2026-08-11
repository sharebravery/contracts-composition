import { AppShell, LabCard, SectionHeading } from '@onchain-contract-lab/ui';

import { labCatalog } from '../../features/labs/catalog';

export default function LabsPage() {
  return (
    <AppShell>
      <main className="page-frame">
        <section className="page-intro">
          <span className="eyebrow">Registry / Phase 1</span>
          <h1>Contract labs</h1>
          <p>
            Inspect one contract capability at a time, with the execution
            context kept visible.
          </p>
        </section>
        <section aria-labelledby="catalog-heading">
          <SectionHeading
            eyebrow="Arbitrum Sepolia"
            title="Available experiments"
          />
          <div className="lab-grid" id="catalog-heading">
            {labCatalog.map((lab) => (
              <LabCard key={lab.slug} {...lab} href={`/labs/${lab.slug}`} />
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
