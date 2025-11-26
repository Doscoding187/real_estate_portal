import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Search, Filter } from 'lucide-react';

interface Property {
  id: number;
  title: string | null;
  price: number | null;
  status: string;
  city: string | null;
  createdAt: string;
}

export default function PropertiesPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.admin.listProperties.useQuery({
    page,
    limit: 20,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  });

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || user?.role !== 'super_admin') {
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

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Property Listings</h1>
              <p className="text-slate-500">Manage all properties on the platform</p>
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
                  placeholder="Search by title, city..."
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

        {/* Properties Table */}
        <GlassCard className="border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)]">
          <CardHeader>
            <CardTitle className="text-slate-800">All Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading properties...</div>
            ) : !data?.properties?.length ? (
              <div className="py-12 text-center text-muted-foreground">No properties found.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-200">
                      <TableHead className="text-slate-500">Title</TableHead>
                      <TableHead className="text-slate-500">Location</TableHead>
                      <TableHead className="text-slate-500">Price</TableHead>
                      <TableHead className="text-slate-500">Status</TableHead>
                      <TableHead className="text-slate-500">Created</TableHead>
                      <TableHead className="text-right text-slate-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.properties?.map((property: Property) => (
                      <TableRow key={property.id} className="hover:bg-white/40 border-slate-100 transition-colors">
                        <TableCell className="font-medium text-slate-700">
                          {property.title || 'Untitled'}
                        </TableCell>
                        <TableCell className="text-slate-600">{property.city || 'Unknown'}</TableCell>
                        <TableCell className="text-slate-600">{formatPrice(property.price)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(property.status || 'unknown')}>
                            {property.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {property.createdAt
                            ? new Date(property.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/admin/review/${property.id}`);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-2" />
                            Review Property
                          </Button>
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
                    Page {page} of {data?.pagination?.totalPages || 1}
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
        </GlassCard>
      </div>
    </div>
  );
}
