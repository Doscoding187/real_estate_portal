import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { databaseAuthorityChildEnvironment } from '../context';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireAcceptedMigrationHead,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  verifyCanonicalGeographyReferenceData,
  type GeographyReferenceEvidence,
} from './canonicalGeography';

export const SEARCH_TO_LEAD_SCENARIO_VERSION = 'search-to-lead-v1' as const;
export const SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID = 'dba-search-to-lead-v1-property-enquiry';

const SCENARIO_IDS = Object.freeze({
  developerUser: 990001,
  agentUser: 990002,
  agency: 990001,
  agent: 990001,
  developer: 990001,
  development: 990001,
  property: 990001,
  unit: '00000000-0000-4000-8000-000000000001',
});

const SCENARIO_PAYLOAD = Object.freeze({
  version: SEARCH_TO_LEAD_SCENARIO_VERSION,
  ids: SCENARIO_IDS,
  location: { province: 'gauteng', city: 'johannesburg', suburb: 'sandton' },
  captureRequestId: SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID,
  contact: { email: 'dba-prospect@invalid.example', phone: '+27000000000' },
});

export const SEARCH_TO_LEAD_SCENARIO_DIGEST = stableDigest(SCENARIO_PAYLOAD);

export type SearchToLeadScenarioEvidence = AdapterEvidence & {
  expected: {
    eligibleProperties: number;
    eligibleDevelopments: number;
    canonicalLocation: string;
  };
  verified: {
    eligibleProperties: number;
    eligibleDevelopments: number;
    canonicalLocation: string;
    propertyId: number;
    developmentId: number;
    unitId: string;
  };
  migrationHead: string;
  acceptance?: {
    locationState: 'resolved';
    locationContext: { provinceId: number; cityId: number; suburbId: number };
    propertyCardHref: string;
    developmentCardHref: string;
    propertyPage: string;
    developmentPage: string;
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    leadId: number;
    replayedLeadId: number;
    duplicateReplay: true;
    leadCustody: string;
    deliveryStatus: string;
    deliveryMethod: string;
  };
};

