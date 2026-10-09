'use strict';

// Offline evidence checks only. No network, subprocess, signal, timer or mutation.
const fs = require('node:fs');
const { isIPv4 } = require('node:net');

const PROJECT = '8cdd7515-ddd2-4252-bbee-df5a5c209d4b';
const ENVIRONMENT = '63070d99-357a-40ba-99c3-6d1368f61652';
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const EVIDENCE_MAX_AGE_MS = 60000;
const SERVER =
  '/subscriptions/384dc69e-9e22-419f-9e3d-83fbac4f58d0/resourceGroups/rg-property-listify/providers/Microsoft.DBforMySQL/flexibleServers/propertylistify-mysql';
const ORIGINAL_SERVICES = [
  'db88a720-2d1f-4afc-a3a8-6228b6b08d3e',
  '59c0d8f8-abe2-4696-ad9c-de1037723b66',
  'e1e32aa8-0b85-4c91-af18-843f1bc52d9f',
  'bb79bb51-7abb-4194-9f62-81e80b410c24',
  '3160d05c-44f0-4d5f-af9c-7bfe5f5ce37e', // Deleted runner; never reuse.
];
const RULES = new Map([
  ['PropertyListify-Railway-Production-240', '208.77.246.240'],
  ['PropertyListify-Railway-Production-241', '208.77.246.241'],
  ['PropertyListify-Railway-Production-242', '208.77.246.242'],
  ['ClientIPAddress_2026-9-12_1-51-50', '192.143.7.18'],
]);

function requireProof(condition, reason) {
  if (!condition) {
    const error = new Error(reason);
    error.publicReason = reason;
    throw error;
  }
}

function runnerId(id) {
  requireProof(typeof id === 'string' && UUID.test(id), 'Missing or malformed runner service ID');
  requireProof(
    !ORIGINAL_SERVICES.includes(id),
    'Original service or retired runner is not a replacement runner',
  );
}

function networkGate(serviceId, railway, azure) {
  runnerId(serviceId);
  requireProof(
    railway?.service?.id === serviceId && railway?.environment?.id === ENVIRONMENT,
    'Railway readback scope mismatch',
  );
  requireProof(
    railway.staticIp?.enabled === true && railway.staticIp?.highAvailability === true,
    'HA static outbound networking is unproved',
  );
  const ips = railway.staticIp.ips;
  requireProof(Array.isArray(ips) && ips.length > 0, 'Missing assigned outbound addresses');
  for (const ip of ips) {
    requireProof(
      isIPv4(ip?.ipv4 ?? '') && ip.region === 'sin' && ip.zone === 'eqsg3a',
      'Malformed address or unexpected outbound region/zone',
    );
  }
  requireProof(new Set(ips.map(ip => ip.ipv4)).size === ips.length, 'Duplicate assigned addresses');
  // No newly widened range or special all-Azure rule can make this gate pass.
  requireProof(Array.isArray(azure) && azure.length === RULES.size, 'Azure rule inventory drift');
  const names = new Set();
  for (const rule of azure) {
    requireProof(RULES.has(rule?.name) && !names.has(rule.name), 'Azure rule identity drift');
    names.add(rule.name);
    requireProof(
      rule.id === SERVER + '/firewallRules/' + rule.name,
      'Azure server/subscription mismatch',
    );
    requireProof(
      rule.startIpAddress === RULES.get(rule.name) && rule.endIpAddress === RULES.get(rule.name),
      'Azure rule range changed; senior review required',
    );
  }
  const allowed = new Set(azure.map(rule => rule.startIpAddress));
  const missing = ips.map(ip => ip.ipv4).filter(ip => !allowed.has(ip));
  return {
    eligible: missing.length === 0,
    assignedIPv4: ips.map(ip => ip.ipv4),
    missingIPv4: missing,
    proposedSingletonRulesForSeniorReview: missing.map(ip => ({
      startIpAddress: ip,
      endIpAddress: ip,
    })),
    connectivityProved: false,
    next: missing.length
      ? 'STOP before deployment or credentials; narrow network amendment requires senior review'
      : 'Assignment eligible only; deploy after configuration, verify effective route, inspector and observer',
  };
}

function utc(value) {
  requireProof(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    'Absolute UTC timestamp required',
  );
  const parsed = Date.parse(value);
  requireProof(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value.replace('Z', '.000Z'),
    'Invalid UTC timestamp',
  );
  return parsed;
}

function freshInstanceEvidence(record, now, created) {
  let captured;
  try {
    captured = utc(record.lastEvidenceAt);
  } catch {
    return false;
  }
  if (captured < created || captured > now || now - captured > EVIDENCE_MAX_AGE_MS) return false;
  for (const key of ['deploymentId', 'instanceId']) {
    if (typeof record[key] !== 'string' || !UUID.test(record[key])) return false;
  }
  const binding = record.lastEvidenceBinding;
  return (
    binding !== null &&
    typeof binding === 'object' &&
    [
      'projectId',
      'environmentId',
      'serviceId',
      'deploymentId',
      'instanceId',
      'operationState',
    ].every(key => binding[key] === record[key])
  );
}

