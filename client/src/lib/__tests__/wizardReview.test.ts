import { describe, expect, it } from 'vitest';
import { buildReviewModel, describePublishFailure, publishConfirmText, stepForIssue } from '../wizardReview';

describe('describePublishFailure', () => {
  it('uses the server message and lists readiness blockers', () => {
    const failure = describePublishFailure(
      {
        message: 'Development is not ready for submission.',
        data: {
          validationErrors: [
            { field: 'suburb', message: 'Choose the suburb from the list.' },
            { field: 'media', message: 'At least one persisted image with a URL is required.' },
            { field: 'media', message: 'At least one persisted image with a URL is required.' },
          ],
        },
      },
      'fallback',
    );
    expect(failure.message).toBe('Development is not ready for submission.');
    expect(failure.details).toEqual([
      'Choose the suburb from the list.',
      'At least one persisted image with a URL is required.',
    ]);
  });

  it('adds zod field errors and never returns an empty message', () => {
    const failure = describePublishFailure(
      { message: '', data: { zodError: { fieldErrors: { name: ['Required'] }, formErrors: ['Bad input'] } } },
      'Failed to publish',
    );
    expect(failure.message).toBe('Failed to publish');
    expect(failure.details).toEqual(['name: Required', 'Bad input']);
    expect(describePublishFailure(null, 'x')).toEqual({ message: 'x', details: [] });
  });
});

describe('review house type order', () => {
  it('lists house types cheapest first, like the public page', () => {
    const unit = (id: string, size: number, price: number) => ({ id, name: id, unitSize: size, priceFrom: price, bedrooms: 3, bathrooms: 2 });
    const model = buildReviewModel({ unitTypes: [unit('big', 155, 2445000), unit('small', 71, 1745000), unit('mid', 91, 1930000)] });
    expect(model.houseTypes.map(h => h.id)).toEqual(['small', 'mid', 'big']);
  });
});

describe('review helpers', () => {
  it('maps readiness messages to the step that fixes them', () => {
    expect(stepForIssue('Choose the suburb from the list.')).toBe('location');
    expect(stepForIssue('At least three highlights are required.')).toBe('amenities_features');
    expect(stepForIssue('At least one persisted image with a URL is required.')).toBe('development_media');
    expect(stepForIssue('Something unrecognised')).toBeNull();
  });

  it('words the confirmation per mode', () => {
    expect(publishConfirmText({ name: 'A', publisherName: 'P', houseTypeCount: 1, curated: true })).toBe(
      'Publishes A for P with 1 house type. It becomes visible to the public on the site.',
    );
  });
});
