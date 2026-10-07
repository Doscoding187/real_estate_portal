import {
  FounderGoogleIdentityError,
  resolveFounderGoogleProofConfig,
  type FounderGoogleProofConfig,
} from './founderGoogleIdentity';

export const GOOGLE_FOUNDER_LOGIN_METHOD = 'google-founder';
export const GOOGLE_FOUNDER_PRINCIPAL_PATTERN = /^google:[A-Za-z0-9_-]{43}$/;
export function isFounderGoogleAccount(user: {
  founderAuthority?: string | null;
  loginMethod?: string | null;
  openId?: string | null;
}): boolean {
  return (
    user.founderAuthority === 'platform_founder' ||
    user.loginMethod === GOOGLE_FOUNDER_LOGIN_METHOD ||
    Boolean(user.openId?.startsWith('google:'))
  );
}
export type FounderGoogleLoginConfig = {
  ownerPrincipal: string;
  founderEmail: string;
  appOrigin: string;
};

/** Proof alone never enables account admission. Owner binding is an explicit second gate. */
export function resolveFounderGoogleLoginConfig(
  proof: FounderGoogleProofConfig | null,
  env: NodeJS.ProcessEnv = process.env,
): FounderGoogleLoginConfig | null {
  const enabled = env.FOUNDER_GOOGLE_LOGIN_ENABLED;
  if (!enabled || enabled === 'false') return null;
  const invalid = () =>
    new FounderGoogleIdentityError(
      'FOUNDER_GOOGLE_LOGIN_CONFIGURATION_INVALID',
      503,
      'Founder sign-in is unavailable.',
    );
  if (
    enabled !== 'true' ||
    !proof ||
    !GOOGLE_FOUNDER_PRINCIPAL_PATTERN.test(env.OWNER_OPEN_ID ?? '')
  ) {
    throw invalid();
  }
  let app: URL;
  try {
    app = new URL(env.APP_URL ?? '');
  } catch {
    throw invalid();
  }
  const localHttp =
    !proof.secure &&
    app.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname);
  if (
    (app.protocol !== 'https:' && !localHttp) ||
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== '/'
  )
    throw invalid();
  return {
    ownerPrincipal: env.OWNER_OPEN_ID!,
    founderEmail: proof.founderEmail,
    appOrigin: app.origin,
  };
}

export function getConfiguredFounderGoogleLogin(): FounderGoogleLoginConfig | null {
  return resolveFounderGoogleLoginConfig(resolveFounderGoogleProofConfig());
}

/** Reserve only the explicitly enabled founder identity, never a caller-supplied role. */
export function isReservedFounderGoogleEmail(email: string): boolean {
  const config = getConfiguredFounderGoogleLogin();
  return Boolean(config && email.trim().toLowerCase() === config.founderEmail);
}
