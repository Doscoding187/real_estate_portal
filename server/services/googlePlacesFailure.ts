/**
 * Google Places failures are reported with one HTTP status and one provider status, but they
 * need different operator actions. A missing billing account, a disabled Places API and a
 * restricted API key all arrive as HTTP 403 with `REQUEST_DENIED`. Reporting them as one
 * "invalid API key" sends the operator to the wrong fix, so the failure is classified here
 * once and every call site reports the same actionable reason.
 *
 * This module is pure. It never reads or exposes a credential.
 */

export const GOOGLE_PLACES_FAILURES = [
  'billing-not-enabled',
  'api-not-enabled',
  'key-restricted-or-invalid',
  'rate-limited',
  'service-unavailable',
  'no-results',
  'unknown',
] as const;

export type GooglePlacesFailure = (typeof GOOGLE_PLACES_FAILURES)[number];

export interface GooglePlacesFailureDetail {
  failure: GooglePlacesFailure;
  /** Short reason suitable for an operator log line. */
  reason: string;
  /** The action that resolves this failure. */
  action: string;
}

export interface GooglePlacesFailureInput {
  httpStatus?: number;
  apiStatus?: string;
  message?: string;
}

function normalise(value: string | undefined): string {
  return String(value || '').toLowerCase();
}

export function classifyGooglePlacesFailure(
  input: GooglePlacesFailureInput,
): GooglePlacesFailureDetail {
  const apiStatus = normalise(input.apiStatus);
  const message = normalise(input.message);
  const httpStatus = input.httpStatus;

  const billingNotEnabled =
    message.includes('billing') ||
    apiStatus.includes('billing') ||
    (httpStatus === 403 && message.includes('must be enabled'));
  if (billingNotEnabled) {
    return {
      failure: 'billing-not-enabled',
      reason: 'Billing is not enabled for the Google Cloud project that owns this API key.',
      action:
        'Enable billing on the Google Cloud project that owns GOOGLE_PLACES_API_KEY. Google refuses Places requests from an unbilled project.',
    };
  }

  const apiNotEnabled =
    message.includes('has not been used in project') ||
    message.includes('not enabled') ||
    message.includes('is disabled') ||
    message.includes('api is not enabled');
  if (apiNotEnabled) {
    return {
      failure: 'api-not-enabled',
      reason: 'The Places API is not enabled for the Google Cloud project that owns this key.',
      action:
        'Enable the Places API for the Google Cloud project that owns GOOGLE_PLACES_API_KEY, then confirm the key is allowed to use it.',
    };
  }

  const restricted =
    apiStatus === 'request_denied' ||
    apiStatus === 'permission_denied' ||
    httpStatus === 401 ||
    httpStatus === 403 ||
    message.includes('api key not valid') ||
    message.includes('api key') ||
    message.includes('referrer') ||
    message.includes('restriction');
  if (restricted) {
    return {
      failure: 'key-restricted-or-invalid',
      reason: 'The API key was rejected or is restricted for this request.',
      action:
        'Check that GOOGLE_PLACES_API_KEY is valid, that the Places API is enabled for its project, and that any HTTP referrer or IP restrictions allow this service.',
    };
  }

  if (httpStatus === 429 || apiStatus === 'over_query_limit') {
    return {
      failure: 'rate-limited',
      reason: 'The Google Places quota for this key is exhausted.',
      action: 'Reduce request volume or wait for the quota window to reset.',
    };
  }

  if (httpStatus === 503 || apiStatus === 'unknown_error') {
    return {
      failure: 'service-unavailable',
      reason: 'Google Places is temporarily unavailable.',
      action: 'Retry later; no configuration change is required for this failure.',
    };
  }

  if (apiStatus === 'zero_results') {
    return {
      failure: 'no-results',
      reason: 'The provider returned no results for this area.',
      action: 'No action is required. A wider radius or a different place will return results.',
    };
  }

  return {
    failure: 'unknown',
    reason: input.message ? String(input.message) : 'Unknown Google Places failure.',
    action: 'Inspect the provider response and the key configuration.',
  };
}

/** A single log-safe sentence that names the failure and the action. */
export function describeGooglePlacesFailure(detail: GooglePlacesFailureDetail): string {
  return `${detail.reason} ${detail.action}`;
}
