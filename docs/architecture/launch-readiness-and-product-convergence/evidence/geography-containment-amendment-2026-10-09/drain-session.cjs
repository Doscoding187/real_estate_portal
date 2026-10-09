// Attended operational artifact; never imported by application startup.
// Requires a separately approved loopback Inspector connection to the bound PID.
// No signals, deployments, SQL, credentials, imports in the target, or force-kills.
const fs = require('node:fs');

// Deadlines bound the observer only; they never cancel or retry a target operation.
async function connect(endpoint, options = {}) {
  const url = new URL(endpoint);
  if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1' || url.username || url.password) throw Error('Loopback only');
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) throw Error('Invalid observer deadline');
  const socket = new (options.WebSocket ?? WebSocket)(url);
  const pending = new Map();
  const contexts = new Map();
  let sequence = 0, stopped = false;
  function fail(error) {
    stopped = true;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); }
    pending.clear();
    try { socket.close(); } catch { /* CLI finally closes its own process on failure. */ }
  }
  socket.addEventListener('error', () => fail(Error('Inspector transport failed; target outcome unknown')));
  socket.addEventListener('close', () => fail(Error('Inspector disconnected; target outcome unknown')));
  socket.addEventListener('message', event => {
    try {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.executionContextCreated') contexts.set(message.params.context.id, message.params.context);
      if (message.method === 'Runtime.executionContextDestroyed') contexts.delete(message.params.executionContextId);
      if (!message.id) return;
      const item = pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timer);
      pending.delete(message.id);
      message.error ? item.reject(Error(item.method + ': Inspector command rejected')) : item.resolve(message.result);
    } catch { fail(Error('Invalid Inspector response; target outcome unknown')); }
  });
  const client = {
    async close() {
      if (socket.readyState === 3) return;
      await new Promise((resolve, reject) => {
        const done = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(() => {
          socket.removeEventListener('close', done);
          reject(Error('Inspector disconnect deadline; terminate observer process'));
        }, timeoutMs);
        socket.addEventListener('close', done, { once: true });
        fail(Error('Observer closed; target outcome unknown for unfinished commands'));
      });
    },
    post(method, params = {}) {
      if (stopped) throw Error('Inspector session unavailable; do not retry arming');
      if (method === 'Runtime.evaluate') {
        const candidates = [...contexts.values()].filter(c => c.auxData?.isDefault);
        const context = candidates.length === 1 ? candidates[0] : contexts.size === 1 ? [...contexts.values()][0] : null;
        if (!context) throw Error('No unique main context');
        params = { ...params, contextId: context.id };
      }
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(Error('Inspector command deadline; target outcome unknown; do not retry arming')), timeoutMs);
        pending.set(id, { resolve, reject, method, timer });
        try { socket.send(JSON.stringify({ id, method, params })); }
        catch { fail(Error('Inspector send failed; target outcome unknown')); }
      });
    },
  };
  try {
    await new Promise((resolve, reject) => {
      const finish = error => {
        clearTimeout(timer);
        socket.removeEventListener('open', opened);
        socket.removeEventListener('error', failed);
        socket.removeEventListener('close', failed);
        error ? reject(error) : resolve();
      };
      const opened = () => finish();
      const failed = () => finish(Error('Inspector connection failed'));
      const timer = setTimeout(() => finish(Error('Inspector connection deadline')), timeoutMs);
      socket.addEventListener('open', opened, { once: true });
      socket.addEventListener('error', failed, { once: true });
      socket.addEventListener('close', failed, { once: true });
    });
    await client.post('Runtime.enable');
    return client;
  } catch (error) {
    try { await client.close(); } catch { /* Original failure preserved; CLI exits. */ }
    throw error;
  }
}

function processStartTicks(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) throw Error('Invalid child PID');
  const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
  return stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/)[19];
}

