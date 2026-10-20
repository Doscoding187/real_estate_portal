import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { formatPartnerProcessOwner } from '@/lib/distributionPartnerJourney';

type ProgramTermsItem = {
  developmentName: string;
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category?: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
  }>;
  sourceDocuments?: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    fileUrl: string;
    fileName: string | null;
    sortOrder: number;
  }>;
};

export function ProgramRequirementsDialog({
  open,
  onOpenChange,
  item,
  developmentId,
  referralProcessAvailable,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProgramTermsItem;
  developmentId?: number;
  referralProcessAvailable?: boolean;
}) {
  const processQuery = trpc.distribution.partner.getReferralIntakeRequirements.useQuery(
    { developmentId: Number(developmentId || 0) },
    {
      enabled:
        open &&
        referralProcessAvailable === true &&
        Number.isInteger(developmentId) &&
        Number(developmentId) > 0,
      retry: false,
    },
  );
  const orderedDocuments = [...(item.requiredDocuments || [])].sort((a, b) => {
    if (a.isRequired !== b.isRequired) {
      return a.isRequired ? -1 : 1;
    }
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
  const sourceDocuments = [...(item.sourceDocuments || [])].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.templateId - b.templateId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.developmentName}: Before you refer</DialogTitle>
          <DialogDescription>
            Review the information available for this property and the documents that may be needed
            if the person chooses to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {typeof referralProcessAvailable === 'boolean' ? (
            <section className="rounded-md border border-primary/15 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">How this referral progresses</p>
                <p className="text-xs text-slate-500">
                  The steps and instructions are set for this opportunity. The team records progress after you submit.
                </p>
              </div>
              {!referralProcessAvailable ? (
                <p className="mt-3 rounded border border-dashed p-3 text-sm text-slate-600">
                  Referrals are temporarily paused for this opportunity. You can still explore its current property information.
                </p>
              ) : processQuery.isLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading the referral steps…</p>
              ) : processQuery.error ? (
                <p role="alert" className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  The referral steps could not be loaded. Try again before starting an introduction.
                </p>
              ) : processQuery.data?.workflowSteps?.length ? (
                <ol className="mt-3 space-y-2">
                  {processQuery.data.workflowSteps.map((step, index) => (
                    <li key={`${step.key}-${index}`} className="rounded border bg-slate-50 p-3">
                      <p className="font-medium text-slate-900">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {step.isBlocking ? 'Required to continue' : 'As needed'}
                        {step.ownerRole
                          ? ` · Handled by ${formatPartnerProcessOwner(step.ownerRole)}`
                          : ''}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-5 text-slate-700">
                        {step.partnerInstructions}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 rounded border border-dashed p-3 text-sm text-slate-600">
                  No referral steps are available for this opportunity yet.
                </p>
              )}
            </section>
          ) : null}

          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Property information</p>
                <p className="text-xs text-slate-500">
                  Shared plans, price lists, and other property information appear here.
                </p>
              </div>
              <Badge variant="secondary">
                {sourceDocuments.length} file{sourceDocuments.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <div className="mt-2 space-y-2">
              {sourceDocuments.map(document => (
                <div
                  key={document.templateId}
                  className="flex items-center justify-between gap-2 rounded border bg-slate-50 p-2"
                >
                  <div>
                    <p className="font-medium">{document.documentLabel}</p>
                    <p className="text-xs text-slate-500">
                      {document.fileName || 'Shared property information'}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={document.fileUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
              ))}
              {!sourceDocuments.length ? (
                <p className="rounded border border-dashed p-3 text-sm text-slate-500">
                  No additional property documents are available right now.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Documents for a referral</p>
                <p className="text-xs text-slate-500">
                  These documents are listed for this opportunity. The referral steps will show
                  you what is needed and when.
                </p>
              </div>
              <Badge variant="secondary">
                {orderedDocuments.filter(document => document.isRequired).length} required
              </Badge>
            </div>
            <div className="mt-2 space-y-2">
          {orderedDocuments.map(document => (
            <div
              key={document.templateId}
              className="flex items-start justify-between gap-2 rounded border p-2"
            >
              <div>
                  <p className="font-medium">{document.documentLabel}</p>
              </div>
              <Badge variant={document.isRequired ? 'default' : 'secondary'}>
                {document.isRequired ? 'Required' : 'Optional'}
              </Badge>
            </div>
          ))}
          {!orderedDocuments.length ? (
            <p className="rounded border border-dashed p-3 text-sm text-slate-500">
              No extra documents are listed for this opportunity.
            </p>
          ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
