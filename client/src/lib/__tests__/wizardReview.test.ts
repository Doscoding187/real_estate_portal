import { describe, expect, it } from 'vitest';
import { describePublishFailure, publishConfirmText, stepForIssue } from '../wizardReview';

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
