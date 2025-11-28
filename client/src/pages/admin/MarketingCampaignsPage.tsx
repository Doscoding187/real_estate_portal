import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Filter, Megaphone, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

const MarketingCampaignsPage: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Determine owner type and ID based on user role
  const isSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  const ownerType = !isSuperAdmin 
    ? (user?.role === 'agency_admin' ? 'agency' : 'agent') 
    : undefined;
    
  const ownerId = !isSuperAdmin 
    ? (user?.agencyId || user?.id || 0) 
    : undefined;

  const { data: campaigns, isLoading } = trpc.marketing.listCampaigns.useQuery({
    ownerType: ownerType as any,
    ownerId: ownerId,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="bg-amber-500 text-white">Paused</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-slate-500 text-white">Completed</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Scheduled</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h1>
          <p className="text-slate-500">Manage your internal promotions and boosts</p>
        </div>
        <Button onClick={() => setLocation('/admin/marketing/create')} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-slate-900">
                {campaigns?.filter(c => c.status === 'active').length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Impressions</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Leads Generated</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Spend</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search campaigns..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                {isSuperAdmin && <TableHead>Owner</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Loading campaigns...
                  </TableCell>
                </TableRow>
              ) : campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No campaigns found. Create your first one!
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((campaign) => (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setLocation(`/admin/marketing/${campaign.id}`)}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    {isSuperAdmin && <TableCell>{campaign.ownerType}</TableCell>}
                    <TableCell>{campaign.type}</TableCell>
                    <TableCell>{campaign.targetType}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>{format(new Date(campaign.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingCampaignsPage;
