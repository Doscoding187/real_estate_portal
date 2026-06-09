import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getChecklistProgrammeSemanticsCopy,
  getChecklistTransactionCopy,
  ManagerDealChecklistPanel,
  normalizeChecklistTransactionLane,
} from './ManagerDealChecklistPanel';

const checklistFixture = {
  dealId: 12,
  dealRef: 'DEAL-12',
  buyerName: 'Jane Doe',
  developmentId: 44,
  developmentName: 'Sky City',
  programId: 91,
  payoutMilestone: 'attorney_signing',
  currencyCode: 'ZAR',
  commissionSummary: {
    commissionModel: 'flat_percentage',
    defaultCommissionPercent: 2.5,
    defaultCommissionAmount: null,
  },
  requiredDocuments: [
    {
      templateId: 1001,
      documentCode: 'id_document',
      documentLabel: 'ID Document',
      isRequired: true,
      sortOrder: 0,
      isActive: true,
      status: 'pending',
      receivedAt: null,
      verifiedAt: null,
      receivedBy: null,
      verifiedBy: null,
      notes: null,
    },
    {
      templateId: 1002,
      documentCode: 'proof_of_income',
      documentLabel: 'Proof of Income',
      isRequired: true,
      sortOrder: 1,
      isActive: true,
      status: 'pending',
      receivedAt: null,
      verifiedAt: null,
      receivedBy: null,
      verifiedBy: null,
      notes: null,
    },
  ],
  computed: {
    requiredCount: 2,
    verifiedRequiredCount: 0,
    allRequiredVerified: false,
    payoutReady: false,
    blockers: ['2 required documents still need verification.'],
  },
};

