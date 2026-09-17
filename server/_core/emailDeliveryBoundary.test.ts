import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({
  ENV: {
    resendApiKey: '',
    resendFromEmail: 'Property Listify <onboarding@example.test>',
  },
}));

import { sendPasswordResetEmail, sendVerificationEmail } from './email';
import { EmailService } from './emailService';
import { isTransactionalEmailConfigured } from './transactionalEmailConfig';

describe('transactional email delivery boundary', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('RESEND_FROM_EMAIL', '');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('APP_URL', 'https://app.example.test');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('refuses to claim delivery in a deployed runtime when Resend is unconfigured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');

    await expect(
      sendVerificationEmail({
        to: 'stakeholder@example.test',
        verificationToken: 'verification-token',
      }),
    ).rejects.toThrow('Transactional email is unavailable in this deployed runtime.');

    await expect(
      sendPasswordResetEmail({
        to: 'stakeholder@example.test',
        resetToken: 'reset-token',
      }),
    ).rejects.toThrow('Transactional email is unavailable in this deployed runtime.');

    await expect(
      EmailService.sendEmail({
        to: 'stakeholder@example.test',
        subject: 'Account access',
        html: '<p>Account access</p>',
      }),
    ).resolves.toBe(false);
  });

  it('retains the non-delivery local fallback for development and test workflows', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'development');

    await expect(
      sendVerificationEmail({
        to: 'stakeholder@example.test',
        verificationToken: 'verification-token',
      }),
    ).resolves.toMatchObject({ success: true, messageId: 'dev-mock-id' });

    await expect(
      sendPasswordResetEmail({
        to: 'stakeholder@example.test',
        resetToken: 'reset-token',
      }),
    ).resolves.toMatchObject({ success: true, messageId: 'dev-mock-id' });

    await expect(
      EmailService.sendEmail({
        to: 'stakeholder@example.test',
        subject: 'Account access',
        html: '<p>Account access</p>',
      }),
    ).resolves.toBe(true);
  });

  it('does not treat Resend’s default onboarding sender as a deployed configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', 're_test_not_a_real_key');
    vi.stubEnv('RESEND_FROM_EMAIL', 'Property Listify <onboarding@resend.dev>');

    expect(isTransactionalEmailConfigured()).toBe(false);

    await expect(
      sendVerificationEmail({
        to: 'stakeholder@example.test',
        verificationToken: 'verification-token',
      }),
    ).rejects.toThrow('Transactional email is unavailable in this deployed runtime.');
  });
});
