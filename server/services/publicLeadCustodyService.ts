export type PublicSupplyOrigin = 'customer_managed' | 'platform_curated';

export type PublicLeadCustody =
  | 'verified_customer_recipient'
  | 'platform_managed'
  | 'attention_required';

export type PublicLeadRecipientType = 'agent' | 'agency' | 'developer' | 'manual';

export type PublicLeadDeliveryMethod = 'crm_export' | 'manual';

export type PublicBrandLeadStatus =
  | 'captured'
  | 'delivered_unsubscribed'
  | 'delivered_subscriber';

export interface PublicAgentOwnershipCandidate {
  id: number;
  userId: number | null;
  agencyId: number | null;
  status: string | null;
  userRole?: string | null;
}

export interface PublicAgencyOwnershipCandidate {
  id: number;
  isVerified: number | null;
}

export interface PublicDeveloperOwnershipCandidate {
  id: number;
  userId?: number | null;
  status: string | null;
  userRole?: string | null;
  organisationId?: number | null;
}

export interface PublicBrandOwnershipCandidate {
  id: number;
  authorityKind?: 'platform_reference' | 'developer_first_party' | string | null;
  developerOrganisationId?: number | null;
  ownerType?: string | null;
  linkedDeveloperAccountId?: number | null;
  isVisible: number | null;
  isSubscriber?: number | null;
}

export interface PublicPropertyOwnershipCandidates {
  propertyAgentId?: number | null;
  sourceListingAgentId?: number | null;
  sourceListingAgencyId?: number | null;
  ownerAgencyId?: number | null;
  cataloguePublisherId?: number | null;
  directAgent?: PublicAgentOwnershipCandidate | null;
  sourceAgent?: PublicAgentOwnershipCandidate | null;
  directAgentAgency?: PublicAgencyOwnershipCandidate | null;
  sourceAgentAgency?: PublicAgencyOwnershipCandidate | null;
  sourceAgency?: PublicAgencyOwnershipCandidate | null;
  ownerAgency?: PublicAgencyOwnershipCandidate | null;
  brand?: PublicBrandOwnershipCandidate | null;
  brandReferenceInvalid?: boolean;
}

export interface PublicDevelopmentOwnershipCandidates {
  cataloguePublisherId?: number | null;
  developerOrganisationId?: number | null;
  developerId?: number | null;
  devOwnerType?: string | null;
  developer?: PublicDeveloperOwnershipCandidate | null;
  brand?: PublicBrandOwnershipCandidate | null;
  brandReferenceInvalid?: boolean;
}

export interface PublicBrandOnlyOwnershipCandidates {
  cataloguePublisherId?: number;
  developer?: PublicDeveloperOwnershipCandidate | null;
  brand?: PublicBrandOwnershipCandidate | null;
}

export interface PublicLeadCustodyResolution {
  supplyOrigin: PublicSupplyOrigin;
  leadCustody: PublicLeadCustody;
  recipientType: PublicLeadRecipientType;
  recipientId: number | null;
  agentId: number | null;
  agencyId: number | null;
  developerId: number | null;
  leadDeliveryMethod: PublicLeadDeliveryMethod;
  brandLeadStatus: PublicBrandLeadStatus | null;
  reason: string | null;
}

function positiveId(value: number | null | undefined): number | null {
  const normalized = Number(value || 0);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : null;
}

function isOperationalUserRole(role: string | null | undefined): boolean {
  return Boolean(role && role !== 'visitor');
}

function isVerifiedAgent(agent: PublicAgentOwnershipCandidate | null | undefined): boolean {
  return Boolean(
    agent &&
      agent.status === 'approved' &&
      positiveId(agent.userId) &&
      isOperationalUserRole(agent.userRole),
  );
}

function isVerifiedAgency(agency: PublicAgencyOwnershipCandidate | null | undefined): boolean {
  return Boolean(agency && Number(agency.isVerified) === 1);
}

function isVerifiedDeveloper(
  developer: PublicDeveloperOwnershipCandidate | null | undefined,
): boolean {
  return Boolean(
    developer &&
      developer.status === 'approved' &&
      (positiveId(developer.organisationId) || positiveId(developer.id)) &&
      (developer.userRole === undefined || developer.userRole === 'property_developer'),
  );
}

function isPlatformBrand(brand: PublicBrandOwnershipCandidate | null | undefined): boolean {
  return Boolean(
    brand &&
      Number(brand.isVisible) === 1 &&
      (brand.authorityKind === 'platform_reference' || brand.ownerType === 'platform') &&
      !positiveId(brand.developerOrganisationId) &&
      !positiveId(brand.linkedDeveloperAccountId),
  );
}

function customerBrandStatus(
  brand: PublicBrandOwnershipCandidate | null | undefined,
): PublicBrandLeadStatus {
  return Number(brand?.isSubscriber || 0) === 1
    ? 'delivered_subscriber'
    : 'delivered_unsubscribed';
}

