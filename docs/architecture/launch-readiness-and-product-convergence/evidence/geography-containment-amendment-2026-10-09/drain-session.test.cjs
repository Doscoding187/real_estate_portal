// Only VM objects and fixture transports. No database, provider, or application signals.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { connect, prepare, state, processStartTicks, withSession } = require('./drain-session.cjs');
const pid = process.pid, ticks = processStartTicks(pid), token = 'senior-drain-test-001';

function target({ logThrows = false, endThrows = false, interruptArm = false } = {}) {
  let endCalls = 0, timerStopped = false;
  const originalError = new Error('original pool error');
  const pool = { pool: {}, async end() { endCalls++; if (endThrows) throw originalError; return 'closed'; } };
  const server = { listening: true, once(event, fn) { this.closed = fn; }, close(fn) { this.listening = false; this.closed(); fn(); } };
  const saved = { stop() { timerStopped = true; }, getStatus() { return { running: false, timerActive: !timerStopped }; } };
  const commercial = { stop() {}, status() { return { running: false, timerActive: false }; } };
  const objects = { pool, server, saved, commercial };
  const context = vm.createContext({ process: { pid, version: process.version }, console: { log() { if (logThrows) throw Error('log failure'); } } });
  const ref = id => ({ objectId: id });
  const client = { async post(method, params) {
    if (method === 'Runtime.evaluate') {
      if (params.expression === "process.listeners('SIGTERM')") return { result: ref('listeners') };
      return { result: { value: vm.runInContext(params.expression, context) } };
    }
    if (method === 'Runtime.getProperties') {
      if (params.objectId === 'listeners') return { result: [{ name: '0', value: ref('listener') }] };
      if (params.objectId === 'listener') return { result: [], internalProperties: [{ name: '[[Scopes]]', value: ref('scopes') }] };
      if (params.objectId === 'scopes') return { result: [{ name: '0', value: ref('scope') }] };
      if (params.objectId === 'scope') return { result: Object.entries({ runtimePool: 'pool', activeServer: 'server', savedSearchDeliveryScheduler: 'saved', commercialTermNoticeScheduler: 'commercial' }).map(([name, id]) => ({ name, value: ref(id) })) };
      return { result: [] };
    }
    if (method === 'Runtime.callFunctionOn') {
      if (interruptArm && params.functionDeclaration.includes("this.once('close'")) throw Error('Inspector disconnected; target outcome unknown');
      const fn = vm.runInContext('(' + params.functionDeclaration + ')', context);
      const value = await fn.apply(objects[params.objectId], params.arguments.map(a => objects[a.objectId]));
      return { result: { value } };
    }
    throw Error('Unexpected command');
  } };
  return { client, pool, context, originalError, endCalls: () => endCalls };
}

for (const endThrows of [false, true]) test('throwing log preserves original pool ' + (endThrows ? 'error' : 'success'), async () => {
  const t = target({ logThrows: true, endThrows });
  await prepare(t.client, 'email', pid, token, true, ticks);
  if (endThrows) await assert.rejects(t.pool.end(), error => error === t.originalError);
  else assert.equal(await t.pool.end(), 'closed');
  assert.equal(t.endCalls(), 1);
  const observed = await state(t.client, 'email', pid, token, ticks);
  assert.equal(observed.poolEndCompleted, !endThrows);
  assert.equal(observed.poolEndFailed, endThrows);
  assert.equal(observed.logFailed, true);
});

test('HTTP-close logging failure cannot interrupt pre-drain', async () => {
  const t = target({ logThrows: true });
  await prepare(t.client, 'api', pid, token, true, ticks);
  const s = await state(t.client, 'api', pid, token, ticks);
  assert.equal(s.httpClosed, true); assert.equal(s.savedStopCompleted, true);
  assert.equal(s.saved.timerActive, false); assert.equal(s.logFailed, true);
});

