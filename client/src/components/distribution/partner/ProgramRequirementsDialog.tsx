import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type ProgramTermsItem = {
  developmentId: number;
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

function downloadBase64File(payload: { base64: string; mimeType: string; fileName: string }) {
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: payload.mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function ProgramRequirementsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProgramTermsItem;
}) {
  const downloadResourceMutation = trpc.distribution.partner.downloadDeveloperSalesResource.useMutation({
    onSuccess: payload => {
      downloadBase64File(payload);
      toast.success('Resource downloaded.');
    },
    onError: error => toast.error(error.message || 'This resource is no longer available.'),
  });
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
          <DialogTitle>{item.developmentName} Requirements</DialogTitle>
          <DialogDescription>
            Program requirements describe what the buyer must provide. Developer files are served
            through current partner access and sharing checks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Supporting pack</p>
                <p className="text-xs text-slate-500">
                  Plans, price lists, and other resources explicitly shared with partners by the developer.
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
                  <div className="flex items-center gap-2">
                    {document.downloadable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={downloadResourceMutation.isPending}
                        onClick={() =>
                          downloadResourceMutation.mutate({
                            developmentId: item.developmentId,
                            resourceId: document.id,
                          })
                        }
                      >
                        {downloadResourceMutation.isPending ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    ) : (
                      <Badge variant="secondary">Information only</Badge>
                    )}
                  </div>
                </div>
              ))}
              {!sourceDocuments.length ? (
                <p className="rounded border border-dashed p-3 text-sm text-slate-500">
                  No partner-visible Developer resources are listed for this development.
                </p>
              ) : null}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Application documents</p>
                <p className="text-xs text-slate-500">
                  These are the buyer documents listed for this program's application and any
                  configured payout checks.
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
                    <p className="text-xs text-slate-500">{document.documentCode}</p>
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
