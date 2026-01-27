/**
 * Developer Directory Page
 *
 * Lists all visible developer brand profiles with filters.
 * SEO-friendly page for brand discovery.
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Loader2, Search, Building2, MapPin, ChevronRight, Home } from 'lucide-react';

export default function DeveloperDirectoryPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  // Fetch brand profiles
  const { data: profiles, isLoading } = trpc.brandProfile.listBrandProfiles.useQuery({
    search: searchQuery || undefined,
    brandTier:
      tierFilter !== 'all' ? (tierFilter as 'national' | 'regional' | 'boutique') : undefined,
    isVisible: true,
    limit: 50,
  });

  const tierLabel: Record<string, string> = {
    national: 'National Developer',
    regional: 'Regional Developer',
    boutique: 'Boutique Developer',
  };

  const tierBadgeColor: Record<string, string> = {
    national: 'bg-indigo-100 text-indigo-700',
    regional: 'bg-blue-100 text-blue-700',
    boutique: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-indigo-900 to-indigo-800 text-white pt-24 pb-12">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Recognised Developers</h1>
            <p className="text-indigo-200 text-lg mb-8">
              Discover trusted property developers across South Africa. Browse developments, view
              track records, and find your next investment.
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search developers..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-indigo-200 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400"
                />
              </div>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full sm:w-48 h-12 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="All Developers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Developers</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="container py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          </div>
        ) : profiles && profiles.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600">
                Showing <span className="font-semibold text-slate-900">{profiles.length}</span>{' '}
                developers
              </p>
            </div>

            {/* Developer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map(profile => (
                <Card
                  key={profile.id}
                  className="group border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setLocation(`/developer/${profile.slug}`)}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 group-hover:border-indigo-300 transition-colors">
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {profile.brandName}
                        </h3>

                        {profile.brandTier && (
                          <Badge
                            className={`mt-1 border-0 text-xs ${tierBadgeColor[profile.brandTier] || 'bg-slate-100 text-slate-700'}`}
                          >
                            {tierLabel[profile.brandTier] || profile.brandTier}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    {profile.headOfficeLocation && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{profile.headOfficeLocation}</span>
                      </div>
                    )}

                    {/* About */}
                    {profile.about && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-4">{profile.about}</p>
                    )}

                    {/* Property Focus Tags */}
                    {profile.propertyFocus && profile.propertyFocus.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {profile.propertyFocus.slice(0, 3).map((focus: string) => (
                          <Badge
                            key={focus}
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-0 text-xs capitalize"
                          >
                            {focus.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {profile.propertyFocus.length > 3 && (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-0 text-xs"
                          >
                            +{profile.propertyFocus.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Stats / CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      {profile.totalLeadsReceived && profile.totalLeadsReceived > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Home className="h-4 w-4" />
                          <span>{profile.totalLeadsReceived} buyer enquiries</span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 -mr-2"
                      >
                        View Profile
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Developers Found</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery
                ? `No developers match "${searchQuery}". Try a different search.`
                : 'No developers are currently listed in the directory.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setTierFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Legal Disclaimer */}
      <div className="bg-slate-100 py-8">
        <div className="container">
          <p className="text-center text-sm text-slate-500 max-w-2xl mx-auto">
            Developer names and logos are used for identification purposes only and do not imply
            partnership or endorsement. Information is provided for reference and may not reflect
            current status.
          </p>
        </div>
      </div>
    </div>
  );
}
