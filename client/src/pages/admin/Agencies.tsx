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
import { Search, Filter, Plus } from 'lucide-react';
import { useAgencies } from '@/hooks/admin';

export default function Agencies() {
  const { data, isLoading } = useAgencies();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgencies = useMemo(() => {
    if (!data?.agencies) return [];
    if (!searchTerm) return data.agencies;
    
    const term = searchTerm.toLowerCase();
    return data.agencies.filter(agency => 
      agency.name.toLowerCase().includes(term) || 
      agency.email.toLowerCase().includes(term) ||
      agency.city.toLowerCase().includes(term)
    );
  }, [data?.agencies, searchTerm]);

  const handleExportCsv = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV clicked');
  };

  if (isLoading) {
    return (
      <DashboardLayout adminSidebar={true}>
        <div className="flex items-center justify-center h-64">
          <p>Loading agencies...</p>
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
            <h1 className="text-3xl font-bold">Agency Management</h1>
            <p className="text-muted-foreground">Manage real estate agencies on the platform</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Agency
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agencies..."
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

        {/* Agencies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell>
                      <div className="font-medium">{agency.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {agency.id}</div>
                    </TableCell>
                    <TableCell>
                      <div>{agency.email}</div>
                      <div className="text-sm text-muted-foreground">{agency.phone}</div>
                    </TableCell>
                    <TableCell>
                      {agency.city}, {agency.province}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{agency.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agency.isVerified ? "default" : "secondary"}>
                        {agency.isVerified ? "Verified" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredAgencies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No agencies found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}