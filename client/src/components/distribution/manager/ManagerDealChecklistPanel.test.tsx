import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManagerDealChecklistPanel } from './ManagerDealChecklistPanel';

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
  it('renders checklist rows with pending statuses and blockers', () => {
    render(
      <ManagerDealChecklistPanel
        checklist={checklistFixture as any}
        savingTemplateId={null}
        onUpdateDocumentStatus={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText('Sky City | DEAL-12')).toBeInTheDocument();
    expect(screen.getByText('Payout Not Ready')).toBeInTheDocument();
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
