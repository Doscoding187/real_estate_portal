import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ProgramRequirementsDialog } from './ProgramRequirementsDialog';

export function PayoutRulesDisclosure({
  developmentId,
}: {
  developmentId: number | null | undefined;
}) {
  const [requirementsOpen, setRequirementsOpen] = useState(false);

  const normalizedDevelopmentId = Number(developmentId || 0);
  const programTermsQuery = trpc.distribution.partner.getProgramTerms.useQuery(
    { developmentId: normalizedDevelopmentId },
    {
      enabled: normalizedDevelopmentId > 0,
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

  const item = programTermsQuery.data;
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
          <CardTitle className="text-sm">Payout Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Referral fee:</span>{' '}
            <span className="font-medium">{item.computed.commissionDisplay || 'Terms not configured yet'}</span>
          </p>
          <p>
            <span className="text-slate-500">Paid after:</span>{' '}
            <span className="font-medium">{item.computed.payoutDisplay || 'Terms not configured yet'}</span>
          </p>
          <p>
            <span className="text-slate-500">Documents required:</span>{' '}
            <span className="font-medium">
              {item.computed.requiredDocsSummary || 'Terms not configured yet'}
            </span>
          </p>
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
