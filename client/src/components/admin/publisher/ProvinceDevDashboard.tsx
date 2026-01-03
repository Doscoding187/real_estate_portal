import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Building2, MapPin, Home, Loader2, Edit, Eye } from 'lucide-react';

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

interface Development {
  id: number;
  name: string;
  province: string | null;
  city: string | null;
  status: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  totalUnits: number | null;
  isPublished: number | null;
  slug: string | null;
  images: string | null;
}

const formatPrice = (price: number | null) => {
  if (!price) return 'TBA';
  return `R${(price / 1000000).toFixed(1)}M`;
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'now-selling': return 'bg-green-100 text-green-700 border-green-200';
    case 'under_construction': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'planning': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'completed': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const DevelopmentCard: React.FC<{ dev: Development }> = ({ dev }) => {
  const [, setLocation] = useLocation();

  const handleEdit = () => {
    setLocation(`/developer/create-development?id=${dev.id}`);
  };

  const handleView = () => {
    setLocation(`/new-developments/${dev.slug || dev.id}`);
  };

  // Parse first image
  let thumbnail = '/placeholder-development.jpg';
  try {
    const images = JSON.parse(dev.images || '[]');
    if (Array.isArray(images) && images.length > 0) {
      thumbnail = images[0];
    }
  } catch {}

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-muted hover:border-primary/20 overflow-hidden">
      <div className="relative h-32 bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
        <img 
          src={thumbnail} 
          alt={dev.name} 
          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop';
          }}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant={dev.isPublished ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {dev.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {dev.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {dev.city || 'Location TBA'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Badge variant="outline" className={`${getStatusColor(dev.status)} text-[10px]`}>
            {dev.status?.replace(/_/g, ' ') || 'Planning'}
          </Badge>
          <span className="font-medium text-primary">
            {formatPrice(dev.priceFrom)}{dev.priceTo && dev.priceTo !== dev.priceFrom ? ` - ${formatPrice(dev.priceTo)}` : ''}
          </span>
        </div>

        {dev.totalUnits && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Home className="w-3 h-3" /> {dev.totalUnits} units
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={handleEdit}>
            <Edit className="w-3 h-3" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleView}>
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProvinceDevDashboard: React.FC = () => {
  const [activeProvince, setActiveProvince] = useState('Gauteng');
  
  // Fetch all developments for super admin
  const { data: developments, isLoading } = trpc.developer.listPublicDevelopments.useQuery({
    limit: 500, // Get all
  });

  // Group developments by province
  const groupedByProvince = React.useMemo(() => {
    if (!developments?.developments) return {};
    
    const grouped: Record<string, Development[]> = {};
    SA_PROVINCES.forEach(p => grouped[p] = []);
    
    developments.developments.forEach((dev: any) => {
      const province = dev.province?.trim() || 'Unknown';
      // Find matching province (case-insensitive)
      const matchedProvince = SA_PROVINCES.find(
        p => p.toLowerCase() === province.toLowerCase()
      ) || 'Unknown';
      
      if (!grouped[matchedProvince]) grouped[matchedProvince] = [];
      grouped[matchedProvince].push(dev);
    });
    
    // Sort each province alphabetically
    Object.keys(grouped).forEach(p => {
      grouped[p].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  }, [developments]);

  // Count per province
  const provinceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    SA_PROVINCES.forEach(p => counts[p] = groupedByProvince[p]?.length || 0);
    return counts;
  }, [groupedByProvince]);

  const totalDevelopments = developments?.developments?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            All Developments by Province
          </h2>
          <p className="text-sm text-muted-foreground">{totalDevelopments} developments across South Africa</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeProvince} onValueChange={setActiveProvince} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1.5 rounded-lg">
            {SA_PROVINCES.map(province => (
              <TabsTrigger 
                key={province} 
                value={province}
                className="text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {province.replace('KwaZulu-Natal', 'KZN').replace('Western Cape', 'W. Cape').replace('Eastern Cape', 'E. Cape').replace('Northern Cape', 'N. Cape').replace('North West', 'N. West')}
                <span className="ml-1.5 text-[10px] opacity-60">({provinceCounts[province]})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {SA_PROVINCES.map(province => (
            <TabsContent key={province} value={province} className="mt-4">
              {groupedByProvince[province]?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {groupedByProvince[province].map((dev) => (
                    <DevelopmentCard key={dev.id} dev={dev} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No developments in {province}</p>
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
