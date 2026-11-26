import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import BasicInformationStep from './BasicInformationStep';
import { useListingWizardStore } from '@/hooks/useListingWizard';

describe('BasicInformationStep typing is never overwritten while focused', () => {
  beforeEach(() => {
    act(() => {
      useListingWizardStore.getState().reset();
      useListingWizardStore.getState().setListingIntent('sale');
      useListingWizardStore.getState().setPropertyType('house');
    });
    localStorage.removeItem('listing-wizard-storage');
  });

  afterEach(() => cleanup());

  it('keeps fast-typed title text when a draft restore / autosave write lands mid-typing', () => {
    render(<BasicInformationStep />);
    const title = screen.getByLabelText(/Property Title/) as HTMLInputElement;
    title.focus();

    let typed = '';
    for (const ch of 'a nice house') {
      typed += ch;
      fireEvent.change(title, { target: { value: typed } });
      if (typed.length === 4) {
        // A stale device draft restore writes an older value into the store.
        act(() => {
          useListingWizardStore.setState({ title: 'a n' });
        });
      }
    }

    expect(title.value).toBe('a nice house');
    fireEvent.blur(title);
    expect(useListingWizardStore.getState().title).toBe('a nice house');
  });

  it('keeps fast-typed description text when the store is rewritten mid-typing', () => {
    render(<BasicInformationStep />);
    const description = screen.getByLabelText(/Property Description/) as HTMLTextAreaElement;
    description.focus();

    let typed = '';
    for (const ch of 'with a garden') {
      typed += ch;
      fireEvent.change(description, { target: { value: typed } });
      if (typed.length === 3) {
        act(() => {
          useListingWizardStore.setState({ description: 'wit' });
        });
      }
    }

    expect(description.value).toBe('with a garden');
  });

  it('follows external changes when the field is not focused', () => {
    render(<BasicInformationStep />);
    const title = screen.getByLabelText(/Property Title/) as HTMLInputElement;
    act(() => {
      useListingWizardStore.getState().setTitle('Restored title');
    });
    expect(title.value).toBe('Restored title');
  });
});
