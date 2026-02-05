import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Plus, Search, Filter, AlertCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EntityStatusCard } from '@/components/dashboard/EntityStatusCard';
import { EnhancedDevelopmentCard } from '@/components/admin/publisher/EnhancedDevelopmentCard';
import { calculateDevelopmentReadiness } from '@/lib/readiness';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { publisherTheme, gradients, cardElevation } from '@/lib/publisherTheme';
import { cn } from '@/lib/utils';
import '@/styles/publisher.css';
import '@/styles/publisher.css';

const PublisherDevelopments: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedBrandId, selectedBrand } = useDeveloperContext();

  const {
    data: developments,
    isLoading,
    refetch,
  } = trpc.superAdminPublisher.getDevelopments.useQuery(
    { brandProfileId: selectedBrandId! },
    { enabled: !!selectedBrandId },
  );

  // Delete mutation for developments
  const deleteMutation = trpc.developer.deleteDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development deleted successfully');
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to delete development');
    },
  });

  const handleDeleteDevelopment = (devId: number, devName: string) => {
    if (
      window.confirm(`Are you sure you want to delete "${devName}"? This action cannot be undone.`)
    ) {
      deleteMutation.mutate({ id: devId });
    }
  };

  const safeDevelopments = developments || [];

  const filteredDevelopments = safeDevelopments.filter(
    (dev: any) =>
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dev.city && dev.city.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // Robust image parser helper (reused)
  const safelyParseImages = (imagesData: any): string[] => {
    let images: any[] = [];
    if (!imagesData) return [];

    if (Array.isArray(imagesData)) {
      images = imagesData;
    } else if (typeof imagesData === 'string') {
      try {
        const parsed = JSON.parse(imagesData);
        if (Array.isArray(parsed)) images = parsed;
        else if (typeof parsed === 'string') images = [parsed];
      } catch (e) {
        if (imagesData.startsWith('http')) images = [imagesData];
      }
    }

    // Normalize elements to strings
    return images
      .map(img => {
        if (typeof img === 'string') return img;
        if (typeof img === 'object' && img !== null && img.url) return img.url;
        return null;
      })
      .filter(url => typeof url === 'string' && url.length > 0) as string[];
  };

  const handleCreateDevelopment = () => {
    if (!selectedBrandId) return;

    // Persist the same structure that main.tsx expects:
    // localStorage['publisher-context'] => { state: { context: { brandProfileId } } }
    const payload = {
      state: {
        context: {
          brandProfileId: selectedBrandId,
        },
      },
    };

    localStorage.setItem('publisher-context', JSON.stringify(payload));

    // Now navigate WITHOUT relying on query params
    setLocation(`/developer/create-development`);

    toast.info(`Creating development for ${selectedBrand?.brandName}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Building2 className="w-6 h-6 text-blue-600" />
            Properties & Developments
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage developments for {selectedBrand?.brandName}
          </p>
        </div>
        <Button
          onClick={handleCreateDevelopment}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Development
        </Button>
      </div>

      {/* Enhanced Search Bar */}
      <Card className={cn('border-0 shadow-lg', cardElevation.medium)}>
        <CardContent className="p-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search developments by name, city, or address..."
              className="pl-12 h-12 text-base border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  {filteredDevelopments.length} results
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Developments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              <div className="text-lg font-medium text-gray-600">Loading developments...</div>
            </div>
          </div>
        ) : filteredDevelopments.length > 0 ? (
          filteredDevelopments.map((dev: any, index) => {
            const parsedImages = safelyParseImages(dev.images);

            return (
              <div
                key={dev.id}
                className={cn(
                  'animate-fade-in duration-500',
                  `animation-delay-${index * 100}`, // Stagger animation
                )}
              >
                <EnhancedDevelopmentCard
                  development={{
                    ...dev,
                    status: dev.isPublished
                      ? 'published'
                      : dev.approvalStatus === 'approved'
                        ? 'approved'
                        : dev.approvalStatus === 'pending'
                          ? 'pending'
                          : dev.approvalStatus === 'rejected'
                            ? 'rejected'
                            : 'draft',
                    images: parsedImages,
                    unitCount: dev.unitCount || 0,
                  }}
                  onEdit={id =>
                    setLocation(
                      `/developer/create-development?id=${id}&brandProfileId=${selectedBrandId}`,
                    )
                  }
                  onDelete={id => handleDeleteDevelopment(id, dev.name)}
                  onView={id => setLocation(`/development/${id}`)}
                />
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16">
            <Card className={cn('max-w-2xl mx-auto border-0 shadow-xl', cardElevation.high)}>
              <CardContent className="p-12 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-blue-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-800">No developments found</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {searchTerm
                      ? `No developments match "${searchTerm}" for ${selectedBrand?.brandName}.`
                      : `${selectedBrand?.brandName} hasn't created any developments yet.`}
                  </p>
                </div>

                <Button
                  onClick={handleCreateDevelopment}
                  className={cn(
                    'px-8 py-3 text-base font-semibold',
                    gradients.primary,
                    'hover:shadow-xl transform hover:scale-105 transition-all duration-200',
                  )}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Development
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublisherDevelopments;
