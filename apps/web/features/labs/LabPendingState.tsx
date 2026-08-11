'use client';

import { CircleAlert, Link2, LockKeyhole } from 'lucide-react';

import {
  ActionButton,
  LabPanel,
  LabPanelHeader,
  MetricCell,
  StatusBadge,
} from '@onchain-contract-lab/ui';

import type { LabDeployment } from './registry';

export function LabPendingState({ deployment }: { deployment: LabDeployment }) {
  return (
    <LabPanel className="h-full">
      <LabPanelHeader
        eyebrow="Registry state"
        title="Awaiting verified deployment"
        detail="Operations stay locked until the Registry contains a verified Arbitrum Sepolia record."
      >
        <StatusBadge tone="neutral">Registry pending</StatusBadge>
      </LabPanelHeader>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCell
          label="Chain"
          value={deployment.chainId}
          detail="Arbitrum Sepolia"
        />
        <MetricCell
          label="Contract"
          value={deployment.contractName}
          detail="No address loaded"
        />
      </div>
      <div className="mt-5 grid gap-3 border-t border-lab-line pt-5 text-sm text-lab-softText">
        <div className="flex items-start gap-3">
          <LockKeyhole
            className="mt-0.5 shrink-0 text-lab-muted"
            size={16}
            aria-hidden="true"
          />
          <span>Write actions are disabled until an address is verified.</span>
        </div>
        <div className="flex items-start gap-3">
          <CircleAlert
            className="mt-0.5 shrink-0 text-lab-muted"
            size={16}
            aria-hidden="true"
          />
          <span>
            Local contract tests remain available through the module commands.
          </span>
        </div>
        <ActionButton disabled variant="secondary" type="button">
          <Link2 size={15} aria-hidden="true" />
          Explorer unavailable
        </ActionButton>
      </div>
    </LabPanel>
  );
}
