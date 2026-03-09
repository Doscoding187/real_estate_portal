export const DISTRIBUTION_MANAGER_ONBOARDING_PATH = '/distribution/manager/onboarding';

const DEFAULT_PUBLIC_APP_ORIGIN = 'http://localhost:5173';
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function toSearchString(input: string | URLSearchParams | null | undefined) {
  if (!input) return '';
  if (input instanceof URLSearchParams) {
    return input.toString();
  }

  const trimmed = String(input).trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).search.replace(/^\?/, '');
    } catch {
      return '';
    }
  }

  return trimmed.replace(/^\?/, '');
}

function toNormalizedOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const normalized = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(normalized).origin;
  } catch {
    return '';
  }
}

function collectQueryCandidates(search: string) {
  const queue = [search];
  const seen = new Set<string>();
  const candidates: string[] = [];

  while (queue.length > 0) {
    const current = String(queue.shift() || '').trim().replace(/^\?/, '');
    if (!current || seen.has(current)) continue;
    seen.add(current);
    candidates.push(current);

    const params = new URLSearchParams(current);
    for (const value of params.values()) {
      const trimmed = value.trim();
      if (!trimmed) continue;

      if (/^https?:\/\//i.test(trimmed)) {
        try {
          const nestedSearch = new URL(trimmed).search.replace(/^\?/, '');
          if (nestedSearch) queue.push(nestedSearch);
        } catch {
          // Ignore invalid nested URL values.
        }
      }

      const nestedQueryIndex = trimmed.lastIndexOf('?');
      if (nestedQueryIndex >= 0 && nestedQueryIndex < trimmed.length - 1) {
        queue.push(trimmed.slice(nestedQueryIndex + 1));
      }
    }
  }

  return candidates;
}

function isLikelyEmail(value: string) {
  return SIMPLE_EMAIL_PATTERN.test(value);
}

export function normalizePublicAppOrigin(
  rawValue?: string | null,
  fallbackValue = DEFAULT_PUBLIC_APP_ORIGIN,
) {
  const fallbackOrigin = toNormalizedOrigin(fallbackValue) || DEFAULT_PUBLIC_APP_ORIGIN;
  const normalized = rawValue ? toNormalizedOrigin(rawValue) : '';
  return normalized || fallbackOrigin;
}

export function buildDistributionManagerInviteUrl(
  appUrl: string | null | undefined,
  params: { registrationId: number; email: string },
) {
  const baseOrigin = normalizePublicAppOrigin(appUrl);
  const url = new URL(DISTRIBUTION_MANAGER_ONBOARDING_PATH, `${baseOrigin}/`);
  url.searchParams.set('registrationId', String(params.registrationId));
  url.searchParams.set('email', params.email.trim().toLowerCase());
  return url.toString();
}

export function parseDistributionManagerInviteParams(
  input: string | URLSearchParams | null | undefined,
) {
  const search = toSearchString(input);
  const candidates = collectQueryCandidates(search);

  let registrationId: number | null = null;
  let email = '';
  let recovered = false;

  for (const candidate of candidates) {
    const params = new URLSearchParams(candidate);

    for (const rawId of params.getAll('registrationId')) {
      const parsedId = Number(rawId);
      if (!Number.isInteger(parsedId) || parsedId <= 0) continue;
      if (registrationId !== null && registrationId !== parsedId) recovered = true;
      registrationId = parsedId;
    }

    for (const rawEmail of params.getAll('email')) {
      const normalizedEmail = rawEmail.trim().toLowerCase();
      if (!isLikelyEmail(normalizedEmail)) continue;
      if (email && email !== normalizedEmail) recovered = true;
      email = normalizedEmail;
    }
  }

  return {
    registrationId,
    email,
    isComplete: Boolean(registrationId && email),
    recovered,
  };
}

export function buildDistributionManagerInviteWhatsappUrl(
  inviteUrl: string,
  inviteeName?: string | null,
) {
  const greeting = inviteeName?.trim() ? `Hi ${inviteeName.trim()}, ` : '';
  const text = `${greeting}accept your distribution manager invite here: ${inviteUrl}`;
  return `https://wa.me/?${new URLSearchParams({ text }).toString()}`;
}

export function buildDistributionManagerInviteMailtoUrl(
  inviteUrl: string,
  inviteeName?: string | null,
) {
  const subject = 'Distribution manager invite';
  const intro = inviteeName?.trim() ? `Hi ${inviteeName.trim()},\n\n` : '';
  const body = `${intro}Use the link below to accept your distribution manager invite and complete onboarding:\n${inviteUrl}`;
  return `mailto:?${new URLSearchParams({ subject, body }).toString()}`;
}
