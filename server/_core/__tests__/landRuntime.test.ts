import { describe, expect, it } from 'vitest';
import { isLocalParityLandActive, LOCAL_PARITY_LAND_ENV } from '../localParityPreview';
import { isLandVerticalAvailable, LAND_VERTICAL_LAUNCH_STATE } from '../../../shared/landLaunchPolicy';
import { isLandVerticalEnabled } from '../landRuntime';

const local = { targetClass: 'disposable-worktree', host: '127.0.0.1', port: '3307', local: true } as never;
const LOCAL = {
  NODE_ENV: 'development',
  APP_ENV: 'development',
  PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: '1',
  [LOCAL_PARITY_LAND_ENV]: '1',
} as Record<string, string | undefined>;

describe('land runtime gate', () => {
  it('keeps the committed policy off', () => {
    expect(LAND_VERTICAL_LAUNCH_STATE.enabled).toBe(false);
  });

  it('is off under vitest/test even with the opt-in in process env', () => {
    expect(isLandVerticalEnabled()).toBe(false);
    expect(isLandVerticalAvailable()).toBe(false);
  });

  it('is off in production, hosted, test, and without the opt-in', () => {
    const target = () => local;
    expect(isLocalParityLandActive({ ...LOCAL, NODE_ENV: 'production' }, target)).toBe(false);
    expect(isLocalParityLandActive({ ...LOCAL, APP_ENV: 'production' }, target)).toBe(false);
    expect(isLocalParityLandActive({ ...LOCAL, VITEST: 'true' }, target)).toBe(false);
    expect(isLocalParityLandActive({ ...LOCAL, RAILWAY_ENVIRONMENT: 'prod' }, target)).toBe(false);
    expect(isLocalParityLandActive({ ...LOCAL, [LOCAL_PARITY_LAND_ENV]: undefined }, target)).toBe(false);
    expect(
      isLocalParityLandActive({ ...LOCAL, PROPERTY_LISTIFY_LOCAL_PARITY_PREVIEW: undefined }, target),
    ).toBe(false);
  });

  it('is on only with preview gate, local target and the land opt-in', () => {
    expect(isLocalParityLandActive(LOCAL, () => local)).toBe(true);
    expect(isLocalParityLandActive(LOCAL, () => null)).toBe(false);
  });
});
