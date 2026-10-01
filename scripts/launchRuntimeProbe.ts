import { evaluateLaunchRuntimeProbe } from './launchRuntimeProbeCheck';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function origin(name: string): URL {
  const url = new URL(required(name));
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`${name} must be an exact HTTPS origin.`);
  }
  return url;
}

function sha(name: string): string {
  const value = required(name);
  if (!/^[a-f0-9]{40}$/i.test(value)) throw new Error(`${name} must be a full SHA.`);
  return value;
}

async function readEndpoint(base: URL, path: string) {
  const response = await fetch(new URL(path, base), {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
  });
  const text = await response.text();
  if (text.length > 64 * 1024) throw new Error(`${path} response is too large.`);
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { /* evaluator rejects missing fields */ }
  return { status: response.status, body };
}

async function main() {
  const frontend = origin('LAUNCH_PROBE_FRONTEND_URL');
  const api = origin('LAUNCH_PROBE_API_URL');
  const frontendSha = sha('LAUNCH_PROBE_FRONTEND_SHA');
  const apiSha = sha('LAUNCH_PROBE_API_SHA');
  const targetFingerprint = required('LAUNCH_PROBE_TARGET_FINGERPRINT');
  if (!/^[a-f0-9]{64}$/i.test(targetFingerprint)) {
    throw new Error('LAUNCH_PROBE_TARGET_FINGERPRINT must be 64 hex characters.');
  }
  const environment = required('LAUNCH_PROBE_ENV');
  if (environment !== 'production' && environment !== 'staging') {
    throw new Error('LAUNCH_PROBE_ENV must be production or staging.');
  }
  const release = required('LAUNCH_PROBE_RELEASE_ID');
  const expected = {
    frontendSha, apiSha, targetFingerprint,
    environment,
    releaseId: release === 'none' ? null : release,
  } as const;

  const [frontendVersion, apiHealth, apiReadiness, apiVersion] = await Promise.all([
    readEndpoint(frontend, '/version.json'),
    readEndpoint(api, '/api/health'),
    readEndpoint(api, '/api/readiness'),
    readEndpoint(api, '/api/version'),
  ]);
  const issues = evaluateLaunchRuntimeProbe({
    frontendVersion, apiHealth, apiReadiness, apiVersion, expected,
    nowMs: Date.now(),
  });
  console.log(JSON.stringify({
    kind: 'launch-runtime-probe',
    checkedAt: new Date().toISOString(),
    frontendOrigin: frontend.origin,
    apiOrigin: api.origin,
    ok: issues.length === 0,
    issues,
  }));
  if (issues.length) process.exitCode = 2;
}

main().catch(() => {
  console.error(JSON.stringify({
    kind: 'launch-runtime-probe', ok: false,
    error: 'probe-setup-or-transport-failed',
  }));
  process.exitCode = 2;
});
