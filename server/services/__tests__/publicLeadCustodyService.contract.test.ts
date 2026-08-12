import { describe, expect, it } from 'vitest';
import {
  resolvePublicBrandOnlyCustody,
  resolvePublicDevelopmentCustody,
  resolvePublicPropertyCustody,
} from '../publicLeadCustodyService';

const activeAgent = {
  id: 33,
  userId: 70,
  agencyId: null,
  status: 'approved',
  userRole: 'agent',
};

const verifiedAgency = { id: 44, isVerified: 1 };
const approvedDeveloper = {
  id: 7,
  userId: 70,
  status: 'approved',
  userRole: 'property_developer',
};

describe('publicLeadCustodyService contract', () => {
  it('routes an active direct agent to a verified customer recipient', () => {
    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        directAgent: activeAgent,
      }),
    ).toMatchObject({
      supplyOrigin: 'customer_managed',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      recipientId: 33,
    });
  });

  it('preserves assigned agent and verified agency attribution together', () => {
    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        directAgent: { ...activeAgent, agencyId: 44 },
        directAgentAgency: verifiedAgency,
      }),
    ).toMatchObject({
      recipientType: 'agent',
      recipientId: 33,
      agentId: 33,
      agencyId: 44,
      leadCustody: 'verified_customer_recipient',
    });
  });

  it('holds an inactive direct agent assignment for attention', () => {
    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        directAgent: { ...activeAgent, status: 'suspended' },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });
  });

  it('routes an agency-owned property when no direct agent is assigned', () => {
    expect(
      resolvePublicPropertyCustody({
        sourceListingAgencyId: 44,
        sourceAgency: verifiedAgency,
      }),
    ).toMatchObject({ recipientType: 'agency', recipientId: 44, leadCustody: 'verified_customer_recipient' });
  });

  it('holds a direct agent whose agency conflicts with listing ownership', () => {
    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        sourceListingAgencyId: 55,
        directAgent: { ...activeAgent, agencyId: 44 },
        directAgentAgency: verifiedAgency,
        sourceAgency: { id: 55, isVerified: 1 },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });
  });

  it('holds a direct agent when the listing has an agency but the agent relationship is missing', () => {
    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        ownerAgencyId: 44,
        directAgent: activeAgent,
        ownerAgency: verifiedAgency,
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });
  });

  it('routes a registered development only when developer and brand ownership agree', () => {
    expect(
      resolvePublicDevelopmentCustody({
        developerId: 7,
        developerBrandProfileId: 13,
        devOwnerType: 'developer',
        developer: approvedDeveloper,
        brand: {
          id: 13,
          ownerType: 'developer',
          linkedDeveloperAccountId: 7,
          isVisible: 1,
          isSubscriber: 1,
        },
      }),
    ).toMatchObject({ recipientType: 'developer', recipientId: 7, leadCustody: 'verified_customer_recipient' });
  });

  it('holds conflicting developer and brand ownership for attention', () => {
    expect(
      resolvePublicDevelopmentCustody({
        developerId: 7,
        developerBrandProfileId: 13,
        devOwnerType: 'developer',
        developer: approvedDeveloper,
        brand: {
          id: 13,
          ownerType: 'developer',
          linkedDeveloperAccountId: 8,
          isVisible: 1,
        },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });
  });

  it('keeps platform-curated development and property supply in platform custody', () => {
    const brand = {
      id: 13,
      ownerType: 'platform',
      linkedDeveloperAccountId: null,
      isVisible: 1,
      isSubscriber: 0,
    };

    expect(
      resolvePublicDevelopmentCustody({
        developerBrandProfileId: 13,
        devOwnerType: 'platform',
        brand,
      }),
    ).toMatchObject({ supplyOrigin: 'platform_curated', leadCustody: 'platform_managed', recipientId: null });

    expect(
      resolvePublicPropertyCustody({
        developerBrandProfileId: 13,
        brand,
      }),
    ).toMatchObject({ supplyOrigin: 'platform_curated', leadCustody: 'platform_managed', recipientId: null });
  });

  it('does not route platform-curated property attribution to an active agent', () => {
    const platformBrand = {
      id: 13,
      ownerType: 'platform',
      linkedDeveloperAccountId: null,
      isVisible: 1,
    };

    expect(
      resolvePublicPropertyCustody({
        propertyAgentId: 33,
        developerBrandProfileId: 13,
        directAgent: activeAgent,
        brand: platformBrand,
      }),
    ).toMatchObject({
      supplyOrigin: 'platform_curated',
      leadCustody: 'attention_required',
      recipientType: 'manual',
      recipientId: null,
    });
  });

  it('holds missing or inactive customer recipients instead of guessing a public contact', () => {
    expect(
      resolvePublicBrandOnlyCustody({
        developerBrandProfileId: 13,
        brand: {
          id: 13,
          ownerType: 'developer',
          linkedDeveloperAccountId: 7,
          isVisible: 1,
        },
        developer: { ...approvedDeveloper, status: 'pending' },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual', recipientId: null });

    expect(
      resolvePublicDevelopmentCustody({
        developerId: 7,
        developerBrandProfileId: 13,
        devOwnerType: 'developer',
        developer: approvedDeveloper,
        brand: {
          id: 13,
          ownerType: 'developer',
          linkedDeveloperAccountId: 7,
          isVisible: 1,
        },
        brandReferenceInvalid: true,
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });

    expect(
      resolvePublicDevelopmentCustody({
        developerBrandProfileId: 13,
        devOwnerType: 'developer',
        brand: {
          id: 13,
          ownerType: 'developer',
          linkedDeveloperAccountId: null,
          isVisible: 1,
        },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });

    expect(
      resolvePublicDevelopmentCustody({
        developerBrandProfileId: 13,
        devOwnerType: 'developer',
        brand: {
          id: 13,
          ownerType: 'platform',
          linkedDeveloperAccountId: null,
          isVisible: 1,
        },
      }),
    ).toMatchObject({ leadCustody: 'attention_required', recipientType: 'manual' });
  });
});
