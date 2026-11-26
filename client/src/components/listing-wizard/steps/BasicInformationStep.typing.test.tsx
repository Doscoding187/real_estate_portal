import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('keeps restored text when hydration lands after focus and the user never typed', () => {
    render(<BasicInformationStep />);
    const title = screen.getByLabelText(/Property Title/) as HTMLInputElement;
    title.focus();
    fireEvent.focus(title);
    act(() => {
      useListingWizardStore.getState().setTitle('Restored title');
    });
    expect(title.value).toBe('Restored title');
    fireEvent.blur(title);
    expect(useListingWizardStore.getState().title).toBe('Restored title');
    expect(title.value).toBe('Restored title');
  });

  it('follows external changes when the field is not focused', () => {
    render(<BasicInformationStep />);
    const title = screen.getByLabelText(/Property Title/) as HTMLInputElement;
    act(() => {
      useListingWizardStore.getState().setTitle('Restored title');
    });
    expect(title.value).toBe('Restored title');
  });

  it('keeps every keystroke of a long description typed fast, with store churn and validation active', () => {
    vi.useFakeTimers();
    try {
      render(<BasicInformationStep />);
      const description = screen.getByLabelText(/Property Description/) as HTMLTextAreaElement;
      description.focus();
      const text =
        'Three-bedroom family home with an open-plan kitchen and lounge, a double garage, a garden and a pool, close to schools and shops. Quiet street in a secure neighbourhood.';
      expect(text.length).toBeGreaterThan(150);

      let writes = 0;
      const unsubscribe = useListingWizardStore.subscribe(() => {
        writes += 1;
      });
      let typed = '';
      for (const [index, ch] of [...text].entries()) {
        typed += ch;
        fireEvent.change(description, { target: { value: typed } });
        if (index % 7 === 0) {
          // Autosave / readiness churn and a stale restore landing between keystrokes.
          act(() => {
            useListingWizardStore.setState({ currentStep: 3, description: typed.slice(0, -2) });
          });
        }
        if (index % 20 === 0) act(() => void vi.advanceTimersByTime(50));
        expect(description.value).toBe(typed);
      }
      act(() => void vi.advanceTimersByTime(500));
      unsubscribe();
      expect(description.value).toBe(text);
      expect(useListingWizardStore.getState().description).toBe(text);
      // Keystrokes stay local; the store is not written once per character.
      expect(writes).toBeLessThan(text.length);
    } finally {
      vi.useRealTimers();
    }
  });
});
