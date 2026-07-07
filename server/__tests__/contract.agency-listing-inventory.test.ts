import { describe, expect, it } from 'vitest';
import { __agencyListingInventoryTestHooks } from '../agencyRouter';

const { mapAgencyListingRow } = __agencyListingInventoryTestHooks;

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  title: '[LOCAL DEMO] Agency Inventory Contract',
  address: 'Local demo address',
  city: 'Johannesburg',
  suburb: 'Sandton',
  province: 'Gauteng',
  action: 'sell',
  propertyType: 'apartment',
  askingPrice: '1450000',
  monthlyRent: null,
  startingBid: null,
  status: 'draft',
  approvalStatus: 'pending',
  agencyId: 19,
  ownerId: 501,
  ownerName: '[LOCAL DEMO] Agency Principal',
  ownerFirstName: 'Local',
  ownerLastName: 'Principal',
  ownerEmail: 'agency@listify.local',
  ownerAgencyId: 19,
  agentId: 22,
  agentFirstName: 'Local',
  agentLastName: 'Agent',
  agentDisplayName: '[LOCAL DEMO] Agency Agent',
  agentEmail: 'agent@listify.local',
  agentStatus: 'approved',
  agentAgencyId: 19,
  readinessScore: 90,
  qualityScore: 82,
  mediaCount: 2,
  imageCount: 2,
  publicPropertyId: null,
  publicPropertyStatus: null,
  publicViews: null,
  publicEnquiries: null,
  listingLeadCount: 0,
  analyticsUpdatedAt: null,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-02T10:00:00.000Z',
  publishedAt: null,
  archivedAt: null,
  rejectionReason: null,
  rejectionReasons: null,
  rejectionNote: null,
  reviewedAt: null,
  queueRejectionReason: null,
  queueReviewNotes: null,
  queueReviewedAt: null,
  queueSubmittedAt: null,
  queueStatus: null,
  ...overrides,
});

describe('agency listing inventory contract', () => {
  it('keeps private listings distinct from unavailable performance data', () => {
    const listing = mapAgencyListingRow(
      baseRow({
        agentId: null,
        status: 'draft',
        mediaCount: 0,
        imageCount: 0,
      }),
      19,
    );

    expect(listing.publicationState).toBe('private');
    expect(listing.publicUrl).toBeNull();
    expect(listing.assignedAgent).toBeNull();
    expect(listing.performance).toMatchObject({
      views: null,
      enquiries: null,
      source: 'unavailable',
      available: false,
      conversionRate: null,
    });
    expect(listing.health.reasons).toContain('unassigned_listing');
  });

  it('preserves known-zero public metrics without marking analytics unavailable', () => {
    const listing = mapAgencyListingRow(
      baseRow({
        status: 'published',
        publicPropertyId: 9001,
        publicPropertyStatus: 'available',
        publicViews: 0,
        publicEnquiries: 0,
        publishedAt: '2026-06-20T10:00:00.000Z',
      }),
      19,
    );

    expect(listing.publicationState).toBe('published');
    expect(listing.publicUrl).toBe('/property/9001');
    expect(listing.performance).toMatchObject({
      views: 0,
      enquiries: 0,
      source: 'properties_mirror',
      available: true,
      conversionRate: null,
    });
  });

  it('shows private pending edits as public plus pending authoring work', () => {
    const listing = mapAgencyListingRow(
      baseRow({
        status: 'pending_review',
        publicPropertyId: 9002,
        publicPropertyStatus: 'published',
        publicViews: 312,
        publicEnquiries: 9,
        publishedAt: '2026-06-24T10:00:00.000Z',
      }),
      19,
    );

    expect(listing.authoringStatus).toBe('pending_review');
    expect(listing.publicationState).toBe('public_with_private_pending_edits');
    expect(listing.publicUrl).toBe('/property/9002');
    expect(listing.nextAction).toBe('Await edit review');
  });

  it('does not expose a public preview URL for withdrawn mirrors', () => {
    const listing = mapAgencyListingRow(
      baseRow({
        status: 'published',
        publicPropertyId: 9003,
        publicPropertyStatus: 'archived',
        publicViews: 121,
        publicEnquiries: 4,
        publishedAt: '2026-06-01T10:00:00.000Z',
      }),
      19,
    );

    expect(listing.publicationState).toBe('withdrawn');
    expect(listing.publicUrl).toBeNull();
    expect(listing.performance.source).toBe('properties_mirror');
  });

  it('masks outside-agency assignment details while preserving reassignment signal', () => {
    const listing = mapAgencyListingRow(
      baseRow({
        agencyId: null,
        ownerAgencyId: 19,
        agentId: 77,
        agentAgencyId: 20,
        agentDisplayName: '[LOCAL DEMO] Boundary Agent',
        agentEmail: 'boundary-agent@listify.local',
      }),
      19,
    );

    expect(listing.assignedAgent).toBeNull();
    expect(listing.assignment).toMatchObject({
      agentId: 77,
      inAgency: false,
      label: 'Outside agency assignment',
    });
    expect(listing.health.reasons).toContain('assigned_agent_outside_agency');
    expect(listing.nextAction).toBe('Reassign outside-agency agent');
  });
});
