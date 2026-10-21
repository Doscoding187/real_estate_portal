import { useState } from 'react';
import { CheckCircle2, Clock, Download, FileCheck2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { downloadPrivateDocument } from '@/lib/privateDocumentUpload';

type DeliveryFilter = 'all' | 'awaiting' | 'acknowledged';

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export default function ReferralDocuments() {
  const [filter, setFilter] = useState<DeliveryFilter>('all');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const deliveriesQuery = trpc.distribution.developer.listDocumentDeliveries.useQuery(
    { limit: 200 },
    { retry: false },
  );
  const downloadMutation = trpc.distribution.developer.downloadDocumentDelivery.useMutation();
  const acknowledgeMutation = trpc.distribution.developer.acknowledgeDocumentDelivery.useMutation({
    onSuccess: async () => {
      await utils.distribution.developer.listDocumentDeliveries.invalidate();
    },
  });

  const deliveries = deliveriesQuery.data?.deliveries || [];
  const visibleDeliveries =
    filter === 'awaiting'
      ? deliveries.filter(delivery => !delivery.acknowledgedAt)
      : filter === 'acknowledged'
        ? deliveries.filter(delivery => Boolean(delivery.acknowledgedAt))
        : deliveries;

  async function handleDownload(deliveryId: number) {
    setDownloadingId(deliveryId);
    try {
      const result = await downloadMutation.mutateAsync({ deliveryId });
      downloadPrivateDocument(result);
    } catch (error: any) {
      toast.error(error?.message || 'Could not download the delivered document.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleAcknowledge(deliveryId: number, documentLabel: string) {
    const confirmed = window.confirm(
      `Acknowledge receipt of “${documentLabel}” on behalf of your Developer organisation?`,
    );
    if (!confirmed) return;

    setAcknowledgingId(deliveryId);
    try {
      await acknowledgeMutation.mutateAsync({ deliveryId });
      toast.success('Document receipt acknowledged.');
    } catch (error: any) {
      toast.error(error?.message || 'Could not acknowledge this document.');
    } finally {
      setAcknowledgingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Referral documents</h1>
        <p className="mt-1 text-sm text-slate-600">
          Verified deal documents delivered to your Developer organisation. Acknowledging receipt
          confirms that your team received the file; it does not verify the buyer or change payout
          readiness.
        </p>
      </div>

      {deliveriesQuery.isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : deliveriesQuery.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-red-600">
            {deliveriesQuery.error.message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <FileCheck2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Delivered</p>
                  <p className="text-2xl font-semibold">{deliveries.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <Clock className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Awaiting acknowledgement
                  </p>
                  <p className="text-2xl font-semibold">
                    {deliveriesQuery.data?.awaitingAcknowledgementCount || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Acknowledged</p>
                  <p className="text-2xl font-semibold">
                    {deliveriesQuery.data?.acknowledgedCount || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery inbox</CardTitle>
              <CardDescription>
                Download the secure file and acknowledge receipt for your organisation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'All'],
                    ['awaiting', 'Awaiting acknowledgement'],
                    ['acknowledged', 'Acknowledged'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filter === value ? 'default' : 'outline'}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {visibleDeliveries.length === 0 ? (
                <p className="rounded border border-dashed p-6 text-center text-sm text-slate-500">
                  {filter === 'all'
                    ? 'No deal documents have been delivered to your organisation yet.'
                    : `No ${filter} document deliveries.`}
                </p>
              ) : (
                visibleDeliveries.map(delivery => {
                  const acknowledged = Boolean(delivery.acknowledgedAt);
                  return (
                    <div key={delivery.deliveryId} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{delivery.documentLabel}</p>
                            <Badge variant={acknowledged ? 'default' : 'secondary'}>
                              {acknowledged ? 'Acknowledged' : 'Awaiting acknowledgement'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-700">
                            {delivery.developmentName} | {delivery.dealRef}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {delivery.buyerName ? `Buyer: ${delivery.buyerName} | ` : ''}
                            Delivered {formatDateTime(delivery.deliveredAt)}
                            {delivery.deliveredBy?.name ? ` by ${delivery.deliveredBy.name}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">File: {delivery.fileName}</p>
                          {acknowledged ? (
                            <p className="mt-2 text-xs text-emerald-700">
                              Acknowledged {formatDateTime(delivery.acknowledgedAt as string)}
                              {delivery.acknowledgedBy?.name
                                ? ` by ${delivery.acknowledgedBy.name}`
                                : ''}
                            </p>
                          ) : null}
                          {delivery.acknowledgementNote ? (
                            <p className="mt-1 text-xs text-slate-600">
                              Note: {delivery.acknowledgementNote}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingId === delivery.deliveryId}
                            onClick={() => void handleDownload(delivery.deliveryId)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            {downloadingId === delivery.deliveryId ? 'Opening…' : 'Download'}
                          </Button>
                          {!acknowledged ? (
                            <Button
                              size="sm"
                              disabled={acknowledgingId === delivery.deliveryId}
                              onClick={() =>
                                void handleAcknowledge(delivery.deliveryId, delivery.documentLabel)
                              }
                            >
                              {acknowledgingId === delivery.deliveryId
                                ? 'Acknowledging…'
                                : 'Acknowledge receipt'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
