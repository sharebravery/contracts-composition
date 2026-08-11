import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseDeploymentRecords } from '../src/index';

const deploymentsPath = resolve(
  import.meta.dirname,
  '../deployments/421614.json',
);
const raw = await readFile(deploymentsPath, 'utf8');
parseDeploymentRecords(JSON.parse(raw) as unknown);
console.log(`Validated ${deploymentsPath}`);
