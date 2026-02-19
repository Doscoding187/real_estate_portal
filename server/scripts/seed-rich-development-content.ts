import { config } from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db-connection';
import { developments, unitTypes } from '../../drizzle/schema';

config({ path: path.resolve(process.cwd(), '.env.local') });

type DevelopmentRow = {
  id: number;
  name: string;
  suburb: string | null;
  city: string;
  province: string;
  developmentType: string;
  priceFrom: number | null;
  description: string | null;
  highlights: unknown;
  rating: number | string | null;
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(v => String(v)).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function unitKindForDevType(devType: string): 'Apartment' | 'House' | 'Office' | 'Plot' {
  const normalized = String(devType || '').toLowerCase();
  if (normalized === 'land') return 'Plot';
  if (normalized === 'commercial') return 'Office';
  return 'Apartment';
}

function structuralTypeForKind(kind: 'Apartment' | 'House' | 'Office' | 'Plot') {
  if (kind === 'House') return 'freestanding-house' as const;
  if (kind === 'Plot') return 'plot-and-plan' as const;
  return 'apartment' as const;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.log('[seed-rich-development-content] Database unavailable.');
    return;
  }

  const candidates = (await db
    .select({
      id: developments.id,
      name: developments.name,
      suburb: developments.suburb,
      city: developments.city,
      province: developments.province,
      developmentType: developments.developmentType,
      priceFrom: developments.priceFrom,
      description: developments.description,
      highlights: developments.highlights,
      rating: developments.rating,
    })
    .from(developments)
    .where(and(eq(developments.isPublished, 1), eq(developments.approvalStatus, 'approved')))
    .limit(20)) as DevelopmentRow[];

  if (candidates.length === 0) {
    console.log('[seed-rich-development-content] No approved published developments found.');
    return;
  }

  let updatedDevelopments = 0;
  let insertedUnitTypes = 0;

  for (const dev of candidates) {
    const nextDescription =
      dev.description && dev.description.trim().length > 0
        ? dev.description
        : `${dev.name} is a premium ${dev.developmentType.replace('_', ' ')} project in ${dev.suburb || dev.city}, ${dev.province}, offering secure modern living and strong long-term value.`;

    const existingHighlights = toArray(dev.highlights);
    const nextHighlights =
      existingHighlights.length > 0
        ? existingHighlights
        : ['24-Hour Security', 'Prime Location', 'Lifestyle Amenities', 'Investment Ready'];

    const hasRating = Number(dev.rating || 0) > 0;
    const nextRating = hasRating ? Number(dev.rating) : Number((4.1 + Math.random() * 0.8).toFixed(1));

    await db
      .update(developments)
      .set({
        description: nextDescription,
        highlights: nextHighlights as any,
        rating: nextRating.toString() as any,
      })
      .where(eq(developments.id, dev.id));
    updatedDevelopments += 1;

    const existingUnits = await db
      .select({
        id: unitTypes.id,
      })
      .from(unitTypes)
      .where(and(eq(unitTypes.developmentId, dev.id), eq(unitTypes.isActive, 1)));

    const targetCount = 4;
    const missing = Math.max(0, targetCount - existingUnits.length);
    if (missing === 0) continue;

    const basePrice = Number(dev.priceFrom || 750000);
    const kind = unitKindForDevType(dev.developmentType);
    const structuralType = structuralTypeForKind(kind);

    for (let i = 0; i < missing; i++) {
      const position = existingUnits.length + i + 1;
      const bedrooms = kind === 'Plot' || kind === 'Office' ? 0 : Math.min(position, 4);
      const price = basePrice + i * 350000;
      const label = bedrooms > 0 ? `${bedrooms} Bed ${kind}` : kind;

      await db.insert(unitTypes).values({
        id: randomUUID(),
        developmentId: dev.id,
        name: label,
        bedrooms,
        bathrooms: bedrooms > 0 ? 1.0 : 0.0,
        basePriceFrom: price,
        basePriceTo: price + 250000,
        priceFrom: price,
        priceTo: price + 250000,
        structuralType,
        displayOrder: position,
        isActive: 1,
        totalUnits: 25,
        availableUnits: 20,
      } as any);

      insertedUnitTypes += 1;
    }
  }

  console.log(`[seed-rich-development-content] Updated developments: ${updatedDevelopments}`);
  console.log(`[seed-rich-development-content] Inserted unit types: ${insertedUnitTypes}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[seed-rich-development-content] Failed:', error);
    process.exit(1);
  });

