/**
 * Validates that TreasuryV2's storage layout is an append-only extension of TreasuryV1's.
 *
 * This is a real upgrade-safety check (not a layout print): every V1 storage entry must
 * appear at the same slot/offset/type in V2, in the same order, as a prefix. V2 may only
 * append new entries after V1's. Runs `forge inspect ... storage-layout --json` for both
 * contracts and exits non-zero on any collision, reorder, or resize.
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { exit } from 'node:process';

type StorageEntry = {
  astId: number;
  contract: string;
  label: string;
  offset: number;
  slot: string;
  type: string;
};

type StorageLayout = {
  storage: StorageEntry[];
  types: Record<string, unknown>;
};

// script/ is contracts/treasury-lab/script, so three levels up reaches the repo root.
const repoRoot = resolve(import.meta.dirname, '../../..');
const foundryRoot = resolve(repoRoot, 'contracts/treasury-lab');

function inspectLayout(contractName: string): StorageLayout {
  const stdout = execSync(
    `forge inspect ${contractName} storage-layout --json --root "${foundryRoot}"`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout) as StorageLayout;
}

function fingerprint(entry: StorageEntry) {
  // astId and contract differ across versions by design; slot/offset/label/type must not.
  return `${entry.label}|${entry.slot}|${entry.offset}|${entry.type}`;
}

const v1 = inspectLayout('TreasuryV1');
const v2 = inspectLayout('TreasuryV2');

if (v1.storage.length === 0) {
  console.error('TreasuryV1 storage layout is empty — inspect failed.');
  exit(1);
}

const errors: string[] = [];
for (let i = 0; i < v1.storage.length; i += 1) {
  const v1Entry = v1.storage[i];
  const v2Entry = v2.storage[i];
  if (v2Entry === undefined) {
    errors.push(`V2 is missing V1 slot ${i} (${v1Entry.label}).`);
    continue;
  }
  if (fingerprint(v1Entry) !== fingerprint(v2Entry)) {
    errors.push(
      `Slot ${i} mismatch:\n  V1 ${fingerprint(v1Entry)}\n  V2 ${fingerprint(v2Entry)}`,
    );
  }
}

if (v2.storage.length < v1.storage.length) {
  errors.push('V2 has fewer storage entries than V1 (cannot be append-only).');
}

if (errors.length > 0) {
  console.error('Storage layout is NOT V1 -> V2 append-compatible:\n');
  for (const error of errors) console.error(`  - ${error}`);
  exit(1);
}

const appended = v2.storage
  .slice(v1.storage.length)
  .map((entry) => entry.label);
console.log('V1 -> V2 storage layout is append-compatible.');
console.log(`V1 entries: ${v1.storage.length}`);
console.log(
  `V2 appended: ${appended.length > 0 ? appended.join(', ') : '(none)'}`,
);
