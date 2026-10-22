import { createHash, timingSafeEqual } from 'crypto';
import { ENV } from '../_core/env';

export type PayFastPaymentFields = Record<string, string>;

export type PayFastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  sandbox: boolean;
  notifyUrl: string;
};

export type PayFastCheckout = {
  action: string;
  fields: PayFastPaymentFields;
};

export type PayFastNotification = {
  valid: boolean;
  verified: boolean;
  status: string;
  paymentId: string;
  merchantPaymentId: string;
  amountMinor: number;
  currency: string;
  raw: PayFastPaymentFields;
  reason?: string;
};

function getConfig(): PayFastConfig {
  const merchantId = process.env.PAYFAST_MERCHANT_ID || ENV.payFastMerchantId;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY || ENV.payFastMerchantKey;
  const passphrase = process.env.PAYFAST_PASSPHRASE || ENV.payFastPassphrase;
  const sandbox =
    String(process.env.PAYFAST_SANDBOX ?? ENV.payFastSandbox).toLowerCase() === 'true';
  const notifyUrl =
    process.env.PAYFAST_NOTIFY_URL ||
    ENV.payFastNotifyUrl ||
    `${ENV.appUrl}/api/payments/payfast/notify`;
  return {
    merchantId,
    merchantKey,
    passphrase,
    sandbox,
    notifyUrl,
  };
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

export function createPayFastSignature(
  fields: PayFastPaymentFields,
  passphrase = getConfig().passphrase,
): string {
  const pairs = Object.entries(fields)
    .filter(([key, value]) => key !== 'signature' && value !== '' && value !== undefined)
    .map(([key, value]) => `${key}=${encode(String(value))}`);
  const query = pairs.join('&');
  const withPassphrase = passphrase ? `${query}&passphrase=${encode(passphrase)}` : query;
  return createHash('md5').update(withPassphrase).digest('hex');
}

function signaturesMatch(expected: string, actual: string): boolean {
  const left = Buffer.from(expected.toLowerCase(), 'utf8');
  const right = Buffer.from(actual.toLowerCase(), 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

function firstName(name: string | null | undefined, email: string): string {
  return (name || email.split('@')[0] || 'Customer').trim().split(/\s+/)[0].slice(0, 100);
}

function lastName(name: string | null | undefined): string {
  return (name || '').trim().split(/\s+/).slice(1).join(' ').slice(0, 100);
}

export function isPayFastConfigured(): boolean {
  const config = getConfig();
  return Boolean(config.merchantId && config.merchantKey && config.notifyUrl);
}

export function createPayFastCheckout(input: {
  invoiceId: number;
  paymentReference: string;
  amountMinor: number;
  currency: string;
  itemName: string;
  customer: { email: string; name?: string | null };
  returnUrl: string;
  cancelUrl: string;
}): PayFastCheckout {
  const config = getConfig();
  if (!isPayFastConfigured()) {
    throw new Error('PayFast is not configured. Set the PayFast merchant environment variables.');
  }
  if (input.currency.toUpperCase() !== 'ZAR') {
    throw new Error('PayFast checkout currently supports ZAR invoices only.');
  }
  const fields: PayFastPaymentFields = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: config.notifyUrl,
    name_first: firstName(input.customer.name, input.customer.email),
    name_last: lastName(input.customer.name),
    email_address: input.customer.email,
    m_payment_id: input.paymentReference,
    amount: (input.amountMinor / 100).toFixed(2),
    item_name: input.itemName,
  };
  return {
    action: config.sandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process',
    fields: { ...fields, signature: createPayFastSignature(fields) },
  };
}

function toFields(input: Record<string, unknown>): PayFastPaymentFields {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      Array.isArray(value) ? String(value[0]) : String(value ?? ''),
    ]),
  );
}

export async function verifyPayFastNotification(
  input: Record<string, unknown>,
): Promise<PayFastNotification> {
  const config = getConfig();
  const raw = toFields(input);
  const signature = raw.signature || '';
  if (!signature || !signaturesMatch(createPayFastSignature(raw), signature)) {
    return {
      valid: false,
      verified: false,
      status: raw.payment_status || '',
      paymentId: raw.pf_payment_id || '',
      merchantPaymentId: raw.m_payment_id || '',
      amountMinor: Math.round(Number(raw.amount_gross || 0) * 100),
      currency: raw.currency || '',
      raw,
      reason: 'Invalid PayFast signature.',
    };
  }

  const validationUrl = config.sandbox
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';
  const body = new URLSearchParams({ cmd: '_notify-validate', ...raw });
  let verified = false;
  try {
    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    verified = (await response.text()).trim() === 'VALID';
  } catch {
    return {
      valid: false,
      verified: false,
      status: raw.payment_status || '',
      paymentId: raw.pf_payment_id || '',
      merchantPaymentId: raw.m_payment_id || '',
      amountMinor: Math.round(Number(raw.amount_gross || 0) * 100),
      currency: raw.currency || '',
      raw,
      reason: 'PayFast validation endpoint could not be reached.',
    };
  }

  const valid =
    verified &&
    raw.merchant_id === config.merchantId &&
    raw.payment_status === 'COMPLETE' &&
    Number.isFinite(Number(raw.amount_gross)) &&
    Number(raw.amount_gross) > 0 &&
    raw.currency === 'ZAR';
  return {
    valid,
    verified,
    status: raw.payment_status || '',
    paymentId: raw.pf_payment_id || '',
    merchantPaymentId: raw.m_payment_id || '',
    amountMinor: Math.round(Number(raw.amount_gross || 0) * 100),
    currency: raw.currency || '',
    raw,
    reason: valid ? undefined : 'PayFast notification did not pass settlement validation.',
  };
}
