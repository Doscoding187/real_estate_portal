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
    templateFileUrl?: string | null;
    templateFileName?: string | null;
    isRequired: boolean;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.developmentName} Requirements</DialogTitle>
          <DialogDescription>
            Submit these documents to complete payout requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {orderedDocuments.map(document => (
            <div
              key={document.templateId}
              className="flex items-start justify-between gap-2 rounded border p-2"
            >
              <div>
                <p className="font-medium">{document.documentLabel}</p>
                <p className="text-xs text-slate-500">{document.documentCode}</p>
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
            <p className="text-sm text-slate-500">Terms not configured yet.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
