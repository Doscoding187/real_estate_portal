import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
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

  const { data, isLoading, refetch } = trpc.admin.listProperties.useQuery({
    limit: 50,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    search: searchTerm || undefined,
  });

  const moderateMutation = trpc.admin.moderateProperty.useMutation({
    onSuccess: () => {
      toast.success('Property status updated');
      refetch();
      setIsActionDialogOpen(false);
      setSelectedProperty(null);
      setActionReason('');
    },
    onError: error => {
      toast.error(error.message || 'Failed to update property');
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

    moderateMutation.mutate({
      propertyId: selectedProperty.id,
      action: selectedProperty.action,
      reason: actionReason,
    });
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

  const getActionButton = (property: any) => {
    switch (property.status) {
      case 'pending':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleModerate(property, 'approve')}
              disabled={moderateMutation.isPending}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleModerate(property, 'reject')}
              disabled={moderateMutation.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        );
      case 'available':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleModerate(property, 'archive')}
            disabled={moderateMutation.isPending}
          >
            <Archive className="h-3 w-3 mr-1" />
            Archive
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-3xl font-bold">Listing Oversight</h1>
              <p className="text-muted-foreground">Review and moderate property listings</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or address..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.pagination.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data?.properties.filter((p: any) => p.status === 'pending').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data?.properties.filter((p: any) => p.status === 'available').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data?.properties.filter((p: any) => p.status === 'archived').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties Table */}
        <Card>
          <CardHeader>
            <CardTitle>Property Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading properties...</div>
            ) : !data?.properties.length ? (
              <div className="py-12 text-center text-muted-foreground">No properties found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.properties.map((property: any) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{property.title}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            Owner #{property.ownerId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatPrice(property.price)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {property.city}, {property.province}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(property.status)}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(property.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{getActionButton(property)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Moderation Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProperty?.action === 'approve' && 'Approve Property Listing'}
                {selectedProperty?.action === 'reject' && 'Reject Property Listing'}
                {selectedProperty?.action === 'archive' && 'Archive Property Listing'}
              </DialogTitle>
              <DialogDescription>{selectedProperty?.title}</DialogDescription>
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
                  disabled={moderateMutation.isPending}
                  variant={selectedProperty?.action === 'reject' ? 'destructive' : 'default'}
                >
                  {selectedProperty?.action === 'approve' && 'Approve'}
                  {selectedProperty?.action === 'reject' && 'Reject'}
                  {selectedProperty?.action === 'archive' && 'Archive'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
