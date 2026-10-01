import { describe, expect, it } from 'vitest';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import {
  CANONICAL_LAUNCH_ACCESS_PRODUCTS,
  verifyCanonicalCommercialReferenceData,
} from '../dataAdapters/canonicalCommercial';

function referenceFixture() {
  const plans = CANONICAL_LAUNCH_ACCESS_PRODUCTS.map((product, index) => ({
    ...structuredClone(product),
    id: index + 1,
    price_monthly: product.priceMonthly,
    trial_days: product.trialDays,
  }));
  const statements: string[] = [];
  const connection: AuthoritySqlConnection = {
    async execute(statement, values = []) {
      statements.push(statement);
      if (statement === 'SELECT * FROM plans WHERE name = ?') {
        return [plans.filter(plan => plan.name === values[0])];
      }
      if (
        statement ===
        'SELECT feature_key, value_json FROM plan_entitlements WHERE plan_id = ? ORDER BY feature_key'
      ) {
        const plan = plans.find(item => item.id === values[0]);
        return [
          Object.entries(plan?.entitlements ?? {}).map(([feature_key, value_json]) => ({
            feature_key,
            value_json,
          })),
        ];
      }
      throw new Error('Unexpected statement in read-only admission verifier');
    },
    async query() {
      throw new Error('Unexpected query path');
    },
    async end() {},
  };
  return { plans, connection, statements };
}

describe('B01 canonical commercial v4 admission', () => {
  it('admits all three approved products without writing or ignoring metadata', async () => {
    const fixture = referenceFixture();
    const evidence = await verifyCanonicalCommercialReferenceData(fixture.connection);
    expect(evidence.products).toHaveLength(3);
    expect(fixture.plans.every(plan => plan.metadata.tax_treatment === 'not_vat_registered')).toBe(
      true,
    );
    expect(fixture.statements).toHaveLength(6);
    expect(fixture.statements.every(statement => statement.startsWith('SELECT '))).toBe(true);
  });

  it.each(['missing', 'wrong', 'unknown-extra'] as const)(
    'rejects %s commercial metadata',
    async kind => {
      const fixture = referenceFixture();
      const metadata = fixture.plans[0].metadata as Record<string, unknown>;
      if (kind === 'missing') delete metadata.tax_treatment;
      if (kind === 'wrong') metadata.tax_treatment = 'vat_registered';
      if (kind === 'unknown-extra') metadata.unapproved_launch_policy = true;
      await expect(verifyCanonicalCommercialReferenceData(fixture.connection)).rejects.toThrow(
        'commercial metadata',
      );
    },
  );
});
