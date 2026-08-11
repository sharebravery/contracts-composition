import { AppShell } from '@onchain-contract-lab/ui';

export default function NotFound() {
  return (
    <AppShell>
      <main className="page-frame">
        <section className="page-intro">
          <span className="eyebrow">404 / Registry lookup</span>
          <h1>Lab not found</h1>
          <p>The requested lab is not part of the current Core MVP registry.</p>
          <a className="primary-action" href="/labs">
            Return to labs
          </a>
        </section>
      </main>
    </AppShell>
  );
}
