import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WizardShell, type WizardShellProps } from '../WizardShell';
import { buildPreviewModel } from '../previewModel';

const baseProps = (over: Partial<WizardShellProps> = {}): WizardShellProps => ({
  steps: [
    { id: 'project_setup', title: 'Project Setup', done: true, visited: true },
    { id: 'configuration', title: 'Configuration', done: false, visited: true },
    { id: 'location', title: 'Location', done: false, visited: false },
  ],
  currentIndex: 1,
  onSelectStep: vi.fn(),
  progress: { position: 2, total: 3, percent: 67 },
  save: { isSaving: false, hasError: false, lastSavedAt: null },
  previewModel: buildPreviewModel({ name: 'Baltimore' }),
  canGoBack: true,
  onBack: vi.fn(),
  onNext: vi.fn(),
  children: <div>step body</div>,
  ...over,
});

describe('WizardShell', () => {
  it('shows who an admin is creating for, with a Change link, in curated mode', () => {
    render(
      <WizardShell
        {...baseProps({ publisherName: 'Cosmopolitan Projects', changePublisherHref: '/admin/publisher' })}
      />,
    );
    expect(screen.getByText('Cosmopolitan Projects')).toBeInTheDocument();
    expect(screen.getByText('Creating for')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/admin/publisher');
  });

  it('shows no publisher chip for a normal developer', () => {
    render(<WizardShell {...baseProps()} />);
    expect(screen.queryByText('Creating for')).not.toBeInTheDocument();
  });

  it('links to the right drafts list', () => {
    render(<WizardShell {...baseProps({ draftsHref: '/admin/publisher', draftsLabel: 'Your drafts' })} />);
    expect(screen.getByRole('link', { name: /Your drafts/ })).toHaveAttribute('href', '/admin/publisher');
  });

  it('is honest about saving: idle, saving, error with retry, saved', () => {
    const onRetrySave = vi.fn();
    const { rerender } = render(<WizardShell {...baseProps()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Not saved yet');

    rerender(<WizardShell {...baseProps({ save: { isSaving: true, hasError: false, lastSavedAt: null } })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saving');

    rerender(
      <WizardShell
        {...baseProps({ save: { isSaving: false, hasError: true, lastSavedAt: null }, onRetrySave })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Couldn.t save/ }));
    expect(onRetrySave).toHaveBeenCalled();
    expect(screen.queryByText(/^Saved/)).not.toBeInTheDocument();

    rerender(
      <WizardShell {...baseProps({ save: { isSaving: false, hasError: false, lastSavedAt: new Date() } })} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Saved just now');
  });

  it('lets the publisher jump to a visited step but not an unvisited one', () => {
    const onSelectStep = vi.fn();
    render(<WizardShell {...baseProps({ onSelectStep })} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Project Setup/ })[0]);
    expect(onSelectStep).toHaveBeenCalledWith('project_setup');
    const location = screen.getAllByRole('button', { name: /Location/ })[0];
    expect(location).toBeDisabled();
  });

  it('shows the step counter, Back and Continue, and the live preview', () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(<WizardShell {...baseProps({ onBack, onNext })} />);
    expect(screen.getAllByText(/Step 2 of 3/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onBack).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
    expect(screen.getByText('What buyers will see')).toBeInTheDocument();
    expect(screen.getByTestId('preview-name')).toHaveTextContent('Baltimore');
  });
});
