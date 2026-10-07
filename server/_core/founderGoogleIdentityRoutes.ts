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

/** Identity proof deliberately has no import or dependency on users, roles or sessions. */
export function registerFounderGoogleIdentityRoutes(
  app: Express,
  options: {
    config?: FounderGoogleProofConfig | null;
    proofFactory?: (config: FounderGoogleProofConfig) => FounderGoogleIdentityProof;
  } = {},
): () => Promise<void> {
  const config = options.config === undefined ? resolveFounderGoogleProofConfig() : options.config;
  const store =
    config && !options.proofFactory ? new RedisFounderGoogleStateStore(config.redisUrl) : null;
  const proof = config
    ? (options.proofFactory?.(config) ?? new FounderGoogleIdentityProof(config, store!))
    : null;
  const cookieName = config?.secure ? '__Host-pl-founder-google-proof' : 'pl-founder-google-proof';
  const cookieOptions = {
    httpOnly: true,
    secure: config?.secure ?? true,
    sameSite: 'lax' as const,
    path: '/',
  };

  function guard(req: Request, res: Response): boolean {
    res.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    });
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
