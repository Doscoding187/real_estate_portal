// Database-free operational fixture. Uses the pinned old cache implementation.
import fs from 'node:fs';
import express from 'express';
import { createServer } from 'node:http';
import { cache } from './legacy-cache.fixture.mjs';
import { redisCache } from './legacy-redis.fixture.mjs';

const deadline=Date.now()+3000;
while(!redisCache.client?.isReady && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,10));
if(!redisCache.client?.isReady)throw Error('Fixture Redis did not connect');
if(process.env.CASE==='redis-failure')redisCache.disconnect=async()=>{throw Error('FIXTURE_REDIS_QUIT_FAILURE')};
const appRouter={_def:{procedures:{'cache.clearAll':{_def:{resolver:async()=>redisCache}}}}};

class ExploreFeedService {
  async getRecommendedFeed() { return cache.get('fixture'); }
}
const exploreFeedService = new ExploreFeedService();
const router = express.Router();
router.get('/', async (_req, res) => { res.json(await exploreFeedService.getRecommendedFeed()); });
const app = express();
app.use('/api/explore', router);
if (process.env.CASE === 'ambiguous-route') app.use('/api/explore', router);
const activeServer = createServer(app);
const savedSearchDeliveryScheduler = { getStatus() { return { running: false, timerActive: false }; } };
const commercialTermNoticeScheduler = { status() { return { running: false, timerActive: false }; } };
const stat = fs.readFileSync('/proc/self/stat', 'utf8');
const startTicks = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/)[19];
const token = 'local-api-recovery-regression';

async function shutdown() {
  await new Promise((resolve, reject) => activeServer.close(error => error ? reject(error) : resolve()));
  // Retain the same named module scopes used by the original deployed API.
  savedSearchDeliveryScheduler.getStatus();
  commercialTermNoticeScheduler.status();
  void appRouter._def;
  globalThis.__plAttendedDrain = {
    token, role: 'api', pid: process.pid, startTicks, logFailed: false,
    poolEndStarted: true, poolEndCompleted: true, poolEndFailed: process.env.CASE === 'failed-drain',
    httpClosed: true, httpCloseFailed: false, schedulersStopped: true,
    savedStopCompleted: true, savedStopFailed: false,
  };
  process.exitCode = 0;
  console.log('FIXTURE_DRAINED ' + JSON.stringify({ pid: process.pid, startTicks, token }));
}
process.on('SIGTERM', () => { void shutdown(); });
activeServer.listen(0, '127.0.0.1', () => console.log('FIXTURE_READY'));
