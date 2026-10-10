// Read-only exact-instance proof after recovery. No signals or Inspector calls.
const fs=require('node:fs'),crypto=require('node:crypto');
const cfg=JSON.parse(fs.readFileSync(0,'utf8'));
function stat(pid){const raw=fs.readFileSync('/proc/'+pid+'/stat','utf8');const fields=raw.slice(raw.lastIndexOf(')')+2).trim().split(/\s+/);return {pid,name:raw.slice(raw.indexOf('(')+1,raw.lastIndexOf(')')),state:fields[0],ppid:Number(fields[1]),startTicks:fields[19],exitRaw:fields[49]};}
if(process.env.RAILWAY_DEPLOYMENT_ID!==cfg.deploymentId || process.env.RAILWAY_GIT_COMMIT_SHA!==cfg.sourceSha || process.env.RAILWAY_SERVICE_ID!==cfg.serviceId || process.env.RAILWAY_ENVIRONMENT_ID!==cfg.environmentId)throw Error('Hosting identity changed');
const chain=cfg.chain.map(expected=>{const current=stat(expected.pid);if(current.ppid!==expected.ppid || current.startTicks!==expected.startTicks)throw Error('Process identity changed');return current;});
for(const [path,expected] of Object.entries(cfg.sourceHashes)){if(crypto.createHash('sha256').update(fs.readFileSync('/app/'+path)).digest('hex')!==expected)throw Error('Deployed source changed');}
const app=chain.find(p=>p.pid===77),parents=chain.filter(p=>[1,48,60,61].includes(p.pid));
const processes=fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)).flatMap(p=>{try{return [stat(Number(p))]}catch{return []}});
let owned=new Set([77]);
for(let pass=0;pass<processes.length;pass++){let changed=false;for(const p of processes){if(owned.has(p.ppid) && !owned.has(p.pid)){owned.add(p.pid);changed=true}}if(!changed)break;}
const descendants=processes.filter(p=>p.pid!==77 && owned.has(p.pid)).map(p=>({...p,fdCount:fs.readdirSync('/proc/'+p.pid+'/fd').length}));
const fdCount=fs.readdirSync('/proc/77/fd').length;
const activeDescendants=descendants.filter(p=>!['Z','X'].includes(p.state));
const cleanExit=app.state==='Z' && app.exitRaw==='0' && fdCount===0 && parents.filter(p=>p.pid!==1).every(p=>p.state==='T') && activeDescendants.length===0;
console.log(JSON.stringify({at:new Date().toISOString(),role:cfg.role,deploymentId:cfg.deploymentId,sourceSha:cfg.sourceSha,app,fdCount,parents,descendants,otherProcesses:processes.filter(p=>!owned.has(p.pid)),observerPid:process.pid,cleanExit}));
if(!cleanExit)process.exitCode=2;
