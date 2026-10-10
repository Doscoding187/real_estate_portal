import assert from 'node:assert/strict';
import { cache } from '../../../lib/cache';
import { savedSearchDeliveryScheduler } from '../../../services/savedSearchDeliveryScheduler';
import { commercialTermNoticeScheduler } from '../../../services/commercialTermNoticeScheduler';
import { RedisCacheManager } from '../../cache/redis';
import { redisCache } from '../../../lib/redis';
import * as database from '../../../db-connection';

const scenario = process.env.SHUTDOWN_SCENARIO;
let databaseStayedOpenDuringStartup = true;
if (scenario === 'core-redis-failure') {
  const close = RedisCacheManager.prototype.close;
  RedisCacheManager.prototype.close = async function () {
    await close.call(this);
    throw new Error('CORE_REDIS_SHUTDOWN_FAILURE');
  };
} else if (scenario === 'explore-redis-failure') {
  const disconnect = redisCache.disconnect.bind(redisCache);
  redisCache.disconnect = async () => {
    await disconnect();
    throw new Error('EXPLORE_REDIS_SHUTDOWN_FAILURE');
  };
} else if (scenario === 'saved-startup' || scenario === 'commercial-startup') {
  const holdStartup = async () => {
    const released = new Promise<void>(resolve => {
      process.once('SIGTERM', () =>
        setTimeout(() => {
          databaseStayedOpenDuringStartup = database._db !== null;
          console.log('STARTUP_FINISHED_AFTER_SHUTDOWN');
          resolve();
        }, 25),
      );
    });
    console.log('STARTUP_WAITING_FOR_SHUTDOWN');
    await released;
  };
  if (scenario === 'saved-startup') {
    const start = savedSearchDeliveryScheduler.start.bind(savedSearchDeliveryScheduler);
    savedSearchDeliveryScheduler.start = async options => {
      const status = await start(options);
      await holdStartup();
      return status;
    };
  } else {
    const start = commercialTermNoticeScheduler.start.bind(commercialTermNoticeScheduler);
    commercialTermNoticeScheduler.start = async () => {
      await start();
      await holdStartup();
    };
  }
}

// Load the actual API entrypoint and route graph, including their real timers.
// NODE_ENV=test without DATABASE_URL uses the existing database-free test mode.
await cache.set('shutdown-regression', 'loaded');
assert.equal(await cache.get('shutdown-regression'), 'loaded');
if (process.env.LOAD_GOOGLE_PLACES === 'true') {
  // Location procedures load this singleton only when a request needs it.
  const { googlePlacesService } = await import('../../../services/googlePlacesService');
  googlePlacesService.terminateSessionToken(googlePlacesService.createSessionToken());
}
await import('../../index');

process.on('beforeExit', () => {
  assert.equal(
    databaseStayedOpenDuringStartup,
    true,
    'Database closed while API startup was unfinished',
  );
  assert.equal(database._db, null, 'API shutdown must complete database cleanup');
  assert.equal(cache.getStats().size, 0, 'API shutdown must clear its cache singleton');
  assert.equal(savedSearchDeliveryScheduler.getStatus().timerActive, false);
  assert.equal(savedSearchDeliveryScheduler.getStatus().running, false);
  assert.equal(commercialTermNoticeScheduler.status().timerActive, false);
  assert.equal(commercialTermNoticeScheduler.status().running, false);
  // Repeat cleanup against the same real singleton, after normal API cleanup.
  cache.destroy();
  cache.destroy();
  console.log('SHUTDOWN_RESOURCES_RELEASED');
});