function customerResolution(input: {
  recipientType: Exclude<PublicLeadRecipientType, 'manual'>;
  recipientId: number;
  agentId?: number | null;
  agencyId?: number | null;
  developerId?: number | null;
  brand?: PublicBrandOwnershipCandidate | null;
}): PublicLeadCustodyResolution {
  return {
    supplyOrigin: 'customer_managed',
    leadCustody: 'verified_customer_recipient',
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    agentId: input.agentId ?? null,
    agencyId: input.agencyId ?? null,
    developerId: input.developerId ?? null,
    leadDeliveryMethod: 'crm_export',
    brandLeadStatus:
      input.brand && !isPlatformBrand(input.brand) ? customerBrandStatus(input.brand) : null,
    reason: null,
  };
}

function attentionResolution(
  supplyOrigin: PublicSupplyOrigin,
  reason: string,
  brand?: PublicBrandOwnershipCandidate | null,
): PublicLeadCustodyResolution {
  return {
    supplyOrigin,
    leadCustody: 'attention_required',
    recipientType: 'manual',
    recipientId: null,
    agentId: null,
    agencyId: null,
    developerId: null,
    leadDeliveryMethod: 'manual',
    brandLeadStatus: isPlatformBrand(brand) ? 'captured' : null,
    reason,
  };
}

function platformResolution(
  brand?: PublicBrandOwnershipCandidate | null,
): PublicLeadCustodyResolution {
  return {
    supplyOrigin: 'platform_curated',
    leadCustody: 'platform_managed',
    recipientType: 'manual',
    recipientId: null,
    agentId: null,
    agencyId: null,
    developerId: null,
    leadDeliveryMethod: 'manual',
    brandLeadStatus: 'captured',
    reason:
      'No verified customer recipient is attached; the lead is queued for Property Listify operations review.',
  };
}

function distinctPositiveIds(values: Array<number | null | undefined>): number[] {
  return Array.from(new Set(values.map(positiveId).filter((id): id is number => id !== null)));
}

export function resolvePublicPropertyCustody(
  input: PublicPropertyOwnershipCandidates,
): PublicLeadCustodyResolution {
  const propertyAgentId = positiveId(input.propertyAgentId);
  const sourceListingAgentId = positiveId(input.sourceListingAgentId);
  const agentIds = distinctPositiveIds([propertyAgentId, sourceListingAgentId]);
  const agencyIds = distinctPositiveIds([
    input.sourceListingAgencyId,
    input.ownerAgencyId,
    input.directAgent?.agencyId,
    input.sourceAgent?.agencyId,
  ]);

  if (input.brand && isPlatformBrand(input.brand)) {
    if (agentIds.length > 0 || agencyIds.length > 0) {
      return attentionResolution(
        'platform_curated',
        'Platform-curated property has conflicting customer recipient references.',
        input.brand,
      );
    }
    return platformResolution(input.brand);
  }

  if (agentIds.length > 1) {
    return attentionResolution(
      'customer_managed',
      'Property and source listing have conflicting agent ownership.',
      input.brand,
    );
  }

  if (agencyIds.length > 1) {
    return attentionResolution(
      'customer_managed',
      'Property ownership contains conflicting agency relationships.',
      input.brand,
    );
  }

  const effectiveAgentId = agentIds[0] || null;
  const effectiveAgent =
    effectiveAgentId && input.directAgent?.id === effectiveAgentId
      ? input.directAgent
      : effectiveAgentId && input.sourceAgent?.id === effectiveAgentId
        ? input.sourceAgent
        : null;

  if (effectiveAgentId) {
    if (!isVerifiedAgent(effectiveAgent)) {
      return attentionResolution(
        'customer_managed',
        'The assigned property agent is not an active verified recipient.',
        input.brand,
      );
    }

    const agentAgencyId = positiveId(effectiveAgent?.agencyId);
    const agentAgency =
      effectiveAgentId === propertyAgentId ? input.directAgentAgency : input.sourceAgentAgency;
    const expectedAgencyIds = distinctPositiveIds([input.sourceListingAgencyId, input.ownerAgencyId]);
    const expectedAgency =
      input.sourceListingAgencyId && input.sourceListingAgencyId === agentAgencyId
        ? input.sourceAgency
        : input.ownerAgencyId && input.ownerAgencyId === agentAgencyId
          ? input.ownerAgency
          : input.sourceAgency || input.ownerAgency;
    if (
      (expectedAgencyIds.length > 0 && expectedAgencyIds[0] !== agentAgencyId) ||
      (agentAgencyId && !isVerifiedAgency(agentAgency))
    ) {
      return attentionResolution(
        'customer_managed',
        'The assigned agent agency is not an active verified organization.',
        input.brand,
      );
    }

    return customerResolution({
      recipientType: 'agent',
      recipientId: effectiveAgentId,
      agentId: effectiveAgentId,
      agencyId: agentAgencyId,
      brand: input.brand,
    });
  }

  const effectiveAgencyId = agencyIds[0] || null;
  if (effectiveAgencyId) {
    const agency =
      input.sourceListingAgencyId === effectiveAgencyId
        ? input.sourceAgency
        : input.ownerAgencyId === effectiveAgencyId
          ? input.ownerAgency
          : input.sourceAgency || input.ownerAgency;

    if (!isVerifiedAgency(agency)) {
      return attentionResolution(
        'customer_managed',
        'The owning agency is not an active verified organization.',
        input.brand,
      );
    }

    return customerResolution({
      recipientType: 'agency',
      recipientId: effectiveAgencyId,
      agencyId: effectiveAgencyId,
      brand: input.brand,
    });
  }

  if (input.brandReferenceInvalid) {
    return attentionResolution(
      'customer_managed',
      'The public property has an invalid brand ownership reference.',
    );
  }

  if (input.brand && !isPlatformBrand(input.brand)) {
    return attentionResolution(
      'customer_managed',
      'The property has a customer brand attribution but no verified property recipient.',
      input.brand,
    );
  }

  return platformResolution(input.brand);
}

