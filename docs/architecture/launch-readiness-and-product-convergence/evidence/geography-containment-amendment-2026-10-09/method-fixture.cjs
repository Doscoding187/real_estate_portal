// Synthetic, DB/provider-free, exact-start-command method proof.
// Sends signals only to detached children created by this harness.
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const controllerSource = fs.readFileSync(process.argv[2], 'utf8');
const dir = fs.mkdtempSync('/tmp/pl-contained-method-');
fs.chmodSync(dir, 0o700);
const appRoot = process.argv[3] || '/app';
const installed = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const nativeTimeout = setTimeout(() => { console.error('Fixture exceeded 30 seconds'); for (const pid of children) { try { process.kill(-pid, 'SIGKILL'); } catch {} } process.exit(1); }, 30000);
fs.symlinkSync(path.join(appRoot, 'node_modules'), path.join(dir, 'node_modules'));
fs.mkdirSync(path.join(dir, 'server/_core'), { recursive: true });
fs.mkdirSync(path.join(dir, 'scripts'));
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
  private: true, type: installed.type, packageManager: installed.packageManager,
  scripts: { 'start:hosted:api': 'tsx server/_core/start.ts',
    'email:supervisor': 'tsx scripts/runTransactionalEmailSupervisor.ts' },
}));
fs.writeFileSync(path.join(dir, 'drain-session.cjs'), controllerSource);
fs.writeFileSync(path.join(dir, 'db.ts'), `
const mockConnectionHandle=setInterval(()=>{},1000);
const runtimePool={pool:{synthetic:true},end:async()=>{await new Promise(r=>setTimeout(r,100));clearInterval(mockConnectionHandle);console.log('MOCK_DB_CLOSED')}};
export async function shutdownDb(){await runtimePool.end()}
`);
const shared = `
import inspector from 'node:inspector';
import {shutdownDb} from '../../db';
inspector.open(0,'127.0.0.1');
console.log(JSON.stringify({event:'BOOT',pid:process.pid,ppid:process.ppid,endpoint:inspector.url()}));
`;
fs.writeFileSync(path.join(dir, 'server/_core/start.ts'), shared + `
import http from 'node:http';
let savedRunning=true,commercialRunning=true;
const savedPromise=new Promise(r=>setTimeout(()=>{savedRunning=false;r()},800));
setTimeout(()=>{commercialRunning=false},1000);
const savedSearchDeliveryScheduler={timer:setInterval(()=>{},10000),stop(){clearInterval(this.timer);this.timer=null;return savedPromise},getStatus(){return {running:savedRunning,timerActive:!!this.timer}}};
const commercialTermNoticeScheduler={timer:setInterval(()=>{},10000),stop(){clearInterval(this.timer);this.timer=null},status(){return {running:commercialRunning,timerActive:!!this.timer}}};
const activeServer=http.createServer((req,res)=>setTimeout(()=>{console.log('MOCK_REQUEST_FINISHED');res.setHeader('Connection','close');res.end('ok')},1500));
activeServer.listen(0,'127.0.0.1',()=>{http.get({host:'127.0.0.1',port:activeServer.address().port},res=>res.resume())});
async function shutdown(){if(activeServer.listening)await new Promise(r=>activeServer.close(r));savedSearchDeliveryScheduler.stop();commercialTermNoticeScheduler.stop();await shutdownDb();process.exitCode=0}
process.on('SIGTERM',()=>{void shutdown()});
`);
fs.writeFileSync(path.join(dir, 'scripts/emailWorkerSupervisor.ts'), `
import {shutdownDb} from '../db';
export async function runHostedEmailSupervisor(signal){
  try{await new Promise(r=>setTimeout(r,1500));console.log('MOCK_BATCH_FINISHED');if(!signal.aborted)await new Promise(r=>signal.addEventListener('abort',r,{once:true}))}
  finally{await shutdownDb()}
}
`);
fs.writeFileSync(path.join(dir, 'scripts/runTransactionalEmailSupervisor.ts'), `
import inspector from 'node:inspector';
import {runHostedEmailSupervisor} from './emailWorkerSupervisor';
const controller=new AbortController();
process.once('SIGTERM',()=>controller.abort());
inspector.open(0,'127.0.0.1');
console.log(JSON.stringify({event:'BOOT',pid:process.pid,ppid:process.ppid,endpoint:inspector.url()}));
await runHostedEmailSupervisor(controller.signal);
`);
const tool = require(path.join(dir, 'drain-session.cjs'));
const runs = [];
const children = [];
(async () => {
  try {
    for (const role of ['api', 'email']) {
      const child = cp.spawn('pnpm', [role === 'api' ? 'start:hosted:api' : 'email:supervisor'], {
        cwd: dir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' },
      });
      children.push(child.pid);
      let stdout = '', stderr = '';
      child.stdout.on('data', value => { stdout += value; });
      child.stderr.on('data', value => { stderr += value; });
      let boot;
      for (let n = 0; n < 100 && !boot; n++) {
        await delay(50);
        const line = stdout.split('\n').find(line => line.startsWith('{"event":"BOOT"'));
        if (line) boot = JSON.parse(line);
      }
      if (!boot) throw Error('Fixture boot failed: ' + stderr);
      const client = await tool.connect(boot.endpoint);
      const startTicks = tool.processStartTicks(boot.pid);
      const token = 'synthetic-method-proof-' + role;
      const inspection = await tool.prepare(client, role, boot.pid, token, false, startTicks);
      const prepared = await tool.prepare(client, role, boot.pid, token, true, startTicks);
      if (role === 'api') {
        let idle = false;
        for (let n = 0; n < 160 && !idle; n++) {
          const state = await tool.state(client, role, boot.pid, token, startTicks);
          idle = state.httpClosed && !state.httpCloseFailed && state.savedStopCompleted && !state.saved.running && !state.saved.timerActive &&
            !state.commercial.running && !state.commercial.timerActive;
          if (!idle) await delay(50);
        }
        if (!idle) throw Error('Synthetic pre-drain incomplete: ' + JSON.stringify({state:await tool.state(client,role,boot.pid,token,startTicks),stdout}));
      }
      const held = [];
      let parent = boot.ppid;
      while (parent > 0) {
        const status = fs.readFileSync('/proc/' + parent + '/status', 'utf8');
        held.push(parent);
        if (parent === child.pid) break;
        parent = Number(status.match(/^PPid:\s+(\d+)/m)[1]);
      }
      if (held.at(-1) !== child.pid) throw Error('Unsafe fixture ancestry');
      // Leave the outer launcher running, as production namespace PID 1 must be.
      const stopped = held.filter(pid => pid !== child.pid);
      for (const pid of stopped) process.kill(pid, 'SIGSTOP');
      process.kill(boot.pid, 'SIGTERM');
      let complete;
      for (let n = 0; n < 100; n++) {
        complete = {
          poolEndCompleted: stdout.includes('"event":"POOL_END_COMPLETED"'),
          poolEndFailed: stdout.includes('"event":"POOL_END_FAILED"'),
          httpClosed: stdout.includes('"event":"HTTP_CLOSED"'),
        };
        if (complete.poolEndCompleted && (role !== 'api' || complete.httpClosed)) break;
        await delay(50);
      }
      if (!complete.poolEndCompleted || complete.poolEndFailed || (role === 'api' && !complete.httpClosed)) {
        throw Error('Completion gate failed');
      }
      await client.close();
      await delay(250);
      const stat = fs.readFileSync('/proc/' + boot.pid + '/stat', 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      if (fields[0] !== 'Z' || fields[49] !== '0') throw Error('No clean child exit');
      const outerState=fs.readFileSync('/proc/'+child.pid+'/status','utf8').match(/^State:\s+(.+)$/m)[1];
      if(outerState.startsWith('Z') || outerState.startsWith('T')) throw Error('Outer launcher did not remain running');
      runs.push({ role, startTicks, inspection, prepared, complete, heldAncestors: stopped.length, outerLauncherState:outerState,
        childState: fields[0], rawExitCode: fields[49], stdout, stderr });
      process.kill(-child.pid, 'SIGKILL'); // only the harness-owned, drained fixture group
    }
  } finally {
    for (const pid of children) { try { process.kill(-pid, 'SIGKILL'); } catch {} }
    clearTimeout(nativeTimeout);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log('METHOD_FIXTURE_RESULT ' + JSON.stringify({
    node: process.version, packageType: installed.type, packageManager: installed.packageManager,
    syntheticOnly: true, realDatabase: false, productionSignals: false,
    temporaryFilesRemoved: !fs.existsSync(dir), runs,
  }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
