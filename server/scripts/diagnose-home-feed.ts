/**
 * Diagnose why development units may or may not appear in the homepage buy/rent rail.
 *
 * This script intentionally avoids the normal service stack so it can fail fast:
 * - loads env from both worktree and repo root
 * - connects to MySQL directly with a short timeout
 * - reconstructs the homepage unit/listing composition rules in-process
 *
 * Examples:
 *   C:\dev\real_estate_portal\node_modules\.bin\tsx.CMD server/scripts/diagnose-home-feed.ts
 *   C:\dev\real_estate_portal\node_modules\.bin\tsx.CMD server/scripts/diagnose-home-feed.ts --province "Western Cape" --tab rent --limit 10
 */
import * as dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

type Tab = 'buy' | 'rent';

type DevelopmentRow = {
  developmentId: number;
  developmentName: string;
  province: string | null;
  city: string | null;
  suburb: string | null;
  transactionType: string | null;
  isPublished: number | null;
  approvalStatus: string | null;
  createdAt: string | null;
  unitTypeId: string | null;
  unitTypeName: string | null;
  isActive: number | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  basePriceFrom: number | string | null;
  monthlyRentFrom: number | string | null;
  displayOrder: number | null;
};

type PropertyRow = {
  id: number;
  title: string;
  price: number | null;
  address: string | null;
  city: string | null;
  province: string | null;
  listingType: string | null;
  status: string | null;
  createdAt: string | null;
};

type UnitCandidate = {
  id: string;
  title: string;
  developmentId: number;
  developmentName: string;
  city: string;
  province: string;
  suburb: string;
  priceFrom: number | null;
};

