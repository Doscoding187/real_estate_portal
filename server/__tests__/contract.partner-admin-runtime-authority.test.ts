import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

const routerSource = readFileSync(
  resolve(root, 'server/partnerRouter.ts'),
  'utf8',
);

const clientSource = readFileSync(
  resolve(root, 'client/src/pages/admin/PartnerNetworkPage.tsx'),
  'utf8',
);

describe('canonical Partner admin runtime authority', () => {
  it('restricts Partner administration to super admins', () => {
    expect(routerSource).toContain('superAdminProcedure');
    expect(routerSource).not.toContain('protectedProcedure');
  });

  it('uses the canonical Partner database helpers', () => {
    for (const helper of [
      'listPartners',
      'createPartner',
      'updatePartner',
      'deletePartner',
    ]) {
      expect(routerSource).toContain(helper);
    }

    expect(routerSource).not.toContain(
      'return { partners: [] as any[], total: 0 }',
    );
    expect(routerSource).not.toContain(
      'return { ok: true, id: 0 }',
    );
  });

  it('uses canonical Partner identity fields at the router boundary', () => {
    for (const field of [
      'userId',
      'companyName',
      'description',
      'verificationStatus',
      'websiteUrl',
      'contactEmail',
      'contactPhone',
      'isActive',
    ]) {
      expect(routerSource).toContain(field);
    }

    for (const legacyField of [
      'category:',
      'status:',
      'name:',
      'contactPerson:',
      'email:',
      'phone:',
      'website:',
      'isVerified:',
    ]) {
      expect(routerSource).not.toContain(legacyField);
    }
  });

  it('aligns the Partner admin client with the canonical identity model', () => {
    expect(clientSource).not.toContain('// @ts-nocheck');

    for (const field of [
      'userId',
      'companyName',
      'verificationStatus',
      'websiteUrl',
      'contactEmail',
      'contactPhone',
      'isActive',
    ]) {
      expect(clientSource).toContain(field);
    }

    for (const legacyField of [
      'contactPerson',
      'isVerified',
      'partner.category',
      'partner.status',
      'partner.name',
      'partner.email',
      'partner.phone',
    ]) {
      expect(clientSource).not.toContain(legacyField);
    }

    expect(clientSource).not.toMatch(/partner\.website(?!Url)/);
  });

  it('does not reintroduce Service Engine classification into Partner identity', () => {
    expect(routerSource).not.toContain('category');
    expect(clientSource).not.toContain('categoryFilter');
    expect(clientSource).not.toContain('CATEGORIES');
  });
});
