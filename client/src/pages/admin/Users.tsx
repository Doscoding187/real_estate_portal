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
import { useUsers } from '@/hooks/admin';

export default function Users() {
  const { data, isLoading } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data since we don't have a real users endpoint yet
  const mockUsers = [
    {
      id: 1,
      name: 'John Admin',
      email: 'john@admin.com',
      role: 'super_admin',
      status: 'active',
      lastLogin: '2024-06-15',
    },
    {
      id: 2,
      name: 'Sarah Agent',
      email: 'sarah@agency.com',
      role: 'agent',
      status: 'active',
      lastLogin: '2024-06-14',
    },
    {
      id: 3,
      name: 'Mike Agency',
      email: 'mike@urbanestates.com',
      role: 'agency_admin',
      status: 'active',
      lastLogin: '2024-06-10',
    },
    {
      id: 4,
      name: 'Emma Visitor',
      email: 'emma@gmail.com',
      role: 'visitor',
      status: 'inactive',
      lastLogin: '2024-05-20',
    },
  ];

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return mockUsers;

    const term = searchTerm.toLowerCase();
    return mockUsers.filter(
      user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term),
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
          <p>Loading users...</p>
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
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users and their roles</p>
          </div>
          <Button>Add User</Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'super_admin'
                            ? 'destructive'
                            : user.role === 'agency_admin'
                              ? 'default'
                              : user.role === 'agent'
                                ? 'secondary'
                                : 'outline'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.lastLogin}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
