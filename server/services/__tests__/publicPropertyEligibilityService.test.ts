import { describe, expect, it, vi } from 'vitest';

import {
  evaluatePublicPropertySupplyEvidence,
  resolvePublicPropertyEligibilities,
  type PublicPropertySupplyEvidence,
} from '../publicPropertyEligibilityService';

const agent = {
  id: 33,
  userId: 70,
  agencyId: null,
  status: 'approved',
  isVerified: 1,
  userRole: 'agent',
  firstName: 'Amina',
  lastName: 'Nkosi',
  displayName: 'Amina Nkosi',
  profileImage: '/amina.jpg',
  phone: '+27110000000',
  whatsapp: '+27110000000',
  email: 'amina@example.test',
  slug: 'amina-nkosi',
};

const agency = {
  id: 44,
  name: 'North Star Realty',
  slug: 'north-star-realty',
  logo: '/north-star.svg',
  phone: '+27210000000',
  email: 'hello@north-star.example',
  isVerified: 1,
};

function evidence(
  overrides: Partial<PublicPropertySupplyEvidence> = {},
): PublicPropertySupplyEvidence {
  return {
    approvedSourceListingId: 9001,
    property: {
      id: 501,
      ownerId: 70,
      agentId: 33,
      developmentId: null,
      cataloguePublisherId: null,
    },
    sourceListing: {
      id: 9001,
      ownerId: 70,
      agentId: 33,
      agencyId: null,
    },
    propertyOwner: { id: 70, role: 'agent', agencyId: null },
    sourceOwner: { id: 70, role: 'agent', agencyId: null },
    directAgent: agent,
    sourceAgent: agent,
    directAgentAgency: null,
    sourceAgentAgency: null,
    sourceAgency: null,
    ownerAgency: null,
    brand: null,
    brandReferenceInvalid: false,
    ...overrides,
  };
}

