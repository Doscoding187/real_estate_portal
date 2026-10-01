import { resolveAppRuntimeEnv } from './runtimeBootstrap';

const PLACEHOLDER_PATTERNS = [
  /replace-with/i,
  /example\.invalid/i,
  /not-payable/i,
  /local test/i,
  /onboarding@resend\.dev/i,
  /^0+$/,
];

export const DEPLOYED_TRANSACTIONAL_EMAIL_UNAVAILABLE_MESSAGE =
  'Transactional email is unavailable in this deployed runtime.';

function readEnv(env: NodeJS.ProcessEnv, key: string): string {
  return String(env[key] ?? '').trim();
}

export function isTransactionalEmailPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(value.trim()));
}

export function resolveTransactionalEmailConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = readEnv(env, 'RESEND_API_KEY');
  const resendFromEmail = readEnv(env, 'RESEND_FROM_EMAIL');
  const emailFrom = readEnv(env, 'EMAIL_FROM');
  const from = resendFromEmail || emailFrom;
  const fromKey = resendFromEmail ? 'RESEND_FROM_EMAIL' : emailFrom ? 'EMAIL_FROM' : null;

  return {
    apiKey,
    from,
    fromKey,
    apiKeyConfigured: apiKey.length > 0 && !isTransactionalEmailPlaceholder(apiKey),
    fromConfigured: from.length > 0 && !isTransactionalEmailPlaceholder(from) && isValidSender(from),
  };
}

function isValidSender(value: string): boolean {
  if (/[\r\n]/.test(value)) return false;
  const address = value.match(/<([^<>]+)>$/)?.[1] || value;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address);
}

export function transactionalEmailOrigin(kind: 'app' | 'api', env: NodeJS.ProcessEnv = process.env): string {
  const deployed = ['production', 'staging'].includes(resolveAppRuntimeEnv(env));
  const raw = kind === 'app'
    ? readEnv(env, 'APP_URL') || readEnv(env, 'VITE_APP_URL') || readEnv(env, 'NEXT_PUBLIC_APP_URL')
    : readEnv(env, 'VITE_API_URL') || readEnv(env, 'VITE_API_BASE_URL') || readEnv(env, 'API_URL');
  if (!raw && deployed) throw new Error(`Transactional email requires a configured public ${kind} origin.`);
  const parsed = new URL(raw || (kind === 'app' ? 'http://localhost:5173' : 'http://localhost:3000'));
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash ||
      (deployed && (parsed.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)))) {
    throw new Error(`Transactional email requires a valid public ${kind} origin.`);
  }
  return parsed.origin;
}

export function isTransactionalEmailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const configuration = resolveTransactionalEmailConfiguration(env);
  return configuration.apiKeyConfigured && configuration.fromConfigured;
}

export function permitsLocalEmailFallback(env: NodeJS.ProcessEnv = process.env): boolean {
  const runtimeEnv = resolveAppRuntimeEnv(env);
  return runtimeEnv === 'development' || runtimeEnv === 'test';
}

export function isTransactionalEmailDeliveryAvailable(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return permitsLocalEmailFallback(env) || isTransactionalEmailConfigured(env);
}
