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
import { Search, Filter, Activity } from 'lucide-react';

export default function Audit() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data since we don't have a real audit logs endpoint yet
  const mockAuditLogs = [
    { id: 1, timestamp: '2024-06-15 14:30:22', user: 'John Admin', action: 'Updated property status', target: 'Property #123', ip: '192.168.1.100' },
    { id: 2, timestamp: '2024-06-15 13:45:10', user: 'Sarah Agent', action: 'Created new listing', target: 'Property #456', ip: '192.168.1.101' },
    { id: 3, timestamp: '2024-06-15 12:20:05', user: 'Mike Admin', action: 'Deleted user account', target: 'User #789', ip: '192.168.1.102' },
    { id: 4, timestamp: '2024-06-15 11:15:33', user: 'Emma Support', action: 'Resolved support ticket', target: 'Ticket #101', ip: '192.168.1.103' },
    { id: 5, timestamp: '2024-06-15 10:05:12', user: 'Alex Admin', action: 'Modified agency subscription', target: 'Agency #42', ip: '192.168.1.104' },
    { id: 6, timestamp: '2024-06-15 09:30:45', user: 'System', action: 'Generated monthly report', target: 'Report #2024-06', ip: '192.168.1.1' },
  ];

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return mockAuditLogs;
    
    const term = searchTerm.toLowerCase();
    return mockAuditLogs.filter(log => 
      log.user.toLowerCase().includes(term) || 
      log.action.toLowerCase().includes(term) ||
      log.target.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleExportCsv = () => {
    // TODO: Implement CSV export functionality
    console.log('Export CSV clicked');
  };

  return (
    <DashboardLayout adminSidebar={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground">Track all admin actions and changes</p>
          </div>
          <Button variant="outline" onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.timestamp}</TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.target}</TableCell>
                    <TableCell>{log.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}