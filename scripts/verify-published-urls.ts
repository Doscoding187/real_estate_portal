/**
 * Proves that every published location URL still resolves to the same place.
 *
 * The runtime projection records the URL we publish for each Gauteng place. This compares that
 * with the URL the national Place Authority search now produces, so a published link can never
 * move under a customer.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { searchNationalPlaces } from '../server/services/nationalPlaceSearchService';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJECTION = path.join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);

async function main() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  const published = projection.rows
    .map((row: { runtime_natural_key: string; name: string }) => ({
      key: row.runtime_natural_key,
      name: row.name,
    }))
    .filter((row: { key: string }) => row.key.split('/').length >= 2);

  let same = 0;
  let different = 0;
  let missing = 0;
  const examples: string[] = [];

  for (const row of published) {
    const results = await searchNationalPlaces({ query: row.name, limit: 40 });
    const match = results.find(result => result.label === row.name);
    if (!match) {
      missing += 1;
      continue;
    }
    if (match.canonicalPath === `/${row.key}`) {
      same += 1;
    } else {
      different += 1;
      if (examples.length < 12) examples.push(`${row.key}  →  ${match.canonicalPath}`);
    }
  }

  console.log('# Published URL compatibility\n');
  console.log(`Published location URLs checked : ${published.length}`);
  console.log(`Reproduced exactly              : ${same}`);
  console.log(`Different URL                   : ${different}`);
  console.log(`Not returned by search          : ${missing}`);
  if (examples.length) {
    console.log('\nDifferences:');
    for (const example of examples) console.log(`  ${example}`);
  }
  if (different) process.exitCode = 1;
}

void main();
