import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ADMIN_PAGE_CLASS } from '@/components/admin/adminPageLayout';
import { useAuth } from '@/_core/hooks/useAuth';
import { isSuperAdminRole } from '@/_core/roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInvalidateAdminQueues } from './dashboard/useInvalidateAdminQueues';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type InventoryStatus =
  | 'all'
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'sold'
  | 'rented';

interface Property {
  id: number;
  title: string | null;
  price: number | null;
  status: string;
  city: string | null;
  createdAt: string;
  propertyType?: string | null;
  userId?: number | null;
  qualityScore?: number;
}

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus>('all');
  const [page, setPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const { data, isLoading, isError, refetch } = trpc.admin.listProperties.useQuery({
    page,
    limit: 20,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const invalidateQueues = useInvalidateAdminQueues();

  const deleteMutation = trpc.listing.delete.useMutation({
    onSuccess: () => {
      toast.success('Property deleted successfully');
      setIsDeleteDialogOpen(false);
      setPropertyToDelete(null);
      void refetch();
      invalidateQueues();
    },
    onError: error => {
      toast.error(error.message || 'Failed to delete property');
    },
  });

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || !isSuperAdmin) {
    setLocation('/login');
    return null;
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
      case 'published':
        return 'default'; // primary/blue
      case 'pending':
      case 'pending_review':
        return 'secondary'; // gray/secondary
      case 'sold':
      case 'rented':
        return 'outline';
      case 'archived':
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price || price === null) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleDelete = (property: Property) => {
    setPropertyToDelete(property);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!propertyToDelete) return;
    deleteMutation.mutate({ id: propertyToDelete.id });
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className={ADMIN_PAGE_CLASS}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Listings</h1>
              <p className="text-sm text-slate-600">
                Manage listing inventory. Open Approvals to review pending submissions.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  aria-label="Search listings by title or address"
                  placeholder="Search by title or address..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-white/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={value => {
                  setStatusFilter(value as InventoryStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  aria-label="Filter listing inventory by status"
                  className="bg-white/50 border-slate-200 focus:bg-white transition-all"
                >
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="pending_review">Pending review</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Properties Table */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader>
            <CardTitle className="text-slate-800">Listing inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-4" data-testid="listings-loading">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : isError ? (
              <div
                role="alert"
                className="py-10 flex items-center justify-center gap-3 text-sm text-red-800"
              >
                <span>Could not load listings.</span>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : !data?.properties?.length ? (
              <div className="py-12 text-center text-muted-foreground">
                No listings match these filters.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="text-slate-500">Title & Quality</TableHead>
                      <TableHead className="text-slate-500">Type</TableHead>
                      <TableHead className="text-slate-500">Location</TableHead>
                      <TableHead className="text-slate-500">Price</TableHead>
                      <TableHead className="text-slate-500">Status</TableHead>
                      <TableHead className="text-slate-500">Submitted By</TableHead>
                      <TableHead className="text-slate-500">Created</TableHead>
                      <TableHead className="text-right text-slate-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.properties?.map((property: Property) => (
                      <TableRow
                        key={property.id}
                        className="hover:bg-white/40 border-slate-100 transition-colors"
                      >
                        <TableCell className="font-medium text-slate-700">
                          {property.title || 'Untitled'}
                          {/* Quality Score Badge - Phase 6 */}
                          {(property as any).qualityScore > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge
                                variant="outline"
                                className={`h-5 text-[10px] px-1 border-0 ${
                                  (property as any).qualityScore >= 90
                                    ? 'bg-purple-100 text-purple-700'
                                    : (property as any).qualityScore >= 75
                                      ? 'bg-blue-100 text-blue-700'
                                      : (property as any).qualityScore >= 50
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-red-50 text-red-600'
                                }`}
                              >
                                Quality: {(property as any).qualityScore}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{property.propertyType || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {property.city || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {formatPrice(property.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(property.status || 'unknown')}>
                            {property.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          User #{property.userId || 'N/A'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {property.createdAt
                            ? new Date(property.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                              onClick={e => {
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
                              aria-label={`Delete listing ${property.title || property.id}`}
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(property);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Simple Pagination */}
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-white/50 hover:bg-white"
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Showing {data.properties.length} of {data.pagination?.total ?? data.properties.length}{' '}
                    &middot; Page {page} of {data?.pagination?.totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (data?.pagination?.totalPages || 1)}
                    className="bg-white/50 hover:bg-white"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DialogContent
            onEscapeKeyDown={e => e.preventDefault()}
            onPointerDownOutside={e => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Delete Property Listing</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{propertyToDelete?.title}"? This action cannot be
                undone.
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
