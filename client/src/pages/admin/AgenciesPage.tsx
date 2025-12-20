import React, { useState } from 'react';
import { Plus, MapPin, Phone, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

const AgenciesPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAgency, setSelectedAgency] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch real data
  const { data, isLoading } = trpc.admin.listAgencies.useQuery({
    page,
    limit: 20,
    search: searchQuery || undefined,
  });

  const handleViewAgency = (agency: any) => {
    setSelectedAgency(agency);
    setIsModalOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6 container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Agency Management</h1>
          <p className="text-slate-500">Manage real estate agencies and their listings</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-sm" onClick={() => setLocation('/admin/agencies/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Agency
        </Button>
      </div>

      {/* Search */}
      <GlassCard className="border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <CardContent className="pt-6">
          <div className="max-w-md relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 focus:bg-white border-slate-200"
            />
          </div>
        </CardContent>
      </GlassCard>

      {/* Agencies Table */}
      <GlassCard className="border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <CardContent className="pt-6 p-0 overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading agencies...</div>
          ) : !data?.agencies?.length ? (
            <div className="py-12 text-center text-muted-foreground">No agencies found.</div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-500 font-semibold">Agency Name</TableHead>
                    <TableHead className="text-slate-500 font-semibold">Location</TableHead>
                    <TableHead className="text-slate-500 font-semibold">Status</TableHead>
                    <TableHead className="text-slate-500 font-semibold">Plan</TableHead>
                    <TableHead className="text-slate-500 font-semibold">Created At</TableHead>
                    <TableHead className="text-right text-slate-500 font-semibold pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.agencies.map((agency: any) => (
                    <TableRow key={agency.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-medium text-slate-700">{agency.name}</TableCell>
                      <TableCell className="text-slate-600">{agency.city || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(agency.status || 'active')} className="capitalize">
                          {agency.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 capitalize">{agency.subscriptionPlan || 'Free'}</TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(agency.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-slate-100" onClick={() => handleViewAgency(agency)}>
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-slate-100">
                            <Edit className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-white hover:bg-red-50 border-red-100">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-100">
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
                  Page {page} of {data.pagination.totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= (data.pagination.totalPages || 1)}
                  className="bg-white hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </GlassCard>

      {/* Agency Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">{selectedAgency?.name}</DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Location</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {selectedAgency.city || 'N/A'}
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {selectedAgency.phone || 'N/A'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</p>
                  <Badge variant={getStatusVariant(selectedAgency.status || 'active')}>
                    {selectedAgency.status || 'Active'}
                  </Badge>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Plan</p>
                  <p className="font-semibold text-slate-800 capitalize">
                    {selectedAgency.subscriptionPlan || 'Free'}
                  </p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Details</p>
                <div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-600">
                   <div className="grid grid-cols-[100px_1fr] gap-2">
                     <span className="text-slate-400">Email:</span>
                     <span>{selectedAgency.email || 'N/A'}</span>
                     <span className="text-slate-400">Website:</span>
                     <span>{selectedAgency.website || 'N/A'}</span>
                     <span className="text-slate-400">Branding:</span>
                     <span className="truncate">{selectedAgency.brandingColors ? 'Custom colors set' : 'Default'}</span>
                   </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
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

export default AgenciesPage;
