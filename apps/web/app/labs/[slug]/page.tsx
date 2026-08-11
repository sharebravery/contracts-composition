import { notFound } from 'next/navigation';

import {
  AppShell,
  ContractAddress,
  DataRow,
  LabCollapsible,
  NetworkBadge,
} from '@onchain-contract-lab/ui';

import { LabPendingState } from '../../../features/labs/LabPendingState';
import { AirdropLab } from '../../../features/labs/AirdropLab';
import { RewardPoolLab } from '../../../features/labs/RewardPoolLab';
import { TreasuryLab } from '../../../features/labs/TreasuryLab';
import { VaultLab } from '../../../features/labs/VaultLab';
import { getLab, labCatalog } from '../../../features/labs/catalog';
import { getLabDeployment } from '../../../features/labs/registry';

export function generateStaticParams() {
  return labCatalog.map((lab) => ({ slug: lab.slug }));
}

export default async function LabDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lab = getLab(slug);

  if (!lab) {
    notFound();
  }

  const deployment = getLabDeployment(lab.slug, lab.contractName);

  return (
    <AppShell>
      <main className="page-frame">
        <div className="page-intro">
          <a className="back-link" href="/labs">
            ← All labs
          </a>
          <div className="panel-header">
            <div className="min-w-0">
              <span className="eyebrow">
                {lab.phase} / {lab.shortName}
              </span>
              <h1>{lab.name}</h1>
              <p>{lab.description}</p>
            </div>
            <NetworkBadge />
          </div>
        </div>

        <section
          className="grid gap-3 pt-7"
          aria-label={`${lab.name} workspace`}
        >
          {slug === 'airdrop' ? <AirdropLab deployment={deployment} /> : null}
          {slug === 'reward-pool' ? (
            <RewardPoolLab deployment={deployment} />
          ) : null}
          {slug === 'vault' ? <VaultLab deployment={deployment} /> : null}
          {slug === 'upgradeable' ? (
            <TreasuryLab deployment={deployment} />
          ) : null}
          {slug !== 'airdrop' &&
          slug !== 'reward-pool' &&
          slug !== 'vault' &&
          slug !== 'upgradeable' ? (
            <LabPendingState deployment={deployment} />
          ) : null}
        </section>

        <LabCollapsible
          title="Developer Panel"
          detail={
            deployment.status === 'live'
              ? 'verified deployment'
              : 'registry pending'
          }
        >
          <div className="grid gap-3">
            <DataRow
              label="Contract"
              value={
                <ContractAddress
                  address={
                    deployment.status === 'live'
                      ? deployment.address
                      : undefined
                  }
                />
              }
            />
            <DataRow
              label="Network"
              value={<span className="font-mono text-xs">421614</span>}
            />
            <DataRow
              label="Version"
              value={
                <span className="font-mono text-xs">
                  {deployment.status === 'live'
                    ? deployment.version
                    : 'Not available'}
                </span>
              }
            />
            <DataRow
              label="Implementation"
              value={
                <span className="break-all font-mono text-xs">
                  {deployment.status === 'live'
                    ? (deployment.implementationAddress ?? 'Not recorded')
                    : 'Not available'}
                </span>
              }
            />
            <DataRow
              label="Receipt"
              value={<span className="font-mono text-xs">Session only</span>}
            />
          </div>
        </LabCollapsible>
      </main>
    </AppShell>
  );
}