test('state rejects missing state and wrong token, role, PID and start ticks', async () => {
  const t = target();
  await assert.rejects(state(t.client, 'email', pid, token, ticks), /missing/);
  await prepare(t.client, 'email', pid, token, true, ticks);
  await assert.rejects(state(t.client, 'email', pid, token + '-wrong', ticks), /binding mismatch/);
  await assert.rejects(state(t.client, 'api', pid, token, ticks), /binding mismatch/);
  t.context.process.pid = pid + 1;
  await assert.rejects(state(t.client, 'email', pid, token, ticks), /identity mismatch/);
  t.context.process.pid = pid;
  await assert.rejects(state(t.client, 'email', pid, token, ticks + '0'), /start ticks mismatch/);
  await assert.rejects(state(t.client, 'email', pid, token), /Invalid binding/);
});

test('interrupted arming is observable and cannot be armed again', async () => {
  const t = target({ interruptArm: true });
  await assert.rejects(prepare(t.client, 'api', pid, token, true, ticks), /outcome unknown/);
  const s = await state(t.client, 'api', pid, token, ticks);
  assert.equal(s.httpClosed, false); assert.equal(s.schedulersStopped, false);
  await assert.rejects(prepare(t.client, 'api', pid, token, true, ticks), /Already armed/);
  assert.equal(await t.pool.end(), 'closed'); assert.equal(t.endCalls(), 1);
});

function transport(mode) {
  let latest;
  class Socket extends EventTarget {
    readyState = 0;
    constructor() {
      super(); latest = this;
      if (mode !== 'never-open') queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); });
    }
    send(raw) {
      const m = JSON.parse(raw);
      if (mode === 'lost') return queueMicrotask(() => this.close());
      if (mode === 'no-response') return;
      queueMicrotask(() => {
        this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ method: 'Runtime.executionContextCreated', params: { context: { id: 1, auxData: { isDefault: true } } } }) }));
        this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ id: m.id, result: {} }) }));
      });
    }
    close() {
      if (mode === 'never-close' || this.readyState === 3) return;
      this.readyState = 3;
      queueMicrotask(() => this.dispatchEvent(new Event('close')));
    }
  }
  return { Socket, latest: () => latest };
}
for (const mode of ['never-open', 'no-response', 'lost']) test('observer terminates wait: ' + mode, async () => {
  const t = transport(mode);
  await assert.rejects(connect('ws://127.0.0.1:12345/id', { WebSocket: t.Socket, timeoutMs: 20 }), /deadline|disconnected/);
  assert.equal(t.latest().readyState, 3);
});
test('unresponsive close reports failure within deadline', async () => {
  const t = transport('never-close');
  const c = await connect('ws://127.0.0.1:12345/id', { WebSocket: t.Socket, timeoutMs: 20 });
  await assert.rejects(c.close(), /disconnect deadline/);
  assert.throws(() => c.post('Runtime.evaluate', {}), /unavailable/);
});
test('normal close disconnects and rejects further commands', async () => {
  const t = transport('normal');
  const c = await connect('ws://127.0.0.1:12345/id', { WebSocket: t.Socket, timeoutMs: 20 });
  await c.close(); assert.equal(t.latest().readyState, 3);
  assert.throws(() => c.post('Runtime.evaluate', {}), /unavailable/);
});
test('reject non-loopback and credential-bearing endpoints', async () => {
  await assert.rejects(connect('ws://example.com/id'), /Loopback/);
  await assert.rejects(connect('ws://user:pass@127.0.0.1/id'), /Loopback/);
});

test('disconnect failure preserves primary uncertain operation error', async () => {
  const primary = Error('arm outcome unknown');
  let closed = 0;
  await assert.rejects(withSession({ async close() { closed++; throw Error('close failed'); } }, async () => { throw primary; }), e => e === primary);
  assert.equal(closed, 1);
  await assert.rejects(withSession({ async close() { throw Error('close failed'); } }, async () => 'ok'), /close failed/);
});
