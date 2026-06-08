import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgramRequirementsDialog } from './ProgramRequirementsDialog';
import { getPartnerProgramTermsCopy } from './partnerProgramTermsCopy';

export type ProgramTermsItem = {
  developmentId: number;
  developmentName: string;
  transactionType?: unknown;
  city?: string | null;
  province?: string | null;
  brand?: { brandProfileId: number; brandName: string } | null;
  program: {
    programId: number;
    isActive: boolean;
    isReferralEnabled: boolean;
    tierAccessPolicy: string | null;
    commissionModel: 'flat_percentage' | 'flat_amount' | string;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    currencyCode: string | null;
    payoutMilestone: string | null;
    payoutMilestoneNotes: string | null;
  };
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category?: 'developer_document' | 'client_required_document';
    templateFileUrl?: string | null;
    templateFileName?: string | null;
    isRequired: boolean;
    sortOrder: number;
  }>;
  sourceDocuments?: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    fileUrl?: string | null;
    fileName?: string | null;
    sortOrder: number;
  }>;
  computed: {
    commissionDisplay: string;
    payoutDisplay: string;
    requiredDocsSummary: string;
  };
};

function fallbackTerm(value: string | null | undefined) {
  if (!value) return 'Terms not configured yet';
  return value;
}

export function PartnerProgramTermsCard({
  item,
  onViewDetails,
}: {
  item: ProgramTermsItem;
  onViewDetails?: () => void;
}) {
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const termsCopy = getPartnerProgramTermsCopy(item.transactionType);

  const locationLabel = useMemo(
    () => [item.city, item.province].filter(Boolean).join(', ') || 'Location unavailable',
    [item.city, item.province],
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{item.developmentName}</CardTitle>
              <CardDescription>{locationLabel}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant={item.program.isReferralEnabled ? 'default' : 'secondary'}>
                {item.program.isReferralEnabled ? 'Referrals Enabled' : 'Referrals Disabled'}
              </Badge>
              <Badge variant={item.program.isActive ? 'default' : 'secondary'}>
                {item.program.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          {item.brand ? (
            <p className="text-xs text-slate-500">Brand: {item.brand.brandName}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Commission</p>
            <p className="font-medium">{fallbackTerm(item.computed.commissionDisplay)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payout Rules</p>
            <p className="font-medium">{fallbackTerm(item.computed.payoutDisplay)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Application documents</p>
            <p className="font-medium">{fallbackTerm(item.computed.requiredDocsSummary)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Supporting pack</p>
            <p className="font-medium">
              {(item.sourceDocuments || []).length
                ? `${(item.sourceDocuments || []).length} ${termsCopy.supportingPackSummaryLabel} file${
                    (item.sourceDocuments || []).length === 1 ? '' : 's'
                  }`
                : 'No supporting files uploaded yet'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setRequirementsOpen(true)}>
              View requirements
            </Button>
            {onViewDetails ? (
              <Button size="sm" variant="outline" onClick={onViewDetails}>
                View details
              </Button>
            ) : null}
          </div>
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
