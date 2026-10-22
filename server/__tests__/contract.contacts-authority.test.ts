import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { describe, expect, it } from 'vitest';
import { normalizedDesiredSchema } from '../_core/databaseAuthority/schemaCongruency';
import * as canonicalSchema from '../../drizzle/schema';
import {
  CONTACT_VISIBILITY_VALUES,
  CURATED_PERSON_AUTHORITY,
  contacts,
} from '../../drizzle/schema';

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

describe('Agent Workplace Contacts authority contract', () => {
  it('registers contacts as the sole curated person authority', () => {
    const inventory = JSON.parse(read('drizzle/schema/canonical-model-inventory.json')) as {
      tables: string[];
      curatedPersonAuthority: {
        canonicalTables: string[];
        approvedDecision: string;
        sourceOrCaptureTables: string[];
        admissionRule: string;
        monitoredTableNameTerms: string[];
        reviewInvariant: string;
      };
    };

    expect(getTableName(contacts)).toBe('contacts');
    expect(CURATED_PERSON_AUTHORITY.canonicalTables).toEqual(['contacts']);
    expect(inventory.curatedPersonAuthority).toMatchObject(CURATED_PERSON_AUTHORITY);
    expect(inventory.curatedPersonAuthority.approvedDecision).toBe('AW-MVP-001');
    expect(inventory.curatedPersonAuthority.admissionRule).toContain(
      'explicit architecture decision',
    );
    expect(inventory.curatedPersonAuthority.monitoredTableNameTerms).toEqual(
      CURATED_PERSON_AUTHORITY.monitoredTableNameTerms,
    );
    expect(inventory.curatedPersonAuthority.reviewInvariant).toContain('review');
    expect(inventory.tables).toContain('contacts');
    expect(inventory.curatedPersonAuthority.sourceOrCaptureTables).toEqual([
      'leads',
      'seller_prospects',
      'listing_leads',
      'prospect_identities',
    ]);
  });

  it('fails schema admission for a new contact-like authority outside the registry', () => {
    const tableNames = normalizedDesiredSchema(canonicalSchema).tables.map(table => table.name);
    const semanticAuthorityPattern = new RegExp(
      `(?:^|_)(?:${CURATED_PERSON_AUTHORITY.monitoredTableNameTerms.join('|')})(?:s)?(?:_|$)`,
    );
    const authorityNamedTables = tableNames.filter(tableName =>
      semanticAuthorityPattern.test(tableName),
    );

    // This is deliberately a schema-entity admission guard, not a name/email/
    // phone column ban. Source snapshots remain legitimate. A new table whose
    // name claims a person/contact/CRM authority must be explicitly reviewed
    // and classified before it can be admitted to canonical schema.
    expect(authorityNamedTables).toEqual(CURATED_PERSON_AUTHORITY.canonicalTables);
  });

  it('keeps ownership and visibility in one referentially constrained physical model', () => {
    const config = getTableConfig(contacts);
    const columns = config.columns.map(column => column.name);

    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'owner_user_id',
        'agency_id',
        'visibility',
        'full_name',
        'email',
        'phone',
        'company',
        'notes',
      ]),
    );
    expect(CONTACT_VISIBILITY_VALUES).toEqual(['private', 'agency_shared']);
    expect(config.foreignKeys).toHaveLength(2);
    expect(
      config.foreignKeys.map(foreignKey => ({
        columns: foreignKey.reference().columns.map(column => column.name),
        onDelete: foreignKey.onDelete,
      })),
    ).toEqual(
      expect.arrayContaining([
        { columns: ['owner_user_id'], onDelete: 'restrict' },
        { columns: ['agency_id'], onDelete: 'restrict' },
      ]),
    );
    expect(config.checks.map(check => check.name)).toContain('chk_contacts_shared_requires_agency');
    expect(config.indexes.map(index => index.config.name)).toEqual(
      expect.arrayContaining([
        'idx_contacts_owner_updated',
        'idx_contacts_agency_visibility_updated',
      ]),
    );
  });

  it('keeps the authority boundary free of source-domain linking or migration behavior', () => {
    const router = read('server/contactsRouter.ts');
    const access = read('server/services/contactAccessService.ts');
    const schema = read('drizzle/schema/contacts.ts');

    expect(router).toContain('agentProcedure');
    expect(router).toContain('getContactActorScope');
    expect(router).toContain('requireReadableContact');
    expect(router).toContain('requireWritableContact');
    expect(access).toContain('contactReadPredicate');
    expect(access).toContain('contactWritePredicate');
    expect(router).not.toMatch(/(?:leads|sellerProspects|seller_prospects|listing_leads)/);
    expect(schema).not.toMatch(/(?:leads|sellerProspects|seller_prospects|listing_leads)/);
    const createInputSurface = router.slice(
      router.indexOf('const createContactSchema'),
      router.indexOf('const updateContactSchema'),
    );
    const updateInputSurface = router.slice(
      router.indexOf('const updateContactSchema'),
      router.indexOf('async function requireDatabase'),
    );
    expect(createInputSurface).not.toMatch(/(?:ownerUserId|agencyId)\s*:/);
    expect(updateInputSurface).not.toMatch(/(?:ownerUserId|agencyId)\s*:/);
  });
});
