import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgencyListingActions, AgencyListingStatus } from './AgencyListingPresentation';

afterEach(cleanup);

describe('agency listing status summary', () => {
  it('shows one Live status for matching publication states without repeated clear/readiness badges', () => {
    render(
      <AgencyListingStatus
        listing={{
          authoringStatus: 'published',
          publicationState: 'published',
          readinessScore: 100,
          health: { needsAttention: false, reasons: [] },
        }}
      />,
    );
    expect(screen.getAllByText('Live')).toHaveLength(1);
    expect(screen.queryByText('published')).toBeNull();
    expect(screen.queryByText('Clear')).toBeNull();
    expect(screen.queryByText('100% ready')).toBeNull();
  });

  it('keeps the live version distinct from edits awaiting review', () => {
    render(
      <AgencyListingStatus
        listing={{
          authoringStatus: 'pending_review',
          publicationState: 'public_with_private_pending_edits',
        }}
      />,
    );
    expect(screen.getByText('Live')).toBeDefined();
    expect(screen.getByText('Live version unchanged · edits pending')).toBeDefined();
  });

  it.each([
    ['approved', 'approved_not_published', 'Approved', 'Not yet public'],
    ['published', 'publication_mismatch', 'Publication pending', 'Check publication'],
    ['published', 'withdrawn', 'Publication pending', 'Withdrawn from public view'],
    ['draft', 'private', 'Draft', '65% ready'],
  ])(
    'does not imply a public listing for %s / %s',
    (authoringStatus, publicationState, label, detail) => {
      render(
        <AgencyListingStatus listing={{ authoringStatus, publicationState, readinessScore: 65 }} />,
      );
      expect(screen.getByText(label)).toBeDefined();
      expect(screen.getByText(detail)).toBeDefined();
      expect(screen.queryByText('Live')).toBeNull();
    },
  );

  it('describes an assignment problem while preserving public visibility', () => {
    render(
      <AgencyListingStatus
        listing={{
          authoringStatus: 'published',
          publicationState: 'published',
          health: {
            needsAttention: true,
            reasons: ['unassigned_listing', 'published_no_recent_enquiries'],
          },
        }}
      />,
    );
    expect(screen.getByText('Live')).toBeDefined();
    expect(screen.getByText('Assign an agent')).toBeDefined();
    expect(screen.queryByText('Needs attention')).toBeNull();
  });

  it('treats no recent enquiries as a quiet activity observation, keeping the reason visible', () => {
    render(
      <AgencyListingStatus
        listing={{
          authoringStatus: 'published',
          publicationState: 'published',
          health: { needsAttention: true, reasons: ['published_no_recent_enquiries'] },
        }}
      />,
    );
    expect(screen.getByText('No recent enquiries')).toBeDefined();
    expect(screen.queryByText('Needs attention')).toBeNull();
  });
});

describe('agency listing contextual actions', () => {
  const props = () => ({
    title: 'Sandton home',
    busy: false,
    canEdit: true,
    canSubmit: true,
    canArchive: true,
    hasPublicPage: true,
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onSubmit: vi.fn(),
    onArchive: vi.fn(),
    onPublic: vi.fn(),
  });
  const openMenu = () =>
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions for Sandton home' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });

  it('leaves View visible and hides secondary actions until the menu is opened', async () => {
    const actions = props();
    render(<AgencyListingActions {...actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Sandton home' }));
    expect(actions.onOpen).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menuitem')).toBeNull();
    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Open public listing' }));
    expect(actions.onPublic).toHaveBeenCalledOnce();
    expect(actions.onArchive).not.toHaveBeenCalled();
  });

  it('preserves author-only editing and publication-dependent public actions', async () => {
    const actions = props();
    render(
      <AgencyListingActions {...actions} canEdit={false} hasPublicPage={false} canSubmit={false} />,
    );
    openMenu();
    expect(await screen.findByRole('menuitem', { name: 'Archive listing' })).toBeDefined();
    expect(screen.queryByRole('menuitem', { name: 'Edit listing' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Open public listing' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Submit for review' })).toBeNull();
  });

  it.each([
    ['Edit listing', 'onEdit'],
    ['Submit for review', 'onSubmit'],
    ['Archive listing', 'onArchive'],
  ] as const)('routes %s to its existing handler', async (label, handler) => {
    const actions = props();
    render(<AgencyListingActions {...actions} />);
    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));
    expect(actions[handler]).toHaveBeenCalledOnce();
  });

  it('disables mutations while busy and omits an empty menu', async () => {
    const actions = props();
    const view = render(<AgencyListingActions {...actions} busy />);
    openMenu();
    expect(await screen.findByRole('menuitem', { name: 'Archive listing' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Submit for review' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Archive listing' }));
    expect(actions.onArchive).not.toHaveBeenCalled();
    view.unmount();
    render(
      <AgencyListingActions
        {...actions}
        canEdit={false}
        canSubmit={false}
        canArchive={false}
        hasPublicPage={false}
      />,
    );
    expect(screen.queryByRole('button', { name: /More actions/ })).toBeNull();
  });
});
