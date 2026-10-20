import { describe, expect, it } from 'vitest';
import { classifyGooglePlacesFailure, describeGooglePlacesFailure } from '../googlePlacesFailure';

describe('Google Places failure classification', () => {
  it('separates an unbilled project from a rejected key', () => {
    const unbilled = classifyGooglePlacesFailure({
      httpStatus: 403,
      apiStatus: 'REQUEST_DENIED',
      message:
        'Google Maps Platform rejected your request. Billing is not enabled for your project.',
    });
    expect(unbilled.failure).toBe('billing-not-enabled');
    expect(unbilled.action).toContain('Enable billing');

    const rejected = classifyGooglePlacesFailure({
      httpStatus: 403,
      apiStatus: 'REQUEST_DENIED',
      message: 'The provided API key is invalid.',
    });
    expect(rejected.failure).toBe('key-restricted-or-invalid');
  });

  it('separates a disabled Places API from a rejected key', () => {
    const disabled = classifyGooglePlacesFailure({
      httpStatus: 403,
      apiStatus: 'REQUEST_DENIED',
      message:
        'Places API has not been used in project 123456789 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/places.googleapis.com/overview?project=123456789',
    });
    expect(disabled.failure).toBe('api-not-enabled');
    expect(disabled.action).toContain('Enable the Places API');
  });

  it('treats a bare REQUEST_DENIED as a key or permission problem', () => {
    const detail = classifyGooglePlacesFailure({ apiStatus: 'REQUEST_DENIED' });
    expect(detail.failure).toBe('key-restricted-or-invalid');
  });

  it('classifies quota and availability failures separately', () => {
    expect(classifyGooglePlacesFailure({ httpStatus: 429 }).failure).toBe('rate-limited');
    expect(classifyGooglePlacesFailure({ httpStatus: 503 }).failure).toBe('service-unavailable');
    expect(classifyGooglePlacesFailure({ apiStatus: 'ZERO_RESULTS' }).failure).toBe('no-results');
  });

  it('never reports a credential value', () => {
    const detail = classifyGooglePlacesFailure({
      httpStatus: 403,
      apiStatus: 'REQUEST_DENIED',
      message: 'The provided API key is invalid: AIzaSyEXAMPLE',
    });
    const described = describeGooglePlacesFailure(detail);
    expect(described).not.toContain('AIza');
    expect(described).toContain('Check that GOOGLE_PLACES_API_KEY is valid');
  });
});