type ListingCandidate = {
  id: number;
  title: string;
  city: string;
  province: string;
  price: number | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const worktreeRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(worktreeRoot, '../..');

for (const candidate of [
  path.resolve(worktreeRoot, '.env.local'),
  path.resolve(worktreeRoot, '.env'),
  path.resolve(repoRoot, '.env.local'),
  path.resolve(repoRoot, '.env'),
]) {
  dotenv.config({ path: candidate, override: false });
}

function parseArg(flag: string, fallback?: string) {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function normalizeLocation(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesLocation(candidate: unknown, filter?: string) {
  if (!filter) return true;
  return normalizeLocation(candidate) === normalizeLocation(filter);
}

function matchesAddress(candidate: unknown, filter?: string) {
  if (!filter) return true;
  const normalizedCandidate = normalizeLocation(candidate);
  const normalizedFilter = normalizeLocation(filter);
  return normalizedCandidate.includes(normalizedFilter);
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolFlag(value: unknown) {
  return Number(value || 0) === 1;
}

async function createConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Checked worktree and repo-root env files.');
  }

  return mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 8000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

function summarizeReasons(rows: Array<{ reasons: string[] }>) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const reason of row.reasons) {
      counts.set(reason, (counts.get(reason) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} (${count})`);
}

async function diagnoseHomeFeed() {
  const province = parseArg('--province', 'Gauteng')!;
  const city = parseArg('--city');
  const suburb = parseArg('--suburb');
  const tab = (parseArg('--tab', 'buy') as Tab) || 'buy';
  const limit = Number(parseArg('--limit', '10') || 10);
  const listingType = tab === 'rent' ? 'rent' : 'sale';
  const transactionType = tab === 'rent' ? 'for_rent' : 'for_sale';
  const poolLimit = Math.max(limit * 2, 12);
  const maxUnitItems = limit >= 10 ? 3 : Math.min(2, Math.max(1, Math.floor(limit / 2)));

  console.log('--- HOMEPAGE FEED DIAGNOSTIC ---');
  console.log({
    province,
    city: city || null,
    suburb: suburb || null,
    tab,
    limit,
    poolLimit,
    listingType,
    transactionType,
    maxUnitItems,
  });

  const connection = await createConnection();

  try {
    const [dbRows] = await connection.query('SELECT DATABASE() AS db');
    const dbName = Array.isArray(dbRows) ? (dbRows[0] as { db?: string })?.db : undefined;
    console.log(`Database: ${dbName || '(unknown)'}`);

    const developmentWhere: string[] = [];
    const developmentParams: Array<string | number> = [];

    if (province) {
      developmentWhere.push('d.province = ?');
      developmentParams.push(province);
    }
    if (city) {
      developmentWhere.push('d.city = ?');
      developmentParams.push(city);
    }
    if (suburb) {
      developmentWhere.push('d.suburb = ?');
      developmentParams.push(suburb);
    }

    const developmentWhereClause =
      developmentWhere.length > 0 ? `WHERE ${developmentWhere.join(' AND ')}` : '';

    const [developmentRowsRaw] = await connection.query(
      `
        SELECT
          d.id AS developmentId,
          d.name AS developmentName,
          d.province,
          d.city,
          d.suburb,
          d.transaction_type AS transactionType,
          d.isPublished,
          d.approval_status AS approvalStatus,
          d.createdAt,
          u.id AS unitTypeId,
          u.name AS unitTypeName,
          u.is_active AS isActive,
          u.bedrooms,
          u.bathrooms,
          u.base_price_from AS basePriceFrom,
          u.monthly_rent_from AS monthlyRentFrom,
          u.display_order AS displayOrder
        FROM developments d
        LEFT JOIN unit_types u ON u.development_id = d.id
        ${developmentWhereClause}
        ORDER BY d.createdAt DESC, u.display_order ASC, u.base_price_from ASC
        LIMIT 1200
      `,
      developmentParams,
    );

    const propertyWhere: string[] = [
      'p.listingType = ?',
      `p.status IN ('available', 'published')`,
    ];
    const propertyParams: Array<string | number> = [listingType];

    if (province) {
      propertyWhere.push('p.province = ?');
      propertyParams.push(province);
    }
    if (city) {
      propertyWhere.push('p.city = ?');
      propertyParams.push(city);
    }
    if (suburb) {
      propertyWhere.push('p.address LIKE ?');
      propertyParams.push(`%${suburb}%`);
    }

    const [propertyRowsRaw] = await connection.query(
      `
        SELECT
          p.id,
          p.title,
          p.price,
          p.address,
          p.city,
          p.province,
          p.listingType,
          p.status,
          p.createdAt
        FROM properties p
        WHERE ${propertyWhere.join(' AND ')}
        ORDER BY p.createdAt DESC
        LIMIT ?
      `,
      [...propertyParams, Math.max(poolLimit * 2, 40)],
    );

    const developmentRows = developmentRowsRaw as DevelopmentRow[];
    const propertyRows = propertyRowsRaw as PropertyRow[];

    const groupedDevelopments = new Map<
      number,
      {
        id: number;
        name: string;
        province: string | null;
        city: string | null;
        suburb: string | null;
        transactionType: string | null;
        isPublished: boolean;
        approvalStatus: string | null;
        units: DevelopmentRow[];
      }
    >();

    for (const row of developmentRows) {
      if (!groupedDevelopments.has(row.developmentId)) {
        groupedDevelopments.set(row.developmentId, {
          id: row.developmentId,
          name: row.developmentName,
          province: row.province,
          city: row.city,
          suburb: row.suburb,
          transactionType: row.transactionType,
          isPublished: toBoolFlag(row.isPublished),
          approvalStatus: row.approvalStatus,
          units: [],
        });
      }

      if (row.unitTypeId) {
        groupedDevelopments.get(row.developmentId)!.units.push(row);
      }
    }

    const developmentDiagnostics = Array.from(groupedDevelopments.values()).map(development => {
      const reasons: string[] = [];

      if (!development.isPublished) reasons.push('not_published');
      if (String(development.approvalStatus || '') !== 'approved') reasons.push('not_approved');
      if (String(development.transactionType || '') !== transactionType) {
        reasons.push(`transaction:${development.transactionType || 'missing'}`);
      }
      if (!matchesLocation(development.province, province)) {
        reasons.push(`province:${development.province || 'missing'}`);
      }
      if (!matchesLocation(development.city, city)) {
        reasons.push(`city:${development.city || 'missing'}`);
      }
      if (!matchesLocation(development.suburb, suburb)) {
        reasons.push(`suburb:${development.suburb || 'missing'}`);
      }

      const activeUnits = development.units.filter(unit => toBoolFlag(unit.isActive));
      if (activeUnits.length === 0) {
        reasons.push('no_active_units');
      }

      return {
        ...development,
        activeUnits,
        reasons,
      };
    });

    const excludedDevelopments = developmentDiagnostics.filter(item => item.reasons.length > 0);
    const eligibleDevelopments = developmentDiagnostics.filter(item => item.reasons.length === 0);

    console.log(`\nEligible developments: ${eligibleDevelopments.length}`);
    eligibleDevelopments.slice(0, 20).forEach((development, index) => {
      console.log(
        `${index + 1}. ${development.name} | ${development.province || '-'} | ${development.city || '-'} | active units: ${development.activeUnits.length}`,
      );
    });

    console.log('\nExcluded development reasons:');
    for (const summary of summarizeReasons(excludedDevelopments).slice(0, 10)) {
      console.log(`- ${summary}`);
    }

    console.log('\nExcluded development examples:');
    excludedDevelopments.slice(0, 10).forEach((development, index) => {
      console.log(`${index + 1}. ${development.name} -> ${development.reasons.join(', ')}`);
    });

    const unitCandidates: UnitCandidate[] = [];
    for (const development of eligibleDevelopments) {
      const sortedUnits = [...development.activeUnits].sort((a, b) => {
        const displayDiff = Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
        if (displayDiff !== 0) return displayDiff;
        return Number(asNumber(a.basePriceFrom) || 0) - Number(asNumber(b.basePriceFrom) || 0);
      });

      const selected = sortedUnits.slice(0, 1);
      for (const unit of selected) {
        unitCandidates.push({
          id: String(unit.unitTypeId),
          title: `${unit.unitTypeName || 'Untitled Unit'} @ ${development.name}`,
          developmentId: development.id,
          developmentName: development.name,
          city: String(development.city || ''),
          province: String(development.province || ''),
          suburb: String(development.suburb || ''),
          priceFrom:
            transactionType === 'for_rent'
              ? asNumber(unit.monthlyRentFrom)
              : asNumber(unit.basePriceFrom),
        });
      }
    }

    const listingCandidates: ListingCandidate[] = propertyRows
      .filter(row => matchesLocation(row.province, province))
      .filter(row => matchesLocation(row.city, city))
      .filter(row => matchesAddress(row.address, suburb))
      .slice(0, poolLimit)
      .map(row => ({
        id: Number(row.id),
        title: row.title || 'Untitled Listing',
        city: String(row.city || ''),
        province: String(row.province || ''),
        price: asNumber(row.price),
      }));

    console.log(`\nProperty listing candidates: ${listingCandidates.length}`);
    listingCandidates.slice(0, 10).forEach((listing, index) => {
      console.log(
        `L${index + 1}. ${listing.title} | ${listing.city || '-'} | ${listing.province || '-'} | ${listing.price || '-'}`,
      );
    });

    console.log(`\nDevelopment unit candidates: ${unitCandidates.length}`);
    unitCandidates.slice(0, 10).forEach((unit, index) => {
      console.log(
        `U${index + 1}. ${unit.title} | ${unit.city || '-'} | ${unit.province || '-'} | ${unit.priceFrom || '-'}`,
      );
    });

    const targetListingCount = Math.max(limit - maxUnitItems, 1);
    const selectedListings = listingCandidates.slice(0, targetListingCount);
    const selectedUnits = unitCandidates.slice(0, Math.max(0, limit - selectedListings.length));
    const finalFeed: Array<{ kind: 'listing' | 'unit'; title: string }> = [];
    let listingIndex = 0;
    let unitIndex = 0;

    while (
      finalFeed.length < limit &&
      (listingIndex < selectedListings.length || unitIndex < selectedUnits.length)
    ) {
      if (listingIndex < selectedListings.length) {
        finalFeed.push({
          kind: 'listing',
          title: selectedListings[listingIndex].title,
        });
        listingIndex += 1;
      }

      const canInsertUnit =
        unitIndex < selectedUnits.length &&
        finalFeed.length < limit &&
        unitIndex < maxUnitItems &&
        (listingIndex >= 2 || selectedListings.length < 2 || finalFeed.length >= 2);

      if (canInsertUnit) {
        finalFeed.push({
          kind: 'unit',
          title: selectedUnits[unitIndex].title,
        });
        unitIndex += 1;
      }
    }

    while (finalFeed.length < limit && listingIndex < listingCandidates.length) {
      finalFeed.push({
        kind: 'listing',
        title: listingCandidates[listingIndex].title,
      });
      listingIndex += 1;
    }

    while (finalFeed.length < limit && unitIndex < unitCandidates.length && unitIndex < maxUnitItems) {
      finalFeed.push({
        kind: 'unit',
        title: unitCandidates[unitIndex].title,
      });
      unitIndex += 1;
    }

    console.log('\nFinal homepage rail composition:');
    finalFeed.forEach((item, index) => {
      console.log(`${index + 1}. [${item.kind}] ${item.title}`);
    });
  } finally {
    await connection.end();
  }
}

diagnoseHomeFeed().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Diagnostic failed: ${message}`);
  process.exit(1);
});
