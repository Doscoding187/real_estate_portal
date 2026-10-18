import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ProgramRequirementsDialog } from './ProgramRequirementsDialog';

type ReferralTermsSnapshot = {
  capturedAt?: string;
  developmentId?: number;
  developerSalesSnapshot?: {
    revision: string;
    observedAt: string;
    marketMode: 'sale' | 'rent';
    campaign: {
      name: string;
      city: string;
      province: string;
    };
    inventory: {
      phaseScope: 'phase-released' | 'development-wide';
      mode: 'for_sale' | 'for_rent';
      total: {
        availableCount: number;
        priceFrom: number;
        priceTo: number;
        priceBasis: 'purchase_price' | 'monthly_rent';
      };
      unitTypes: Array<{
        id: string;
        name: string;
        bedrooms: number | null;
        bathrooms: number | null;
        size: number | null;
        availableCount: number;
        priceFrom: number;
        priceTo: number;
        priceBasis: 'purchase_price' | 'monthly_rent';
      }>;
    };
  };
  program?: {
    referrerCommissionType?: string | null;
    referrerCommissionValue?: string | number | null;
    referrerCommissionBasis?: string | null;
    currencyCode?: string | null;
    payoutMilestone?: string | null;
    payoutMilestoneNotes?: string | null;
  };
  requiredDocuments?: Array<{
    documentCode: string;
    documentLabel: string;
    category: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
  }>;
};

function formatSnapshotPrice(value: number) {
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(value);
}

function snapshotPriceLabel(value: {
  priceFrom: number;
  priceTo: number;
  priceBasis: 'purchase_price' | 'monthly_rent';
}) {
  const range =
    value.priceFrom === value.priceTo
      ? formatSnapshotPrice(value.priceFrom)
      : `${formatSnapshotPrice(value.priceFrom)}–${formatSnapshotPrice(value.priceTo)}`;
  return `${range} ${value.priceBasis === 'monthly_rent' ? 'monthly rent' : 'purchase price'}`;
}

function toSnapshotItem(snapshot: ReferralTermsSnapshot) {
  const value = Number(snapshot.program?.referrerCommissionValue);
  const currency = snapshot.program?.currencyCode || 'ZAR';
  const basis = String(snapshot.program?.referrerCommissionBasis || '').replace(/_/g, ' ');
  const commissionDisplay =
    !Number.isFinite(value) || value <= 0
      ? 'Referral payout terms not configured'
      : snapshot.program?.referrerCommissionType === 'percentage'
        ? `${value}% referral payout${basis ? ` of ${basis}` : ''}`
        : `${currency === 'ZAR' ? 'R' : `${currency} `}${Math.round(value).toLocaleString('en-ZA')} referral payout`;
  const milestone = String(snapshot.program?.payoutMilestone || '').replace(/_/g, ' ');
  const notes = String(snapshot.program?.payoutMilestoneNotes || '').trim();
  const requiredDocuments = (snapshot.requiredDocuments || [])
    .filter(document => document.category === 'client_required_document')
    .map((document, index) => ({
    templateId: index + 1,
    documentCode: document.documentCode,
    documentLabel: document.documentLabel,
    category: 'client_required_document' as const,
    isRequired: document.isRequired,
    sortOrder: document.sortOrder,
    }));

  return {
    developmentName:
      snapshot.developerSalesSnapshot?.campaign.name || `Development #${snapshot.developmentId || 0}`,
    computed: {
      commissionDisplay,
      payoutDisplay: milestone ? (notes ? `${milestone} (${notes})` : milestone) : 'Payout rules not configured',
      requiredDocsSummary: requiredDocuments.length
        ? `${requiredDocuments.length} required document${requiredDocuments.length === 1 ? '' : 's'}`
        : 'No required documents configured',
    },
    requiredDocuments,
    sourceDocuments: [],
  };
}

