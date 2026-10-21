/**
 * Proves that every published location URL still resolves to the same place.
 *
 * The runtime projection records the URL we publish for each Gauteng place. This searches the
 * national Place Authority for the published label and checks that the published URL is one of
 * the results, so a published link can never move under a customer.
 *
 * A published label may be carried by more than one published location, such as the three
 * published Westdenes. The customer sees each of them at its own published URL, so the check is
 * that the published URL is among the results, not that it is the first one.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { searchPublicPlaceSuggestions } from '../server/services/nationalPlaceSearchService';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJECTION = path.join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_runtime_reference_projection_v0.2.json',
);
const REGISTRY = path.join(
  ROOT,
  'data/geography-coverage-v0.1/output/gauteng_published_place_registry_v0.2.json',
);

async function main() {
  const projection = JSON.parse(readFileSync(PROJECTION, 'utf8'));
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
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
    const results = await searchPublicPlaceSuggestions({ query: row.name, limit: 40 });
    const matches = results.filter(result => result.label === row.name);
    if (!matches.length) {
      missing += 1;
      if (examples.length < 20) examples.push(`${row.key}  →  not returned by search`);
      continue;
    }
    if (matches.some(result => result.canonicalPath === `/${row.key}`)) {
      same += 1;
    } else {
      different += 1;
      if (examples.length < 20) {
        examples.push(`${row.key}  →  ${matches.map(result => result.canonicalPath).join(' | ')}`);
      }
    }
  }

  console.log('# Published URL compatibility\n');
  console.log(`Published location URLs checked : ${published.length}`);
  console.log(`Reproduced exactly              : ${same}`);
  console.log(`Different URL                   : ${different}`);
  console.log(`Not returned by search          : ${missing}`);
  console.log(
    `\nPublished locations with no canonical Place identity: ${registry.unmapped.length}`,
  );
  for (const entry of registry.unmapped) {
    console.log(`  ${entry.path} (${entry.label}) ${entry.reason}`);
  }
  if (examples.length) {
    console.log('\nDifferences:');
    for (const example of examples) console.log(`  ${example}`);
  }
  if (different || missing) process.exitCode = 1;
}

void main();
