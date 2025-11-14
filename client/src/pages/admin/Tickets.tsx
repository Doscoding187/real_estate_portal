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
import { useTickets } from '@/hooks/admin';

export default function Tickets() {
  const { data, isLoading } = useTickets();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data since we don't have a real tickets endpoint yet
  const mockTickets = [
    {
      id: 1,
      subject: 'Property listing not showing',
      priority: 'high',
      status: 'open',
      user: 'Sarah Johnson',
      createdAt: '2024-06-15',
      assignedTo: 'John Admin',
    },
    {
      id: 2,
      subject: 'Payment processing issue',
      priority: 'medium',
      status: 'in-progress',
      user: 'Mike Williams',
      createdAt: '2024-06-14',
      assignedTo: 'Emma Support',
    },
    {
      id: 3,
      subject: 'Account verification',
      priority: 'low',
      status: 'resolved',
      user: 'James Brown',
      createdAt: '2024-06-10',
      assignedTo: 'Support Team',
    },
    {
      id: 4,
      subject: 'Image upload failing',
      priority: 'high',
      status: 'open',
      user: 'Lisa Davis',
      createdAt: '2024-06-16',
      assignedTo: 'Unassigned',
    },
  ];

  const filteredTickets = useMemo(() => {
    if (!searchTerm) return mockTickets;

    const term = searchTerm.toLowerCase();
    return mockTickets.filter(
      ticket =>
        ticket.subject.toLowerCase().includes(term) ||
        ticket.user.toLowerCase().includes(term) ||
        ticket.status.toLowerCase().includes(term),
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
          <p>Loading tickets...</p>
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
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground">Manage support requests from users</p>
          </div>
          <Button>Create Ticket</Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
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

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-medium">{ticket.subject}</div>
                      <div className="text-sm text-muted-foreground">#{ticket.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ticket.priority === 'high'
                            ? 'destructive'
                            : ticket.priority === 'medium'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ticket.status === 'open'
                            ? 'default'
                            : ticket.status === 'in-progress'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.user}</TableCell>
                    <TableCell>{ticket.createdAt}</TableCell>
                    <TableCell>{ticket.assignedTo}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredTickets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No tickets found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