async function assertIdentity(client, role, expectedPid, token, startTicks, requireArmed = false) {
  if (!['api', 'email'].includes(role) || !/^[a-z0-9-]{12,80}$/.test(token) ||
      typeof startTicks !== 'string' || !/^[0-9]+$/.test(startTicks)) throw Error('Invalid binding');
  if (processStartTicks(expectedPid) !== startTicks) throw Error('Process start ticks mismatch');
  const result = await client.post('Runtime.evaluate', {
    expression: `({pid:process.pid,node:process.version,drain:globalThis.__plAttendedDrain ?
      {token:globalThis.__plAttendedDrain.token,role:globalThis.__plAttendedDrain.role,
       pid:globalThis.__plAttendedDrain.pid,startTicks:globalThis.__plAttendedDrain.startTicks}:null})`,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw Error('Identity observation failed');
  const identity = result.result.value;
  if (identity.pid !== expectedPid || processStartTicks(expectedPid) !== startTicks) throw Error('Process identity mismatch');
  const d = identity.drain;
  if (requireArmed && !d) throw Error('Drain state missing');
  if (d && (d.token !== token || d.role !== role || d.pid !== expectedPid || d.startTicks !== startTicks)) throw Error('Drain binding mismatch');
  return identity;
}

async function call(client, object, declaration, objects = [], awaitPromise = false) {
  const result = await client.post('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: declaration,
    arguments: objects.map(value => ({ objectId: value.objectId })),
    returnByValue: true,
    awaitPromise,
  });
  if (result.exceptionDetails) throw Error('Target operation failed; retain containment');
  return result.result.value;
}

// Follow only named, existing function scopes. Never import a second module instance.
async function references(client) {
  const evaluated = await client.post('Runtime.evaluate', {
    expression: "process.listeners('SIGTERM')", returnByValue: false,
  });
  const properties = async object => client.post('Runtime.getProperties', {
    objectId: object.objectId, ownProperties: true,
  });
  const listeners = await properties(evaluated.result);
  const queue = listeners.result.filter(p => /^\d+$/.test(p.name)).map(p => p.value);
  const follow = new Set(['shutdown', 'runHostedEmailSupervisor', 'shutdownDb']);
  const wanted = new Set([
    ...follow, 'runtimePool', 'activeServer', 'savedSearchDeliveryScheduler',
    'commercialTermNoticeScheduler',
  ]);
  const found = {};
  for (let n = 0; n < queue.length && n < 12; n++) {
    const detail = await properties(queue[n]);
    const scopeList = detail.internalProperties?.find(p => p.name === '[[Scopes]]')?.value;
    if (!scopeList) continue;
    const scopes = await properties(scopeList);
    for (const scope of scopes.result) {
      if (!/^\d+$/.test(scope.name) || scope.value?.description === 'Global') continue;
      const bindings = await properties(scope.value);
      for (const binding of bindings.result) {
        if (!wanted.has(binding.name) || !binding.value?.objectId || found[binding.name]) continue;
        found[binding.name] = binding.value;
        if (follow.has(binding.name)) queue.push(binding.value);
      }
    }
  }
  return found;
}

async function prepare(client, role, expectedPid, token, execute, startTicks) {
  const identity = await assertIdentity(client, role, expectedPid, token, startTicks);
  const refs = await references(client);
  const required = role === 'api'
    ? ['runtimePool', 'activeServer', 'savedSearchDeliveryScheduler', 'commercialTermNoticeScheduler']
    : ['runtimePool'];
  if (required.some(name => !refs[name])) throw Error('Expected live singleton unavailable; do not signal');
  const poolShape = await call(client, refs.runtimePool,
    'function(){return {end:typeof this.end,pool:!!this.pool}}');
  if (poolShape.end !== 'function' || !poolShape.pool) throw Error('Pool shape mismatch');
  if (role === 'api') {
    const shapes = await call(client, refs.activeServer,
      'function(saved,commercial){return {listening:this.listening,close:typeof this.close,savedStop:typeof saved.stop,savedStatus:typeof saved.getStatus,commercialStop:typeof commercial.stop,commercialStatus:typeof commercial.status}}',
      [refs.savedSearchDeliveryScheduler, refs.commercialTermNoticeScheduler]);
    if (!shapes.listening || Object.entries(shapes).some(([key, value]) => key !== 'listening' && value !== 'function')) {
      throw Error('API interface mismatch');
    }
  }
  if (!execute) return { role, identity, references: required, armed: false };
  // This wrapper only observes completion of the original, awaited canonical end.
  // It does not replace queries, create connections, or change the shutdown result.
  const declaration = `function(){
    if(globalThis.__plAttendedDrain) throw Error('Already armed');
    const state=globalThis.__plAttendedDrain={token:${JSON.stringify(token)},role:${JSON.stringify(role)},pid:${expectedPid},startTicks:${JSON.stringify(startTicks)},poolEndStarted:false,poolEndCompleted:false,poolEndFailed:false,httpClosed:false,schedulersStopped:false,savedStopCompleted:false};
    const emit=event=>{try{console.log(JSON.stringify({kind:'attended-drain',token:state.token,event}))}catch{state.logFailed=true}};
    const original=this.end;
    this.end=async function(...args){
      state.poolEndStarted=true;
      emit('POOL_END_STARTED');
      try{const result=await original.apply(this,args);state.poolEndCompleted=true;emit('POOL_END_COMPLETED');return result}
      catch(error){state.poolEndFailed=true;emit('POOL_END_FAILED');throw error}
    };
    return {armed:true};
  }`;
  await call(client, refs.runtimePool, declaration);
  if (role === 'api') {
    await call(client, refs.activeServer,
      `function(saved,commercial){
        const state=globalThis.__plAttendedDrain;
        const emit=event=>{try{console.log(JSON.stringify({kind:'attended-drain',token:state.token,event}))}catch{state.logFailed=true}};
        this.once('close',()=>{state.httpClosed=true;emit('HTTP_CLOSED')});
        const savedPromise=saved.stop();
        commercial.stop();
        state.schedulersStopped=true;
        state.savedPromise=Promise.resolve(savedPromise).then(()=>{state.savedStopCompleted=true},()=>{state.savedStopFailed=true});
        this.close(error=>{if(error){state.httpCloseFailed=true;emit('HTTP_CLOSE_FAILED')}});
        return {timersStopped:true};
      }`, [refs.savedSearchDeliveryScheduler, refs.commercialTermNoticeScheduler]);
  }
  return { role, identity, armed: true };
}

async function state(client, role, expectedPid, token, startTicks) {
  await assertIdentity(client, role, expectedPid, token, startTicks, true);
  const refs = await references(client);
  const result = await client.post('Runtime.evaluate', {
    expression: `(()=>{const s=globalThis.__plAttendedDrain;if(!s)return null;return {token:s.token,role:s.role,pid:s.pid,startTicks:s.startTicks,logFailed:!!s.logFailed,poolEndStarted:s.poolEndStarted,poolEndCompleted:s.poolEndCompleted,poolEndFailed:s.poolEndFailed,httpClosed:s.httpClosed,httpCloseFailed:!!s.httpCloseFailed,schedulersStopped:s.schedulersStopped,savedStopCompleted:s.savedStopCompleted,savedStopFailed:!!s.savedStopFailed}})()`,
    returnByValue: true,
  });
  if (result.exceptionDetails || !result.result.value) throw Error('Drain state unavailable');
  await assertIdentity(client, role, expectedPid, token, startTicks, true);
  if (role !== 'api') return result.result.value;
  const status = await call(client, refs.savedSearchDeliveryScheduler,
    'function(commercial){const a=this.getStatus(),b=commercial.status();return {saved:{running:a.running,timerActive:a.timerActive},commercial:{running:b.running,timerActive:b.timerActive}}}',
    [refs.commercialTermNoticeScheduler]);
  // Only write activity flags, never customer criteria/results or recipient data.
  return { ...result.result.value, saved: { running: status.saved.running, timerActive: status.saved.timerActive },
    commercial: { running: status.commercial.running, timerActive: status.commercial.timerActive } };
}

async function withSession(client, operation) {
  let primary;
  try { return await operation(); }
  catch (error) { primary = error; throw error; }
  finally {
    try { await client.close(); }
    catch (error) { if (!primary) throw error; /* Preserve original uncertain outcome. */ }
  }
}

module.exports = { connect, prepare, state, processStartTicks, withSession };
if (require.main === module) {
  const [bindingFile, mode] = process.argv.slice(2);
  if (!['inspect', 'arm', 'state'].includes(mode)) throw Error('Mode: inspect | arm | state');
  const binding = JSON.parse(fs.readFileSync(bindingFile, 'utf8'));
  if (mode === 'arm' && binding.approval !== 'EDWARD_APPROVED_ATTENDED_CONTAINMENT_AMENDMENT') {
    throw Error('Separate containment amendment approval required');
  }
  // Whole-operation ceiling includes scope discovery. It kills only this observer.
  const watchdog = setTimeout(() => {
    console.error('Observer operation deadline; target outcome unknown; do not retry arming');
    process.exit(1);
  }, 60000);
  (async () => {
    const client = await connect(binding.endpoint);
    const result = await withSession(client, async () => {
      return mode === 'state' ? await state(client, binding.role, binding.pid, binding.token, binding.startTicks)
        : await prepare(client, binding.role, binding.pid, binding.token, mode === 'arm', binding.startTicks);
    });
    clearTimeout(watchdog);
    console.log(JSON.stringify(result));
  })().catch(error => { console.error(error.message); process.exit(1); /* exits only this observer, releasing its socket */ });
}
