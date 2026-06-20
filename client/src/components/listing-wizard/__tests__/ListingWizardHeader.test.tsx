import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ListingWizardHeader } from '../ui/ListingWizardHeader';

describe('ListingWizardHeader — Save Draft button', () => {
  it('does not render save button when onSaveDraft is not provided', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
      />,
    );
    expect(screen.queryByText('Save Draft')).toBeNull();
  });

  it('renders Save Draft button when onSaveDraft is provided', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        onSaveDraft={() => {}}
      />,
    );
    expect(screen.getByText('Save Draft')).toBeTruthy();
  });

  it('disables Save Draft button when isSaving is true', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        onSaveDraft={() => {}}
        isSaving={true}
      />,
    );
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
  });

  it('disables Save Draft button when draft prerequisites are missing', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        onSaveDraft={() => {}}
        canSaveDraft={false}
      />,
    );

    expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
  });

  it('calls onSaveDraft when Save Draft button is clicked', () => {
    const onSaveDraft = vi.fn();
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        onSaveDraft={onSaveDraft}
      />,
    );
    fireEvent.click(screen.getByText('Save Draft'));
    expect(onSaveDraft).toHaveBeenCalledOnce();
  });

  it('renders saved status badge', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        saveStatus="saved"
        lastSavedAt={new Date('2026-06-20T10:30:00')}
      />,
    );
    expect(screen.getByText(/Saved/)).toBeTruthy();
  });

  it('renders error status badge', () => {
    render(
      <ListingWizardHeader
        title="Test"
        progressPercent={50}
        saveStatus="error"
      />,
    );
    expect(screen.getByText('Save failed')).toBeTruthy();
  });
});
