import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import {
  Building2,
  MapPin,
  Loader2,
  ExternalLink,
  Users,
  TrendingUp,
  Home,
  Star,
  ChevronRight,
  Globe,
  Building,
} from 'lucide-react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { cn, getPrimaryDevelopmentImageUrl } from '@/lib/utils';
import { publisherTheme, cardElevation, gradients, animations } from '@/lib/publisherTheme';

// South African Provinces with more data
const SA_PROVINCES = [
  { name: 'Gauteng', code: 'GP', cities: 12, developments: 156 },
  { name: 'Western Cape', code: 'WC', cities: 24, developments: 203 },
  { name: 'KwaZulu-Natal', code: 'KZN', cities: 19, developments: 178 },
  { name: 'Eastern Cape', code: 'EC', cities: 16, developments: 89 },
  { name: 'Free State', code: 'FS', cities: 11, developments: 67 },
  { name: 'Limpopo', code: 'LP', cities: 8, developments: 45 },
  { name: 'Mpumalanga', code: 'MP', cities: 9, developments: 78 },
  { name: 'North West', code: 'NW', cities: 7, developments: 54 },
  { name: 'Northern Cape', code: 'NC', cities: 6, developments: 23 },
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

interface EnhancedBrandProfile extends BrandProfile {
  developmentCount?: number;
  leadCount?: number;
  avgPropertyValue?: number;
  activeProjects?: number;
}

const getTierColor = (tier: string | null) => {
  switch (tier) {
    case 'national':
      return {
        bg: 'bg-gradient-to-r from-purple-500 to-pink-600',
        text: 'text-white',
        border: 'border-purple-200',
      };
    case 'regional':
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-cyan-600',
        text: 'text-white',
        border: 'border-blue-200',
      };
    case 'boutique':
      return {
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
        text: 'text-white',
        border: 'border-emerald-200',
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-500 to-slate-600',
        text: 'text-white',
        border: 'border-gray-200',
      };
  }
};

