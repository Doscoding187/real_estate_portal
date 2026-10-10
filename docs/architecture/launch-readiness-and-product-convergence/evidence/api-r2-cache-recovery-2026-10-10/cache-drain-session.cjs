// Operational recovery only. Follow existing scopes; never import in the target.
// External deployment/source/process/parent/socket binding is required by the wrapper.
const original = require('./drain-session.original.cjs');

const APPROVAL = 'SENIOR_DELEGATED_R2_CACHE_AND_REDIS_RECOVERY_20261010';

async function properties(client, object) {
  if (!object?.objectId) throw Error('Existing object unavailable');
  return client.post('Runtime.getProperties', { objectId: object.objectId, ownProperties: true });
}

async function namedScopes(client, fn, names) {
  const details = await properties(client, fn);
  const list = details.internalProperties?.find(p => p.name === '[[Scopes]]')?.value;
  if (!list) throw Error('Existing function scopes unavailable');
  const scopes = await properties(client, list);
  const found = {};
  for (const entry of scopes.result) {
    if (!/^\d+$/.test(entry.name) || entry.value?.description === 'Global') continue;
    const scope = await properties(client, entry.value);
    for (const item of scope.result) {
      if (names.has(item.name) && item.value?.objectId && !found[item.name]) {
        found[item.name] = item.value;
      }
    }
  }
  return found;
}

async function existingFunction(client, object, declaration) {
  const result = await client.post('Runtime.callFunctionOn', {
    objectId: object.objectId, functionDeclaration: declaration, returnByValue: false,
  });
  if (result.exceptionDetails || !result.result?.objectId) throw Error('Existing reference unavailable');
  return result.result;
}

async function existingCache(client) {
  const evaluated = await client.post('Runtime.evaluate', {
    expression: "process.listeners('SIGTERM')", returnByValue: false,
  });
  const listeners = await properties(client, evaluated.result);
  const queue = listeners.result.filter(p => /^\d+$/.test(p.name)).map(p => p.value);
  let server;
  for (let n = 0; n < queue.length && n < 12 && !server; n++) {
    const refs = await namedScopes(client, queue[n], new Set(['shutdown', 'activeServer']));
    if (refs.activeServer) server = refs.activeServer;
    if (refs.shutdown) queue.push(refs.shutdown);
  }
  if (!server) throw Error('Original server scope unavailable');
  const handler = await existingFunction(client, server, `function(){
    const applications=this.listeners('request');
    if(applications.length!==1) throw Error('Ambiguous application');
    const layers=applications[0]._router?.stack;
    if(!Array.isArray(layers)) throw Error('Original router unavailable');
    const matches=layers.filter(l=>l.handle?.stack &&
      l.regexp?.source.replaceAll(String.fromCharCode(92),'')==='^/api/explore/?(?=/|$)');
    if(matches.length!==1) throw Error('Ambiguous Explore mount');
    const roots=matches[0].handle.stack.filter(l=>l.route?.path==='/');
    if(roots.length!==1) throw Error('Ambiguous original route');
    const handlers=roots[0].route.stack;
    if(!handlers.length) throw Error('Original handler unavailable');
    return handlers[handlers.length-1].handle;
  }`);
  const route = await namedScopes(client, handler, new Set(['exploreFeedService']));
  if (!route.exploreFeedService) throw Error('Original feed scope unavailable');
  const feed = await existingFunction(client, route.exploreFeedService,
    'function(){return this.getRecommendedFeed}');
  const refs = await namedScopes(client, feed, new Set(['cache']));
  if (!refs.cache) throw Error('Original cache scope unavailable');
  return refs.cache;
}

async function inspectExistingRedis(client, binding) {
  await drained(client, binding);
  const evaluated=await client.post('Runtime.evaluate', {
    expression: "process.listeners('SIGTERM')", returnByValue:false,
  });
  const listeners=await properties(client,evaluated.result);
  const queue=listeners.result.filter(p=>/^\d+$/.test(p.name)).map(p=>p.value);
  let router;
  for(let n=0;n<queue.length && n<12 && !router;n++) {
    const refs=await namedScopes(client,queue[n],new Set(['shutdown','appRouter']));
    if(refs.appRouter)router=refs.appRouter;
    if(refs.shutdown)queue.push(refs.shutdown);
  }
  if(!router)throw Error('Original tRPC router scope unavailable');
  const resolver=await existingFunction(client,router,
    "function(){return this._def.procedures['cache.clearAll']._def.resolver}");
  const refs=await namedScopes(client,resolver,new Set(['redisCache']));
  if(!refs.redisCache)throw Error('Original Redis cache scope unavailable');
  const result=await client.post('Runtime.callFunctionOn',{
    objectId:refs.redisCache.objectId,
    functionDeclaration:`function(){return {constructorName:this.constructor?.name,
      disconnect:typeof this.disconnect,isConnected:this.isConnected,
      clientPresent:!!this.client,isOpen:this.client?.isOpen,isReady:this.client?.isReady}}`,
    returnByValue:true,
  });
  if(result.exceptionDetails)throw Error('Original Redis observation failed');
  return {redis:refs.redisCache,shape:result.result.value};
}

