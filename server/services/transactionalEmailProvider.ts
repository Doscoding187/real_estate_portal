import { Resend } from 'resend';
import { resolveTransactionalEmailConfiguration, transactionalEmailOrigin } from '../_core/transactionalEmailConfig';

export type EmailProviderResult =
  | { kind: 'accepted'; reference: string | null }
  | { kind: 'retryable'; code: string }
  | { kind: 'permanent'; code: string }
  | { kind: 'unknown'; code: string };

export type TransactionalEmailProvider = (input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) => Promise<EmailProviderResult>;

export function transactionalEmailPublicOrigin(): string {
  return transactionalEmailOrigin('app');
}

export const sendViaResend: TransactionalEmailProvider = async input => {
  // Preserve B05's authority-wrapped private browser capture. This branch is
  // impossible in a deployed runtime and does not expose tokens to logs.
  if (process.env.PROPERTY_LISTIFY_GOVERNED_B05_EMAIL_CAPTURE_PATH) {
    const authorized = process.env.NODE_ENV === 'test' && process.env.APP_ENV === 'test' &&
      process.env.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_FIXTURE === 'true' &&
      process.env.PROPERTY_LISTIFY_GOVERNED_BROWSER_TEST_PRODUCT_KEYS === 'agency_launch_access' &&
      Boolean(process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT) &&
      Boolean(process.env.DATABASE_AUTHORITY_CORRELATION_ID);
    if (!authorized) return { kind: 'permanent', code: 'unauthorized_capture_configuration' };
    const { EmailService } = await import('../_core/emailService');
    const captured = await EmailService.sendEmail(input);
    return captured ? { kind: 'accepted', reference: 'governed-b05-private-capture' } :
      { kind: 'permanent', code: 'governed_capture_failed' };
  }
  const config = resolveTransactionalEmailConfiguration();
  if (!config.apiKeyConfigured || !config.fromConfigured) {
    return { kind: 'permanent', code: 'provider_unconfigured' };
  }
  // A thrown transport exception can occur after provider acceptance. Never
  // classify it as a safe retry without provider reconciliation.
  try {
    const result = await new Resend(config.apiKey).emails.send({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }, { idempotencyKey: input.idempotencyKey });
    if (result.error) {
      const status = Number((result.error as { statusCode?: number }).statusCode || 0);
      if (status === 429) return { kind: 'retryable', code: 'provider_rate_limited' };
      if (status >= 500) return { kind: 'retryable', code: 'provider_server_error' };
      return { kind: 'permanent', code: status ? `provider_rejected_${status}` : 'provider_rejected' };
    }
    return result.data?.id
      ? { kind: 'accepted', reference: result.data.id }
      : { kind: 'unknown', code: 'provider_acceptance_reference_missing' };
  } catch {
    return { kind: 'unknown', code: 'provider_outcome_ambiguous' };
  }
};
