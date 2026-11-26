import { setLandRuntimeOverride } from '@shared/landLaunchPolicy';

// Effective Land state as reported by the server. Defaults to off (hosted
// builds stay deferred) and is primed once before the app renders.
let serverReportedLand = false;
setLandRuntimeOverride(() => serverReportedLand);

export function setServerReportedLandEnabled(enabled: boolean): void {
  serverReportedLand = enabled === true;
}

export async function primeLandAvailability(
  fetchStatus: () => Promise<{ enabled: boolean }>,
  timeoutMs = 3000,
): Promise<void> {
  try {
    const result = await Promise.race([
      fetchStatus(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    setServerReportedLandEnabled(result?.enabled === true);
  } catch {
    setServerReportedLandEnabled(false);
  }
}