async function drained(client, binding) {
  const status = await original.state(client, 'api', binding.pid, binding.token, binding.startTicks);
  if (!status.httpClosed || !status.savedStopCompleted || !status.schedulersStopped ||
      !status.poolEndStarted || !status.poolEndCompleted || status.poolEndFailed ||
      status.httpCloseFailed || status.savedStopFailed || status.logFailed ||
      status.saved.running || status.saved.timerActive ||
      status.commercial.running || status.commercial.timerActive) {
    throw Error('Required API drain is incomplete');
  }
  const observed = await client.post('Runtime.evaluate', {
    expression: `({exitCode:process.exitCode,attempted:!!globalThis.__plAttendedDrain.cacheRecoveryAttempted})`,
    returnByValue: true,
  });
  if (observed.exceptionDetails || observed.result.value.exitCode !== 0 ||
      observed.result.value.attempted) throw Error('Failed or previously attempted recovery');
  return status;
}

async function inspectCache(client, binding) {
  await drained(client, binding);
  const cache = await existingCache(client);
  const result = await client.post('Runtime.callFunctionOn', {
    objectId: cache.objectId,
    functionDeclaration: `function(){return {
      constructorName:this.constructor?.name,destroy:typeof this.destroy,
      map:this.cache instanceof Map,entries:this.cache?.size,
      timer:!!this.cleanupInterval,repeatMs:this.cleanupInterval?._repeat,
      timerDestroyed:this.cleanupInterval?._destroyed,
      timerReferenced:this.cleanupInterval?.hasRef?.()
    }}`,
    returnByValue: true,
  });
  const shape = result.result?.value;
  if (result.exceptionDetails || shape?.constructorName !== 'SimpleCache' ||
      shape.destroy !== 'function' || shape.map !== true || shape.timer !== true ||
      shape.repeatMs !== 60000 || shape.timerDestroyed !== false || shape.timerReferenced !== true) {
    throw Error('Original cache/timer shape differs');
  }
  await drained(client, binding);
  return { cache, shape };
}

async function recoverResources(client, binding) {
  if (binding.approval !== APPROVAL) throw Error('Reviewed recovery scope required');
  const { cache, shape } = await inspectCache(client, binding);
  const redis=await inspectExistingRedis(client,binding);
  if(redis.shape.constructorName!=='RedisCache' || redis.shape.disconnect!=='function' ||
     !redis.shape.isConnected || !redis.shape.clientPresent || !redis.shape.isOpen || !redis.shape.isReady)
    throw Error('Original ready Redis client shape differs');
  await drained(client,binding);
  const disconnected=await client.post('Runtime.callFunctionOn',{
    objectId:redis.redis.objectId,
    functionDeclaration:`async function(){
      const s=globalThis.__plAttendedDrain;
      if(s.cacheRecoveryAttempted || process.exitCode!==0 || !s.httpClosed ||
         !s.savedStopCompleted || !s.schedulersStopped || !s.poolEndCompleted ||
         s.poolEndFailed || s.httpCloseFailed || s.savedStopFailed || s.logFailed)
        throw Error('Recovery prerequisites changed');
      s.cacheRecoveryAttempted=true;
      try {
        await this.disconnect();
        if(this.isConnected!==false || this.client?.isOpen!==false)throw Error('Redis release incomplete');
        s.redisRecoveryCompleted=true;
        return {redisReleased:true,isConnected:this.isConnected,isOpen:this.client.isOpen};
      }catch(error){s.cacheRecoveryFailed=true;throw error;}
    }`,
    returnByValue:true,awaitPromise:true,
  });
  if(disconnected.exceptionDetails || !disconnected.result?.value?.redisReleased)
    throw Error('Redis recovery outcome unknown or failed; inspect, never retry');
  const result = await client.post('Runtime.callFunctionOn', {
    objectId: cache.objectId,
    functionDeclaration: `function(){
      const s=globalThis.__plAttendedDrain;
      if(!s.cacheRecoveryAttempted || !s.redisRecoveryCompleted || process.exitCode!==0 || !s.httpClosed ||
         !s.savedStopCompleted || !s.schedulersStopped || !s.poolEndCompleted ||
         s.poolEndFailed || s.httpCloseFailed || s.savedStopFailed || s.logFailed)
        throw Error('Recovery prerequisites changed');
      const timer=this.cleanupInterval;
      try {
        this.destroy();
        if(timer._destroyed!==true || this.cache.size!==0) throw Error('Cache release incomplete');
        s.cacheRecoveryCompleted=true;
        return {token:s.token,pid:s.pid,startTicks:s.startTicks,cacheReleased:true,
          timerDestroyed:true,exitCode:process.exitCode};
      } catch(error) {s.cacheRecoveryFailed=true;throw error;}
    }`,
    returnByValue: true,
  });
  if (result.exceptionDetails || !result.result?.value?.cacheReleased) {
    throw Error('Recovery outcome unknown or failed; inspect, never retry');
  }
  return { before: {cache:shape,redis:redis.shape},redis:disconnected.result.value,after: result.result.value };
}

module.exports = { ...original, APPROVAL, inspectCache, recoverResources, inspectExistingRedis };
