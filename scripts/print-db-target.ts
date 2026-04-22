import { assertDatabaseTargetMatchesRuntime, getExpectedDatabaseName } from '../server/_core/databaseTarget';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

function loadEnv() {
  return loadAppRuntimeEnv({ cwd: process.cwd() });
}

function maskValue(value: string): string {
  if (value.length <= 2) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***`;
}

function main() {
  const { runtimeEnv } = loadEnv();

  const dbUrlRaw = process.env.DATABASE_URL;
  if (!dbUrlRaw) {
    console.error('[DB Target] DATABASE_URL is not set.');
    process.exit(1);
  }

  let parsed: URL;
  try {
    parsed = new URL(dbUrlRaw);
  } catch {
    console.error('[DB Target] DATABASE_URL is invalid.');
    process.exit(1);
  }

  const protocol = parsed.protocol.replace(':', '');
  const host = parsed.hostname || '(none)';
  const port = parsed.port || '(default)';
  const database = parsed.pathname.replace(/^\//, '') || '(none)';
  const user = parsed.username ? maskValue(decodeURIComponent(parsed.username)) : '(none)';
  const ssl = parsed.searchParams.get('ssl') ?? parsed.searchParams.get('sslmode') ?? '(unspecified)';
  const nodeEnv = process.env.NODE_ENV || runtimeEnv;
  const appEnv = process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV;
  const environmentLabel = appEnv ? `${nodeEnv} (${appEnv})` : nodeEnv;
  const expectedDatabase = getExpectedDatabaseName(runtimeEnv);

  console.log('[DB Target] Environment:', environmentLabel);
  console.log('[DB Target] Protocol:', protocol);
  console.log('[DB Target] Host:', host);
  console.log('[DB Target] Port:', port);
  console.log('[DB Target] Database:', database);
  console.log('[DB Target] User:', user);
  console.log('[DB Target] SSL:', ssl);
  console.log('[DB Target] Fingerprint:', `${protocol}://${host}:${port}/${database}`);
  console.log('[DB Target] Expected Database:', expectedDatabase ?? '(not enforced)');

  try {
    assertDatabaseTargetMatchesRuntime(dbUrlRaw, runtimeEnv);
    console.log('[DB Target] Guard: PASS');
  } catch (error) {
    console.error('[DB Target] Guard: FAIL');
    console.error(error);
    process.exit(1);
  }

  if (nodeEnv === 'production' && (host === 'localhost' || host === '127.0.0.1')) {
    console.warn('[DB Target] WARNING: NODE_ENV=production but host is localhost.');
  }
}

main();
