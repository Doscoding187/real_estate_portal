import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { hydrateListingWizardForUser, useListingWizardStore } from '../useListingWizard';

const storageKey = 'listing-wizard-storage';

describe('listing wizard persisted draft ownership', () => {
  beforeEach(async () => {
    localStorage.removeItem(storageKey);
    await act(async () => {
      await hydrateListingWizardForUser(null);
    });
  });

  it('restores a persisted draft after a refresh for its authenticated owner', async () => {
    await act(async () => {
      await hydrateListingWizardForUser(101);
      useListingWizardStore.getState().setTitle('Agent A private draft');
      useListingWizardStore.getState().setDescription('Private pricing and location details');
      useListingWizardStore.getState().setListingIntent('sale');
    });

    await act(async () => {
      await hydrateListingWizardForUser(101);
    });

    expect(useListingWizardStore.getState()).toMatchObject({
      persistedOwnerId: 101,
      title: 'Agent A private draft',
      description: 'Private pricing and location details',
      action: 'sell',
    });
  });

  it('clears private draft state when a different account opens the wizard', async () => {
    await act(async () => {
      await hydrateListingWizardForUser(101);
      useListingWizardStore.getState().setTitle('Agent A private draft');
      useListingWizardStore.getState().setListingIntent('sale');
      await hydrateListingWizardForUser(202);
    });

    expect(useListingWizardStore.getState()).toMatchObject({
      persistedOwnerId: 202,
      title: '',
      description: '',
      action: undefined,
      media: [],
    });
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('does not transfer an unowned legacy draft to the next authenticated account', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        state: {
          title: 'Legacy private title',
          description: 'Legacy private location and price',
          currentStep: 4,
        },
        version: 0,
      }),
    );

    await act(async () => {
      await hydrateListingWizardForUser(202);
    });

    expect(useListingWizardStore.getState()).toMatchObject({
      persistedOwnerId: 202,
      title: '',
      description: '',
      currentStep: 1,
    });
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});
