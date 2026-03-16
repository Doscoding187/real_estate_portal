import { afterEach, describe, expect, it } from 'vitest';
import { ExploreFeedService } from '../exploreFeedService';

const ENV_KEY = 'EXPLORE_LEGACY_SHORTS_RESPONSE';

describe('Explore feed legacy shorts alias switch', () => {
  const previous = process.env[ENV_KEY];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = previous;
    }
  });

  it('omits deprecated shorts alias when EXPLORE_LEGACY_SHORTS_RESPONSE=0', () => {
    process.env[ENV_KEY] = '0';
    const service = new ExploreFeedService() as any;
    const result = service.withLegacyShortsAlias([{ id: 1 }]);
    expect(result).toEqual({});
  });

  it('keeps deprecated shorts alias when switch is enabled', () => {
    process.env[ENV_KEY] = '1';
    const service = new ExploreFeedService() as any;
    const items = [{ id: 1 }, { id: 2 }];
    const result = service.withLegacyShortsAlias(items);
    expect(result).toEqual({ shorts: items });
  });
});