function requiredBudgetMinutes(action, budgets) {
  for (const [phase, minimum] of [
    ['schema', 65],
    ['containment', 105],
  ]) {
    requireProof(
      Number.isSafeInteger(budgets?.[phase]) && budgets[phase] >= minimum,
      'Explicit whole-minute budgets required; schema >= 65 and containment >= 105',
    );
  }
  // A larger schema/recovery estimate also reserves the preceding 40 minutes.
  const containment = Math.max(budgets.containment, budgets.schema + 40);
  requireProof(Number.isSafeInteger(containment), 'Budget exceeds safe integer range');
  return action === 'schema' ? budgets.schema : containment;
}

function lifecycleGate(action, record, now = Date.now()) {
  requireProof(['containment', 'schema', 'cleanup'].includes(action), 'Unknown lifecycle action');
  runnerId(record.serviceId);
  requireProof(
    record.projectId === PROJECT && record.environmentId === ENVIRONMENT,
    'Lifecycle scope mismatch',
  );
  requireProof(
    typeof record.cleanupOwner === 'string' &&
      record.cleanupOwner.trim().length > 0 &&
      typeof record.recoveryCustodian === 'string' &&
      record.recoveryCustodian.trim().length > 0 &&
      record.custodianAcknowledged === true,
    'Cleanup owner and independent acknowledged recovery custody required',
  );
  requireProof(
    record.cleanupOwner !== record.recoveryCustodian,
    'Recovery custody must survive operator interruption',
  );
  const created = utc(record.createdAt);
  const expires = utc(record.expiresAt);
  const start = utc(record.windowStartsAt);
  const end = utc(record.windowEndsAt);
  requireProof(
    expires > created && expires - created <= 120 * 60000 && expires <= end && start < end,
    'Expiry must be within two hours of creation and no later than window end',
  );
  requireProof(Number.isFinite(now) && created <= now, 'Creation is in the future');
  requireProof(
    ['idle', 'active', 'unknown', 'complete'].includes(record.operationState),
    'Missing critical-operation state',
  );
  if (!freshInstanceEvidence(record, now, created)) {
    return {
      eligible: false,
      operationState: 'unknown',
      expired: now >= expires,
      next: 'unknown—inspect first; KEEP runner; refresh exact instance evidence; never timer-kill or retry migration',
    };
  }
  // Check active/unknown before any clock-driven cleanup decision.
  if (record.operationState === 'active' || record.operationState === 'unknown') {
    return {
      eligible: false,
      expired: now >= expires,
      next: 'KEEP runner; attended read-only recovery; never timer-kill or retry migration',
    };
  }
  if (action === 'cleanup') {
    return {
      eligible: true,
      expired: now >= expires,
      next: 'Verify no active/unknown command, lock or session; then exact provider deletion and readback',
    };
  }
  requireProof(record.operationState === 'idle', 'Completed runner cannot start another release');
  requireProof(
    typeof record.windowApprovalReference === 'string' &&
      record.windowApprovalReference.trim().length > 0,
    'Fresh window approval reference required',
  );
  requireProof(
    record.attendanceConfirmed === true && record.freshWindowApproval === true,
    'Fresh window approval and current attendance required',
  );
  const requiredMinutes = requiredBudgetMinutes(action, record.budgetsMinutes);
  const remainingMinutes = (Math.min(expires, end) - now) / 60000;
  return {
    eligible: now >= start && remainingMinutes >= requiredMinutes,
    remainingMinutes,
    requiredMinutes,
    next: 'This is a time gate only; all release evidence and exact operation approvals remain mandatory',
  };
}

module.exports = { networkGate, lifecycleGate };
if (require.main === module) {
  try {
    const [command, ...args] = process.argv.slice(2);
    let result;
    if (command === 'network' && args.length === 3) {
      result = networkGate(
        args[0],
        JSON.parse(fs.readFileSync(args[1], 'utf8')),
        JSON.parse(fs.readFileSync(args[2], 'utf8')),
      );
    } else if (command === 'lifecycle' && args.length === 2) {
      result = lifecycleGate(args[0], JSON.parse(fs.readFileSync(args[1], 'utf8')));
    } else {
      throw new Error(
        'Usage: runner-gates.cjs network SERVICE_ID railway.json azure.json | lifecycle containment|schema|cleanup record.json',
      );
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exitCode = result.eligible ? 0 : 1;
  } catch (error) {
    // Do not echo untrusted file content, JSON parse diagnostics or credentials.
    process.stderr.write(
      'STOP: ' +
        (error.publicReason ??
          'invalid or unproved gate input; inspect sanitized evidence locally') +
        '.\n',
    );
    process.exitCode = 1;
  }
}
