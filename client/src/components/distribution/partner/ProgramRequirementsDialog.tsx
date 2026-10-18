import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
    id: number;
    title: string;
    documentType: string;
    category: string;
    version: number;
    downloadable: boolean;
  }>;
};

export function ProgramRequirementsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProgramTermsItem;
}) {
  const orderedDocuments = [...(item.requiredDocuments || [])].sort((a, b) => {
    if (a.isRequired !== b.isRequired) {
      return a.isRequired ? -1 : 1;
    }
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
  const sourceDocuments = [...(item.sourceDocuments || [])].sort(
    (a, b) => a.title.localeCompare(b.title) || a.id - b.id,
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
                  key={document.id}
                  className="flex items-center justify-between gap-2 rounded border bg-slate-50 p-2"
                >
                  <div>
                    <p className="font-medium">{document.title}</p>
                    <p className="text-xs text-slate-500">
                      {document.documentType} · version {document.version}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {document.downloadable ? 'Shared resource' : 'Information only'}
                  </Badge>
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
