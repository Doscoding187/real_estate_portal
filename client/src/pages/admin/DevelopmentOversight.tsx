import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Eye,
  Search,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Home,
  Check,
  Ban,
  MessageSquare,
  History,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevelopmentOversight() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevelopment, setSelectedDevelopment] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes' | null>(
    null,
  );

  // Fetch pending developments
  const {
    data: pendingDevelopments,
    isLoading,
    refetch,
  } = trpc.admin.adminListPendingDevelopments.useQuery();
  const { data: analytics } = trpc.admin.getDevelopmentAnalytics.useQuery();

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const hours = Math.round(seconds / 3600);
    if (hours < 1) return '< 1h';
    return `${hours}h`;
  };

  // Mutations
  const approveMutation = trpc.admin.adminApproveDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development approved and published successfully');
      refetch();
      closeDialog();
    },
    onError: error => {
      toast.error(error.message || 'Failed to approve development');
    },
  });

  const rejectMutation = trpc.admin.adminRejectDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development rejected successfully');
      refetch();
      closeDialog();
    },
    onError: error => {
      toast.error(error.message || 'Failed to reject development');
    },
  });

  const requestChangesMutation = trpc.admin.adminRequestChanges.useMutation({
    onSuccess: () => {
      toast.success('Feedback sent to developer');
      refetch();
      closeDialog();
    },
    onError: error => {
      toast.error(error.message || 'Failed to send feedback');
    },
  });

  // Filter data
  const filteredData =
    pendingDevelopments?.filter(
      dev =>
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.developerName.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  const handleReview = (development: any) => {
    setSelectedDevelopment(development);
    setIsActionDialogOpen(true);
    setReviewAction(null); // Reset action
    setActionReason('');
  };

  const closeDialog = () => {
    setIsActionDialogOpen(false);
    setSelectedDevelopment(null);
    setReviewAction(null);
    setActionReason('');
  };

  const confirmAction = (complianceChecks?: Record<string, boolean>) => {
    if (!selectedDevelopment || !reviewAction) return;

    if (reviewAction === 'approve') {
      approveMutation.mutate({
        developmentId: selectedDevelopment.id,
        complianceChecks,
      });
    } else if (reviewAction === 'request_changes') {
      if (!actionReason.trim()) {
        toast.error('Please provide feedback for the developer');
        return;
      }
      requestChangesMutation.mutate({
        developmentId: selectedDevelopment.id,
        feedback: actionReason,
      });
    } else if (reviewAction === 'reject') {
      if (!actionReason.trim()) {
        toast.error('Please provide a reason for rejection');
        return;
      }
      rejectMutation.mutate({
        developmentId: selectedDevelopment.id,
        reason: actionReason,
      });
    }
  };

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || user?.role !== 'super_admin') {
    // In a real app, we might redirect, but for components used in dashboard layout,
    // we often rely on the parent to handle access control.
    // However, explicit check is safe.
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Assuming this is rendered inside SuperAdminDashboard, so no Navbar needed here 
          But if used standalone, uncomment Navbar. 
          Based on Plan, this will be a route inside SuperAdminDashboard layout.
      */}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Development Management</h1>
              <p className="text-muted-foreground">Review and moderate development applications</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <GlassCard className="border-white/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {pendingDevelopments?.length || 0}
              </div>
            </CardContent>
          </GlassCard>
          <GlassCard className="border-white/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Fast-Track Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {analytics ? `${(analytics.autoApprovalRate * 100).toFixed(0)}%` : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {analytics ? `${analytics.autoApprovedCount} auto-approved` : 'Calculating...'}
              </p>
            </CardContent>
          </GlassCard>
          <GlassCard className="border-white/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Avg Manual Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {analytics ? formatDuration(analytics.avgManualApprovalSeconds) : '-'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Target: &lt; 24h</p>
            </CardContent>
          </GlassCard>
        </div>

        {/* Search & Filter */}
        <GlassCard className="mb-6 border-white/40 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search developments or developers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 border-slate-200 focus:bg-white transition-all max-w-md"
            />
          </div>
        </GlassCard>

        {/* Table */}
        <GlassCard className="border-white/40 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Development</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading pending developments...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No pending approvals found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map(dev => (
                  <TableRow key={dev.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900">{dev.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {dev.city}, {dev.province}
                      </div>
                    </TableCell>
                    <TableCell>{dev.developerName}</TableCell>
                    <TableCell>{new Date(dev.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {dev.developmentType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
                        Pending Review
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleReview(dev)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Review Application
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </GlassCard>

        {/* Review Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={open => !open && closeDialog()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Development Application</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            {selectedDevelopment &&
              (() => {
                // Optimized parsing with useMemo (hook rules require this to be at top level,
                // but since we are conditionally rendering, we should extract a sub-component or
                // just move logic before return if we weren't in a conditional block.
                // However, given the structure, I will extract the content to a lightweight component
                // OR just move the parsing logic safely.
                // To follow React rules strictly, we can't call useMemo inside this conditional callback.
                // I will refactor to parse "just in time" but safely, OR better, render a separate component for the content.

                // Let's use a separate component for the dialog content to allow proper hook usage
                return (
                  <DevelopmentReviewContent
                    development={selectedDevelopment}
                    reviewAction={reviewAction}
                    setReviewAction={setReviewAction}
                    confirmAction={confirmAction}
                    isMutating={
                      approveMutation.isPending ||
                      rejectMutation.isPending ||
                      requestChangesMutation.isPending
                    }
                    actionReason={actionReason}
                    setActionReason={setActionReason}
                  />
                );
              })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function DevelopmentReviewContent({
  development,
  reviewAction,
  setReviewAction,
  confirmAction,
  isMutating,
  actionReason,
  setActionReason,
}: {
  development: any;
  reviewAction: 'approve' | 'reject' | 'request_changes' | null;
  setReviewAction: (action: 'approve' | 'reject' | 'request_changes' | null) => void;
  confirmAction: (checks?: Record<string, boolean>) => void;
  isMutating: boolean;
  actionReason: string;
  setActionReason: (reason: string) => void;
}) {
  const [checklist, setChecklist] = useState({
    images: false,
    data: false,
    pricing: false,
    location: false,
  });
  const [showHistory, setShowHistory] = useState(false);

  // Fetch history when enabled
  const { data: auditLogs, isLoading: isLoadingHistory } =
    trpc.admin.getDevelopmentAuditLogs.useQuery(
      { developmentId: development.id },
      { enabled: showHistory },
    );

  // Safe JSON parsing with useMemo
  const { images, amenities, coverImage } = useMemo(() => {
    const parseJson = (val: any) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(val) ? val : [];
    };

    const parsedImages = parseJson(development.images);
    const parsedAmenities = parseJson(development.amenities);
    return {
      images: parsedImages,
      amenities: parsedAmenities,
      coverImage: parsedImages.length > 0 ? parsedImages[0] : null,
    };
  }, [development]);

  return (
    <div className="space-y-6 py-4">
      {/* Compact Details Header */}
      <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="w-24 h-24 bg-slate-200 rounded-md overflow-hidden flex-shrink-0">
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">No Img</div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{development.name}</h3>
          <div className="text-sm text-slate-600 mb-2">{development.address}</div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{development.totalUnits} Units</Badge>
            <Badge variant="outline">{development.developmentType}</Badge>
            <Badge variant="outline">
              Submitted: {new Date(development.submittedAt).toLocaleDateString()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="font-semibold mb-2 text-sm text-slate-700 uppercase tracking-wide">
          Description
        </h4>
        <div className="p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-600 max-h-40 overflow-y-auto">
          {development.description || 'No description provided.'}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h4 className="font-semibold mb-2 text-sm text-slate-700 uppercase tracking-wide">
          Amenities
        </h4>
        <div className="flex flex-wrap gap-2">
          {amenities.map((amenity: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="font-normal">
              {amenity}
            </Badge>
          ))}
          {(!amenities || amenities.length === 0) && (
            <span className="text-sm text-slate-500 italic">No amenities listed.</span>
          )}
        </div>
      </div>

      {/* Compliance Checklist (Only shown when approving) */}
      {reviewAction === 'approve' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-900 mb-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Compliance Verification
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'images', label: 'Images are high quality & safe' },
              { id: 'data', label: 'Development data is complete' },
              { id: 'pricing', label: 'Pricing appears realistic' },
              { id: 'location', label: 'Location/Address verified' },
            ].map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`check-${item.id}`}
                  checked={checklist[item.id as keyof typeof checklist]}
                  onCheckedChange={checked =>
                    setChecklist(prev => ({ ...prev, [item.id]: !!checked }))
                  }
                />
                <Label
                  htmlFor={`check-${item.id}`}
                  className="text-sm cursor-pointer text-slate-700 font-normal"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Area */}
      <div className="pt-4 border-t border-slate-100">
        {!reviewAction ? (
          <div className="flex gap-4 justify-between items-center">
            <Button
              variant="link"
              className="text-slate-500"
              onClick={() => window.open(`/development/${development.id}`, '_blank')}
            >
              <Eye className="w-4 h-4 mr-2" /> View Full Preview
            </Button>
            <Button
              variant="ghost"
              className="text-slate-500"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" /> {showHistory ? 'Hide History' : 'View History'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setReviewAction('request_changes')}
                className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
              >
                <MessageSquare className="w-4 h-4" /> Request Changes
              </Button>
              <Button
                variant="destructive"
                onClick={() => setReviewAction('reject')}
                className="gap-2"
              >
                <Ban className="w-4 h-4" /> Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 gap-2"
                onClick={() => setReviewAction('approve')}
              >
                <Check className="w-4 h-4" /> Approve
              </Button>
            </div>
          </div>
        ) : reviewAction === 'approve' ? (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Confirm Approval</h4>
            <p className="text-sm text-green-700 mb-4">
              This will immediately publish the development to the public portal and notify the
              developer.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setReviewAction(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => confirmAction(checklist)}
                disabled={isMutating}
              >
                {isMutating ? 'Publishing...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        ) : reviewAction === 'request_changes' ? (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Request Changes (Feedback)</h4>
            <p className="text-sm text-amber-700 mb-4">
              The developer will be notified to make updates. Status will revert to 'Changes
              Requested'.
            </p>
            <Textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder="E.g. Please clarify the amenities list..."
              className="mb-4 bg-white"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setReviewAction(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => confirmAction()}
                disabled={isMutating}
              >
                {isMutating ? 'Sending...' : 'Send Feedback'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">Reject Application</h4>
            <p className="text-sm text-red-700 mb-4">
              This will mark the application as Rejected. Use for policy violations.
            </p>
            <Textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder="E.g. This listing violates our content policy..."
              className="mb-4 bg-white"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setReviewAction(null)} disabled={isMutating}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmAction()} disabled={isMutating}>
                {isMutating ? 'Rejecting...' : 'Reject Application'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit History Section */}
      {showHistory && (
        <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-semibold text-sm text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Application History
          </h4>
          <div className="bg-slate-50 rounded-lg p-4 max-h-60 overflow-y-auto space-y-4">
            {isLoadingHistory ? (
              <div className="text-center text-sm text-slate-500 py-4">Loading history...</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              auditLogs.map(log => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-24 text-slate-400 text-xs text-right pt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <div className="w-px bg-slate-200" />
                  <div className="flex-1 pb-2">
                    <div className="font-medium text-slate-900">
                      {log.user?.name || 'Unknown User'}
                      <span className="text-slate-500 font-normal">
                        {' '}
                        - {log.action.replace('UPDATE_DEVELOPMENT', 'Update')}
                      </span>
                    </div>
                    {log.metadata && (
                      <div className="text-slate-600 mt-1 bg-white p-2 rounded border border-slate-200 inline-block max-w-full">
                        {/* Start of Helper Logic for metadata display */}
                        {(() => {
                          try {
                            const meta =
                              typeof log.metadata === 'string'
                                ? JSON.parse(log.metadata)
                                : log.metadata;
                            if (meta.action === 'request_changes')
                              return (
                                <span className="text-amber-700">
                                  Changes Requested: "{meta.feedback}"
                                </span>
                              );
                            if (meta.action === 'reject')
                              return (
                                <span className="text-red-700">Rejected: "{meta.reason}"</span>
                              );
                            if (meta.action === 'approve')
                              return <span className="text-green-700">Approved</span>;
                            return JSON.stringify(meta);
                          } catch (e) {
                            return String(log.metadata);
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-slate-500 py-4 italic">
                No history found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
