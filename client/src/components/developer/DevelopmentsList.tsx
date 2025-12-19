import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Filter, MoreVertical, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DevelopmentsList: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  /* replaced by tRPC query */
  const { data: developments, isLoading, refetch } = trpc.developer.getDevelopments.useQuery();

  // Delete mutation
  const deleteMutation = trpc.developer.deleteDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete development');
    },
  });

  const handleDelete = (devId: number, devName: string) => {
    if (window.confirm(`Are you sure you want to delete "${devName}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: devId });
    }
  };
  
  const safeDevelopments = developments || [];

  const filteredDevelopments = safeDevelopments.filter(
    (dev: any) =>
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.city && dev.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Status Badge Logic
  const getStatusBadge = (dev: any) => {
    switch (dev.approvalStatus) {
      case 'rejected':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="destructive" className="cursor-help flex items-center gap-1">
                   <AlertCircle className="w-3 h-3" /> Rejected
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-red-900 text-white border-red-800">
                <p className="font-semibold mb-1">Reason for Rejection:</p>
                <p>{dev.rejectionReason || "Please contact support for details."}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">Pending Review</Badge>;
      case 'approved':
        // If approved, check if published
        // Note: Backend might need to return isPublished 
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Live</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Developments</h1>
          <p className="text-muted-foreground">
            Manage all your property developments in one place
          </p>
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={() => setLocation('/developer/create-development')}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Development
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search developments..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Developments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Development</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Views</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevelopments.map(dev => (
                <TableRow key={dev.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
                         {/* Placeholder or real image if available */}
                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                            {dev.image ? (
                                <img src={dev.image} alt={dev.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs">IMG</span>
                            )}
                        </div>
                      <span className="font-semibold text-foreground">{dev.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{dev.city}, {dev.province}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{dev.developmentType?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell className="font-medium">{dev.totalUnits || 0}</TableCell>
                  <TableCell>
                    {getStatusBadge(dev)}
                  </TableCell>
                  <TableCell className="font-medium">{dev.leads ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(dev.views ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {dev.approvalStatus === 'rejected' && (
                            <DropdownMenuItem className="text-red-600 font-medium" onClick={() => setLocation(`/developer/create-development?id=${dev.id}`)}>
                                <AlertCircle className="w-4 h-4 mr-2" /> Fix Issues
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/developer/create-development?id=${dev.id}`)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Analytics</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(dev.id, dev.name)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevelopmentsList;
