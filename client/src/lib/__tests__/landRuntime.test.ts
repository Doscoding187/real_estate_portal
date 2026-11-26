import { afterEach, describe, expect, it } from 'vitest';
import { isLandVerticalAvailable } from '@shared/landLaunchPolicy';
import { primeLandAvailability, setServerReportedLandEnabled } from '../landRuntime';

afterEach(() => setServerReportedLandEnabled(false));

describe('client land availability', () => {
  it('defaults to deferred', () => {
    expect(isLandVerticalAvailable()).toBe(false);
  });

  it('follows the server when it reports enabled', async () => {
    await primeLandAvailability(async () => ({ enabled: true }));
    expect(isLandVerticalAvailable()).toBe(true);
  });

  it('stays deferred when the server says off or the call fails', async () => {
    await primeLandAvailability(async () => ({ enabled: false }));
    expect(isLandVerticalAvailable()).toBe(false);
    await primeLandAvailability(async () => {
      throw new Error('down');
    });
    expect(isLandVerticalAvailable()).toBe(false);
  });
});
