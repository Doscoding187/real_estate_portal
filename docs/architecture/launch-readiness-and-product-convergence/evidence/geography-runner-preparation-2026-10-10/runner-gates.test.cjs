'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');
const { networkGate, lifecycleGate } = require('./runner-gates.cjs');
const evidence = require('./read-only-provider-evidence.json');
const SERVICE = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const now = Date.parse('2026-10-10T16:10:00Z');
const railway = () => ({
  ...structuredClone(evidence.apiStaticOutbound),
  service: { id: SERVICE },
});
const azure = () => structuredClone(evidence.azureFirewallRules);
const lifecycle = () => ({
  projectId: '8cdd7515-ddd2-4252-bbee-df5a5c209d4b',
  environmentId: '63070d99-357a-40ba-99c3-6d1368f61652',
  serviceId: SERVICE,
  createdAt: '2026-10-10T16:00:00Z',
  expiresAt: '2026-10-10T18:00:00Z',
  windowStartsAt: '2026-10-10T16:00:00Z',
  windowEndsAt: '2026-10-10T18:00:00Z',
  windowApprovalReference: 'SYNTHETIC-TEST-ONLY',
  cleanupOwner: 'senior operator',
  recoveryCustodian: 'attending recovery custodian',
  custodianAcknowledged: true,
  attendanceConfirmed: true,
  freshWindowApproval: true,
  operationState: 'idle',
});

test('all assigned addresses must be covered; eligibility never claims connectivity', () => {
  const result = networkGate(SERVICE, railway(), azure());
  assert.equal(result.eligible, true);
  assert.equal(result.connectivityProved, false);
});
test('one uncovered HA address refuses and returns an exact singleton amendment', () => {
  const r = railway();
  r.staticIp.ips[2].ipv4 = '34.21.135.52';
  const result = networkGate(SERVICE, r, azure());
  assert.equal(result.eligible, false);
  assert.deepEqual(result.proposedSingletonRulesForSeniorReview, [
    { startIpAddress: '34.21.135.52', endIpAddress: '34.21.135.52' },
  ]);
});
test('disabled, empty, malformed, duplicate or wrong-region assignments fail', () => {
  for (const mutate of [
    r => {
      r.staticIp.enabled = false;
    },
    r => {
      r.staticIp.highAvailability = false;
    },
    r => {
      r.staticIp.ips = [];
    },
    r => {
      r.staticIp.ips[0].ipv4 = '::1';
    },
    r => {
      r.staticIp.ips[0].ipv4 = '208.77.246.241';
    },
    r => {
      r.staticIp.ips[0].region = 'us';
    },
  ]) {
    const r = railway();
    mutate(r);
    assert.throws(() => networkGate(SERVICE, r, azure()));
  }
});
test('actual Azure identity/range drift cannot silently widen authority', () => {
  for (const mutate of [
    a => {
      a[0].endIpAddress = '255.255.255.255';
    },
    a => {
      a[0].startIpAddress = a[0].endIpAddress = '0.0.0.0';
    },
    a => {
      a[0].id = '/other-server';
    },
    a => {
      a.pop();
    },
    a => {
      a.push(a[0]);
    },
  ]) {
    const a = azure();
    mutate(a);
    assert.throws(() => networkGate(SERVICE, railway(), a));
  }
});
test('scope mismatches, original services and retired runner refuse', () => {
  assert.throws(() =>
    networkGate(evidence.apiStaticOutbound.service.id, evidence.apiStaticOutbound, azure()),
  );
  assert.throws(() => networkGate('3160d05c-44f0-4d5f-af9c-7bfe5f5ce37e', railway(), azure()));
  const r = railway();
  r.environment.id = 'other';
  assert.throws(() => networkGate(SERVICE, r, azure()));
  assert.throws(() => networkGate(SERVICE, evidence.apiStaticOutbound, azure()));
});
test('containment requires 105 minutes; schema requires 65 minutes including recovery', () => {
  assert.equal(lifecycleGate('containment', lifecycle(), now).eligible, true);
  assert.equal(lifecycleGate('containment', lifecycle(), now + 6 * 60000).eligible, false);
  assert.equal(lifecycleGate('schema', lifecycle(), now + 45 * 60000).eligible, true);
  assert.equal(lifecycleGate('schema', lifecycle(), now + 45 * 60000 + 1).eligible, false);
});
test('window start, expiry and shorter runner expiry constrain admission', () => {
  assert.equal(lifecycleGate('schema', lifecycle(), now + 110 * 60000).eligible, false);
  const r = lifecycle();
  r.windowStartsAt = '2026-10-10T16:15:00Z';
  assert.equal(lifecycleGate('schema', r, now).eligible, false);
  r.windowStartsAt = '2026-10-10T16:00:00Z';
  r.expiresAt = '2026-10-10T17:00:00Z';
  assert.equal(lifecycleGate('schema', r, now).eligible, false);
});
test('overlong expiry, malformed dates, missing custody and absent attendance refuse', () => {
  for (const mutate of [
    r => {
      r.expiresAt = '2026-10-10T19:00:00Z';
    },
    r => {
      r.createdAt = '2026-02-30T16:00:00Z';
    },
    r => {
      r.recoveryCustodian = null;
    },
    r => {
      r.recoveryCustodian = r.cleanupOwner;
    },
    r => {
      r.custodianAcknowledged = false;
    },
    r => {
      r.attendanceConfirmed = false;
    },
    r => {
      r.freshWindowApproval = false;
    },
    r => {
      r.windowApprovalReference = null;
    },
  ]) {
    const r = lifecycle();
    mutate(r);
    assert.throws(() => lifecycleGate('schema', r, now));
  }
});
test('active and unknown operations cannot be cleaned up before or after expiry', () => {
  for (const state of ['active', 'unknown']) {
    const r = lifecycle();
    r.operationState = state;
    for (const at of [now, now + 180 * 60000]) {
      for (const action of ['cleanup', 'schema', 'containment']) {
        const result = lifecycleGate(action, r, at);
        assert.equal(result.eligible, false);
        assert.match(result.next, /never timer-kill/);
      }
    }
  }
});
test('idle cleanup gives verification instructions, no automatic provider action', () => {
  const result = lifecycleGate('cleanup', lifecycle(), now + 180 * 60000);
  assert.equal(result.eligible, true);
  assert.equal(result.expired, true);
  assert.match(result.next, /provider deletion and readback/);
  const r = lifecycle();
  r.operationState = 'complete';
  assert.throws(() => lifecycleGate('schema', r, now));
});
test('unfilled example refuses; CLI invalid input fails without echoing sensitive content', () => {
  assert.throws(() => lifecycleGate('schema', require('./lifecycle-record.example.json'), now));
  const r = spawnSync(
    process.execPath,
    [require.resolve('./runner-gates.cjs'), 'bad-secret-value'],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /bad-secret-value/);
  assert.equal(r.stdout, '');
});
