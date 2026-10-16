import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import { assertLocalJourneyTarget } from '../server/_core/databaseAuthority/dataAdapters/localJourneyPreview';
import { resolveHttpListenHost } from '../server/_core/runtimeBootstrap';

resolveHttpListenHost();
const authority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
assertLocalJourneyTarget(authority);
if (authority.context.targetFingerprintHash !== process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT) {
  throw new Error('Local journey child must use its exact parent-owned database.');
}
authorizeDatabaseOperation(authority);
const inbox = resolve('.private/local-journey/mail.jsonl');
const known = new Set(
  readFileSync(inbox, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line).idempotencyKey)
    .filter(Boolean),
);
function capture(message: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}) {
  if (message.idempotencyKey && known.has(message.idempotencyKey)) return;
  appendFileSync(
    inbox,
    JSON.stringify({ ...message, capturedAt: new Date().toISOString(), localOnly: true }) + '\n',
    { mode: 0o600 },
  );
  if (message.idempotencyKey) known.add(message.idempotencyKey);
}
// Substitute only the local mail transport. Authentication, acceptance,
// billing, moderation and transactional-delivery persistence stay real.
const { EmailService } = await import('../server/_core/emailService');
EmailService.sendEmail = async message => {
  capture(message);
  return true;
};
const { consumeLaunchEmailEvents, runTransactionalEmailWorker } =
  await import('../server/services/transactionalEmailDeliveryService');
let running = false;
const timer = setInterval(async () => {
  if (running) return;
  running = true;
  try {
    await consumeLaunchEmailEvents();
    await runTransactionalEmailWorker({
      provider: async message => {
        capture(message);
        return { kind: 'accepted', reference: 'local-demo-inbox' };
      },
    });
  } catch {
    console.error('Local inbox worker failed; inspect the local delivery queue.');
  } finally {
    running = false;
  }
}, 2000);
const stop = () => clearInterval(timer);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await import('../server/_core/start');
