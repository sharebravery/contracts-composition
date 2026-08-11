import type { PropsWithChildren, ReactNode } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ClassName = { className?: string };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function AppShell({ children }: PropsWithChildren) {
  return <div className="app-shell">{children}</div>;
}

export function NetworkBadge({
  label = 'Arbitrum Sepolia',
}: {
  label?: string;
}) {
  return (
    <span className="network-badge">
      <span className="network-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LabCard({
  name,
  capability,
  description,
  phase,
  status,
  href,
  accent,
}: {
  name: string;
  capability: string;
  description: string;
  phase: string;
  status: string;
  href: string;
  accent: string;
}) {
  return (
    <a className={`lab-card lab-card-${accent}`} href={href}>
      <div className="lab-card-topline">
        <span>{phase}</span>
        <span className="status-label">{status}</span>
      </div>
      <h3>{name}</h3>
      <p className="lab-card-capability">{capability}</p>
      <p className="lab-card-description">{description}</p>
      <span className="lab-card-arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {detail ? <span className="metric-detail">{detail}</span> : null}
    </div>
  );
}

export function ContractAddress({
  address,
  explorerUrl,
}: {
  address?: string;
  explorerUrl?: string;
}) {
  if (!address) {
    return <span className="mono muted">Not deployed</span>;
  }

  return explorerUrl ? (
    <a
      className="mono contract-link"
      href={explorerUrl}
      target="_blank"
      rel="noreferrer"
    >
      {address}
    </a>
  ) : (
    <span className="mono">{address}</span>
  );
}

export function DeveloperPanel({ children }: PropsWithChildren) {
  return (
    <details className="developer-panel">
      <summary>
        <span>Developer Panel</span>
        <span className="summary-hint">inspect execution context</span>
      </summary>
      <div className="developer-content">{children}</div>
    </details>
  );
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: PropsWithChildren<{ eyebrow: string; title: string }>) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children ? <div className="section-heading-side">{children}</div> : null}
    </div>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: ClassName & {
  label: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`icon-button ${props.className ?? ''}`}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function LabPanel({
  children,
  className,
}: PropsWithChildren<ClassName>) {
  return (
    <section
      className={cn(
        'min-w-0 border border-lab-line bg-lab-surface/80 p-5 shadow-lab sm:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function LabPanelHeader({
  eyebrow,
  title,
  detail,
  children,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  detail?: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-lab-line pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-lab-accent">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-lab-text">
          {title}
        </h2>
        {detail ? (
          <div className="mt-1 text-sm text-lab-muted">{detail}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function LabTabs({
  children,
  defaultValue,
  className,
}: PropsWithChildren<ClassName & { defaultValue: string }>) {
  return (
    <Tabs.Root className={cn('min-w-0', className)} defaultValue={defaultValue}>
      {children}
    </Tabs.Root>
  );
}

export function LabTabsList({ children }: PropsWithChildren) {
  return (
    <Tabs.List className="grid grid-flow-col auto-cols-fr border-b border-lab-line">
      {children}
    </Tabs.List>
  );
}

export function LabTabsTrigger({
  children,
  value,
}: PropsWithChildren<{ value: string }>) {
  return (
    <Tabs.Trigger
      className="border-b-2 border-transparent px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-lab-muted outline-none transition data-[state=active]:border-lab-accent data-[state=active]:text-lab-text data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus-visible:ring-2 focus-visible:ring-lab-accent"
      value={value}
    >
      {children}
    </Tabs.Trigger>
  );
}

export function LabTabsContent({
  children,
  value,
}: PropsWithChildren<{ value: string }>) {
  return (
    <Tabs.Content
      className="pt-5 outline-none focus-visible:ring-2 focus-visible:ring-lab-accent"
      value={value}
    >
      {children}
    </Tabs.Content>
  );
}

export function LabTooltip({
  children,
  label,
}: PropsWithChildren<{ label: string }>) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-20 max-w-64 border border-lab-strong bg-lab-raised px-3 py-2 text-xs text-lab-text shadow-lab"
            sideOffset={6}
          >
            {label}
            <Tooltip.Arrow className="fill-[var(--surface-raised)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function LabCollapsible({
  children,
  title,
  detail,
}: PropsWithChildren<{ title: string; detail?: string }>) {
  return (
    <Collapsible.Root className="border border-lab-line">
      <Collapsible.Trigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm text-lab-text outline-none transition hover:bg-lab-soft focus-visible:ring-2 focus-visible:ring-lab-accent">
        <span>{title}</span>
        {detail ? (
          <span className="font-mono text-[11px] text-lab-muted">{detail}</span>
        ) : null}
      </Collapsible.Trigger>
      <Collapsible.Content className="border-t border-lab-line px-4 py-4 text-sm text-lab-softText data-[state=closed]:animate-[accordion-up_120ms_ease-out] data-[state=open]:animate-[accordion-down_120ms_ease-out]">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function Field({
  children,
  label,
  htmlFor,
  hint,
}: PropsWithChildren<{ label: string; htmlFor: string; hint?: ReactNode }>) {
  return (
    <label className="grid gap-2" htmlFor={htmlFor}>
      <span className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-lab-muted">
        <span>{label}</span>
        {hint ? (
          <span className="normal-case tracking-normal text-lab-muted">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function ActionButton({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lab-accent disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' &&
          'border-lab-accent bg-lab-accent text-[#071117] hover:bg-[#b7efff]',
        variant === 'secondary' &&
          'border-lab-strong bg-transparent text-lab-text hover:border-lab-accent hover:text-lab-accent',
        variant === 'danger' &&
          'border-lab-danger bg-transparent text-lab-danger hover:bg-lab-danger/10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'danger' | 'accent' }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.04em]',
        tone === 'neutral' && 'border-lab-strong text-lab-muted',
        tone === 'success' && 'border-lab-success/50 text-lab-success',
        tone === 'danger' && 'border-lab-danger/50 text-lab-danger',
        tone === 'accent' && 'border-lab-accent/50 text-lab-accent',
      )}
    >
      {children}
    </span>
  );
}

export function MetricCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex min-h-[112px] min-w-0 flex-col border border-lab-line bg-lab-soft p-4">
      <span className="font-mono text-[11px] uppercase tracking-[0.04em] text-lab-muted">
        {label}
      </span>
      <strong className="mt-auto truncate font-mono text-2xl tracking-[-0.04em] text-lab-text">
        {value}
      </strong>
      {detail ? (
        <span className="mt-1 text-xs text-lab-muted">{detail}</span>
      ) : null}
    </div>
  );
}
