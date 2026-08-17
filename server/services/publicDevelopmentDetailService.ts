import { and, desc, eq, isNotNull } from 'drizzle-orm';

import {
  cataloguePublishers,
  developmentApprovalQueue,
  developments,
  unitTypes,
} from '../../drizzle/schema';
import {
  projectPublicDevelopmentFacts,
  type PublicDevelopmentDetail,
  type PublicDevelopmentDetailUnit,
  type PublicDevelopmentProjectionDevelopment,
  type PublicDevelopmentProjectionUnit,
} from '../../shared/publicDevelopmentSearch';
import { getDb } from '../db-connection';
import { buildDevelopmentRootPath } from './developmentRouteAuthority';
import { publicDevelopmentEligibilityConditions } from './publicDevelopmentEligibility';

function parseSlugOrId(input: string): { isId: boolean; value: string | number } {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (Number.isSafeInteger(value) && value > 0) return { isId: true, value };
  }
  return { isId: false, value: trimmed };
}

function parseJsonValue(value: unknown, fallback: unknown): unknown {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') return JSON.parse(parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

function parseJsonList(value: unknown): unknown[] {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeAmenities(value: unknown): string[] {
  const parsed = parseJsonValue(value, value);
  if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean);
  if (parsed && typeof parsed === 'object') {
    const candidate = parsed as { standard?: unknown; additional?: unknown };
    return [
      ...(Array.isArray(candidate.standard) ? candidate.standard : []),
      ...(Array.isArray(candidate.additional) ? candidate.additional : []),
    ]
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeCoordinate(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(value).trim() : null;
}

function normalizeMediaObject(value: unknown): unknown {
  return parseJsonValue(value, {});
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSalesMetrics(
  publicFacts: PublicDevelopmentDetail['publicFacts'],
  units: readonly Record<string, unknown>[],
) {
  if (publicFacts.totalUnits === null || publicFacts.availableUnits === null) return null;
  if (publicFacts.totalUnits <= 0) return null;

  const reservedUnits = units.reduce((sum, unit) => {
    const total = finiteNumber(unit.totalUnits);
    const reserved = finiteNumber(unit.reservedUnits);
    if (total === null || reserved === null) return sum;
    return sum + Math.min(Math.max(Math.round(reserved), 0), Math.max(Math.round(total), 0));
  }, 0);
  const soldUnits = Math.max(publicFacts.totalUnits - publicFacts.availableUnits - reservedUnits, 0);

  return {
    totalUnits: publicFacts.totalUnits,
    availableUnits: publicFacts.availableUnits,
    reservedUnits,
    soldUnits,
    soldPct: Math.round((soldUnits / publicFacts.totalUnits) * 100),
  };
}

export class PublicDevelopmentDetailService {
  async getBySlugOrId(slugOrId: string): Promise<PublicDevelopmentDetail | null> {
    const db = await getDb();
    if (!db) return null;

    const { isId, value } = parseSlugOrId(slugOrId);
    const identityCondition = isId
      ? eq(developments.id, value as number)
      : eq(developments.slug, value as string);

    const [row] = (await db
      .select({
        id: developments.id,
        name: developments.name,
        slug: developments.slug,
        description: developments.description,
        images: developments.images,
        videos: developments.videos,
        city: developments.city,
        province: developments.province,
        suburb: developments.suburb,
        address: developments.address,
        latitude: developments.latitude,
        longitude: developments.longitude,
        showHouseAddress: developments.showHouseAddress,
        gpsAccuracy: developments.gpsAccuracy,
        amenities: developments.amenities,
        estateSpecs: developments.estateSpecs,
        floorPlans: developments.floorPlans,
        brochures: developments.brochures,
        locationId: developments.locationId,
        isPublished: developments.isPublished,
        publishedAt: developments.publishedAt,
        approvalStatus: developments.approvalStatus,
        status: developments.status,
        developmentType: developments.developmentType,
        ownershipType: developments.ownershipType,
        structuralType: developments.structuralType,
        floors: developments.floors,
        transactionType: developments.transactionType,
        marketingRole: developments.marketingRole,
        completionDate: developments.completionDate,
        nature: developments.nature,
        isFeatured: developments.isFeatured,
        createdAt: developments.createdAt,
        rating: developments.rating,
        highlights: developments.highlights,
        cataloguePublisherId: developments.cataloguePublisherId,
        publisherName: cataloguePublishers.name,
        publisherLogoUrl: cataloguePublishers.logoUrl,
        publisherAuthorityKind: cataloguePublishers.authorityKind,
        publisherSlug: cataloguePublishers.slug,
        publisherWebsiteUrl: cataloguePublishers.websiteUrl,
        publisherDescription: cataloguePublishers.about,
        publisherSourceAttribution: cataloguePublishers.sourceAttribution,
        publisherFoundedYear: cataloguePublishers.foundedYear,
        publisherHeadOfficeLocation: cataloguePublishers.headOfficeLocation,
      })
      .from(developments)
      .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
      .where(and(identityCondition, publicDevelopmentEligibilityConditions()))
      .limit(1)) as Array<Record<string, unknown>>;

    if (!row) return null;

    const [latestReview] = await db
      .select({ reviewedAt: developmentApprovalQueue.reviewedAt })
      .from(developmentApprovalQueue)
      .where(
        and(
          eq(developmentApprovalQueue.developmentId, Number(row.id)),
          isNotNull(developmentApprovalQueue.reviewedAt),
        ),
      )
      .orderBy(desc(developmentApprovalQueue.reviewedAt), desc(developmentApprovalQueue.id))
      .limit(1);

    const development: PublicDevelopmentProjectionDevelopment = {
      id: Number(row.id),
      name: String(row.name || '').trim(),
      slug: (row.slug as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      images: row.images,
      city: String(row.city || ''),
      suburb: (row.suburb as string | null) ?? null,
      province: String(row.province || ''),
      developmentType: row.developmentType as PublicDevelopmentProjectionDevelopment['developmentType'],
      transactionType: row.transactionType as PublicDevelopmentProjectionDevelopment['transactionType'],
      status: row.status as PublicDevelopmentProjectionDevelopment['status'],
      nature: row.nature as PublicDevelopmentProjectionDevelopment['nature'],
      completionDate: (row.completionDate as string | null) ?? null,
      createdAt: (row.createdAt as string | null) ?? null,
      isFeatured: row.isFeatured,
      rating: row.rating,
      highlights: row.highlights,
      canonicalRoute: buildDevelopmentRootPath({ id: Number(row.id), slug: row.slug as string | null }),
      cataloguePublisherId: (row.cataloguePublisherId as number | null) ?? null,
      publisherName: (row.publisherName as string | null) ?? null,
      publisherLogoUrl: (row.publisherLogoUrl as string | null) ?? null,
      publisherAuthorityKind:
        (row.publisherAuthorityKind as PublicDevelopmentProjectionDevelopment['publisherAuthorityKind']) ??
        null,
      publisherSlug: (row.publisherSlug as string | null) ?? null,
      publisherWebsiteUrl: (row.publisherWebsiteUrl as string | null) ?? null,
      publisherDescription: (row.publisherDescription as string | null) ?? null,
      publisherSourceAttribution: (row.publisherSourceAttribution as string | null) ?? null,
      publisherLastVerifiedAt: latestReview?.reviewedAt ?? null,
      publisherFoundedYear: (row.publisherFoundedYear as number | null) ?? null,
      publisherHeadOfficeLocation: (row.publisherHeadOfficeLocation as string | null) ?? null,
    };

    const units = (await db
      .select()
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, Number(row.id)), eq(unitTypes.isActive, 1)))
      .orderBy(unitTypes.displayOrder, unitTypes.id)) as Array<Record<string, unknown>>;

    const projectionUnits: PublicDevelopmentProjectionUnit[] = units.map(unit => ({
      id: String(unit.id),
      developmentId: Number(row.id),
      name: String(unit.name || '').trim(),
      label: (unit.label as string | null) ?? null,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      basePriceFrom: unit.basePriceFrom,
      basePriceTo: unit.basePriceTo,
      monthlyRentFrom: unit.monthlyRentFrom,
      monthlyRentTo: unit.monthlyRentTo,
      totalUnits: unit.totalUnits,
      availableUnits: unit.availableUnits,
      reservedUnits: unit.reservedUnits,
    }));

    const publicFacts = projectPublicDevelopmentFacts(development, projectionUnits);
    if (!publicFacts) return null;

    const detailUnits = units.map((unit, index) => {
      const publicUnit = publicFacts.unitTypes[index];
      const baseMedia = normalizeMediaObject(unit.baseMedia);
      const gallery =
        baseMedia && typeof baseMedia === 'object' && Array.isArray((baseMedia as any).gallery)
          ? (baseMedia as any).gallery
          : [];
      const primaryImageUrl =
        gallery.find((item: any) => item && typeof item.url === 'string')?.url ?? null;

      const detailUnit: PublicDevelopmentDetailUnit = {
        ...unit,
        ...publicUnit,
        id: publicUnit.id ?? String(unit.id),
        name: String(unit.name || '').trim() || 'Unit type',
        label: publicUnit.label,
        bedrooms: publicUnit.bedrooms,
        bathrooms: publicUnit.bathrooms,
        totalUnits: publicUnit.totalUnits,
        availableUnits: publicUnit.availableUnits,
        developmentId: Number(row.id),
        basePriceFrom: (unit.basePriceFrom as number | string | null) ?? null,
        basePriceTo: (unit.basePriceTo as number | string | null) ?? null,
        monthlyRentFrom: (unit.monthlyRentFrom as number | string | null) ?? null,
        monthlyRentTo: (unit.monthlyRentTo as number | string | null) ?? null,
        reservedUnits: finiteNumber(unit.reservedUnits),
        baseMedia,
        primaryImageUrl,
        publicFacts: publicUnit,
      };

      return detailUnit;
    });

    const latitude = normalizeCoordinate(row.latitude);
    const longitude = normalizeCoordinate(row.longitude);
    const coordinatesAreZeroPair =
      latitude !== null && longitude !== null && Number(latitude) === 0 && Number(longitude) === 0;

    const detail: PublicDevelopmentDetail = {
      ...publicFacts,
      publicFacts,
      address: Number(row.showHouseAddress || 0) === 1 ? ((row.address as string | null) ?? null) : null,
      showHouseAddress: Number(row.showHouseAddress || 0) === 1,
      locationId: (row.locationId as number | null) ?? null,
      latitude: coordinatesAreZeroPair ? null : latitude,
      longitude: coordinatesAreZeroPair ? null : longitude,
      gpsAccuracy: (row.gpsAccuracy as 'accurate' | 'approximate' | null) ?? null,
      videos: parseJsonList(row.videos),
      floorPlans: parseJsonList(row.floorPlans),
      brochures: parseJsonList(row.brochures),
      amenities: normalizeAmenities(row.amenities),
      estateSpecs: parseJsonValue(row.estateSpecs, {}),
      ownershipType: (row.ownershipType as string | null) ?? null,
      structuralType: (row.structuralType as string | null) ?? null,
      floors: finiteNumber(row.floors),
      marketingRole: (row.marketingRole as 'exclusive' | 'joint' | 'open' | null) ?? null,
      isPublished: Number(row.isPublished || 0),
      approvalStatus: (row.approvalStatus as PublicDevelopmentDetail['approvalStatus']) ?? null,
      cataloguePublisherId: publicFacts.publisher.id,
      unitTypes: detailUnits,
      salesMetrics: buildSalesMetrics(publicFacts, units),
    };

    return detail;
  }
}

export const publicDevelopmentDetailService = new PublicDevelopmentDetailService();
