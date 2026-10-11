import fs from 'node:fs';
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import crypto from 'node:crypto';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{40}$/i;
const POST_PATHS = ['/api/auth/login', '/api/auth/logout'];
const POST_PROCEDURES = ['auth.logout', 'listing.create', 'listing.update', 'listing.uploadMedia', 'listing.confirmMediaUpload'];

export function validateTransportInput({ binding, sourceSha, expiresAt, evidenceRoot, mode = 'read-only' }) {
  if (!binding || !['projectId', 'environmentId', 'serviceId', 'deploymentId', 'instanceId'].every(k => UUID.test(binding[k] || ''))) {
    throw new Error('Exact provider binding required');
  }
  if (binding.projectId !== '8cdd7515-ddd2-4252-bbee-df5a5c209d4b' ||
      binding.environmentId !== '63070d99-357a-40ba-99c3-6d1368f61652' ||
      binding.serviceId !== 'db88a720-2d1f-4afc-a3a8-6228b6b08d3e') throw new Error('Wrong application target');
  if (!SHA.test(sourceSha || '')) throw new Error('Full source SHA required');
  const remaining = Date.parse(expiresAt) - Date.now();
  if (!(remaining > 0 && remaining <= 2 * 60 * 60 * 1000)) throw new Error('Fresh bounded window required');
  if (!['read-only', 'private-proof'].includes(mode)) throw new Error('Unknown transport scope');
  if (typeof evidenceRoot !== 'string' || !evidenceRoot.startsWith('/home/edwardspc/.local/state/property-listify/')) throw new Error('Private evidence root required');
}

export function validateRequestScope(path, method, mode) {
  if (typeof path !== 'string' || !path.startsWith('/api/') || path.includes('://') || path.includes('\\') || /%(?:2e|2f|5c)/i.test(path.split('?')[0])) throw new Error('Private request path refused');
  const url = new URL(path, 'http://127.0.0.1');
  if (url.pathname !== path.split('?')[0] || !url.pathname.startsWith('/api/')) throw new Error('Private request normalization refused');
  if (['GET', 'OPTIONS'].includes(method)) return;
  if (mode !== 'private-proof' || method !== 'POST') throw new Error('Write outside admitted proof');
  if (POST_PATHS.includes(url.pathname)) return;
  if (!url.pathname.startsWith('/api/trpc/')) throw new Error('Unadmitted mutation endpoint');
  const procedures = url.pathname.slice('/api/trpc/'.length).split(',');
  if (!procedures.length || !procedures.every(p => POST_PROCEDURES.includes(p))) throw new Error('Unadmitted mutation procedure');
}

const remote = String.raw`
const readline=require('readline');let cfg;
const rl=readline.createInterface({input:process.stdin});
const emit=x=>process.stdout.write('PL_API '+JSON.stringify(x)+'\n');
rl.on('line',async line=>{let x;try{
 x=JSON.parse(line);
 if(!cfg){
  if(Date.now()>=Date.parse(x.expiry))throw Error('Private window expired');
  for(const[k,v]of Object.entries({projectId:'RAILWAY_PROJECT_ID',environmentId:'RAILWAY_ENVIRONMENT_ID',serviceId:'RAILWAY_SERVICE_ID',deploymentId:'RAILWAY_DEPLOYMENT_ID',instanceId:'RAILWAY_REPLICA_ID'}))if(process.env[v]!==x.binding[k])throw Error('API binding mismatch');
  if((process.env.BUILD_SHA||process.env.RAILWAY_GIT_COMMIT_SHA)!==x.sourceSha)throw Error('API source mismatch');
  cfg=x;emit({kind:'ready',binding:cfg.binding,sourceSha:cfg.sourceSha});return;
 }
 if(Date.now()>=Date.parse(cfg.expiry))throw Error('Private window expired');
 if(!x.path.startsWith('/api/')||!['GET','POST','OPTIONS'].includes(x.method)||x.path.includes('://'))throw Error('Private request scope');
 const headers={...x.headers,host:'api.propertylistifysa.co.za','x-forwarded-proto':'https'};
 delete headers['content-length'];delete headers['connection'];delete headers['accept-encoding'];
 const started=performance.now();
 const response=await fetch('http://127.0.0.1:'+String(process.env.PORT||3000)+x.path,{method:x.method,headers,body:x.method==='GET'?undefined:Buffer.from(x.body||'','base64'),redirect:'manual',signal:['GET','OPTIONS'].includes(x.method)?AbortSignal.timeout(8000):undefined});
 const body=Buffer.from(await response.arrayBuffer());if(body.length>10*1024*1024)throw Error('Private response size');
 const h=Object.fromEntries(response.headers);delete h['content-encoding'];delete h['content-length'];
 const cookies=response.headers.getSetCookie();if(cookies.length)h['set-cookie']=cookies.join('\n');
 emit({id:x.id,kind:'response',status:response.status,headers:h,body:body.toString('base64'),processingMs:Math.round(performance.now()-started)});
 }catch(e){emit({id:x?.id,kind:cfg?'failure':'initialization-failure',error:String(e.name||'Error')});}});
`;