const EnhancedProvinceCard: React.FC<{
  province: (typeof SA_PROVINCES)[0];
  brands: EnhancedBrandProfile[];
  isActive: boolean;
}> = ({ province, brands, isActive }) => {
  const { setSelectedBrandId } = useDeveloperContext();
  const [, setLocation] = useLocation();

  const provinceBrands = brands.filter(brand => brand.operatingProvinces?.includes(province.name));

  const totalDevelopments = provinceBrands.reduce(
    (sum, brand) => sum + (brand.developmentCount || 0),
    0,
  );
  const totalLeads = provinceBrands.reduce((sum, brand) => sum + (brand.leadCount || 0), 0);

  return (
    <Card
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-300 group',
        'hover:shadow-2xl hover:-translate-y-2',
        isActive ? cardElevation.colored : cardElevation.high,
        isActive ? 'border-blue-300' : 'border-gray-200',
      )}
      onClick={() => {
        // Navigate to province-specific view
        setLocation(`/publisher/province/${province.code.toLowerCase()}`);
      }}
    >
      {/* Province Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-80" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />

      <CardContent className="relative z-10 p-6">
        {/* Province Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{province.name}</h3>
            <p className="text-sm text-gray-600">{province.code}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {provinceBrands.length}
            </div>
            <p className="text-xs text-gray-500">Brands</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <div className="text-lg font-bold text-gray-800">{totalDevelopments}</div>
            <p className="text-xs text-gray-500">Projects</p>
          </div>
          <div className="text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold text-gray-800">{totalLeads}</div>
            <p className="text-xs text-gray-500">Leads</p>
          </div>
          <div className="text-center">
            <MapPin className="w-4 h-4 mx-auto mb-1 text-purple-600" />
            <div className="text-lg font-bold text-gray-800">{province.cities}</div>
            <p className="text-xs text-gray-500">Cities</p>
          </div>
        </div>

        {/* Brand Avatars */}
        {provinceBrands.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {provinceBrands.slice(0, 4).map((brand, index) => (
                <div
                  key={brand.id}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 border-white shadow-lg transition-transform duration-200',
                    'hover:scale-110 hover:z-10',
                    animations.scaleIn,
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.brandName}
                      className="w-full h-full rounded-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className={cn(
                        'w-full h-full rounded-full flex items-center justify-center text-xs font-bold',
                        getTierColor(brand.brandTier).bg,
                        getTierColor(brand.brandTier).text,
                      )}
                    >
                      {brand.brandName.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
              {provinceBrands.length > 4 && (
                <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">
                    +{provinceBrands.length - 4}
                  </span>
                </div>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        )}

        {/* Empty State for No Brands */}
        {provinceBrands.length === 0 && (
          <div className="text-center py-4">
            <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No brands operating in this province yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EnhancedBrandCard: React.FC<{ brand: EnhancedBrandProfile }> = ({ brand }) => {
  const { setSelectedBrandId } = useDeveloperContext();
  const [, setLocation] = useLocation();

  const handleOperate = () => {
    setSelectedBrandId(brand.id);
    // Scroll down to brand context section
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
  };

  const tierInfo = getTierColor(brand.brandTier);

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 cursor-pointer',
        'hover:shadow-xl hover:-translate-y-2 hover:scale-105',
        cardElevation.medium,
        animations.fadeIn,
      )}
      onClick={handleOperate}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-90" />

      <CardContent className="relative z-10 p-6">
        <div className="flex items-start gap-4">
          {/* Logo or Avatar */}
          <div className="relative">
            {brand.logoUrl ? (
              <div className="relative group">
                <img
                  src={brand.logoUrl}
                  alt={brand.brandName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ) : (
              <div
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg',
                  tierInfo.bg,
                  tierInfo.text,
                  'border-2 border-white',
                )}
              >
                {brand.brandName.charAt(0)}
              </div>
            )}

            {/* Status Indicator */}
            {(brand.developmentCount || 0) > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
                {brand.brandName}
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {brand.headOfficeLocation || 'Location TBA'}
              </p>
            </div>

            {/* Tier Badge */}
            {brand.brandTier && (
              <Badge
                className={cn('text-xs font-semibold', tierInfo.bg, tierInfo.text, tierInfo.border)}
              >
                {brand.brandTier.charAt(0).toUpperCase() + brand.brandTier.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        {(brand.developmentCount || brand.leadCount) && (
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            {brand.developmentCount && (
              <div className="text-center">
                <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-bold text-gray-800">{brand.developmentCount}</div>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
            )}
            {brand.leadCount && (
              <div className="text-center">
                <Users className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-gray-800">{brand.leadCount}</div>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-200 group-hover:shadow-xl"
            onClick={e => {
              e.stopPropagation();
              handleOperate();
            }}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Operate as Brand
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProvinceDevDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('provinces');
  const { data: brands, isLoading } = trpc.superAdminPublisher.listBrandProfiles.useQuery({});

  // Enhanced brands with mock metrics for demo
  const enhancedBrands = React.useMemo(() => {
    return (brands || []).map(brand => ({
      ...brand,
      developmentCount: Math.floor(Math.random() * 25) + 1,
      leadCount: Math.floor(Math.random() * 150) + 10,
      avgPropertyValue: Math.floor(Math.random() * 5000000) + 500000,
      activeProjects: Math.floor(Math.random() * 15) + 1,
    })) as EnhancedBrandProfile[];
  }, [brands]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Loading Dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Provincial Development Overview
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse developments by province or operate directly as a brand profile
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-gray-100 rounded-xl">
          <TabsTrigger
            value="provinces"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold"
          >
            <MapPin className="w-4 h-4 mr-2" />
            By Province
          </TabsTrigger>
          <TabsTrigger
            value="brands"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg font-semibold"
          >
            <Building2 className="w-4 h-4 mr-2" />
            By Brand
          </TabsTrigger>
        </TabsList>

        <TabsContent value="provinces" className="mt-8">
          {/* Province Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SA_PROVINCES.map((province, index) => (
              <div
                key={province.code}
                className={animations.fadeIn}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <EnhancedProvinceCard
                  province={province}
                  brands={enhancedBrands}
                  isActive={false}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="brands" className="mt-8">
          {/* Brand Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {enhancedBrands.map((brand, index) => (
              <div
                key={brand.id}
                className={animations.fadeIn}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <EnhancedBrandCard brand={brand} />
              </div>
            ))}
          </div>

          {enhancedBrands.length === 0 && (
            <div className="text-center py-16">
              <Card className="max-w-md mx-auto border-0 shadow-xl">
                <CardContent className="p-8 text-center space-y-4">
                  <Building2 className="w-16 h-16 mx-auto text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">No Brand Profiles</h3>
                  <p className="text-gray-600">
                    Start by creating brand profiles to manage developments and track leads.
                  </p>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    Create First Brand
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