describe('public property eligibility authority', () => {
  it('resolves approval and supply evidence once per candidate batch', async () => {
    const approval = {
      authority: 'approved_listing' as const,
      sourceListingId: 9001,
      property: {
        id: 501,
        ownerId: 70,
        agentId: 33,
        developmentId: null,
        cataloguePublisherId: null,
      },
      images: [],
      media: [],
    };
    const resolveApprovedProperties = vi
      .fn()
      .mockResolvedValue(new Map([[501, approval]]));
    const loadSupplyEvidence = vi.fn().mockResolvedValue(new Map([[501, evidence()]]));

    const result = await resolvePublicPropertyEligibilities([501, 501, 0, -1], {
      resolveApprovedProperties,
      loadSupplyEvidence,
    });

    expect(resolveApprovedProperties).toHaveBeenCalledTimes(1);
    expect(resolveApprovedProperties).toHaveBeenCalledWith([501]);
    expect(loadSupplyEvidence).toHaveBeenCalledTimes(1);
    expect(loadSupplyEvidence).toHaveBeenCalledWith([approval]);
    expect(result.get(501)).toMatchObject({
      publicAuthority: 'public_property_eligibility',
      publicIdentity: { role: 'agent', agentId: 33 },
    });
  });

  it('publishes a verified independent agent with an actionable identity', () => {
    const result = evaluatePublicPropertySupplyEvidence(evidence());

    expect(result).toMatchObject({
      eligible: true,
      custody: {
        leadCustody: 'verified_customer_recipient',
        recipientType: 'agent',
        recipientId: 33,
      },
      publicIdentity: {
        role: 'agent',
        provenance: 'agent',
        name: 'Amina Nkosi',
        agentId: 33,
        agentSlug: 'amina-nkosi',
      },
    });
  });

  it('publishes an assigned agent and verified agency as one identity', () => {
    const agencyAgent = { ...agent, agencyId: 44 };
    const result = evaluatePublicPropertySupplyEvidence(
      evidence({
        sourceListing: { id: 9001, ownerId: 70, agentId: 33, agencyId: 44 },
        propertyOwner: { id: 70, role: 'agent', agencyId: 44 },
        sourceOwner: { id: 70, role: 'agent', agencyId: 44 },
        directAgent: agencyAgent,
        sourceAgent: agencyAgent,
        directAgentAgency: agency,
        sourceAgentAgency: agency,
        sourceAgency: agency,
        ownerAgency: agency,
      }),
    );

    expect(result).toMatchObject({
      eligible: true,
      publicIdentity: {
        role: 'agent',
        name: 'Amina Nkosi',
        organizationName: 'North Star Realty',
        agentId: 33,
        agencyId: 44,
      },
    });
  });

  it('publishes verified agency inventory without inventing an agent', () => {
    const result = evaluatePublicPropertySupplyEvidence(
      evidence({
        property: {
          id: 501,
          ownerId: 71,
          agentId: null,
          developmentId: null,
          cataloguePublisherId: null,
        },
        sourceListing: { id: 9001, ownerId: 71, agentId: null, agencyId: 44 },
        propertyOwner: { id: 71, role: 'agency_admin', agencyId: 44 },
        sourceOwner: { id: 71, role: 'agency_admin', agencyId: 44 },
        directAgent: null,
        sourceAgent: null,
        sourceAgency: agency,
        ownerAgency: agency,
      }),
    );

    expect(result).toMatchObject({
      eligible: true,
      custody: { recipientType: 'agency', recipientId: 44 },
      publicIdentity: {
        role: 'agency',
        provenance: 'agency',
        name: 'North Star Realty',
        agencyId: 44,
      },
    });
  });

  it('fails agency-only inventory closed when its owner cannot access the agency queue', () => {
    const result = evaluatePublicPropertySupplyEvidence(
      evidence({
        property: {
          id: 501,
          ownerId: 72,
          agentId: null,
          developmentId: null,
          cataloguePublisherId: null,
        },
        sourceListing: { id: 9001, ownerId: 72, agentId: null, agencyId: 44 },
        propertyOwner: { id: 72, role: 'agent', agencyId: 44 },
        sourceOwner: { id: 72, role: 'agent', agencyId: 44 },
        directAgent: null,
        sourceAgent: null,
        sourceAgency: agency,
        ownerAgency: agency,
      }),
    );

    expect(result).toMatchObject({
      eligible: false,
      reason: 'invalid_owner_relationship',
    });
  });

  it('fails closed when ownership absence would previously imply private or platform supply', () => {
    const result = evaluatePublicPropertySupplyEvidence(
      evidence({
        property: {
          id: 501,
          ownerId: 71,
          agentId: null,
          developmentId: null,
          cataloguePublisherId: null,
        },
        sourceListing: { id: 9001, ownerId: 71, agentId: null, agencyId: null },
        propertyOwner: { id: 71, role: 'user', agencyId: null },
        sourceOwner: { id: 71, role: 'user', agencyId: null },
        directAgent: null,
        sourceAgent: null,
      }),
    );

    expect(result).toMatchObject({ eligible: false, reason: 'unactionable_custody' });
  });

  it('requires positive explicit platform provenance and platform ownership', () => {
    const platformBrand = {
      id: 91,
      authorityKind: 'platform_reference',
      developerOrganisationId: null,
      ownerType: null,
      linkedDeveloperAccountId: null,
      isVisible: 1,
      sourceAttribution: 'Curated by Property Listify operations',
      isSubscriber: 0,
      name: 'Property Listify Curated',
      slug: 'property-listify-curated',
      logoUrl: '/brand.svg',
      publicContactEmail: 'operations@propertylistify.example',
    };
    const result = evaluatePublicPropertySupplyEvidence(
      evidence({
        property: {
          id: 501,
          ownerId: 1,
          agentId: null,
          developmentId: null,
          cataloguePublisherId: 91,
        },
        sourceListing: { id: 9001, ownerId: 1, agentId: null, agencyId: null },
        propertyOwner: { id: 1, role: 'super_admin', agencyId: null },
        sourceOwner: { id: 1, role: 'super_admin', agencyId: null },
        directAgent: null,
        sourceAgent: null,
        brand: platformBrand,
      }),
    );

    expect(result).toMatchObject({
      eligible: true,
      custody: { leadCustody: 'platform_managed' },
      publicIdentity: { role: 'platform', provenance: 'platform_curated' },
    });

    expect(
      evaluatePublicPropertySupplyEvidence(
        evidence({
          property: {
            id: 501,
            ownerId: 70,
            agentId: 33,
            developmentId: null,
            cataloguePublisherId: 91,
          },
          brand: platformBrand,
        }),
      ),
    ).toMatchObject({ eligible: false, reason: 'invalid_platform_provenance' });
  });

  it.each([
    ['unverified agent', { directAgent: { ...agent, isVerified: 0 }, sourceAgent: { ...agent, isVerified: 0 } }],
    ['stale owner', { property: { id: 501, ownerId: 99, agentId: 33, developmentId: null, cataloguePublisherId: null } }],
    ['stale agent', { property: { id: 501, ownerId: 70, agentId: 34, developmentId: null, cataloguePublisherId: null } }],
    ['wrong source evidence', { approvedSourceListingId: 9002 }],
    ['flattened development', { property: { id: 501, ownerId: 70, agentId: 33, developmentId: 8, cataloguePublisherId: null } }],
  ])('fails closed for %s', (_label, overrides) => {
    expect(
      evaluatePublicPropertySupplyEvidence(
        evidence(overrides as Partial<PublicPropertySupplyEvidence>),
      ),
    ).toMatchObject({ eligible: false });
  });
});
