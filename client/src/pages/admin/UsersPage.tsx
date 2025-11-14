import React, { useState } from 'react';
import { Plus, Users, TrendingUp, Calendar, Eye, MessageSquare, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Record<string, any> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // User stats cards data
  const userStats = [
    {
      title: 'Total Registered Users',
      value: '3,421',
      change: '+142 this month',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Active This Month',
      value: '1,847',
      change: '+89 this month',
      icon: <TrendingUp className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'New Signups',
      value: '245',
      change: '+12% from last month',
      icon: <Calendar className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      title: 'Engagement Rate',
      value: '54%',
      change: '+3% from last month',
      icon: <TrendingUp className="h-6 w-6 text-cyan-600" />,
      color: 'bg-cyan-100',
    },
  ];

  // User segments
  const userSegments = [
    { id: 'all', name: 'All Users' },
    { id: 'buyers', name: 'Buyers' },
    { id: 'renters', name: 'Renters' },
    { id: 'sellers', name: 'Individual Sellers (For Sale By Owner)' },
    { id: 'inactive', name: 'Inactive Users' },
  ];

  // User table data
  const userData: Record<string, any>[] = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@email.com',
      type: 'Buyer',
      registration: '2025-01-15',
      lastActive: '2025-11-12',
      saved: 12,
      inquiries: 3,
      status: 'Active',
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      type: 'Renter',
      registration: '2025-03-22',
      lastActive: '2025-11-11',
      saved: 8,
      inquiries: 5,
      status: 'Active',
    },
    {
      id: 3,
      name: 'Mike Williams',
      email: 'mike.w@email.com',
      type: 'Seller',
      registration: '2025-02-10',
      lastActive: '2025-11-10',
      saved: 0,
      inquiries: 12,
      status: 'Active',
    },
    {
      id: 4,
      name: 'Emma Davis',
      email: 'emma.d@email.com',
      type: 'Buyer',
      registration: '2025-10-05',
      lastActive: '2025-11-05',
      saved: 5,
      inquiries: 1,
      status: 'Inactive',
    },
  ];

  const handleViewUser = (user: Record<string, any>) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users Module</h1>
          <p className="text-muted-foreground">Manage end-users (non-professionals)</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {userStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">{stat.title}</h3>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.color}`}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Segments Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {userSegments.map(segment => (
                <TabsTrigger key={segment.id} value={segment.id}>
                  {segment.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* User Table */}
          <div className="mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <h2 className="text-lg font-bold">Users</h2>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <select className="border border-input rounded-md px-3 py-2 text-sm">
                  <option>All Statuses</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Suspended</option>
                </select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Saved Properties</TableHead>
                  <TableHead>Inquiries Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.type}</TableCell>
                    <TableCell>{user.registration}</TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell>{user.saved}</TableCell>
                    <TableCell>{user.inquiries}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Profile Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-bold">{selectedUser.name}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-bold">{selectedUser.email}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">User Type</p>
                      <p className="font-bold">{selectedUser.type}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-bold">
                        <Badge variant={getStatusVariant(selectedUser.status)}>
                          {selectedUser.status}
                        </Badge>
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-bold">{selectedUser.registration}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Last Active</p>
                      <p className="font-bold">{selectedUser.lastActive}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-lg font-bold mb-3">Activity Timeline</h3>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">Saved 3 properties</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-0.5 h-full bg-border"></div>
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">Sent inquiry to Century Properties</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium">Registered account</p>
                      <p className="text-xs text-muted-foreground">2 weeks ago</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication History */}
              <div>
                <h3 className="text-lg font-bold mb-3">Communication History</h3>
                <div className="space-y-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <p className="font-medium">Welcome email</p>
                        <p className="text-xs text-muted-foreground">2025-11-12</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent automatically after registration
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex justify-between">
                        <p className="font-medium">Property alert: New listings in Sandton</p>
                        <p className="text-xs text-muted-foreground">2025-11-10</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Weekly property alert based on saved searches
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* POPIA Actions */}
              <div>
                <h3 className="text-lg font-bold mb-3">POPIA Compliance</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    Export User Data
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete User Data
                  </Button>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <h3 className="text-lg font-bold mb-3">Admin Notes</h3>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground text-sm">
                      User has shown interest in premium listings. Consider offering a trial
                      subscription.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button size="sm">Send Message</Button>
                <Button variant="outline" size="sm">
                  View All Activity
                </Button>
                <Button variant="destructive" size="sm">
                  Suspend User
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
