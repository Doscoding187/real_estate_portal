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
  Filter,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Property Listings</h1>
              <p className="text-muted-foreground">Manage all properties on the platform</p>
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
                  placeholder="Search by title, city..."
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

        {/* Properties Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Properties</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading properties...</div>
            ) : !data?.properties.length ? (
              <div className="py-12 text-center text-muted-foreground">No properties found.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.properties.map((property: any) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.title}</TableCell>
                        <TableCell>{property.city}</TableCell>
                        <TableCell>{formatPrice(property.price)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(property.status)}>
                            {property.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(property.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setLocation(`/property/${property.id}`)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Edit Property</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete Property</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                  >
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil((data?.total || 0) / 20)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil((data?.total || 0) / 20)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
