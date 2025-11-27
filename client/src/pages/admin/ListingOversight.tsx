import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Archive,
  ArrowLeft,
  Filter,
  Home,
  MapPin,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ListingOversight() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [actionReason, setActionReason] = useState('');
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<any>(null);

  // Use the listing approval queue endpoint instead of admin.listProperties
  const { data, isLoading, refetch } = trpc.listing.getApprovalQueue.useQuery({
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  });

  // Use listing approve/reject mutations instead of admin.moderateProperty
  const approveMutation = trpc.listing.approve.useMutation({
    onSuccess: () => {
      toast.success('Property approved successfully');
      refetch();
      setIsActionDialogOpen(false);
      setSelectedProperty(null);
      setActionReason('');
    },
    onError: error => {
      toast.error(error.message || 'Failed to approve property');
    },
  });

  const rejectMutation = trpc.listing.reject.useMutation({
    onSuccess: () => {
      toast.success('Property rejected successfully');
      refetch();
      setIsActionDialogOpen(false);
      setSelectedProperty(null);
      setActionReason('');
    },
    onError: error => {
      toast.error(error.message || 'Failed to reject property');
    },
  });

  const deleteMutation = trpc.listing.delete.useMutation({
    onSuccess: () => {
      toast.success('Property deleted successfully');
      refetch();
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
    },
    onError: error => {
      toast.error(error.message || 'Failed to delete property');
    },
  });

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || user?.role !== 'super_admin') {
    setLocation('/login');
    return null;
  }

  const handleModerate = (property: any, action: 'approve' | 'reject' | 'archive') => {
    setSelectedProperty({ ...property, action });
    setIsActionDialogOpen(true);
  };

  const confirmModeration = () => {
    if (!selectedProperty) return;

    if (selectedProperty.action === 'approve') {
      approveMutation.mutate({
        listingId: selectedProperty.listingId,
        notes: actionReason,
      });
    } else if (selectedProperty.action === 'reject') {
      rejectMutation.mutate({
        listingId: selectedProperty.listingId,
        reason: actionReason,
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'sold':
      case 'rented':
        return 'outline';
      case 'archived':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleDelete = (property: any) => {
    setPropertyToDelete(property);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!propertyToDelete) return;
    deleteMutation.mutate({ id: propertyToDelete.id });
  };

  const getActionButton = (property: any) => {
    switch (property.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/admin/review/${property.id}`);
              }}
            >
              <Eye className="h-3 w-3 mr-2" />
              Review
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(property);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      default:
        return (
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(property);
            }}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Listing Oversight</h1>
              <p className="text-muted-foreground">Review and moderate property listings</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <GlassCard className="mb-6 border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or address..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/50 border-slate-200 focus:bg-white transition-all">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="flex items-center gap-2 bg-white/50 hover:bg-white">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </Button>
            </div>
          </CardContent>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{data?.length || 0}</div>
            </CardContent>
          </GlassCard>
          <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data?.filter((p: any) => p.status === 'pending').length || 0}
              </div>
            </CardContent>
          </GlassCard>
          <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data?.filter((p: any) => p.status === 'approved').length || 0}
              </div>
            </CardContent>
          </GlassCard>
          <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data?.filter((p: any) => p.status === 'rejected').length || 0}
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* Properties Table */}
        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
          <CardHeader>
            <CardTitle className="text-slate-800">Property Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading properties...</div>
            ) : !data?.length ? (
              <div className="py-12 text-center text-muted-foreground">No properties found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="text-slate-500">Property</TableHead>
                    <TableHead className="text-slate-500">Type</TableHead>
                    <TableHead className="text-slate-500">Action</TableHead>
                    <TableHead className="text-slate-500">Status</TableHead>
                    <TableHead className="text-slate-500">Submitted</TableHead>
                    <TableHead className="text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((property: any) => (
                    <TableRow key={property.id} className="hover:bg-white/40 border-slate-100 transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-700">{property.listingTitle}</div>
                          <div className="text-sm text-muted-foreground">
                            Submitted by User #{property.submittedBy}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.listingPropertyType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{property.listingAction}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(property.status)}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{new Date(property.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getActionButton(property)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </GlassCard>

        {/* Moderation Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProperty?.action === 'approve' && 'Approve Property Listing'}
                {selectedProperty?.action === 'reject' && 'Reject Property Listing'}
              </DialogTitle>
              <DialogDescription>{selectedProperty?.listingTitle}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Textarea
                  placeholder="Provide a reason for this action..."
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmModeration}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  variant={selectedProperty?.action === 'reject' ? 'destructive' : 'default'}
                >
                  {approveMutation.isPending || rejectMutation.isPending ? (
                    'Processing...'
                  ) : (
                    <>
                      {selectedProperty?.action === 'approve' && 'Approve'}
                      {selectedProperty?.action === 'reject' && 'Reject'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Property Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{propertyToDelete?.listingTitle}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                variant="destructive"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
