import {
  resolveDatabaseAuthority,
  databaseAuthorityChildEnvironment,
} from '../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import dotenv from 'dotenv';
import { appendFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';

const authority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
if (
  authority.context.targetClass !== 'disposable-worktree' ||
  authority.context.targetFingerprintHash !==
    process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT
) {
  throw new Error('MVP verification requires the exact task-owned target.');
}
// The authorized browser wrapper pins its child to this worktree's exact
// target; never substitute the database belonging to a previous review branch.
authorizeDatabaseOperation(authority);
const central = dotenv.config({
  path: `${homedir()}/.config/property-listify/local.env`,
  quiet: true,
}).parsed;
Object.assign(process.env, databaseAuthorityChildEnvironment(authority), {
  JWT_SECRET: central?.JWT_SECRET,
  PORT: '5000',
  SKIP_FRONTEND: 'true',
  APP_URL: 'http://localhost:5177',
  FRONTEND_URL: 'http://localhost:5177',
  VITE_API_URL: 'http://localhost:5000',
  RESEND_API_KEY: '',
  REDIS_URL: '',
  SAVED_SEARCH_SCHEDULER_ENABLED: 'false',
});

/**
 * The B05 browser proof needs the real application-generated invitation URL,
 * but test mail must stay inside a private disposable artifact. This transport
 * boundary is available only to the authority-wrapped Agency-only browser
 * fixture; it has no production or public API path and never logs a token.
 */
function governedB05EmailCapturePath(): string | null {
  const capturePath = String(
    process.env.PROPERTY_LISTIFY_GOVERNED_B05_EMAIL_CAPTURE_PATH || '',
  ).trim();
  if (!capturePath) return null;

  const authorized =
    process.env.NODE_ENV === 'test' &&
    process.env.APP_ENV === 'test' &&
    process.env.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE === 'true' &&
    process.env.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS === 'agency_launch_access' &&
    Boolean(process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT) &&
    Boolean(process.env.DATABASE_AUTHORITY_CORRELATION_ID);
  if (!authorized) {
    throw new Error('B05 local email capture requires the governed Agency-only browser fixture.');
  }
  if (!/^\/tmp\/property-listify-b05-[a-z0-9._-]+\.jsonl$/i.test(capturePath)) {
    throw new Error('B05 local email capture path must be a private /tmp/property-listify-b05-*.jsonl artifact.');
  }

  // The Playwright config creates the file with umask 077; preserve that
  // protection if the local filesystem supports mode changes.
  chmodSync(capturePath, 0o600);
  return capturePath;
}

const b05EmailCapturePath = governedB05EmailCapturePath();

function captureB05AgencyInvitation(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!b05EmailCapturePath) return;
  const source = `${options.html}\n${options.text || ''}`;
  const invitationUrl = source.match(
    /https?:\/\/[^\s"'<>]+\/accept-invitation\?token=[a-f0-9]{64}/i,
  )?.[0];
  if (!invitationUrl) return;

  appendFileSync(
    b05EmailCapturePath,
    `${JSON.stringify({
      kind: 'agency_invitation',
      to: options.to,
      subject: options.subject,
      invitationUrl,
      capturedAt: new Date().toISOString(),
    })}\n`,
    { encoding: 'utf8', mode: 0o600 },
  );
}

// Local email transport capture only: retain real auth/token/session logic.
// Run with stdout redirected to the private mode-0600 task log.
const { EmailService } = await import('../server/_core/emailService');
EmailService.sendEmail = async options => {
  captureB05AgencyInvitation(options);
  const token = options.text?.match(/reset-password\?token=([a-f0-9]+)/)?.[1];
  if (token)
    console.log(`[MVP Local Sink] Reset URL: http://localhost:5177/reset-password?token=${token}`);
  return true;
};
await import('../server/_core/start');
