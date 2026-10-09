const http = require('node:http');
const crypto = require('node:crypto');
const id=crypto.randomUUID();
function record(event,extra={}){console.log(JSON.stringify({event,at:new Date().toISOString(),runId:id,pid:process.pid,deployment:process.env.RAILWAY_DEPLOYMENT_ID,...extra}));}
for (const key of ['DATABASE_URL','DATABASE_MIGRATION_URL','AWS_SECRET_ACCESS_KEY','RESEND_API_KEY','STRIPE_SECRET_KEY']) if(process.env[key]) throw new Error('Probe refuses application credentials');
let stopping=false;
const server=http.createServer((req,res)=>{res.writeHead(200);res.end('owned nonproduction probe');});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>record('BOOT'));
const timer=setInterval(()=>record('ALIVE'),2000);
process.once('SIGTERM',()=>{
  stopping=true; clearInterval(timer); record('SIGTERM_RECEIVED');
  server.close(()=>record('HTTP_CLOSED'));
  setTimeout(()=>record('DRAIN_5_SECONDS'),5000);
  setTimeout(()=>record('DRAIN_12_SECONDS'),12000);
  setTimeout(()=>{record('SHUTDOWN_COMPLETE',{elapsedTargetMs:20000});process.exit(0);},20000);
});
process.on('exit',code=>record('EXIT',{code,stopping}));
