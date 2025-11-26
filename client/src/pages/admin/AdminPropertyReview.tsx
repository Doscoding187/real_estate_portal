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
import { CheckCircle, XCircle, MessageSquare, ArrowLeft, AlertTriangle } from 'lucide-react';
import PropertyDetail from '@/pages/PropertyDetail';

export default function AdminPropertyReview() {
  const [, params] = useRoute('/admin/review/:id');
  const [, setLocation] = useLocation();
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Fetch property status to show current state
  const { data: propertyData, refetch } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 }
  );

  const approveMutation = trpc.listing.approve.useMutation({
    onSuccess: () => {
      toast.success('Property approved successfully');
      setIsApproveDialogOpen(false);
      refetch();
      // Optional: redirect back to oversight after delay
      setTimeout(() => setLocation('/admin/listing-approvals'), 1500);
    },
    onError: (error) => {
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
    onError: (error) => {
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
        <div className="text-sm text-slate-400">
          Viewing as Super Admin
        </div>
      </div>

      {/* Main Property Content */}
      <div className="pointer-events-none opacity-100">
        {/* We wrap PropertyDetail in a div that disables interaction with user buttons if needed, 
            or we just let them be clickable but they won't do much for admin */}
        <div className="pointer-events-auto">
          <PropertyDetail propertyId={propertyId} />
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            Current Status: 
            <span className={`ml-2 font-bold uppercase ${
              propertyData?.property?.status === 'published' || propertyData?.property?.status === 'approved' ? 'text-green-600' :
              propertyData?.property?.status === 'rejected' ? 'text-red-600' :
              'text-orange-500'
            }`}>
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
                  Please provide feedback to the agent explaining why this listing is being rejected.
                  This will be sent to them directly.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">Rejection Reason / Feedback</label>
                <Textarea 
                  placeholder="e.g., Photos are blurry, Description contains prohibited content..." 
                  className="min-h-[120px]"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
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
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
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
