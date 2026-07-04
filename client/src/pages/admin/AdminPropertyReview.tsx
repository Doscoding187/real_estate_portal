import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bath,
  BedDouble,
  CheckCircle,
  Home,
  ImageOff,
  MapPin,
  Ruler,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

function formatCurrency(value: unknown, action?: string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price not set';

  const suffix = action === 'rent' ? ' / month' : '';
  return `R ${amount.toLocaleString('en-ZA')}${suffix}`;
}

function AdminListingPreview({ data }: { data: any }) {
  const listing = data?.property;
  const images = Array.isArray(data?.images) ? data.images : [];
  const details = listing?.propertyDetails || {};
  const primaryImage = images[0]?.url || images[0]?.originalUrl || listing?.mainImage;
  const location = [listing?.suburb, listing?.city, listing?.province].filter(Boolean).join(', ');
  const stats = [
    { icon: BedDouble, label: 'Bedrooms', value: details.bedrooms ?? listing?.bedrooms },
    { icon: Bath, label: 'Bathrooms', value: details.bathrooms ?? listing?.bathrooms },
    {
      icon: Ruler,
      label: 'Size',
      value:
        details.unitSizeM2 ||
        details.houseAreaM2 ||
        details.floorAreaM2 ||
        details.erfSizeM2 ||
        listing?.area,
      suffix: 'm²',
    },
  ].filter(item => item.value !== undefined && item.value !== null && item.value !== '');

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Home className="mx-auto mb-3 h-8 w-8 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900">Listing not available</h2>
        <p className="mt-2 text-sm text-slate-500">
          This private review record could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="relative min-h-[320px] bg-slate-100 lg:min-h-[560px]">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-slate-400">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
          <span className="absolute left-4 top-4 rounded bg-slate-950/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {listing.status}
          </span>
        </div>

        <div className="flex flex-col gap-6 p-6 lg:p-8">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              {listing.action || listing.listingType}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-950 lg:text-3xl">
              {listing.title}
            </h1>
            {location && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-3xl font-bold text-slate-950">
              {formatCurrency(listing.price, listing.action)}
            </p>
            <p className="mt-1 text-sm text-slate-500">{listing.address}</p>
          </div>

          {stats.length > 0 && (
            <div className="grid grid-cols-3 gap-3 border-y border-slate-200 py-4">
              {stats.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="min-w-0">
                    <Icon className="mb-2 h-4 w-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-950">
                      {item.value}
                      {item.suffix || ''}
                    </p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold uppercase text-slate-500">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {listing.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminPropertyReview() {
  const [, params] = useRoute('/admin/review/:id');
  const [, setLocation] = useLocation();
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Fetch listing status to show current state
  const { data: propertyData, isLoading, refetch } = trpc.listing.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  const approveMutation = trpc.listing.approve.useMutation({
    onSuccess: () => {
      toast.success('Property approved successfully');
      setIsApproveDialogOpen(false);
      refetch();
      // Optional: redirect back to oversight after delay
      setTimeout(() => setLocation('/admin/listing-approvals'), 1500);
    },
    onError: error => {
      toast.error(error.message || 'Failed to approve property');
    },
  });

  const rejectMutation = trpc.listing.reject.useMutation({
    onSuccess: () => {
      toast.success('Property rejected and feedback sent');
      setIsRejectDialogOpen(false);
      refetch();
      setTimeout(() => setLocation('/admin/listing-approvals'), 1500);
    },
    onError: error => {
      toast.error(error.message || 'Failed to reject property');
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      listingId: propertyId,
      notes: feedback, // Optional notes for approval
    });
  };

  const handleReject = () => {
    if (!feedback.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({
      listingId: propertyId,
      reason: feedback,
    });
  };

  if (!propertyId) {
    return <div>Invalid Property ID</div>;
  }

  return (
    <div className="relative min-h-screen pb-24">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-50 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => setLocation('/admin/listing-approvals')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">Admin Review Mode</span>
            <span className="bg-orange-500 text-xs px-2 py-0.5 rounded-full font-medium">
              PREVIEW
            </span>
          </div>
        </div>
        <div className="text-sm text-slate-400">Viewing as Super Admin</div>
      </div>

      <main className="min-h-[calc(100vh-9rem)] bg-slate-50 px-4 py-6 lg:px-8">
        {isLoading ? (
          <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading listing preview...
          </div>
        ) : (
          <AdminListingPreview data={propertyData} />
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Current Status:
            <span
              className={`ml-2 font-bold uppercase ${
                propertyData?.property?.status === 'published' ||
                propertyData?.property?.status === 'approved'
                  ? 'text-green-600'
                  : propertyData?.property?.status === 'rejected'
                    ? 'text-red-600'
                    : 'text-orange-500'
              }`}
            >
              {propertyData?.property?.status || 'Loading...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="lg" className="gap-2">
                <XCircle className="h-5 w-5" />
                Reject Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Reject Listing</DialogTitle>
                <DialogDescription>
                  Please provide feedback to the agent explaining why this listing is being
                  rejected. This will be sent to them directly.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">
                  Rejection Reason / Feedback
                </label>
                <Textarea
                  placeholder="e.g., Photos are blurry, Description contains prohibited content..."
                  className="min-h-[120px]"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" size="lg">
                <CheckCircle className="h-5 w-5" />
                Approve Listing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Listing</DialogTitle>
                <DialogDescription>
                  Are you sure you want to approve this listing? It will be published immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">Internal Notes (Optional)</label>
                <Textarea
                  placeholder="Any internal notes about this approval..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
