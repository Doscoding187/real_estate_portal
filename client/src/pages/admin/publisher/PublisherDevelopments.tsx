import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Filter, AlertCircle, Building2 } from 'lucide-react';
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
import { EntityStatusCard } from '@/components/dashboard/EntityStatusCard';
import { calculateDevelopmentReadiness } from '@/lib/readiness';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';

const PublisherDevelopments: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedBrandId, selectedBrand } = useDeveloperContext();

  const { data: developments, isLoading, refetch } = trpc.superAdminPublisher.getDevelopments.useQuery(
    { brandProfileId: selectedBrandId! },
    { enabled: !!selectedBrandId }
  );

  // Delete mutation would go here, linked to admin functionality if needed

  const safeDevelopments = developments || [];

  const filteredDevelopments = safeDevelopments.filter(
    (dev: any) =>
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.city && dev.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Robust image parser helper (reused)
  const safelyParseImages = (imagesData: any): string[] => {
    if (!imagesData) return [];
    if (Array.isArray(imagesData)) return imagesData;
    if (typeof imagesData === 'string') {
      try {
        const parsed = JSON.parse(imagesData);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') return [parsed];
        return []; 
      } catch (e) {
        if (imagesData.startsWith('http')) return [imagesData];
        return [];
      }
    }
    return [];
  };

  const handleCreateDevelopment = () => {
    // Navigate to wizard with special param to indicate brand context override
    // We'll need to update the wizard to handle this param or create a wrapper
    setLocation(`/developer/create-development?brandProfileId=${selectedBrandId}`);
    toast.info(`Creating development for ${selectedBrand?.brandName}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h3 className="text-xl font-semibold flex items-center gap-2">
             <Building2 className="w-5 h-5 text-muted-foreground" />
             Properties & Developments
           </h3>
           <p className="text-sm text-muted-foreground">
             Manage developments for {selectedBrand?.brandName}
           </p>
        </div>
        <Button onClick={handleCreateDevelopment}>
          <Plus className="h-4 w-4 mr-2" />
          Add Development
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
          </div>
        </CardContent>
      </Card>

      {/* Developments Grid */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading developments...</div>
        ) : filteredDevelopments.length > 0 ? (
          filteredDevelopments.map((dev: any) => {
            const parsedImages = safelyParseImages(dev.images);
            return (
              <EntityStatusCard
                key={dev.id}
                type="development"
                data={{
                    ...dev,
                    status: dev.isPublished ? 'published' : 
                            dev.approvalStatus === 'approved' ? 'approved' : 
                            dev.approvalStatus === 'pending' ? 'pending' : 
                            dev.approvalStatus === 'rejected' ? 'rejected' : 'draft',
                    images: parsedImages,
                    priceFrom: dev.priceFrom, 
                }}
                readiness={calculateDevelopmentReadiness({
                    name: dev.name,
                    description: dev.description,
                    address: dev.address || dev.city,
                    latitude: dev.latitude,
                    longitude: dev.longitude,
                    images: parsedImages,
                    priceFrom: dev.priceFrom
                })}
                onEdit={(id) => setLocation(`/developer/create-development?id=${id}&brandProfileId=${selectedBrandId}`)}
                onDelete={() => {}} // Disabled for now in emulator
                onView={(id) => setLocation(`/development/${id}`)}
              />
          )})
        ) : (
             <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed border-muted-foreground/20 text-muted-foreground">
                <p>No developments found for {selectedBrand?.brandName}.</p>
                <Button variant="link" onClick={handleCreateDevelopment}>Create the first one</Button>
             </div>
        )}
      </div>
    </div>
  );
};

export default PublisherDevelopments;
