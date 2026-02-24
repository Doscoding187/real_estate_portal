import { config } from 'dotenv';
import { resolve } from 'path';

function loadEnv() {
  config({ path: resolve(process.cwd(), '.env') });

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    config({ path: resolve(process.cwd(), '.env.production'), override: true });
  } else if (nodeEnv === 'staging') {
    config({ path: resolve(process.cwd(), '.env.staging'), override: true });
  } else if (nodeEnv === 'test') {
    config({ path: resolve(process.cwd(), '.env.test'), override: true });
  } else {
    config({ path: resolve(process.cwd(), '.env.local'), override: true });
  }
}

function maskValue(value: string): string {
  if (value.length <= 2) return '*'.repeat(value.length);
  return `${value.slice(0, 2)}***`;
}

function main() {
  loadEnv();

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
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appEnv = process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV;
  const environmentLabel = appEnv ? `${nodeEnv} (${appEnv})` : nodeEnv;

  console.log('[DB Target] Environment:', environmentLabel);
  console.log('[DB Target] Protocol:', protocol);
  console.log('[DB Target] Host:', host);
  console.log('[DB Target] Port:', port);
  console.log('[DB Target] Database:', database);
  console.log('[DB Target] User:', user);
  console.log('[DB Target] SSL:', ssl);
  console.log('[DB Target] Fingerprint:', `${protocol}://${host}:${port}/${database}`);

  if (nodeEnv === 'production' && (host === 'localhost' || host === '127.0.0.1')) {
    console.warn('[DB Target] WARNING: NODE_ENV=production but host is localhost.');
  }
}

main();
