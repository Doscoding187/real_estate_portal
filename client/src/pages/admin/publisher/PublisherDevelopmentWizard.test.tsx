import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { contextMock, setLocationMock } = vi.hoisted(() => ({
  contextMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/', setLocationMock] }));
vi.mock('@/hooks/usePublisherContext', () => ({
  usePublisherContext: () => ({ context: contextMock() }),
}));
vi.mock('@/pages/CreateDevelopment', () => ({ default: () => 'Wizard body' }));

import PublisherDevelopmentWizard from './PublisherDevelopmentWizard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublisherDevelopmentWizard gate', () => {
  it('asks for the publisher when there is no context and no query param', () => {
    contextMock.mockReturnValue(null);
    window.history.pushState({}, '', '/admin/publisher/developments/new');
    render(createElement(PublisherDevelopmentWizard));
    expect(screen.getByText('Choose which publisher this development is for')).toBeInTheDocument();
    expect(screen.queryByText('Wizard body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a publisher' }));
    expect(setLocationMock).toHaveBeenCalledWith('/admin/publisher');
  });

  it('shows the wizard when a publisher context exists', () => {
    contextMock.mockReturnValue({ cataloguePublisherId: 9 });
    window.history.pushState({}, '', '/admin/publisher/developments/new');
    render(createElement(PublisherDevelopmentWizard));
    expect(screen.getByText('Wizard body')).toBeInTheDocument();
  });

  it('shows the gate for a query param without a publisher context', () => {
    contextMock.mockReturnValue(null);
    window.history.pushState({}, '', '/admin/publisher/developments/new?id=5&cataloguePublisherId=9');
    render(createElement(PublisherDevelopmentWizard));
    expect(screen.queryByText('Wizard body')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a publisher' })).toBeInTheDocument();
  });

  it('shows the gate when the query param differs from the context', () => {
    contextMock.mockReturnValue({ cataloguePublisherId: 4 });
    window.history.pushState({}, '', '/admin/publisher/developments/new?id=5&cataloguePublisherId=9');
    render(createElement(PublisherDevelopmentWizard));
    expect(screen.queryByText('Wizard body')).not.toBeInTheDocument();
    expect(
      screen.getByText('This development belongs to another publisher — choose it first'),
    ).toBeInTheDocument();
  });

  it('shows the wizard when the query param matches the context', () => {
    contextMock.mockReturnValue({ cataloguePublisherId: 9 });
    window.history.pushState({}, '', '/admin/publisher/developments/new?id=5&cataloguePublisherId=9');
    render(createElement(PublisherDevelopmentWizard));
    expect(screen.getByText('Wizard body')).toBeInTheDocument();
  });
});
