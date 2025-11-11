import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter } from 'lucide-react';
import { useListings } from '@/hooks/admin';

export default function Listings() {
  const { data, isLoading } = useListings();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data since we don't have a real listings endpoint yet
  const mockListings = [
    { id: 1, title: 'Modern Family Home', price: 2500000, status: 'available', city: 'Johannesburg', owner: 'Sarah Johnson', featured: true },
    { id: 2, title: 'Luxury Apartment', price: 1800000, status: 'pending', city: 'Cape Town', owner: 'Mike Williams', featured: false },
    { id: 3, title: 'Townhouse for Rent', price: 25000, status: 'rented', city: 'Durban', owner: 'Emma Davis', featured: false },
    { id: 4, title: 'Beachfront Villa', price: 4500000, status: 'available', city: 'Port Elizabeth', owner: 'James Brown', featured: true },
  ];

  const filteredListings = useMemo(() => {
    if (!searchTerm) return mockListings;
    
    const term = searchTerm.toLowerCase();
    return mockListings.filter(listing => 
      listing.title.toLowerCase().includes(term) || 
      listing.city.toLowerCase().includes(term) ||
      listing.owner.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleExportCsv = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV clicked');
  };

  if (isLoading) {
    return (
      <DashboardLayout adminSidebar={true}>
        <div className="flex items-center justify-center h-64">
          <p>Loading listings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout adminSidebar={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Property Listings</h1>
            <p className="text-muted-foreground">Manage property listings on the platform</p>
          </div>
          <Button>Review Pending</Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" onClick={handleExportCsv}>
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.title}</TableCell>
                    <TableCell>R{listing.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={listing.status === 'available' ? "default" : listing.status === 'pending' ? "secondary" : "outline"}>
                        {listing.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{listing.city}</TableCell>
                    <TableCell>{listing.owner}</TableCell>
                    <TableCell>
                      {listing.featured ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredListings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No listings found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}