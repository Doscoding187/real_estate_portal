import React, { useState } from 'react';
import { Plus, Eye, MessageSquare, Download, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import { trpc } from '@/lib/trpc';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = trpc.admin.listUsers.useQuery({
    page,
    limit: 20,
    search: searchQuery || undefined,
    role: activeTab !== 'all' ? (activeTab as any) : undefined,
  });

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const getUserRoleVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'agency_admin':
        return 'default';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Users Module</h1>
          <p className="text-slate-500">Manage all platform users</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Segments / Tabs */}
      <GlassCard className="border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="visitor">Visitors</TabsTrigger>
              <TabsTrigger value="agent">Agents</TabsTrigger>
              <TabsTrigger value="agency_admin">Agency Admins</TabsTrigger>
              <TabsTrigger value="super_admin">Admins</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/50 focus:bg-white border-slate-200"
              />
            </div>
            <Button variant="outline" className="bg-white hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* User Table */}
          <div className="mt-6">
            {isLoading ? (
               <div className="py-12 text-center text-muted-foreground">Loading users...</div>
            ) : !data?.users?.length ? (
               <div className="py-12 text-center text-muted-foreground">No users found.</div>
            ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-500">Name</TableHead>
                  <TableHead className="font-semibold text-slate-500">Email</TableHead>
                  <TableHead className="font-semibold text-slate-500">Role</TableHead>
                  <TableHead className="font-semibold text-slate-500">Registration</TableHead>
                  <TableHead className="font-semibold text-slate-500">Last Active</TableHead>
                  <TableHead className="text-right font-semibold text-slate-500 pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user: any) => (
                  <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-700">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-slate-600">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getUserRoleVariant(user.role)} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-slate-100" onClick={() => handleViewUser(user)}>
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-slate-100">
                          <MessageSquare className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            
            {/* Pagination */}
             <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-100 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white hover:bg-slate-50"
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
                  className="bg-white hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>

          </div>
        </CardContent>
      </GlassCard>

      {/* User Profile Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              User Profile: {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 pt-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Email</p>
                      <p className="font-semibold text-slate-800">{selectedUser.email}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Role</p>
                      <Badge variant={getUserRoleVariant(selectedUser.role)} className="capitalize">
                        {selectedUser.role}
                      </Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Registered</p>
                      <p className="font-semibold text-slate-800">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                   <div className="p-4 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Last Active</p>
                      <p className="font-semibold text-slate-800">{selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">Send Message</Button>
                <Button variant="outline" size="sm" className="bg-white">
                  Reset Password
                </Button>
                <Button variant="destructive" size="sm">
                  Suspend User
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-white">
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
