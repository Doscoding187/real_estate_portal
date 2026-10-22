import { useState } from 'react';
import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function saveEvidenceFile(input: { contentBase64: string; mimeType: string; evidenceUuid: string }) {
  const binary = atob(input.contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: input.mimeType }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `partner-identity-${input.evidenceUuid}`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function ReferralEvidenceReviewQueue() {
  const [rejectionCodes, setRejectionCodes] = useState<Record<string, string>>({});
  const utils = trpc.useUtils();
  const queue = trpc.distribution.manager.listReferralIntakeEvidenceQueue.useQuery(
    { limit: 50 },
    { retry: false },
  );
  const review = trpc.distribution.manager.reviewReferralIntakeEvidence.useMutation({
    onSuccess: () => {
      toast.success('Evidence review recorded');
      void queue.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const [downloadingUuid, setDownloadingUuid] = useState<string | null>(null);

  const download = async (evidenceUuid: string) => {
    setDownloadingUuid(evidenceUuid);
    try {
      const file = await utils.distribution.manager.readReferralIntakeEvidence.fetch({ evidenceUuid });
      saveEvidenceFile({ ...file, evidenceUuid });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download private evidence.');
    } finally {
      setDownloadingUuid(null);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Partner identity evidence</CardTitle>
        <CardDescription>
          Check the file against the programme’s configured evidence requirement. This records an operational review, not a legal identity determination. Access is limited to assigned managers and roles named in the pinned policy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {queue.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : null}
        {queue.error ? <p className="text-sm text-red-600">{queue.error.message}</p> : null}
        {!queue.isLoading && !queue.error && !(queue.data || []).length ? (
          <p className="text-sm text-slate-600">No partner identity evidence is waiting for review.</p>
        ) : null}
        {(queue.data || []).map(item => (
          <div key={item.evidenceUuid} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <strong>Development {item.developmentId}</strong>
                <Badge variant="secondary">Policy v{item.policyVersion}</Badge>
                <Badge variant="outline">Pending review</Badge>
              </div>
              <p className="text-slate-600">Partner account #{item.partnerUserId} · {item.mimeType || 'file'} · {Math.max(1, Math.ceil(item.byteSize / 1024))} KB</p>
              <p className="text-xs text-slate-500">Uploaded {new Date(item.uploadedAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" disabled={downloadingUuid === item.evidenceUuid} onClick={() => void download(item.evidenceUuid)}>
                {downloadingUuid === item.evidenceUuid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Review file
              </Button>
              <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ evidenceUuid: item.evidenceUuid, reviewStatus: 'verified' })}>Mark checked</Button>
              <select
                className="h-9 rounded-md border bg-white px-2 text-xs"
                aria-label="Evidence rejection reason"
                value={rejectionCodes[item.evidenceUuid] || ''}
                onChange={event => setRejectionCodes(current => ({ ...current, [item.evidenceUuid]: event.target.value }))}
              >
                <option value="">Choose rejection reason</option>
                <option value="unreadable">Unreadable</option>
                <option value="wrong_document_type">Wrong document type</option>
                <option value="expired">Expired</option>
                <option value="mismatch">Does not match partner</option>
                <option value="other">Other</option>
              </select>
              <Button
                size="sm"
                variant="destructive"
                disabled={review.isPending || !rejectionCodes[item.evidenceUuid]}
                onClick={() => review.mutate({
                  evidenceUuid: item.evidenceUuid,
                  reviewStatus: 'rejected',
                  rejectionReasonCode: rejectionCodes[item.evidenceUuid] as 'unreadable' | 'wrong_document_type' | 'expired' | 'mismatch' | 'other',
                })}
              >Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
