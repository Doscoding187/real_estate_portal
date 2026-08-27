#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const OUTPUT_DIR = 'data/geography-coverage-v0.1/output';
const AUDIT_PATH = 'data/geography-coverage-v0.1/research/residual-collision-audit.v0.1.json';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readJsonl(relativePath) {
  return fs
    .readFileSync(path.join(ROOT, relativePath), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

const queue = readJsonl(`${OUTPUT_DIR}/gauteng_review_queue_v0.1.jsonl`).filter(
  entry => entry.reason === 'duplicate_natural_key_within_parent',
);
const audit = readJson(AUDIT_PATH);
const failures = [];

function fail(message) {
  failures.push(message);
}

if (audit.queue_reason !== 'duplicate_natural_key_within_parent') {
  fail(`audit queue_reason is ${audit.queue_reason ?? 'missing'}`);
}
if (!Array.isArray(audit.entries)) {
  fail('audit entries must be an array');
}

const entries = Array.isArray(audit.entries) ? audit.entries : [];
const auditedById = new Map();
for (const entry of entries) {
  if (!entry || typeof entry.factual_location_id !== 'string') {
    fail('every audit entry must declare factual_location_id');
    continue;
  }
  if (auditedById.has(entry.factual_location_id)) {
    fail(`duplicate audit entry ${entry.factual_location_id}`);
  }
  auditedById.set(entry.factual_location_id, entry);
  if (entry.decision !== 'retain_queue') fail(`${entry.factual_location_id} is not retain_queue`);
  if (entry.accepted_parent_natural_key !== null) {
    fail(`${entry.factual_location_id} declares an accepted parent edge`);
  }
  if (entry.allow_duplicate_natural_key_grouping !== false) {
    fail(`${entry.factual_location_id} enables duplicate grouping`);
  }
  if (typeof entry.blocking_condition !== 'string' || entry.blocking_condition.length === 0) {
    fail(`${entry.factual_location_id} is missing blocking_condition`);
  }
  if (!Array.isArray(entry.evidence_reviewed) || entry.evidence_reviewed.length === 0) {
    fail(`${entry.factual_location_id} is missing evidence_reviewed`);
  }
  if (typeof entry.rationale !== 'string' || entry.rationale.length === 0) {
    fail(`${entry.factual_location_id} is missing rationale`);
  }
  if (typeof entry.next_action !== 'string' || entry.next_action.length === 0) {
    fail(`${entry.factual_location_id} is missing next_action`);
  }
}

const queueIds = new Set();
for (const entry of queue) {
  queueIds.add(entry.factual_location_id);
  const auditEntry = auditedById.get(entry.factual_location_id);
  if (!auditEntry) {
    fail(`queue identity ${entry.factual_location_id} has no audit entry`);
    continue;
  }
  for (const field of ['preferred_name', 'factual_type', 'administrative_context']) {
    if (auditEntry[field] !== entry[field]) {
      fail(
        `${entry.factual_location_id} audit ${field} ${JSON.stringify(auditEntry[field])} does not match queue ${JSON.stringify(entry[field])}`,
      );
    }
  }
}

for (const entry of entries) {
  if (!queueIds.has(entry.factual_location_id)) {
    fail(`audit identity ${entry.factual_location_id} is not in the current collision queue`);
  }
}

const expectedSummary = {
  queue_identities_reviewed: queue.length,
  retained_queue_count: queue.length,
  promoted_count: 0,
  rejected_or_retired_count: 0,
  proposed_parent_edges: 0,
  grouping_exceptions_granted: 0,
};
for (const [field, expected] of Object.entries(expectedSummary)) {
  if (audit.summary?.[field] !== expected) {
    fail(`audit summary ${field} is ${JSON.stringify(audit.summary?.[field])}; expected ${expected}`);
  }
}

if (failures.length > 0) {
  console.error(`residual-collision-audit: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `residual-collision-audit: ${queue.length}/${queue.length} collision identities reviewed; 0 grouping exceptions granted`,
);
