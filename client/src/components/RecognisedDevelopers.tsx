/**
 * Recognised Developers Section
 * 
 * Displays developer brand profiles from the database on the homepage.
 * Pulls real data from brandProfile.listBrandProfiles tRPC endpoint.
 */

import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ChevronRight, ArrowRight, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';

export function RecognisedDevelopers() {
  const [, setLocation] = useLocation();

  // Fetch visible brand profiles
  const { data: profiles, isLoading } = trpc.brandProfile.listBrandProfiles.useQuery({
    isVisible: true,
    limit: 8,
  });

  const tierBadgeColor: Record<string, string> = {
    national: 'bg-indigo-100 text-indigo-700',
    regional: 'bg-blue-100 text-blue-700',
    boutique: 'bg-emerald-100 text-emerald-700',
  };

  // Don't render if no profiles
  if (!isLoading && (!profiles || profiles.length === 0)) {
    return null;
  }

  return (
    <div className="py-16 md:py-20 bg-gradient-to-b from-white to-slate-50/50">
      <div className="container">
        {/* Header */}
        <div className="text-left mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-full px-4 py-2 mb-4">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">Property Developers</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
            Recognised Property Developers
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
            Discover developments from leading property developers across South Africa.
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-6">
                  <Skeleton className="w-16 h-16 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Developer Grid */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {profiles?.map((profile) => (
              <Card 
                key={profile.id}
                className="group border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setLocation(`/developer/${profile.slug}`)}
              >
                <CardContent className="p-6 text-center">
                  {/* Logo */}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 group-hover:border-indigo-300 transition-colors">
                    {profile.logoUrl ? (
                      <img 
                        src={profile.logoUrl} 
                        alt={profile.brandName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white text-xl font-bold">
                        {profile.brandName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1 truncate">
                    {profile.brandName}
                  </h3>

                  {/* Tier Badge */}
                  {profile.brandTier && (
                    <Badge 
                      className={`${tierBadgeColor[profile.brandTier] || 'bg-slate-100 text-slate-600'} border-0 text-xs mt-2`}
                    >
                      {profile.brandTier.charAt(0).toUpperCase() + profile.brandTier.slice(1)}
                    </Badge>
                  )}

                  {/* Location */}
                  {profile.headOfficeLocation && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {profile.headOfficeLocation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-10">
          <Button 
            size="lg"
            onClick={() => setLocation('/developers')}
            className="gap-2 h-12 px-8 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            View All Developers
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-center text-xs text-slate-400 mt-6 max-w-xl mx-auto">
          Developer names and logos are used for identification purposes only and do not imply partnership or endorsement.
        </p>
      </div>
    </div>
  );
}
