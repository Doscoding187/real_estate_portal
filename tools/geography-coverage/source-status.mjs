#!/usr/bin/env node
import process from 'node:process';
import console from 'node:console';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const RECORD_PATH = 'data/geography-coverage-v0.1/source-recovery.v0.1.json';
const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD_PATH), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, record.territory.manifest), 'utf8'));
const canonicalRoot =
  process.env[manifest.inputs.canonical_root_env] || manifest.inputs.canonical_root_default;
const inputs = record.required_inputs.map(input => {
  const filePath = path.join(canonicalRoot, input.relative_path);
  if (!fs.existsSync(filePath)) {
    return {
      name: input.name,
      relative_path: input.relative_path,
      expected_sha256: input.expected_sha256,
      status: 'missing',
    };
  }
  const actual = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return {
    name: input.name,
    relative_path: input.relative_path,
    expected_sha256: input.expected_sha256,
    actual_sha256: actual,
    status: actual === input.expected_sha256 ? 'exact' : 'digest_mismatch',
  };
});
const recovered = inputs.every(input => input.status === 'exact');
const report = {
  record: RECORD_PATH,
  recorded_status: record.status,
  canonical_root: canonicalRoot,
  current_status: recovered ? 'exact_source_recovered' : record.status,
  full_regeneration_available: recovered,
  inputs,
};
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`geography-source-status: ${report.current_status}`);
  for (const input of inputs) {
    console.log(`- ${input.name}: ${input.status}`);
  }
}
if (process.argv.includes('--strict') && !recovered) process.exitCode = 1;