export function PayoutRulesDisclosure({
  developmentId,
  termsSnapshot,
  historical = false,
}: {
  developmentId: number | null | undefined;
  termsSnapshot?: ReferralTermsSnapshot | null;
  historical?: boolean;
}) {
  const [requirementsOpen, setRequirementsOpen] = useState(false);

  const normalizedDevelopmentId = Number(developmentId || 0);
  const programTermsQuery = trpc.distribution.partner.getProgramTerms.useQuery(
    { developmentId: normalizedDevelopmentId },
    {
      enabled: normalizedDevelopmentId > 0 && !termsSnapshot && !historical,
      retry: false,
    },
  );

  if (!normalizedDevelopmentId) {
    return (
      <Card>
        <CardContent className="py-3 text-sm text-slate-500">Terms not configured yet.</CardContent>
      </Card>
    );
  }

  if (historical && !termsSnapshot) {
    return (
      <Card>
        <CardContent className="py-3 text-sm text-slate-500">
          Referral terms were not snapshotted when this referral was submitted.
        </CardContent>
      </Card>
    );
  }

  if (programTermsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-3 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payout rules...
        </CardContent>
      </Card>
    );
  }

  if (programTermsQuery.error) {
    return (
      <Card>
        <CardContent className="py-3 text-sm text-slate-500">Terms not configured yet.</CardContent>
      </Card>
    );
  }

  const item = termsSnapshot ? toSnapshotItem(termsSnapshot) : programTermsQuery.data;
  if (!item) {
    return (
      <Card>
        <CardContent className="py-3 text-sm text-slate-500">Terms not configured yet.</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {historical ? 'Referral Payout Rules at Submission' : 'Referral Payout Rules'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Referral payout:</span>{' '}
            <span className="font-medium">{item.computed.commissionDisplay || 'Terms not configured yet'}</span>
          </p>
          <p>
            <span className="text-slate-500">Paid after:</span>{' '}
            <span className="font-medium">{item.computed.payoutDisplay || 'Terms not configured yet'}</span>
          </p>
          <p>
            <span className="text-slate-500">Application documents:</span>{' '}
            <span className="font-medium">
              {item.computed.requiredDocsSummary || 'Terms not configured yet'}
            </span>
          </p>
          <p>
            <span className="text-slate-500">Supporting pack:</span>{' '}
            <span className="font-medium">
              {(item.sourceDocuments || []).length
                ? `${(item.sourceDocuments || []).length} file${
                    (item.sourceDocuments || []).length === 1 ? '' : 's'
                  }`
                : 'No additional developer documents are available'}
            </span>
          </p>
          {historical && termsSnapshot?.developerSalesSnapshot ? (
            <section className="space-y-2 border-t pt-3" aria-label="Developer inventory snapshot">
              <div>
                <p className="font-medium">Developer inventory at referral submission</p>
                <p className="text-xs text-slate-500">
                  {termsSnapshot.developerSalesSnapshot.campaign.name} ·{' '}
                  {termsSnapshot.developerSalesSnapshot.marketMode === 'sale' ? 'For sale' : 'For rent'}
                  {' · '}
                  {[
                    termsSnapshot.developerSalesSnapshot.campaign.city,
                    termsSnapshot.developerSalesSnapshot.campaign.province,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
              <p>
                <span className="text-slate-500">Available:</span>{' '}
                <span className="font-medium">
                  {termsSnapshot.developerSalesSnapshot.inventory.total.availableCount} ·{' '}
                  {snapshotPriceLabel(termsSnapshot.developerSalesSnapshot.inventory.total)}
                </span>
              </p>
              {termsSnapshot.developerSalesSnapshot.inventory.unitTypes.map(unitType => (
                <p key={unitType.id} className="text-xs text-slate-600">
                  {unitType.name}: {unitType.availableCount} available ·{' '}
                  {snapshotPriceLabel(unitType)}
                </p>
              ))}
              <p className="text-xs text-slate-500">
                Developer projection observed{' '}
                {new Date(termsSnapshot.developerSalesSnapshot.observedAt).toLocaleString()}.
              </p>
            </section>
          ) : null}
          {termsSnapshot?.capturedAt ? (
            <p className="text-xs text-slate-500">
              Terms captured {new Date(termsSnapshot.capturedAt).toLocaleString()}
            </p>
          ) : null}
          <Button size="sm" variant="outline" onClick={() => setRequirementsOpen(true)}>
            View full requirements
          </Button>
        </CardContent>
      </Card>

      <ProgramRequirementsDialog
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        item={item}
      />
    </>
  );
}
