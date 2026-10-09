// Attended operational artifact; never imported by application startup.
// Requires a separately approved loopback Inspector connection to the bound PID.
// No signals, deployments, SQL, credentials, imports in the target, or force-kills.
const fs = require('node:fs');

async function connect(endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== 'ws:' || url.hostname !== '127.0.0.1') throw Error('Loopback only');
  const socket = new WebSocket(url);
  const pending = new Map();
  const contexts = new Map();
  let sequence = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.executionContextCreated') contexts.set(message.params.context.id, message.params.context);
    if (message.method === 'Runtime.executionContextDestroyed') contexts.delete(message.params.executionContextId);
    if (!message.id) return;
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    message.error ? item.reject(Error(item.method + ': ' + message.error.message)) : item.resolve(message.result);
  });
  socket.addEventListener('close', () => {
    for (const item of pending.values()) item.reject(Error('Inspector disconnected'));
    pending.clear();
  });
  const client = {
    close: () => socket.close(),
    post(method, params = {}) {
      if (method === 'Runtime.evaluate') {
        const candidates = [...contexts.values()].filter(c => c.auxData?.isDefault);
        const context = candidates.length === 1 ? candidates[0] : contexts.size === 1 ? [...contexts.values()][0] : null;
        if (!context) throw Error('No unique main context: ' + JSON.stringify([...contexts.values()]));
        params = { ...params, contextId: context.id };
      }
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
  await client.post('Runtime.enable');
  return client;
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

async function prepare(client, role, expectedPid, token, execute) {
  if (!['api', 'email'].includes(role) || !/^[a-z0-9-]{12,80}$/.test(token)) throw Error('Invalid binding');
  const identity = await client.post('Runtime.evaluate', {
    expression: '({pid:process.pid,node:process.version})', returnByValue: true,
  });
  if (identity.result.value.pid !== expectedPid) throw Error('PID mismatch');
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
  if (!execute) return { role, identity: identity.result.value, references: required, armed: false };
  // This wrapper only observes completion of the original, awaited canonical end.
  // It does not replace queries, create connections, or change the shutdown result.
  const declaration = `function(){
    if(globalThis.__plAttendedDrain) throw Error('Already armed');
    const state=globalThis.__plAttendedDrain={token:${JSON.stringify(token)},poolEndStarted:false,poolEndCompleted:false,poolEndFailed:false,httpClosed:false,schedulersStopped:false,savedStopCompleted:false};
    const original=this.end;
    this.end=async function(...args){
      state.poolEndStarted=true;
      console.log(JSON.stringify({kind:'attended-drain',token:state.token,event:'POOL_END_STARTED'}));
      try{const result=await original.apply(this,args);state.poolEndCompleted=true;console.log(JSON.stringify({kind:'attended-drain',token:state.token,event:'POOL_END_COMPLETED'}));return result}
      catch(error){state.poolEndFailed=true;console.log(JSON.stringify({kind:'attended-drain',token:state.token,event:'POOL_END_FAILED'}));throw error}
    };
    return {armed:true};
  }`;
  await call(client, refs.runtimePool, declaration);
  if (role === 'api') {
    await call(client, refs.activeServer,
      `function(saved,commercial){
        const state=globalThis.__plAttendedDrain;
        this.once('close',()=>{state.httpClosed=true;console.log(JSON.stringify({kind:'attended-drain',token:state.token,event:'HTTP_CLOSED'}))});
        const savedPromise=saved.stop();
        commercial.stop();
        state.schedulersStopped=true;
        state.savedPromise=Promise.resolve(savedPromise).then(()=>{state.savedStopCompleted=true},()=>{state.savedStopFailed=true});
        this.close(error=>{if(error){state.httpCloseFailed=true;console.log(JSON.stringify({kind:'attended-drain',token:state.token,event:'HTTP_CLOSE_FAILED'}))}});
        return {timersStopped:true};
      }`, [refs.savedSearchDeliveryScheduler, refs.commercialTermNoticeScheduler]);
  }
  return { role, identity: identity.result.value, armed: true };
}

async function state(client, role) {
  const refs = await references(client);
  const result = await client.post('Runtime.evaluate', {
    expression: `(()=>{const s=globalThis.__plAttendedDrain;if(!s)return null;return {token:s.token,poolEndStarted:s.poolEndStarted,poolEndCompleted:s.poolEndCompleted,poolEndFailed:s.poolEndFailed,httpClosed:s.httpClosed,httpCloseFailed:!!s.httpCloseFailed,schedulersStopped:s.schedulersStopped,savedStopCompleted:s.savedStopCompleted,savedStopFailed:!!s.savedStopFailed}})()`,
    returnByValue: true,
  });
  if (role !== 'api') return result.result.value;
  const status = await call(client, refs.savedSearchDeliveryScheduler,
    'function(commercial){const a=this.getStatus(),b=commercial.status();return {saved:{running:a.running,timerActive:a.timerActive},commercial:{running:b.running,timerActive:b.timerActive}}}',
    [refs.commercialTermNoticeScheduler]);
  // Only write activity flags, never customer criteria/results or recipient data.
  return { ...result.result.value, saved: { running: status.saved.running, timerActive: status.saved.timerActive },
    commercial: { running: status.commercial.running, timerActive: status.commercial.timerActive } };
}

module.exports = { connect, prepare, state };
if (require.main === module) {
  const [bindingFile, mode] = process.argv.slice(2);
  if (!['inspect', 'arm', 'state'].includes(mode)) throw Error('Mode: inspect | arm | state');
  const binding = JSON.parse(fs.readFileSync(bindingFile, 'utf8'));
  if (mode === 'arm' && binding.approval !== 'EDWARD_APPROVED_ATTENDED_CONTAINMENT_AMENDMENT') {
    throw Error('Separate containment amendment approval required');
  }
  (async () => {
    const client = await connect(binding.endpoint);
    try {
      const result = mode === 'state' ? await state(client, binding.role)
        : await prepare(client, binding.role, binding.pid, binding.token, mode === 'arm');
      console.log(JSON.stringify(result));
    } finally { client.close(); }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
