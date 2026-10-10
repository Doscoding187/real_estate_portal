// Runs in a separate SSH observer on the exact original API replica.
const fs = require('node:fs');
const crypto = require('node:crypto');
const cfg = JSON.parse(fs.readFileSync(0, 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function processState(pid) {
  const stat = fs.readFileSync('/proc/' + pid + '/stat', 'utf8');
  const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
  return { pid, state: fields[0], ppid: Number(fields[1]), startTicks: fields[19], exitRaw: fields[49] };
}

function verify() {
  if (process.env.RAILWAY_DEPLOYMENT_ID !== cfg.deploymentId ||
      process.env.RAILWAY_GIT_COMMIT_SHA !== cfg.sourceSha ||
      process.env.RAILWAY_SERVICE_ID !== cfg.serviceId ||
      process.env.RAILWAY_ENVIRONMENT_ID !== cfg.environmentId) throw Error('Hosting binding changed');
  if (cfg.projectId !== '8cdd7515-ddd2-4252-bbee-df5a5c209d4b' ||
      cfg.environmentId !== '63070d99-357a-40ba-99c3-6d1368f61652' ||
      cfg.serviceId !== 'db88a720-2d1f-4afc-a3a8-6228b6b08d3e' ||
      cfg.deploymentId !== '93b7b423-91ac-4855-b8a7-e8fb53a0f112' ||
      cfg.instanceId !== '41e46a78-215c-4feb-9c7a-b0aa7d5faf50' ||
      cfg.sourceSha !== '68f2c679eb423dd0da8cb2b5115a85d4620a10aa') throw Error('Unreviewed binding');
  const expected = new Map([[1,'755792886'],[48,'755793028'],[60,'755793060'],[61,'755793060'],[77,'755793067']]);
  const parents = new Map([[1,0],[48,1],[60,48],[61,60],[77,61]]);
  const chain = [...expected].map(([pid, ticks]) => {
    const state = processState(pid);
    if (state.startTicks !== ticks || state.ppid !== parents.get(pid) ||
        ([48,60,61].includes(pid) && state.state !== 'T')) throw Error('Process or launcher binding changed');
    return state;
  });
  if (['Z','X','T'].includes(chain.at(-1).state)) throw Error('API is not the original live drained child');
  for (const [file, expectedHash] of Object.entries(cfg.sourceHashes)) {
    if (hash(fs.readFileSync('/app/' + file)) !== expectedHash) throw Error('Deployed source changed');
  }
  const own = new Set();
  for (const fd of fs.readdirSync('/proc/77/fd')) {
    try { const match=fs.readlinkSync('/proc/77/fd/' + fd).match(/^socket:\[(\d+)\]$/); if(match)own.add(match[1]); } catch {}
  }
  const connections = [];
  for (const protocol of ['tcp','tcp6']) {
    for (const line of fs.readFileSync('/proc/net/' + protocol,'utf8').trim().split('\n').slice(1)) {
      const fields=line.trim().split(/\s+/);
      if (!own.has(fields[9])) continue;
      // Permit only the existing loopback Inspector and the observed Redis peer.
      const inspector=protocol==='tcp' && fields[1]==='0100007F:240D' &&
        (fields[2]==='00000000:0000' || fields[2].startsWith('0100007F:'));
      const observedRedis=protocol==='tcp6' &&
        fields[1]==='A34C12FD0100735C660000908577084C:940A' &&
        fields[2]==='A34C12FD0100735C3B00009001B9AFEE:18EB' && fields[3]==='01';
      if (!inspector && !observedRedis) {
        throw Error('Remaining non-Inspector TCP connection');
      }
      connections.push({ protocol, local: fields[1], remote: fields[2], state: fields[3] });
    }
  }
  return { chain, ownedTcp: connections };
}

const ceiling = setTimeout(() => { console.error('Observer deadline: outcome unknown; do not retry'); process.exit(1); }, 60000);
(async () => {
  if (!['inspect','release'].includes(cfg.mode)) throw Error('Mode: inspect | release');
  const before = verify();
  if(Object.keys(cfg.artifacts).sort().join(',')!=='cache-drain-session.cjs,drain-session.original.cjs')throw Error('Unexpected observer artifact');
  for (const name of ['drain-session.original.cjs','cache-drain-session.cjs']) {
    if (hash(cfg.artifacts[name]) !== cfg.artifactHashes[name]) throw Error('Observer artifact changed');
  }
  if (cfg.artifactHashes['drain-session.original.cjs'] !== 'e483eed8b9c14100850177aaefedef60812e7b0ecc414752131e9c3cfd9bba62') throw Error('Original client changed');
  const bindingFile='/tmp/pl-attended-geography-20261010-api-senior/binding.json';
  const binding=JSON.parse(fs.readFileSync(bindingFile,'utf8'));
  if (binding.pid!==77 || binding.startTicks!=='755793067' || binding.token!=='geography-20261010-api-senior' || binding.role!=='api') throw Error('Original drain binding changed');
  const dir=fs.mkdtempSync('/tmp/pl-r2-cache-observer-');fs.chmodSync(dir,0o700);
  let result;
  try {
    for(const [name,contents] of Object.entries(cfg.artifacts))fs.writeFileSync(dir+'/'+name,contents,{mode:0o600,flag:'wx'});
    const recovery=require(dir+'/cache-drain-session.cjs');
    if(cfg.mode==='release') {
      if(cfg.approval!==recovery.APPROVAL)throw Error('Reviewed recovery scope absent');
      const end=Date.parse(cfg.windowEndsAt), now=Date.now(), start=Date.parse(cfg.windowStartsAt);
      if(!Number.isFinite(start)||!Number.isFinite(end)||now<start||now>=end||end-start>2*60*60*1000)throw Error('Fresh attended recovery window required');
      binding.approval=cfg.approval;
    }
    const client=await recovery.connect(binding.endpoint);
    result=await recovery.withSession(client,async()=>{
      verify();
      if(cfg.mode==='release')return recovery.recoverResources(client,binding);
      const inspection=await recovery.inspectCache(client,binding);
      const redis=await recovery.inspectExistingRedis(client,binding);
      return {cache:inspection.shape,redis:redis.shape};
    });
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
  clearTimeout(ceiling);
  console.log(JSON.stringify({mode:cfg.mode,at:new Date().toISOString(),deploymentId:cfg.deploymentId,instanceId:cfg.instanceId,sourceSha:cfg.sourceSha,before,result,observerFilesRemoved:true}));
})().catch(error=>{clearTimeout(ceiling);console.error(error.message);process.exit(1); /* Observer only. */});
