import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPartnerProgramTermsCopy } from './partnerProgramTermsCopy';

type ProgramTermsItem = {
  developmentName: string;
  transactionType?: unknown;
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
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
  );
  const termsCopy = getPartnerProgramTermsCopy(item.transactionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.developmentName} Requirements</DialogTitle>
          <DialogDescription>{termsCopy.documentOwnerDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Supporting pack</p>
                <p className="text-xs text-slate-500">
                  {termsCopy.supportingPackDescription}
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
                      {document.fileName || 'File pending upload'}
                    </p>
                  </div>
                  {document.fileUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
              ))}
              {!sourceDocuments.length ? (
                <p className="rounded border border-dashed p-3 text-sm text-slate-500">
                  No supporting files have been uploaded for this development yet.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Application documents</p>
                <p className="text-xs text-slate-500">
                  {termsCopy.applicationDocumentsDescription}
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
                  <p className="text-xs text-slate-500">
                    {document.category === 'developer_document'
                      ? 'Download, sign, and re-upload'
                      : document.documentCode}
                  </p>
                {document.templateFileUrl ? (
                  <a
                    href={document.templateFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Download document
                    {document.templateFileName ? ` (${document.templateFileName})` : ''}
                  </a>
                ) : null}
              </div>
              <Badge variant={document.isRequired ? 'default' : 'secondary'}>
                {document.isRequired ? 'Required' : 'Optional'}
              </Badge>
            </div>
          ))}
          {!orderedDocuments.length ? (
            <p className="rounded border border-dashed p-3 text-sm text-slate-500">
              Application documents are not configured yet.
            </p>
          ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
