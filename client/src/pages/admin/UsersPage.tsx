import React, { useEffect, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
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

type UsersPageProps = {
  initialRole?: string;
};

const ROLE_LABELS: Record<string, string> = {
  visitor: 'Visitor',
  agent: 'Agent',
  agency_admin: 'Agency admin',
  property_developer: 'Developer',
  service_provider: 'Service provider',
  super_admin: 'Admin',
};

export const userDisplayName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email || 'Unnamed';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : null);

const UsersPage: React.FC<UsersPageProps> = ({ initialRole }) => {
  const [activeTab, setActiveTab] = useState(initialRole ?? 'all');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (!initialRole) return;
    setActiveTab(initialRole);
    setPage(1);
  }, [initialRole]);

  const { data, isLoading, isError, refetch } = trpc.admin.listUsers.useQuery({
    page,
    limit: 20,
    search: searchQuery.trim() || undefined,
    role: activeTab !== 'all' ? (activeTab as any) : undefined,
  });

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

  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {initialRole === 'agent' ? 'Agents' : 'Users'}
        </h1>
        <p className="text-sm text-slate-600">
          {initialRole === 'agent'
            ? 'Everyone registered as an agent.'
            : 'Everyone registered on the platform, newest first.'}
        </p>
      </div>

      <GlassCard className="border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {initialRole ? (
              <div />
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={v => {
                  setActiveTab(v);
                  setPage(1);
                }}
              >
                <TabsList className="bg-slate-100 p-1 flex-wrap h-auto">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="visitor">Visitors</TabsTrigger>
                  <TabsTrigger value="agent">Agents</TabsTrigger>
                  <TabsTrigger value="agency_admin">Agency admins</TabsTrigger>
                  <TabsTrigger value="property_developer">Developers</TabsTrigger>
                  <TabsTrigger value="service_provider">Providers</TabsTrigger>
                  <TabsTrigger value="super_admin">Admins</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="relative w-full lg:w-72">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
              <Input
                aria-label="Search users by name or email"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-white/50 focus:bg-white border-slate-200"
              />
            </div>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="space-y-3 py-4" data-testid="users-loading">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : isError ? (
              <div
                role="alert"
                className="py-10 flex items-center justify-center gap-3 text-sm text-red-800"
              >
                <span>Could not load users.</span>
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : !data?.users?.length ? (
              <div className="py-12 text-center text-muted-foreground">No users found.</div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-600">Name</TableHead>
                    <TableHead className="font-semibold text-slate-600">Email</TableHead>
                    <TableHead className="font-semibold text-slate-600">Role</TableHead>
                    <TableHead className="font-semibold text-slate-600">Registered</TableHead>
                    <TableHead className="font-semibold text-slate-600">Last sign-in</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600 pr-6">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user: any) => (
                    <TableRow
                      key={user.id}
                      className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700">
                        {userDisplayName(user)}
                      </TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getUserRoleVariant(user.role)}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(user.lastSignedIn) ?? 'Never'}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`View ${userDisplayName(user)}`}
                          className="h-8 w-8 p-0 bg-white hover:bg-slate-100"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-100 mt-4">
              <div className="text-sm text-muted-foreground">
                {data?.users?.length ? `Showing ${data.users.length} of ${total}` : ''}
              </div>
              <div className="flex items-center gap-2">
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
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="bg-white hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      <Dialog open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {selectedUser ? userDisplayName(selectedUser) : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-600 mb-1">Email</p>
                <p className="font-semibold text-slate-800 break-all">{selectedUser.email}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-600 mb-1">Role</p>
                <Badge variant={getUserRoleVariant(selectedUser.role)}>
                  {ROLE_LABELS[selectedUser.role] ?? selectedUser.role}
                </Badge>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-600 mb-1">Registered</p>
                <p className="font-semibold text-slate-800">{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-600 mb-1">Last sign-in</p>
                <p className="font-semibold text-slate-800">
                  {formatDate(selectedUser.lastSignedIn) ?? 'Never'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
