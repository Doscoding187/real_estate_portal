import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { __agencyDealEngineTestHooks } from '../agencyRouter';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('agency deal engine contract', () => {
  const schema = readRepoFile('drizzle/schema/agencyDeals.ts');
  const router = readRepoFile('server/agencyRouter.ts');
  const workspace = readRepoFile('client/src/features/agency/transactions/AgencyTransactionsWorkspace.tsx');
  const myDay = readRepoFile('client/src/features/agency/viewings/AgencyViewingsWorkspace.tsx');
  const commissionWorkspace = readRepoFile('client/src/features/agency/commission/AgencyCommissionWorkspace.tsx');

  it('stores deals as one connected commercial record with versioned offers', () => {
    for (const tableName of [
      'agency_deals',
      'agency_deal_offer_versions',
      'agency_transactions',
      'agency_transaction_milestones',
      'agency_transaction_conditions',
      'agency_transaction_parties',
      'agency_transaction_documents',
      'agency_transaction_activity',
    ]) {
      expect(schema).toContain(`'${tableName}'`);
    }

    expect(schema).toContain("sourceViewingId: int('source_viewing_id')");
    expect(schema).toContain("leadId: int('lead_id')");
    expect(schema).toContain("listingId: int('listing_id')");
    expect(schema).toContain("unique('uq_agency_deal_offer_version')");
    expect(schema).toContain("unique('uq_agency_transactions_deal')");
  });

  it('makes accepted offer transaction creation server-owned and idempotent', () => {
    expect(router).toContain('acceptOfferVersion: agentProcedure');
    expect(router).toContain('getExistingTransactionForDeal');
    expect(router).toContain('return {');
    expect(router).toContain('idempotent: true');
    expect(router).toContain("stage: 'transaction_open'");
    expect(router).toContain('acceptedTermsSnapshot');
    expect(router).toContain('await tx.insert(agencyTransactionMilestones)');
    expect(router).toContain('await tx.insert(agencyTransactionConditions)');
    expect(router).toContain('expectedCommission');
  });

  it('uses separate sale and rental transaction templates', () => {
    const { workflowTemplates } = __agencyDealEngineTestHooks;
    const sale = workflowTemplates('sale');
    const rental = workflowTemplates('rental');

    expect(sale.milestones.map(milestone => milestone[0])).toEqual(
      expect.arrayContaining(['bond_approval', 'conveyancer_instructed', 'registration', 'commission_payable']),
    );
    expect(rental.milestones.map(milestone => milestone[0])).toEqual(
      expect.arrayContaining(['screening', 'lease_signed', 'incoming_inspection', 'occupation']),
    );
    expect(rental.milestones.map(milestone => milestone[0])).not.toContain('conveyancer_instructed');
  });

  it('derives expected commission from accepted terms without requiring payroll', () => {
    const { calculateCommission } = __agencyDealEngineTestHooks;
    expect(
      calculateCommission({
        acceptedAmount: 1_900_000,
        basis: 'percentage',
        percentage: 5,
        agencySharePercentage: 60,
        referralSplit: 5_000,
        otherDeductions: 2_000,
      }),
    ).toMatchObject({
      grossCommission: 95_000,
      expectedCommission: 88_000,
      agencyShare: 52_800,
      agentShare: 35_200,
    });
  });

  it('keeps partial receipt and variance states deterministic from the immutable forecast', () => {
    const { settlementStatusFromPayments } = __agencyDealEngineTestHooks;
    expect(settlementStatusFromPayments(88_000, 0)).toBe('awaiting_payment');
    expect(settlementStatusFromPayments(88_000, 20_000)).toBe('partially_received');
    expect(settlementStatusFromPayments(88_000, 88_000)).toBe('received');
    expect(settlementStatusFromPayments(88_000, 88_001)).toBe('reconciliation_required');
  });

  it('uses canonical settlements for the operational commission workspace and statement', () => {
    expect(router).toContain('getCommissionSettlements: agentProcedure');
    expect(router).toContain('recordCommissionPayment: agencyAdminProcedure');
    expect(router).toContain('resolveCommissionSettlementDispute: agencyAdminProcedure');
    expect(commissionWorkspace).toContain('getCommissionSettlements.useQuery');
    expect(commissionWorkspace).toContain('recordCommissionPayment.useMutation');
    expect(commissionWorkspace).toContain('Operational commission statement');
    expect(commissionWorkspace).toContain('My commission position');
    expect(commissionWorkspace).toContain('Protected finance actions');
  });

  it('surfaces deal deadlines in My Day and the Transactions workspace', () => {
    expect(router).toContain('transactionDeadlines');
    expect(router).toContain('offer_expiry');
    expect(router).toContain('agencyTransactionConditions');
    expect(router).toContain('agencyTransactionMilestones');

    expect(myDay).toContain('Deal deadlines');
    expect(myDay).toContain('TransactionDeadlineQueue');
    expect(myDay).toContain('/agency/transactions?deal=');

    for (const action of [
      'Open deal',
      'Submit offer',
      'Record counter',
      'Accept and open transaction',
      'Add condition',
      'Add party',
      'Mark complete',
    ]) {
      expect(workspace).toContain(action);
    }

    for (const workspaceText of [
      'Seller/listing context',
      'Transaction status',
      'Activity Timeline',
      'Private document storage not configured locally',
      'No document metadata',
    ]) {
      expect(workspace).toContain(workspaceText);
    }
  });

  it('keeps private document handling metadata-only and agency scoped', () => {
    expect(router).toContain('visibilityScope:');
    expect(router).toContain("'agency_private'");
    expect(router).toContain('expectedPrivatePrefix');
    expect(router).toContain('Document metadata must use an agency-private transaction storage reference.');
    expect(workspace).not.toContain('Add Private Document');
    expect(workspace).not.toContain('Private storage key or reference');
  });
});
