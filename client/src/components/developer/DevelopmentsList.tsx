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
import { EntityStatusCard } from '@/components/dashboard/EntityStatusCard';
import { calculateDevelopmentReadiness } from '@/lib/readiness';
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


  // Robust image parser helper
  const safelyParseImages = (imagesData: any): string[] => {
    if (!imagesData) return [];
    if (Array.isArray(imagesData)) return imagesData;
    if (typeof imagesData === 'string') {
      try {
        const parsed = JSON.parse(imagesData);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') return [parsed]; // Handle "url" case
        return []; 
      } catch (e) {
        // If parsing fails, it might be a raw comma-separated list or a single URL
        if (imagesData.startsWith('http')) return [imagesData];
        return [];
      }
    }
    return [];
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

      {/* Developments Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDevelopments.map(dev => {
          const parsedImages = safelyParseImages(dev.images);
          return (
           <EntityStatusCard
              key={dev.id}
              type="development"
              data={{
                  ...dev,
                  // Map backend status to frontend status for the card
                  status: dev.isPublished ? 'published' : 
                          dev.approvalStatus === 'approved' ? 'approved' : 
                          dev.approvalStatus === 'pending' ? 'pending' : 
                          dev.approvalStatus === 'rejected' ? 'rejected' : 'draft',
                  images: parsedImages, // Use safely parsed images
                  priceFrom: dev.priceFrom, 
              }}
              readiness={calculateDevelopmentReadiness({
                  name: dev.name,
                  description: dev.description, // Ensure description is fetched
                  address: dev.address || dev.city,
                  latitude: dev.latitude,
                  longitude: dev.longitude,
                  images: parsedImages,
                  priceFrom: dev.priceFrom // Ensure priceFrom is fetched
              })}
              onEdit={(id) => setLocation(`/developer/create-development?id=${id}`)}
              onDelete={(id) => handleDelete(id, dev.name)}
              onView={(id) => setLocation(`/development/${id}`)}
           />
        )})}
        
        {filteredDevelopments.length === 0 && (
             <div className="text-center py-12 bg-white rounded-lg border border-dashed text-slate-500">
                No developments found matching your search.
             </div>
        )}
      </div>
    </div>
  );
};

export default DevelopmentsList;
