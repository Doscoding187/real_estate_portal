import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Building2, MapPin, Loader2, ExternalLink, Users, Plus } from 'lucide-react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { CreateBrandProfileDialog } from '@/components/admin/publisher/CreateBrandProfileDialog';
import { cn } from '@/lib/utils';

// South African Provinces
const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

interface BrandProfile {
  id: number;
  brandName: string;
  slug: string;
  logoUrl: string | null;
  headOfficeLocation: string | null;
  operatingProvinces: string[] | null;
  brandTier: string | null;
  isSubscriber: number;
  identityType: string;
}

const getTierColor = (tier: string | null) => {
  switch (tier) {
    case 'national':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'regional':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'boutique':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getIdentityIcon = (type: string) => {
  switch (type) {
    case 'developer':
      return '🏗️';
    case 'marketing_agency':
      return '📢';
    case 'hybrid':
      return '🔄';
    default:
      return '🏢';
  }
};

const BrandProfileCard: React.FC<{ brand: BrandProfile }> = ({ brand }) => {
  const { setSelectedBrandId } = useDeveloperContext();
  const [, setLocation] = useLocation();

  const handleOperate = () => {
    setSelectedBrandId(brand.id);
    // Scroll down to the brand context section
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-muted hover:border-primary/20 overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          {brand.logoUrl ? (
            <div className="w-14 h-14 rounded-lg border bg-white flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={brand.logoUrl}
                alt={brand.brandName}
                className="w-full h-full object-contain p-1"
                onError={e => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl shrink-0 border border-primary/10">
              {getIdentityIcon(brand.identityType)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {brand.brandName}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {brand.headOfficeLocation || 'Location TBA'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`${getTierColor(brand.brandTier)} text-[10px]`}>
            {brand.brandTier || 'Regional'}
          </Badge>
          {brand.isSubscriber ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
              Subscriber
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Platform
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={handleOperate}>
            <Users className="w-3 h-3" /> Operate As
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProvinceDevDashboard: React.FC = () => {
  const [activeProvince, setActiveProvince] = useState('Gauteng');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch all brand profiles
  const { data: brandProfiles, isLoading } = trpc.superAdminPublisher.listBrandProfiles.useQuery(
    {},
  );

  // Group brand profiles by operating provinces
  const groupedByProvince = React.useMemo(() => {
    if (!brandProfiles) return {};

    const grouped: Record<string, BrandProfile[]> = {};
    SA_PROVINCES.forEach(p => (grouped[p] = []));

    brandProfiles.forEach((brand: any) => {
      const provinces: string[] = brand.operatingProvinces || [];

      if (provinces.length === 0) {
        // If no operating provinces specified, try to infer from head office
        const location = brand.headOfficeLocation || '';
        const matchedProvince = SA_PROVINCES.find(p =>
          location.toLowerCase().includes(p.toLowerCase()),
        );
        if (matchedProvince) {
          grouped[matchedProvince].push(brand);
        }
      } else {
        // Brand operates in multiple provinces - show in each
        provinces.forEach((prov: string) => {
          const matchedProvince = SA_PROVINCES.find(p => p.toLowerCase() === prov.toLowerCase());
          if (matchedProvince) {
            grouped[matchedProvince].push(brand);
          }
        });
      }
    });

    // Sort each province alphabetically by brand name
    Object.keys(grouped).forEach(p => {
      grouped[p].sort((a, b) => a.brandName.localeCompare(b.brandName));
    });

    return grouped;
  }, [brandProfiles]);

  // Count per province
  const provinceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    SA_PROVINCES.forEach(p => (counts[p] = groupedByProvince[p]?.length || 0));
    return counts;
  }, [groupedByProvince]);

  const totalBrands = brandProfiles?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Developer Brands by Province
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalBrands} brand profiles across South Africa
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Brand Profile</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <CreateBrandProfileDialog open={isCreateDialogOpen} setOpen={setIsCreateDialogOpen} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeProvince} onValueChange={setActiveProvince} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {SA_PROVINCES.map(province => (
              <TabsTrigger
                key={province}
                value={province}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600',
                  'data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md data-[state=active]:hover:text-white',
                )}
              >
                {province
                  .replace('KwaZulu-Natal', 'KZN')
                  .replace('Western Cape', 'W. Cape')
                  .replace('Eastern Cape', 'E. Cape')
                  .replace('Northern Cape', 'N. Cape')
                  .replace('North West', 'N. West')}
                <span
                  className={cn(
                    'ml-1.5 text-[10px]',
                    activeProvince === province ? 'text-blue-100' : 'text-muted-foreground',
                  )}
                >
                  ({provinceCounts[province]})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {SA_PROVINCES.map(province => (
            <TabsContent key={province} value={province} className="mt-4">
              {groupedByProvince[province]?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedByProvince[province].map(brand => (
                    <BrandProfileCard key={brand.id} brand={brand} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No brand profiles in {province}</p>
                  <p className="text-xs mt-1">
                    Add operating provinces to brand profiles to see them here
                  </p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default ProvinceDevDashboard;
