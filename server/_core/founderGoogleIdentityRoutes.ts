import type { Express, Request, Response } from 'express';
import { parse as parseCookies } from 'cookie';
import {
  FOUNDER_GOOGLE_CALLBACK_PATH,
  FOUNDER_GOOGLE_STATE_TTL_MS,
  FounderGoogleIdentityError,
  FounderGoogleIdentityProof,
  resolveFounderGoogleProofConfig,
  type FounderGoogleProofConfig,
} from './founderGoogleIdentity';
import { RedisFounderGoogleStateStore } from './founderGoogleStateStore';
import { resolveFounderGoogleLoginConfig, type FounderGoogleLoginConfig } from './founderGoogleLoginConfig';
import { FounderGoogleAccountService } from '../services/founderGoogleAccountService';
import { authService } from './auth';
import { COOKIE_NAME } from '../../shared/const';
import { getSessionCookieOptions } from './cookies';

function respondError(res: Response, error: unknown): void {
  const safe =
    error instanceof FounderGoogleIdentityError
      ? error
      : new FounderGoogleIdentityError(
          'FOUNDER_GOOGLE_PROOF_UNAVAILABLE',
          503,
          'Google identity proof could not complete. Start again.',
        );
  res.status(safe.status).json({ code: safe.code, error: safe.message });
}

/** Proof never grants privilege; separately enabled login requires the accepted owner binding. */
export function registerFounderGoogleIdentityRoutes(
  app: Express,
  options: {
    config?: FounderGoogleProofConfig | null;
    loginConfig?: FounderGoogleLoginConfig | null;
    proofFactory?: (config: FounderGoogleProofConfig, purpose: 'founder-proof' | 'founder-login') => FounderGoogleIdentityProof;
    accountFactory?: (config: FounderGoogleLoginConfig) => FounderGoogleAccountService;
    sessionIssuer?: typeof authService.createSessionToken;
  } = {},
): () => Promise<void> {
  const config = options.config === undefined ? resolveFounderGoogleProofConfig() : options.config;
  const loginConfig = options.loginConfig === undefined ? resolveFounderGoogleLoginConfig(config) : options.loginConfig;
  const purpose = loginConfig ? 'founder-login' : 'founder-proof';
  const store =
    config && !options.proofFactory ? new RedisFounderGoogleStateStore(config.redisUrl) : null;
  const proof = config
    ? (options.proofFactory?.(config, purpose) ?? new FounderGoogleIdentityProof(config, store!, { purpose }))
    : null;
  const account = config && loginConfig ?
    (options.accountFactory?.(loginConfig) ?? new FounderGoogleAccountService(loginConfig)) : null;
  const cookieName = config?.secure ? '__Host-pl-founder-google-proof' : 'pl-founder-google-proof';
  const cookieOptions = {
    httpOnly: true,
    secure: config?.secure ?? true,
    sameSite: 'lax' as const,
    path: '/',
  };

  function privateResponse(res: Response): void {
    res.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    });
  }
  app.get('/api/auth/google/status', (_req, res) => {
    privateResponse(res);
    res.json({ founderLoginAvailable: Boolean(config && loginConfig), identityProofAvailable: Boolean(config) });
  });
  function guard(req: Request, res: Response): boolean {
    privateResponse(res);
    if (!config || !proof) {
      respondError(res, null);
      return false;
    }
    // Use the operator-reviewed redirect URI, never a caller-controlled origin or return URL.
    const origin = new URL(config.redirectUri).origin;
    if (`${req.protocol}://${req.get('host')}` !== origin) {
      respondError(
        res,
        new FounderGoogleIdentityError(
          'FOUNDER_GOOGLE_ORIGIN_INVALID',
          400,
          'Use the configured application API domain.',
        ),
      );
      return false;
    }
    return true;
  }

  app.get('/api/auth/google/start', async (req, res) => {
    if (!guard(req, res)) return;
    try {
      const { authorizationUrl, browserBinding } = await proof!.start();
      res.cookie(cookieName, browserBinding, {
        ...cookieOptions,
        maxAge: FOUNDER_GOOGLE_STATE_TTL_MS,
      });
      res.redirect(302, authorizationUrl);
    } catch (error) {
      respondError(res, error);
    }
  });

  app.get(FOUNDER_GOOGLE_CALLBACK_PATH, async (req, res) => {
    if (!guard(req, res)) return;
    res.clearCookie(cookieName, cookieOptions);
    try {
      const browserBinding = parseCookies(req.headers.cookie || '')[cookieName];
      const { principal } = await proof!.finish({
        browserBinding,
        state: req.query.state,
        code: req.query.code,
        providerError: req.query.error,
      });
      if (account && loginConfig) {
        const user = await account.authenticate(principal);
        const issuer = options.sessionIssuer ?? authService.createSessionToken.bind(authService);
        const maxAge = 24 * 60 * 60 * 1000;
        const token = await issuer(user.id, user.email, user.name || 'Founder', user.sessionVersion,
          { expiresInMs: maxAge, founderPrincipal: principal });
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge });
        return res.redirect(303, `${loginConfig.appOrigin}/admin/overview`);
      }
      res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Founder identity verified — Property Listify</title>
        <h1>Google identity verified</h1>
        <p>Owner access is awaiting review. No account or admin session has been created.</p>
        <p>Verified principal for the attended owner-binding review:</p><code>${principal}</code>
        </html>`);
    } catch (error) {
      respondError(res, error);
    }
  });
  return async () => {
    await store?.close();
  };
}
