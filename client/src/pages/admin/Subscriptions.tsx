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
import { useSubscriptions } from '@/hooks/admin';

export default function Subscriptions() {
  const { data, isLoading } = useSubscriptions();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data since we don't have a real subscriptions endpoint yet
  const mockSubscriptions = [
    {
      id: 1,
      agency: 'Premium Properties SA',
      plan: 'premium',
      status: 'active',
      expiry: '2024-12-31',
      revenue: 1200,
    },
    {
      id: 2,
      agency: 'Urban Estates',
      plan: 'basic',
      status: 'active',
      expiry: '2024-11-15',
      revenue: 600,
    },
    {
      id: 3,
      agency: 'Coastal Homes',
      plan: 'premium',
      status: 'suspended',
      expiry: '2024-10-30',
      revenue: 1200,
    },
    {
      id: 4,
      agency: 'Mountain View Realty',
      plan: 'free',
      status: 'trial',
      expiry: '2024-09-20',
      revenue: 0,
    },
  ];

  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return mockSubscriptions;

    const term = searchTerm.toLowerCase();
    return mockSubscriptions.filter(
      sub =>
        sub.agency.toLowerCase().includes(term) ||
        sub.plan.toLowerCase().includes(term) ||
        sub.status.toLowerCase().includes(term),
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
          <p>Loading subscriptions...</p>
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
            <h1 className="text-3xl font-bold">Subscription Management</h1>
            <p className="text-muted-foreground">Manage agency subscription plans</p>
          </div>
          <Button>Manage Plans</Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agency</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.agency}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{sub.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'default'
                            : sub.status === 'trial'
                              ? 'outline'
                              : 'destructive'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.expiry}</TableCell>
                    <TableCell>R{sub.revenue}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No subscriptions found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
