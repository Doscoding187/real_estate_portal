const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const { createServer } = require('node:net');
const recovery = require('./cache-drain-session.cjs');

async function fixture(t, scenario) {
  // Minimal RESP peer: only client metadata and QUIT, no data read/write operations.
  const sockets=new Set();let quits=0;
  const redis=createServer(socket=>{
    sockets.add(socket);socket.once('close',()=>sockets.delete(socket));let buffer=Buffer.alloc(0);
    socket.on('data',chunk=>{
      buffer=Buffer.concat([buffer,chunk]);
      while(buffer.length){
        let offset=buffer.indexOf('\r\n');if(offset<0)return;
        if(buffer[0]!==42)throw Error('Fixture only accepts RESP arrays');
        const count=Number(buffer.subarray(1,offset));offset+=2;const args=[];
        for(let i=0;i<count;i++){
          const end=buffer.indexOf('\r\n',offset);if(end<0)return;
          if(buffer[offset]!==36)throw Error('Expected bulk string');
          const length=Number(buffer.subarray(offset+1,end));offset=end+2;
          if(buffer.length<offset+length+2)return;
          args.push(buffer.subarray(offset,offset+length).toString());offset+=length+2;
        }
        buffer=buffer.subarray(offset);
        const command=args[0]?.toUpperCase();
        if(command==='QUIT'){quits++;socket.end('+OK\r\n');}
        else if(command==='CLIENT')socket.write('+OK\r\n');
        else socket.write('-ERR fixture disallows data commands\r\n');
      }
    });
  });
  await new Promise(resolve=>redis.listen(0,'127.0.0.1',resolve));
  const child = spawn(process.execPath, ['--inspect=127.0.0.1:0', join(__dirname, 'fixtures/cache-recovery-child.mjs')], {
    env: { PATH: process.env.PATH, REDIS_URL:'redis://127.0.0.1:'+redis.address().port, ...(scenario ? { CASE: scenario } : {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '', endpoint, sent = false;
  const closed = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal })));
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await closed;
    for(const socket of sockets)socket.destroy();
    await new Promise(resolve=>redis.close(resolve));
  });
  const binding = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Fixture startup deadline\n' + out)), 5000);
    const collect = bytes => {
      out += bytes.toString();
      endpoint = out.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/)?.[0];
      if (!sent && out.includes('FIXTURE_READY')) { sent = true; child.kill('SIGTERM'); }
      const recorded = out.match(/FIXTURE_DRAINED (\{[^\n]+\})/);
      if (recorded && endpoint) { clearTimeout(timeout); resolve({ endpoint, role: 'api', ...JSON.parse(recorded[1]) }); }
    };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  return { child, binding, closed, output: () => out,quitCount:()=>quits };
}

async function naturallyClosed(f) {
  let timer;
  const exit = await Promise.race([
    f.closed,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Error('No natural exit\n' + f.output())), 2000); }),
  ]).finally(() => clearTimeout(timer));
  assert.deepEqual(exit, { code: 0, signal: null });
}

test('releases the existing referenced timer after a completed drain and exits naturally', async t => {
  const f = await fixture(t);
  const client = await recovery.connect(f.binding.endpoint);
  const result = await recovery.withSession(client, async () => {
    const before = await recovery.inspectCache(client, f.binding);
    assert.equal(before.shape.timerReferenced, true);
    return recovery.recoverResources(client, { ...f.binding, approval: recovery.APPROVAL });
  });
  assert.equal(result.after.cacheReleased, true);
  assert.equal(result.redis.redisReleased, true);
  assert.equal(f.quitCount(), 1);
  assert.equal(result.after.exitCode, 0);
  await naturallyClosed(f);
});

test('missing scope approval leaves the cache untouched', async t => {
  const f = await fixture(t);
  const client = await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client, async () => {
    await assert.rejects(recovery.recoverResources(client, f.binding), /scope required/);
    const untouched = await recovery.inspectCache(client, f.binding);
    assert.equal(untouched.shape.timerDestroyed, false);
    await recovery.recoverResources(client, { ...f.binding, approval: recovery.APPROVAL });
  });
  await naturallyClosed(f);
});

test('a mismatched process start tick refuses recovery', async t => {
  const f = await fixture(t);
  const client = await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client, async () => {
    await assert.rejects(recovery.recoverResources(client, {
      ...f.binding, startTicks: String(BigInt(f.binding.startTicks) + 1n), approval: recovery.APPROVAL,
    }), /ticks mismatch/);
    await recovery.recoverResources(client, { ...f.binding, approval: recovery.APPROVAL });
  });
  await naturallyClosed(f);
});

test('a failed pool drain refuses cache recovery', async t => {
  const f = await fixture(t, 'failed-drain');
  const client = await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client, async () => {
    await assert.rejects(recovery.recoverResources(client, { ...f.binding, approval: recovery.APPROVAL }), /drain is incomplete/);
  });
  assert.equal(f.child.exitCode, null);
});

test('an ambiguous route refuses singleton recovery', async t => {
  const f = await fixture(t, 'ambiguous-route');
  const client = await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client, async () => {
    await assert.rejects(recovery.recoverResources(client, { ...f.binding, approval: recovery.APPROVAL }), /reference unavailable/);
  });
  assert.equal(f.child.exitCode, null);
});

test('an already recorded recovery attempt refuses another mutation', async t => {
  const f = await fixture(t);
  const client = await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client, async () => {
    // Fixture-only injection of a lost-acknowledgement state; no production mutation.
    await client.post('Runtime.evaluate', {
      expression: 'globalThis.__plAttendedDrain.cacheRecoveryAttempted=true', returnByValue: true,
    });
    await assert.rejects(recovery.recoverResources(client, {
      ...f.binding, approval: recovery.APPROVAL,
    }), /previously attempted/);
  });
  assert.equal(f.child.exitCode, null);
});


test('a Redis close failure preserves the timer and prohibits retry', async t => {
  const f=await fixture(t,'redis-failure');
  const client=await recovery.connect(f.binding.endpoint);
  await recovery.withSession(client,async()=>{
    await assert.rejects(recovery.recoverResources(client,{...f.binding,approval:recovery.APPROVAL}),/Redis recovery outcome unknown or failed/);
    await assert.rejects(recovery.recoverResources(client,{...f.binding,approval:recovery.APPROVAL}),/previously attempted/);
  });
  assert.equal(f.child.exitCode,null);
  assert.equal(f.quitCount(),0);
});