function quote(value) { return "'" + value.replaceAll("'", "'\\''") + "'"; }

/** Actual API requests over provider-bound SSH. No maintenance-rule or server-code changes. */
export async function openPrivateApi(input) {
  validateTransportInput(input);
  const { binding, sourceSha, expiresAt, evidenceRoot, mode = 'read-only' } = input;
  fs.mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 });
  const stat = fs.statSync(evidenceRoot);
  if (stat.uid !== process.getuid() || (stat.mode & 0o077)) throw new Error('Evidence directory permissions refused');
  const child = spawn('railway', ['ssh', '--project', binding.projectId, '--environment', binding.environmentId,
    '--service', binding.serviceId, '--deployment-instance', binding.instanceId, 'node -e ' + quote(remote)], {
    env: { ...process.env, RAILWAY_CALLER: 'skill:use-railway@1.6.1', RAILWAY_AGENT_SESSION: 'senior-private-draft-release-20261011' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map(); let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const timer = setTimeout(() => { child.stdin.end(); rejectReady(new Error('Private transport readiness unknown')); }, 30000);
  const log = fs.openSync(evidenceRoot + '/private-api-transport.log', 'a', 0o600);
  child.stderr.on('data', bytes => fs.writeSync(log, bytes));
  readline.createInterface({ input: child.stdout }).on('line', line => {
    if (!line.startsWith('PL_API ')) return;
    const value = JSON.parse(line.slice(7));
    if (value.kind === 'ready') { clearTimeout(timer); resolveReady(value); return; }
    if (value.kind === 'initialization-failure') { clearTimeout(timer); child.stdin.end(); rejectReady(new Error('Private binding refused')); return; }
    const item = pending.get(value.id); if (!item) return;
    pending.delete(value.id);
    if (value.kind === 'failure') item.reject(new Error('Request result unknown: ' + value.error)); else item.resolve(value);
  });
  child.on('error', error => { clearTimeout(timer); rejectReady(error); });
  child.on('close', code => {
    clearTimeout(timer); fs.closeSync(log); rejectReady(new Error('Private transport closed: ' + code));
    for (const item of pending.values()) item.reject(new Error('Request outcome unknown'));
    pending.clear();
  });
  child.stdin.write(JSON.stringify({ binding, sourceSha, expiry: expiresAt }) + '\n');
  await ready;
  return {
    async request(path, options = {}) {
      const method = options.method || 'GET';
      validateRequestScope(path, method, mode);
      if (Date.now() >= Date.parse(expiresAt)) throw new Error('Private window expired');
      const id = crypto.randomUUID();
      const data = { id, path, method, headers: options.headers || {}, body: Buffer.from(options.body || '').toString('base64') };
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      child.stdin.write(JSON.stringify(data) + '\n');
      const value = await response;
      fs.appendFileSync(evidenceRoot + '/private-api-request-timeline.jsonl', JSON.stringify({ checkedAt: new Date().toISOString(), path: path.split('?')[0], method, status: value.status, processingMs: value.processingMs, requestId: value.headers['x-request-id'] || null }) + '\n', { mode: 0o600 });
      return { ...value, body: Buffer.from(value.body, 'base64') };
    },
    async route(context) {
      await context.route('https://api.propertylistifysa.co.za/**', async route => {
        const request = route.request(), url = new URL(request.url());
        try {
          const value = await this.request(url.pathname + url.search, { method: request.method(), headers: await request.allHeaders(), body: request.postDataBuffer() || undefined });
          await route.fulfill({ status: value.status, headers: value.headers, body: value.body });
        } catch { await route.abort('failed'); }
      });
    },
    async close() {
      const deadline = Date.now() + 10000;
      while (pending.size && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
      if (pending.size) throw new Error('Private requests active or unknown; preserve transport and reconcile');
      const closed = new Promise(resolve => child.once('close', resolve));
      child.stdin.end();
      await closed;
    },
  };
}