function asId(row: Record<string, unknown>, label: string): number {
  const id = Number(rowValue(row, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error(`Search-to-Lead scenario ${label} has an invalid ID.`);
  return id;
}

function comparable(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function buildScenarioInsertStatement(
  table: string,
  columns: readonly string[],
  values: readonly unknown[],
): string {
  if (
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) ||
    columns.some(column => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column))
  ) {
    throw new Error('Search-to-Lead scenario insert contract contains an invalid identifier.');
  }
  if (columns.length !== values.length) {
    throw new Error(
      `Search-to-Lead scenario insert contract for ${table} has ${columns.length} columns but ${values.length} values.`,
    );
  }
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
}

async function ensureDeterministicRow(input: {
  connection: AuthoritySqlConnection;
  table: string;
  id: number | string;
  columns: readonly string[];
  expected: Record<string, string | number | null>;
  insertColumns: readonly string[];
  insertValues: readonly unknown[];
}): Promise<void> {
  const insertStatement = buildScenarioInsertStatement(
    input.table,
    input.insertColumns,
    input.insertValues,
  );
  const rows = await queryRows(
    input.connection,
    `SELECT ${input.columns.join(', ')} FROM ${input.table} WHERE id = ?`,
    [input.id],
  );
  if (rows.length > 1)
    throw new Error(
      `Search-to-Lead scenario has duplicate deterministic ID ${input.table}:${input.id}.`,
    );
  if (rows.length === 1) {
    for (const [column, expected] of Object.entries(input.expected)) {
      if (comparable(rowValue(rows[0], column)) !== comparable(expected)) {
        throw new Error(
          `Search-to-Lead scenario row ${input.table}:${input.id} conflicts at ${column}.`,
        );
      }
    }
    return;
  }
  await input.connection.execute(insertStatement, input.insertValues);
}

async function prepareScenarioRows(
  connection: AuthoritySqlConnection,
  geography: GeographyReferenceEvidence['verified'],
): Promise<void> {
  const locationRows = await queryRows(
    connection,
    `SELECT p.id AS province_id, c.id AS city_id, s.id AS suburb_id
       FROM provinces p
       INNER JOIN cities c ON c.provinceId = p.id
       INNER JOIN suburbs s ON s.cityId = c.id
      WHERE p.slug = ? AND c.slug = ? AND s.slug = ?`,
    ['gauteng', 'johannesburg', 'sandton'],
  );
  if (locationRows.length !== 1)
    throw new Error('Search-to-Lead scenario requires one canonical Sandton hierarchy.');
  const provinceId = asId({ id: rowValue(locationRows[0], 'province_id') }, 'province');
  const cityId = asId({ id: rowValue(locationRows[0], 'city_id') }, 'city');
  const suburbId = asId({ id: rowValue(locationRows[0], 'suburb_id') }, 'suburb');
  if (geography.provinces < 3 || geography.cities < 4 || geography.suburbs < 1) {
    throw new Error('Search-to-Lead scenario refused: canonical geography evidence is incomplete.');
  }

  await ensureDeterministicRow({
    connection,
    table: 'users',
    id: SCENARIO_IDS.developerUser,
    columns: ['id', 'email', 'role', 'emailVerified'],
    expected: {
      email: 'dba-developer@invalid.example',
      role: 'property_developer',
      emailVerified: 1,
    },
    insertColumns: ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified'],
    insertValues: [
      SCENARIO_IDS.developerUser,
      'dba-developer@invalid.example',
      'DBA Scenario Developer',
      'DBA',
      'Developer',
      'property_developer',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'users',
    id: SCENARIO_IDS.agentUser,
    columns: ['id', 'email', 'role', 'emailVerified'],
    expected: { email: 'dba-agent@invalid.example', role: 'agent', emailVerified: 1 },
    insertColumns: ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified'],
    insertValues: [
      SCENARIO_IDS.agentUser,
      'dba-agent@invalid.example',
      'DBA Scenario Agent',
      'DBA',
      'Agent',
      'agent',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'agencies',
    id: SCENARIO_IDS.agency,
    columns: ['id', 'slug', 'name', 'isVerified'],
    expected: {
      slug: 'dba-verification-agency-v1',
      name: 'DBA Verification Agency',
      isVerified: 1,
    },
    insertColumns: ['id', 'name', 'slug', 'email', 'isVerified'],
    insertValues: [
      SCENARIO_IDS.agency,
      'DBA Verification Agency',
      'dba-verification-agency-v1',
      'dba-agency@invalid.example',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'agents',
    id: SCENARIO_IDS.agent,
    columns: ['id', 'userId', 'agencyId', 'slug', 'status', 'isVerified', 'isFeatured'],
    expected: {
      userId: SCENARIO_IDS.agentUser,
      agencyId: SCENARIO_IDS.agency,
      slug: 'dba-verification-agent-v1',
      status: 'approved',
      isVerified: 1,
      isFeatured: 1,
    },
    insertColumns: [
      'id',
      'userId',
      'agencyId',
      'firstName',
      'lastName',
      'displayName',
      'slug',
      'email',
      'role',
      'isVerified',
      'isFeatured',
      'status',
    ],
    insertValues: [
      SCENARIO_IDS.agent,
      SCENARIO_IDS.agentUser,
      SCENARIO_IDS.agency,
      'DBA',
      'Agent',
      'DBA Verification Agent',
      'dba-verification-agent-v1',
      'dba-agent@invalid.example',
      'agent',
      1,
      1,
      'approved',
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developers',
    id: SCENARIO_IDS.developer,
    columns: ['id', 'userId', 'name', 'status', 'isVerified'],
    expected: {
      userId: SCENARIO_IDS.developerUser,
      name: 'DBA Verification Developer',
      status: 'approved',
      isVerified: 1,
    },
    insertColumns: ['id', 'userId', 'name', 'isVerified', 'status', 'slug'],
    insertValues: [
      SCENARIO_IDS.developer,
      SCENARIO_IDS.developerUser,
      'DBA Verification Developer',
      1,
      'approved',
      'dba-verification-developer-v1',
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'developments',
    id: SCENARIO_IDS.development,
    columns: [
      'id',
      'developer_id',
      'name',
      'slug',
      'city',
      'province',
      'suburb',
      'isPublished',
      'approval_status',
      'transaction_type',
    ],
    expected: {
      developer_id: SCENARIO_IDS.developer,
      name: 'DBA Verification Development',
      slug: 'dba-verification-development-v1',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Sandton',
      isPublished: 1,
      approval_status: 'approved',
      transaction_type: 'for_sale',
    },
    insertColumns: [
      'id',
      'developer_id',
      'name',
      'developmentType',
      'city',
      'province',
      'suburb',
      'slug',
      'isPublished',
      'approval_status',
      'dev_owner_type',
      'status',
      'transaction_type',
      'totalUnits',
      'availableUnits',
      'priceFrom',
    ],
    insertValues: [
      SCENARIO_IDS.development,
      SCENARIO_IDS.developer,
      'DBA Verification Development',
      'residential',
      'Johannesburg',
      'Gauteng',
      'Sandton',
      'dba-verification-development-v1',
      1,
      'approved',
      'developer',
      'selling',
      'for_sale',
      20,
      20,
      1800000,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'unit_types',
    id: SCENARIO_IDS.unit,
    columns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'available_units',
      'total_units',
    ],
    expected: {
      development_id: SCENARIO_IDS.development,
      name: 'DBA Verification Unit',
      bedrooms: 2,
      bathrooms: '1.0',
      base_price_from: '1800000.00',
      is_active: 1,
      available_units: 10,
      total_units: 10,
    },
    insertColumns: [
      'id',
      'development_id',
      'name',
      'bedrooms',
      'bathrooms',
      'base_price_from',
      'is_active',
      'total_units',
      'available_units',
      'structural_type',
      'display_order',
    ],
    insertValues: [
      SCENARIO_IDS.unit,
      SCENARIO_IDS.development,
      'DBA Verification Unit',
      2,
      '1.0',
      '1800000.00',
      1,
      10,
      10,
      'apartment',
      1,
    ],
  });
  await ensureDeterministicRow({
    connection,
    table: 'properties',
    id: SCENARIO_IDS.property,
    columns: [
      'id',
      'title',
      'status',
      'listingType',
      'provinceId',
      'cityId',
      'suburbId',
      'agentId',
      'ownerId',
    ],
    expected: {
      title: 'DBA Verification Property',
      status: 'available',
      listingType: 'sale',
      provinceId,
      cityId,
      suburbId,
      agentId: SCENARIO_IDS.agent,
      ownerId: SCENARIO_IDS.developerUser,
    },
    insertColumns: [
      'id',
      'title',
      'description',
      'propertyType',
      'listingType',
      'transactionType',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'address',
      'city',
      'province',
      'provinceId',
      'cityId',
      'suburbId',
      'status',
      'featured',
      'views',
      'enquiries',
      'agentId',
      'ownerId',
      'latitude',
      'longitude',
    ],
    insertValues: [
      SCENARIO_IDS.property,
      'DBA Verification Property',
      'Deterministic isolated Search-to-Lead verification property.',
      'house',
      'sale',
      'sale',
      2200000,
      3,
      2,
      150,
      '1 DBA Verification Street',
      'Johannesburg',
      'Gauteng',
      provinceId,
      cityId,
      suburbId,
      'available',
      1,
      0,
      0,
      SCENARIO_IDS.agent,
      SCENARIO_IDS.developerUser,
      '-26.1076',
      '28.0567',
    ],
  });
}

export async function verifySearchToLeadScenarioData(
  connection: AuthoritySqlConnection,
): Promise<SearchToLeadScenarioEvidence['verified']> {
  const propertyRows = await queryRows(
    connection,
    `SELECT p.id, p.provinceId AS province_id, p.cityId AS city_id, p.suburbId AS suburb_id,
            a.id AS agent_id, a.status AS agent_status, ag.id AS agency_id, ag.isVerified AS agency_verified
       FROM properties p
       INNER JOIN agents a ON a.id = p.agentId
       INNER JOIN agencies ag ON ag.id = a.agencyId
      WHERE p.id = ? AND p.status IN ('available', 'published') AND p.listingType = 'sale'
        AND a.status = 'approved' AND a.isVerified = 1 AND ag.isVerified = 1`,
    [SCENARIO_IDS.property],
  );
  const developmentRows = await queryRows(
    connection,
    `SELECT d.id AS development_id, d.slug AS development_slug, u.id AS unit_id
       FROM developments d
       INNER JOIN unit_types u ON u.development_id = d.id
      WHERE d.id = ? AND d.isPublished = 1 AND d.approval_status = 'approved'
        AND d.transaction_type = 'for_sale' AND u.is_active = 1 AND u.available_units > 0`,
    [SCENARIO_IDS.development],
  );
  if (propertyRows.length !== 1)
    throw new Error('Search-to-Lead scenario is missing one eligible public property.');
  if (developmentRows.length !== 1)
    throw new Error('Search-to-Lead scenario is missing one eligible public development unit.');
  const property = propertyRows[0];
  if (
    Number(rowValue(property, 'province_id')) <= 0 ||
    Number(rowValue(property, 'city_id')) <= 0 ||
    Number(rowValue(property, 'suburb_id')) <= 0
  ) {
    throw new Error('Search-to-Lead scenario property is not linked to canonical geography IDs.');
  }
  const locationRows = await queryRows(
    connection,
    `SELECT p.slug AS province_slug, c.slug AS city_slug, s.slug AS suburb_slug,
            p.id AS province_id, c.id AS city_id, s.id AS suburb_id
       FROM provinces p
       INNER JOIN cities c ON c.provinceId = p.id
       INNER JOIN suburbs s ON s.cityId = c.id
      WHERE p.id = ? AND c.id = ? AND s.id = ?`,
    [property.province_id, property.city_id, property.suburb_id],
  );
  if (
    locationRows.length !== 1 ||
    rowValue(locationRows[0], 'province_slug') !== 'gauteng' ||
    rowValue(locationRows[0], 'city_slug') !== 'johannesburg' ||
    rowValue(locationRows[0], 'suburb_slug') !== 'sandton'
  ) {
    throw new Error(
      'Search-to-Lead scenario property is not linked to Gauteng/Johannesburg/Sandton.',
    );
  }
  return {
    eligibleProperties: propertyRows.length,
    eligibleDevelopments: developmentRows.length,
    canonicalLocation: 'gauteng/johannesburg/sandton',
    propertyId: SCENARIO_IDS.property,
    developmentId: SCENARIO_IDS.development,
    unitId: String(rowValue(developmentRows[0], 'unit_id')),
  };
}

export async function prepareSearchToLeadScenario(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<SearchToLeadScenarioEvidence> {
  assertOperation(input.decision, ['scenario-seed']);
  const ownership = requireExactAdapterTarget(input.authority, input.profileRoot);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  const geography = await verifyCanonicalGeographyReferenceData(input.connection);
  await withTransaction(input.connection, () => prepareScenarioRows(input.connection, geography));
  const verified = await verifySearchToLeadScenarioData(input.connection);
  return {
    ...ownership,
    adapter: 'search-to-lead-scenario',
    version: SEARCH_TO_LEAD_SCENARIO_VERSION,
    digest: SEARCH_TO_LEAD_SCENARIO_DIGEST,
    expected: {
      eligibleProperties: 1,
      eligibleDevelopments: 1,
      canonicalLocation: 'gauteng/johannesburg/sandton',
    },
    verified,
    migrationHead: manifest.document.expectedHead,
  };
}

async function runContainedApplicationVerification(
  authority: ResolvedDatabaseAuthority,
  expected: SearchToLeadScenarioEvidence['verified'],
): Promise<NonNullable<SearchToLeadScenarioEvidence['acceptance']>> {
  if (
    expected.propertyId !== SCENARIO_IDS.property ||
    expected.developmentId !== SCENARIO_IDS.development
  ) {
    throw new Error('Search-to-Lead scenario has unexpected deterministic target identities.');
  }
  const previous = new Map<string, string | undefined>();
  const containedKeys = [
    'DATABASE_URL',
    'DATABASE_AUTHORITY_PARENT_FINGERPRINT',
    'DATABASE_CREDENTIAL_CLASS',
    'NODE_ENV',
    'APP_ENV',
    'REDIS_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'EMAIL_FROM',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ];
  for (const key of containedKeys) previous.set(key, process.env[key]);
  Object.assign(process.env, {
    ...databaseAuthorityChildEnvironment(authority),
    REDIS_URL: '',
    RESEND_API_KEY: '',
    RESEND_FROM_EMAIL: '',
    EMAIL_FROM: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
  });
  try {
    const { resetDb } = await import('../../../db-connection');
    resetDb();
    const { publicSearchService } = await import('../../../services/publicSearchService');
    const { capturePublicLead } = await import('../../../services/publicLeadCaptureService');
    const search = await publicSearchService.searchInventory({
      province: 'gauteng',
      city: 'johannesburg',
      suburb: ['sandton'],
      listingType: 'sale',
      page: 0,
      pageSize: 2,
    });
    if (search.locationState !== 'resolved' || !search.locationContext)
      throw new Error('Search-to-Lead scenario search did not resolve the canonical location.');
    if (
      Number(search.locationContext.ids.provinceId) <= 0 ||
      Number(search.locationContext.ids.cityId) <= 0 ||
      Number(search.locationContext.ids.suburbId) <= 0
    ) {
      throw new Error('Search-to-Lead scenario returned invalid canonical location identity.');
    }
    if (search.sourceCounts.manual < 1 || search.sourceCounts.development < 1) {
      throw new Error(
        'Search-to-Lead scenario did not prove server-owned source counts for both result types.',
      );
    }
    const propertyCard = search.cards.find(
      card => card.kind === 'property' && card.href === `/property/${SCENARIO_IDS.property}`,
    );
    const developmentCard = search.cards.find(
      card =>
        card.kind === 'development' &&
        card.href === `/development/dba-verification-development-v1/unit/${SCENARIO_IDS.unit}`,
    );
    if (!propertyCard || !developmentCard)
      throw new Error('Search-to-Lead scenario did not blend both eligible public result sources.');
    const lead = await capturePublicLead({
      propertyId: SCENARIO_IDS.property,
      name: 'Database Authority Prospect',
      email: SCENARIO_PAYLOAD.contact.email,
      phone: SCENARIO_PAYLOAD.contact.phone,
      message: 'Contained local Search-to-Lead acceptance scenario.',
      source: 'search_results',
      sourceSurface: 'search_results',
      leadSource: 'search_results',
      captureRequestId: SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID,
      consent: { accepted: true, version: 'dba-search-to-lead-v1', source: 'local-test' },
    });
    const replay = await capturePublicLead({
      propertyId: SCENARIO_IDS.property,
      name: 'Database Authority Prospect',
      email: SCENARIO_PAYLOAD.contact.email,
      phone: SCENARIO_PAYLOAD.contact.phone,
      message: 'Contained local Search-to-Lead acceptance scenario.',
      source: 'search_results',
      sourceSurface: 'search_results',
      leadSource: 'search_results',
      captureRequestId: SEARCH_TO_LEAD_SCENARIO_CAPTURE_REQUEST_ID,
      consent: { accepted: true, version: 'dba-search-to-lead-v1', source: 'local-test' },
    });
    if (!replay.duplicate || replay.leadId !== lead.leadId)
      throw new Error('Search-to-Lead scenario replay was not idempotent.');
    if (
      lead.leadCustody !== 'verified_customer_recipient' ||
      lead.deliveryStatus !== 'delivered' ||
      lead.deliveryMethod !== 'crm_export'
    )
      throw new Error(
        'Search-to-Lead scenario did not prove verified local lead custody and delivery intent.',
      );
    return {
      locationState: 'resolved',
      locationContext: {
        provinceId: Number(search.locationContext.ids.provinceId),
        cityId: Number(search.locationContext.ids.cityId),
        suburbId: Number(search.locationContext.ids.suburbId),
      },
      propertyCardHref: propertyCard.href,
      developmentCardHref: developmentCard.href,
      propertyPage: propertyCard.href,
      developmentPage: developmentCard.href,
      total: search.total,
      page: search.page,
      pageSize: search.pageSize,
      hasMore: search.hasMore,
      leadId: lead.leadId,
      replayedLeadId: replay.leadId,
      duplicateReplay: true,
      leadCustody: lead.leadCustody,
      deliveryStatus: lead.deliveryStatus,
      deliveryMethod: lead.deliveryMethod,
    };
  } finally {
    const { resetDb } = await import('../../../db-connection');
    resetDb();
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

export async function verifySearchToLeadScenario(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  profileRoot?: string;
}): Promise<SearchToLeadScenarioEvidence> {
  assertOperation(input.decision, ['verification', 'browser-verification', 'readiness']);
  const ownership = requireExactAdapterTarget(input.authority, input.profileRoot);
  const manifest = await requireAcceptedMigrationHead({
    authority: input.authority,
    connection: input.connection,
    profileRoot: input.profileRoot,
  });
  const geography = await verifyCanonicalGeographyReferenceData(input.connection);
  const verified = await verifySearchToLeadScenarioData(input.connection);
  const acceptance =
    input.decision.operation === 'readiness'
      ? undefined
      : await runContainedApplicationVerification(input.authority, verified);
  return {
    ...ownership,
    adapter: 'search-to-lead-scenario',
    version: SEARCH_TO_LEAD_SCENARIO_VERSION,
    digest: SEARCH_TO_LEAD_SCENARIO_DIGEST,
    expected: {
      eligibleProperties: 1,
      eligibleDevelopments: 1,
      canonicalLocation: 'gauteng/johannesburg/sandton',
    },
    verified,
    migrationHead: manifest.document.expectedHead,
    acceptance,
  };
}
