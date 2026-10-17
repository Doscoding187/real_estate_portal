import { readFileSync } from 'node:fs';
import { RehearsalRefusal } from '../loadRehearsal/config';
import {
  HOSTED_LOAD_BOUNDS,
  PROVISIONAL_RATE_PLAN,
  isLoopbackHost,
  parseRatePlanFile,
  validateRatePlan,
  type RatePlan,
} from './schedule';

export const HOSTED_LOAD_CONFIRM_ENV = 'PROPERTY_LISTIFY_HOSTED_LOAD_CONFIRM';

export const HOSTED_LOAD_SCENARIOS = [
  'property-detail',
  'property-related-feed',
  'search-typed-city',
  'search-typed-province',
  'property-detail-view',
] as const;

export interface HostedLoadConfig {
  targetOrigin: string;
  targetHost: string;
  durationSeconds: number;
  ratePlan: RatePlan;
  ratePlanSource: 'provisional' | 'file';
  scenarios: string[];
  smokeWrite: boolean;
  abortFile: string | null;
  evidenceOut: string | null;
  inflightCap: number;
  allowInsecureLocal: boolean;
}

function parseIntFlag(raw: string, label: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new RehearsalRefusal(`Invalid ${label} value "${raw}": expected a positive integer.`);
  }
  return Number(raw);
}

function assertWithinBounds(
  value: number,
  label: string,
  bounds: { min: number; max: number },
): number {
  if (value < bounds.min || value > bounds.max) {
    throw new RehearsalRefusal(
      `${label} ${value} is outside the admitted range ${bounds.min}-${bounds.max}.`,
    );
  }
  return value;
}

export function parseTargetOrigin(raw: string, allowInsecureLocal: boolean): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RehearsalRefusal(`Refused: --target "${raw}" is not a valid URL.`);
  }
  if (url.username || url.password) {
    throw new RehearsalRefusal('Refused: --target must not contain credentials.');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new RehearsalRefusal(
      'Refused: --target must be a bare origin (scheme, host, optional port) with no path or query.',
    );
  }
  const loopback = isLoopbackHost(url.hostname);
  if (url.protocol !== 'https:') {
    if (url.protocol !== 'http:' || !(allowInsecureLocal && loopback)) {
      throw new RehearsalRefusal(
        'Refused: hosted load traffic requires an https target; plain http is allowed only with --allow-insecure-local against a loopback host.',
      );
    }
  }
  return url;
}

export function parseHostedLoadConfig(
  rawArgv: readonly string[],
  env: NodeJS.ProcessEnv,
): HostedLoadConfig {
  const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;
  let target: string | null = null;
  let confirmHost: string | null = null;
  let durationSeconds = HOSTED_LOAD_BOUNDS.maxDurationSeconds;
  let ratePlan: RatePlan = PROVISIONAL_RATE_PLAN;
  let ratePlanSource: HostedLoadConfig['ratePlanSource'] = 'provisional';
  let inflightCap = HOSTED_LOAD_BOUNDS.defaultInflightCap;
  let smokeWrite = false;
  let allowInsecureLocal = false;
  let abortFile: string | null = null;
  let evidenceOut: string | null = null;
  const scenarios: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    const requireValue = (): string => {
      if (value === undefined || value.startsWith('--')) {
        throw new RehearsalRefusal(`Flag ${flag} requires a value.`);
      }
      index += 1;
      return value;
    };

    if (flag === '--target') {
      target = requireValue();
    } else if (flag === '--confirm-host') {
      confirmHost = requireValue();
    } else if (flag === '--duration-seconds') {
      durationSeconds = assertWithinBounds(
        parseIntFlag(requireValue(), '--duration-seconds'),
        '--duration-seconds',
        {
          min: HOSTED_LOAD_BOUNDS.minDurationSeconds,
          max: HOSTED_LOAD_BOUNDS.maxDurationSeconds,
        },
      );
    } else if (flag === '--rate-plan') {
      const path = requireValue();
      let contents: string;
      try {
        contents = readFileSync(path, 'utf8');
      } catch {
        throw new RehearsalRefusal(`Refused: could not read rate plan file ${path}.`);
      }
      ratePlan = parseRatePlanFile(contents, path);
      ratePlanSource = 'file';
    } else if (flag === '--scenario') {
      const name = requireValue().trim();
      if (!name) throw new RehearsalRefusal('--scenario requires a non-empty scenario name.');
      if (!(HOSTED_LOAD_SCENARIOS as readonly string[]).includes(name)) {
        throw new RehearsalRefusal(
          `Unknown scenario "${name}". Admitted scenarios: ${HOSTED_LOAD_SCENARIOS.join(', ')}.`,
        );
      }
      if (!scenarios.includes(name)) scenarios.push(name);
    } else if (flag === '--enable-smoke-write') {
      smokeWrite = true;
    } else if (flag === '--allow-insecure-local') {
      allowInsecureLocal = true;
    } else if (flag === '--inflight-cap') {
      inflightCap = assertWithinBounds(
        parseIntFlag(requireValue(), '--inflight-cap'),
        '--inflight-cap',
        { min: HOSTED_LOAD_BOUNDS.minInflightCap, max: HOSTED_LOAD_BOUNDS.maxInflightCap },
      );
    } else if (flag === '--abort-file') {
      abortFile = requireValue();
    } else if (flag === '--evidence-out') {
      evidenceOut = requireValue();
    } else {
      throw new RehearsalRefusal(`Unknown flag ${flag}.`);
    }
  }

  if (target === null) {
    throw new RehearsalRefusal('Refused: --target <origin> is required.');
  }
  validateRatePlan(ratePlan);

  const targetUrl = parseTargetOrigin(target, allowInsecureLocal);
  const expectedConfirm = confirmHost ?? env[HOSTED_LOAD_CONFIRM_ENV] ?? null;
  if (expectedConfirm === null) {
    throw new RehearsalRefusal(
      `Refused: set ${HOSTED_LOAD_CONFIRM_ENV} (or --confirm-host) to the exact target host to opt in.`,
    );
  }
  if (expectedConfirm !== targetUrl.hostname) {
    throw new RehearsalRefusal(
      'Refused: hosted load confirmation does not match the resolved target host.',
    );
  }
  return {
    targetOrigin: targetUrl.origin,
    targetHost: targetUrl.hostname,
    durationSeconds,
    ratePlan,
    ratePlanSource,
    scenarios,
    smokeWrite,
    abortFile,
    evidenceOut,
    inflightCap,
    allowInsecureLocal,
  };
}
