import React, { useState, useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext, resolvePublishingIdentity } from '@/hooks/usePublisherContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { trpc } from '@/lib/trpc';
import { Search, Building2, Briefcase, CheckCircle2, ArrowRight, Users, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function RepresentationPhase() {
  const { listingIdentity, setListingIdentity, setPhase } = useDevelopmentWizard();
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [hasAutoSkipped, setHasAutoSkipped] = useState(false);
  
  // AUTO-SKIP: If identity is already resolved from Publisher Emulator, skip Step 1
  useEffect(() => {
    if (hasAutoSkipped) return; // Prevent multiple skips
    
    const resolved = resolvePublishingIdentity(user?.role, publisherContext);
    if (resolved) {
      console.log('[RepresentationPhase] Identity resolved from publisher_emulator:', resolved);
      setListingIdentity({
        identityType: resolved.identityType,
        developerBrandProfileId: resolved.brandProfileId,
      });
      setHasAutoSkipped(true);
      toast.success(`Publishing as ${publisherContext?.brandProfileName}`);
      setPhase(2); // Skip to Development Type
    }
  }, [user?.role, publisherContext, setListingIdentity, setPhase, hasAutoSkipped]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search Query - Always enabled for Super Admins, or when Marketing Agency is selected
  const showBrandSelector = isSuperAdmin || listingIdentity.identityType === 'marketing_agency';
  const { data: searchResults, isLoading } = trpc.developer.searchBrandProfiles.useQuery(
    { query: debouncedQuery },
    { 
      enabled: debouncedQuery.length >= 2 && showBrandSelector,
      keepPreviousData: true 
    }
  );

  const handleNext = () => {
    // Super Admins CAN select a brand profile (for frontend grouping), but it's optional
    // The backend uses the Seed Developer for ownership regardless
    if (isSuperAdmin) {
      if (listingIdentity.developerBrandProfileId) {
        console.log('[RepresentationPhase] Super Admin seeding under brand:', listingIdentity.developerBrandProfileId);
      } else {
        console.log('[RepresentationPhase] Super Admin seeding without brand (platform-only)');
        // Ensure identityType is set for Super Admin
        setListingIdentity({ identityType: 'developer' });
      }
      setPhase(2); // Proceed - backend handles ownership
      return;
    }
    // Marketing agencies must select the developer they represent
    if (listingIdentity.identityType === 'marketing_agency' && !listingIdentity.developerBrandProfileId) {
      toast.error('Please select the Developer Brand you are representing');
      return;
    }
    setPhase(2); // Go to Development Type
  };

  const selectBrand = (brand: { id: number; brandName: string; logoUrl: string | null }) => {
    // When a brand is selected, set identityType to 'brand' for proper routing
    setListingIdentity({ 
      identityType: 'brand', 
      developerBrandProfileId: brand.id 
    });
    setSearchQuery(brand.brandName); // Fill input
    toast.success(`Publishing as ${brand.brandName}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-semibold text-slate-900">Who are you listing as?</h2>
        <p className="text-slate-500">Select your role for this designated development.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Developer Option - Hidden for Super Admins since they must use a Brand */}
        {!isSuperAdmin && (
        <div 
          onClick={() => setListingIdentity({ identityType: 'developer', developerBrandProfileId: undefined })}
          className={cn(
            "cursor-pointer group relative p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-md",
            listingIdentity.identityType === 'developer' 
              ? "border-blue-600 bg-blue-50/50" 
              : "border-slate-200 bg-white hover:border-blue-200"
          )}
        >
          {listingIdentity.identityType === 'developer' && (
            <div className="absolute top-4 right-4 text-blue-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Property Developer</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            I am the builder or owner of this development. I manage the project directly.
          </p>
        </div>
        )}

        {/* Agency Option */}
        <div 
          onClick={() => setListingIdentity({ identityType: 'marketing_agency' })}
          className={cn(
            "cursor-pointer group relative p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-md",
            listingIdentity.identityType === 'marketing_agency' 
              ? "border-purple-600 bg-purple-50/50" 
              : "border-slate-200 bg-white hover:border-purple-200"
          )}
        >
          {listingIdentity.identityType === 'marketing_agency' && (
            <div className="absolute top-4 right-4 text-purple-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Briefcase className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Marketing Agency</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            I am acting as a marketing agent or sales partner for a developer brand.
          </p>
        </div>

        {/* Private Owner Option */}
        <div 
          onClick={() => setListingIdentity({ identityType: 'private_owner', developerBrandProfileId: undefined })}
          className={cn(
            "cursor-pointer group relative p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-md",
            listingIdentity.identityType === 'private_owner' 
              ? "border-emerald-600 bg-emerald-50/50" 
              : "border-slate-200 bg-white hover:border-emerald-200"
          )}
        >
          {listingIdentity.identityType === 'private_owner' && (
            <div className="absolute top-4 right-4 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Private Owner</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            I am an individual owner or representing a small private development entity.
          </p>
        </div>
      </div>

      {/* Conditional Search for Agency or Super Admin */}
      {showBrandSelector && (
        <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in duration-300">
          <Label className="text-base font-semibold mb-3 block">
            {isSuperAdmin ? 'Which Developer Brand are you publishing for?' : 'Who is the Developer?'}
          </Label>
          <div className="relative max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search for Developer Brand..."
                className="pl-10 h-12 text-lg"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length < 2) setListingIdentity({ developerBrandProfileId: undefined });
                }}
              />
            </div>
            
            {/* Results Dropdown */}
            {debouncedQuery.length >= 2 && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-slate-200 shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
                 {isLoading ? (
                   <div className="p-4 text-center text-slate-500">Searching...</div>
                 ) : searchResults?.length === 0 ? (
                   <div className="p-4 text-center text-slate-500">No brands found. Contact support to add one.</div>
                 ) : (
                   <div className="divide-y divide-slate-100">
                     {searchResults?.map((brand) => (
                       <div 
                         key={brand.id}
                         onClick={() => selectBrand(brand)}
                         className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
                       >
                         {brand.logoUrl ? (
                           <img src={brand.logoUrl} alt={brand.brandName} className="w-8 h-8 rounded object-cover" />
                         ) : (
                           <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-500">
                             {brand.brandName.substring(0, 2).toUpperCase()}
                           </div>
                         )}
                         <span className="font-medium text-slate-700">{brand.brandName}</span>
                         {brand.id === listingIdentity.developerBrandProfileId && (
                           <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            )}
            
            <p className="text-sm text-slate-500 mt-2">
              Search for the developer brand you are representing. This will appear as "Developed by [Brand]" on the listing.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-8 mt-8 border-t border-slate-200">
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
