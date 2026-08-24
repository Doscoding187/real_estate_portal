/**
 * Twilio Verify adapter for the Shared Living phone-verification rung.
 *
 * Isolated behind a tiny client so the verification service stays testable
 * and so provider choice can change without touching trust logic.
 */

type TwilioVerifyCheck = { valid: boolean };

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const twilioVerifyClient = {
  isConfigured(): boolean {
    return Boolean(
      readEnv('TWILIO_ACCOUNT_SID') &&
        readEnv('TWILIO_AUTH_TOKEN') &&
        readEnv('TWILIO_VERIFY_SERVICE_SID'),
    );
  },

  async start(phone: string): Promise<void> {
    if (!this.isConfigured()) throw new Error('Twilio Verify is not configured.');
    const sid = readEnv('TWILIO_ACCOUNT_SID')!;
    const token = readEnv('TWILIO_AUTH_TOKEN')!;
    const serviceSid = readEnv('TWILIO_VERIFY_SERVICE_SID')!;
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Channel: 'sms' }),
      },
    );
    if (!response.ok) {
      throw new Error(`Phone verification could not be started (${response.status}).`);
    }
  },

  async check(phone: string, code: string): Promise<TwilioVerifyCheck> {
    if (!this.isConfigured()) return { valid: false };
    const sid = readEnv('TWILIO_ACCOUNT_SID')!;
    const token = readEnv('TWILIO_AUTH_TOKEN')!;
    const serviceSid = readEnv('TWILIO_VERIFY_SERVICE_SID')!;
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      },
    );
    if (!response.ok) return { valid: false };
    const payload = (await response.json()) as { valid?: boolean; status?: string };
    return { valid: payload.valid === true || payload.status === 'approved' };
  },
};
