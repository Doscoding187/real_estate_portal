import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cataloguePublisherRouter } from '../../cataloguePublisherRouter';
import { superAdminPublisherRouter } from '../../superAdminPublisherRouter';
import { cataloguePublisherService } from '../cataloguePublisherService';
import {
  assertCataloguePublisherContentMutation,
  IMMUTABLE_CATALOGUE_PUBLISHER_AUTHORITY_FIELDS,
} from '../cataloguePublisherMutationPolicy';
import type { UpdateCataloguePublisherInput } from '../developerIdentityService';
import type { UpdateCataloguePublisherCommand } from '../cataloguePublisherService';

type ForbiddenAuthorityKey =
  | 'authorityKind'
  | 'developerOrganisationId'
  | 'authority_kind'
  | 'developer_organisation_id';
type IdentityServiceAuthorityLeak = Extract<
  keyof UpdateCataloguePublisherInput,
  ForbiddenAuthorityKey
>;
type CatalogueServiceAuthorityLeak = Extract<
  keyof UpdateCataloguePublisherCommand,
  ForbiddenAuthorityKey
>;
const identityServiceUpdateIsContentOnly: IdentityServiceAuthorityLeak extends never
  ? true
  : never = true;
const catalogueServiceUpdateIsContentOnly: CatalogueServiceAuthorityLeak extends never
  ? true
  : never = true;

const superAdminContext = {
  req: { headers: {} },
  res: {},
  requestId: 'publisher-authority-contract',
  user: { id: 1, role: 'super_admin' },
} as any;

describe('Catalogue Publisher mutation authority', () => {
  it('keeps authority fields out of both supported update command types', () => {
    expect(identityServiceUpdateIsContentOnly).toBe(true);
    expect(catalogueServiceUpdateIsContentOnly).toBe(true);
    expect(IMMUTABLE_CATALOGUE_PUBLISHER_AUTHORITY_FIELDS).toEqual([
      'authorityKind',
      'developerOrganisationId',
      'authority_kind',
      'developer_organisation_id',
    ]);
  });

  it.each(IMMUTABLE_CATALOGUE_PUBLISHER_AUTHORITY_FIELDS)(
    'rejects the authority-defining field %s before persistence',
    field => {
      expect(() =>
        assertCataloguePublisherContentMutation({ brandName: 'Editable', [field]: 42 }),
      ).toThrow('authority and organisation custody are immutable');
    },
  );

  it('permits ordinary publisher content fields', () => {
    expect(() =>
      assertCataloguePublisherContentMutation({
        brandName: 'Updated Publisher',
        about: 'Updated public copy',
        isVisible: true,
      }),
    ).not.toThrow();
  });

  it('rejects conversion through the canonical service before opening a database path', async () => {
    await expect(
      cataloguePublisherService.updatePublisher(1, {
        authorityKind: 'platform_reference',
        developerOrganisationId: null,
      } as any),
    ).rejects.toThrow('authority and organisation custody are immutable');
  });

  it('uses strict curator update inputs so unknown authority fields cannot be stripped silently', async () => {
    const catalogueCaller = cataloguePublisherRouter.createCaller(superAdminContext);
    await expect(
      catalogueCaller.adminUpdatePublisher({
        id: 1,
        data: {
          brandName: 'Updated',
          authorityKind: 'platform_reference',
        },
      } as any),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const curatorCaller = superAdminPublisherRouter.createCaller(superAdminContext);
    await expect(
      curatorCaller.updatePublisher({
        cataloguePublisherId: 1,
        brandName: 'Updated',
        developerOrganisationId: 2,
      } as any),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('statically protects active raw update sites from authority-field assignment', () => {
    const sources = [
      'server/services/developerIdentityService.ts',
      'server/services/cataloguePublisherService.ts',
      'server/db.ts',
    ].map(path => readFileSync(resolve(path), 'utf8'));
    for (const source of sources) {
      expect(source).not.toMatch(/\.set\(\s*\{[^}]*\bauthorityKind\s*:/s);
      expect(source).not.toMatch(/\.set\(\s*\{[^}]*\bdeveloperOrganisationId\s*:/s);
      expect(source).not.toMatch(/publisherValues\.(?:authorityKind|developerOrganisationId)\s*=/);
    }
  });
});