describe('ManagerDealChecklistPanel', () => {
  it('normalizes checklist transaction lanes and copy', () => {
    expect(normalizeChecklistTransactionLane('for_sale')).toBe('sale');
    expect(normalizeChecklistTransactionLane('for_rent')).toBe('rent');
    expect(normalizeChecklistTransactionLane('rental')).toBe('rent');
    expect(normalizeChecklistTransactionLane('on_auction')).toBe('auction');

    expect(getChecklistTransactionCopy('for_rent')).toMatchObject({
      engineLabel: 'Rental engine',
      participantLabel: 'Rental applicant',
      documentTitle: 'Rental Applicant Document Checklist',
    });
    expect(getChecklistTransactionCopy('auction')).toMatchObject({
      engineLabel: 'Auction engine',
      participantLabel: 'Bidder',
      documentTitle: 'Bidder Document Checklist',
    });
    expect(getChecklistProgrammeSemanticsCopy('for_rent')).toMatchObject({
      heading: 'Rental programme semantics',
      statusLabel: 'Readiness metadata not configured',
    });
    expect(getChecklistProgrammeSemanticsCopy('auction').requiredReadiness).toContain(
      'Winning bidder confirmed',
    );
  });

  it('renders checklist rows with pending statuses and blockers', () => {
    render(
      <ManagerDealChecklistPanel
        checklist={checklistFixture as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Sky City | DEAL-12')).toBeInTheDocument();
    expect(screen.getByText('Sale engine')).toBeInTheDocument();
    expect(screen.getByText('Buyer: Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Payout Not Ready')).toBeInTheDocument();
    expect(screen.getByText('Sale programme semantics')).toBeInTheDocument();
    expect(screen.getByText('Current baseline')).toBeInTheDocument();
    expect(screen.getByText('Buyer Document Checklist')).toBeInTheDocument();
    expect(screen.getByText(/2 required documents still need verification\./i)).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('pending').length).toBeGreaterThan(0);
    expect(screen.getByText('ID Document')).toBeInTheDocument();
    expect(screen.getByText('Proof of Income')).toBeInTheDocument();
  });

  it('calls mutation callback when status changes and when notes blur', async () => {
    const onUpdateDocumentStatus = vi.fn().mockResolvedValue(undefined);

    render(
      <ManagerDealChecklistPanel
        checklist={checklistFixture as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={onUpdateDocumentStatus}
      />,
    );

    const statusSelect = screen.getAllByLabelText('Status')[0];
    fireEvent.change(statusSelect, { target: { value: 'received' } });

    await waitFor(() =>
      expect(onUpdateDocumentStatus).toHaveBeenCalledWith({
        templateId: 1001,
        status: 'received',
        notes: null,
      }),
    );

    const notesInput = screen.getAllByLabelText('Notes')[0];
    fireEvent.change(notesInput, { target: { value: 'Awaiting verification' } });
    fireEvent.blur(notesInput);

    await waitFor(() =>
      expect(onUpdateDocumentStatus).toHaveBeenCalledWith({
        templateId: 1001,
        status: 'pending',
        notes: 'Awaiting verification',
      }),
    );
  });

  it('shows payout ready banner when all required docs are verified', () => {
    const readyChecklist = {
      ...checklistFixture,
      requiredDocuments: checklistFixture.requiredDocuments.map(document => ({
        ...document,
        status: 'verified',
      })),
      computed: {
        requiredCount: 2,
        verifiedRequiredCount: 2,
        allRequiredVerified: true,
        payoutReady: true,
        blockers: [],
      },
    };

    render(
      <ManagerDealChecklistPanel
        checklist={readyChecklist as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Payout Ready')).toBeInTheDocument();
    expect(screen.getByText('Verified required documents: 2/2')).toBeInTheDocument();
  });

  it('uses rental applicant review language without claiming payout semantics are solved', () => {
    render(
      <ManagerDealChecklistPanel
        checklist={{ ...checklistFixture, transactionType: 'for_rent' } as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Rental engine')).toBeInTheDocument();
    expect(screen.getByText('Rental applicant: Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Referral Review Not Ready')).toBeInTheDocument();
    expect(screen.getByText('Rental programme semantics')).toBeInTheDocument();
    expect(screen.getByText('Readiness metadata not configured')).toBeInTheDocument();
    expect(screen.getByText('Lease signed')).toBeInTheDocument();
    expect(screen.getByText('Deposit received')).toBeInTheDocument();
    expect(
      screen.getByText(/Document templates do not yet identify Rental readiness roles/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Rental Applicant Document Checklist')).toBeInTheDocument();
    expect(screen.getByText(/Lease, deposit, and rental commission rules/i)).toBeInTheDocument();
  });

  it('surfaces configured, missing, and wrong-lane readiness roles from the read model', () => {
    render(
      <ManagerDealChecklistPanel
        checklist={
          {
            ...checklistFixture,
            transactionType: 'for_rent',
            computed: {
              ...checklistFixture.computed,
              programmeSemantics: {
                transactionLane: 'rent',
                expectedRoles: ['submission', 'qualification', 'lease', 'payout'],
                configuredRoles: ['submission', 'qualification'],
                missingRoles: ['lease', 'payout'],
                wrongLaneWarnings: [
                  'Sale Agreement looks like a payout document for another transaction lane.',
                ],
                documentRoles: [
                  {
                    templateId: 1001,
                    documentLabel: 'ID Document',
                    documentCode: 'id_document',
                    readinessRole: 'submission',
                    appliesToLane: true,
                    blocksPayoutAutomation: false,
                  },
                ],
                automationAllowed: false,
                automationBlockedReason:
                  'Readiness metadata is display-only until programme terms, document review rules, and payout triggers are explicitly configured.',
              },
            },
          } as any
        }
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Configured from current templates')).toBeInTheDocument();
    expect(screen.getByText('Missing readiness metadata')).toBeInTheDocument();
    expect(screen.getByText('Wrong-lane template warnings')).toBeInTheDocument();
    expect(screen.getAllByText('Submission').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Qualification').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Lease').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Payout').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Sale Agreement looks like a payout document for another transaction lane.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Readiness metadata is display-only/i)).toBeInTheDocument();
  });

  it('uses bidder review language for auction checklists', () => {
    render(
      <ManagerDealChecklistPanel
        checklist={{ ...checklistFixture, transactionType: 'auction' } as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Auction engine')).toBeInTheDocument();
    expect(screen.getByText('Bidder: Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Bidder Review Not Ready')).toBeInTheDocument();
    expect(screen.getByText('Auction programme semantics')).toBeInTheDocument();
    expect(screen.getByText('Bidder approved')).toBeInTheDocument();
    expect(screen.getByText('Auction terms accepted')).toBeInTheDocument();
    expect(screen.getByText('Winning bidder confirmed')).toBeInTheDocument();
    expect(
      screen.getByText(/Document templates do not yet identify Auction readiness roles/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Bidder Document Checklist')).toBeInTheDocument();
    expect(screen.getByText(/proof-of-funds, auction terms/i)).toBeInTheDocument();
  });

  it('triggers batch callbacks from quick actions', async () => {
    const onMarkAllRequiredReceived = vi.fn().mockResolvedValue(undefined);
    const onMarkAllRequiredVerified = vi.fn().mockResolvedValue(undefined);

    render(
      <ManagerDealChecklistPanel
        checklist={checklistFixture as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
        onMarkAllRequiredReceived={onMarkAllRequiredReceived}
        onMarkAllRequiredVerified={onMarkAllRequiredVerified}
      />,
    );

    fireEvent.click(screen.getByText('Mark All Required as Received'));
    fireEvent.click(screen.getByText('Mark All Required as Verified'));

    await waitFor(() => expect(onMarkAllRequiredReceived).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onMarkAllRequiredVerified).toHaveBeenCalledTimes(1));
  });
});