export function resolvePublicDevelopmentCustody(
  input: PublicDevelopmentOwnershipCandidates,
): PublicLeadCustodyResolution {
  const publisher = input.brand;
  const publisherId = positiveId(input.cataloguePublisherId);
  const organisationId =
    positiveId(input.developerOrganisationId) ||
    positiveId(publisher?.developerOrganisationId) ||
    positiveId(input.developerId);
  if (publisher?.authorityKind === 'platform_reference') {
    if (organisationId || input.devOwnerType === 'developer') {
      return attentionResolution(
        'platform_curated',
        'The development mixes platform publisher and first-party organisation ownership.',
        publisher,
      );
    }
    return platformResolution(publisher);
  }
  if (publisher?.authorityKind === 'developer_first_party') {
    if (
      !publisherId ||
      !organisationId ||
      !input.developer ||
      !isVerifiedDeveloper(input.developer) ||
      Number(publisher.developerOrganisationId) !== Number(organisationId)
    ) {
      return attentionResolution(
        'customer_managed',
        'The first-party publisher and developer organisation could not be verified.',
        publisher,
      );
    }
    return customerResolution({
      recipientType: 'developer',
      recipientId: organisationId,
      developerId: organisationId,
      brand: publisher,
    });
  }

  // Compatibility input for pure policy callers. Production persistence now
  // supplies authorityKind/developerOrganisationId from catalogue_publishers.
  const developerId = positiveId(input.developerId);
  const developerIsValid = isVerifiedDeveloper(input.developer);
  const brand = input.brand;
  const brandDeveloperId = positiveId(brand?.linkedDeveloperAccountId);

  if (input.brandReferenceInvalid) {
    return attentionResolution(
      'customer_managed',
      'The public development has an invalid brand ownership reference.',
    );
  }

  if (input.devOwnerType === 'platform') {
    if (developerId || brand?.ownerType === 'developer') {
      return attentionResolution(
        'platform_curated',
        'The development mixes platform and customer ownership references.',
        brand,
      );
    }
    return platformResolution(brand);
  }

  if (brand && isPlatformBrand(brand)) {
    if (input.devOwnerType === 'developer' || developerId || developerIsValid) {
      return attentionResolution(
        'platform_curated',
        'The development mixes a platform-curated brand with developer ownership.',
        brand,
      );
    }
    return platformResolution(brand);
  }

  if (developerId || brandDeveloperId) {
    if (
      !developerIsValid ||
      !developerId ||
      (brandDeveloperId && brandDeveloperId !== developerId)
    ) {
      return attentionResolution(
        'customer_managed',
        'The development developer and customer brand relationship is incomplete or conflicting.',
        brand,
      );
    }

    return customerResolution({
      recipientType: 'developer',
      recipientId: developerId || brandDeveloperId!,
      developerId: developerId || brandDeveloperId,
      brand,
    });
  }

  if (input.devOwnerType === 'developer' || (brand && !isPlatformBrand(brand))) {
    return attentionResolution(
      'customer_managed',
      'The development is customer-attributed but has no verified developer recipient.',
      brand,
    );
  }

  return platformResolution(brand);
}

export function resolvePublicBrandOnlyCustody(
  input: PublicBrandOnlyOwnershipCandidates,
): PublicLeadCustodyResolution {
  const publisherId = input.cataloguePublisherId;
  if (!input.brand || !publisherId || Number(input.brand.id) !== Number(publisherId)) {
    return attentionResolution('customer_managed', 'The public Catalogue Publisher could not be verified.');
  }

  if (isPlatformBrand(input.brand)) return platformResolution(input.brand);

  const developerId = positiveId(input.brand.developerOrganisationId) || positiveId(input.brand.linkedDeveloperAccountId);
  if (
    input.brand.authorityKind === 'developer_first_party' &&
    developerId &&
    input.developer &&
    isVerifiedDeveloper(input.developer)
  ) {
    return customerResolution({
      recipientType: 'developer',
      recipientId: developerId,
      developerId,
      brand: input.brand,
    });
  }

  return attentionResolution(
    'customer_managed',
    'The Catalogue Publisher is marked customer-managed but has no verified developer recipient.',
    input.brand,
  );
}
