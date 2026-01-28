/**
 * Developer Brand Profile Component
 *
 * Unified public-facing component for both:
 * 1. Subscriber Developers (Developer Accounts)
 * 2. Platform Brand Profiles (Managed Brands)
 * 3. Super Admin Emulation Review
 */

import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Helmet } from 'react-helmet-async';
import { trpc } from '@/lib/trpc';
import { DevelopmentCard } from '@/components/DevelopmentCard';
import {
  Loader2,
  MapPin,
  Globe,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Home,
} from 'lucide-react';

interface DeveloperBrandProfileProps {
  slug?: string;
  className?: string;
  hideNavbar?: boolean;
}

export function DeveloperBrandProfile({
  slug,
  className,
  hideNavbar = false,
}: DeveloperBrandProfileProps) {
  const [, setLocation] = useLocation();

  // Fetch unified profile (Subscriber or Brand)
  const {
    data: profile,
    isLoading,
    error,
  } = trpc.developer.getPublicDeveloperBySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug, retry: false },
  );

  // Fetch developments for this profile
  const { data: developments, isLoading: isLoadingDevs } =
    trpc.developer.getPublicDevelopmentsForProfile.useQuery(
      {
        profileType: profile?.type || 'subscriber',
        profileId: profile?.id || 0,
      },
      { enabled: !!profile },
    );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-40 ${className}`}>
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !profile) {
    if (hideNavbar) {
      // Simple error state for embedded view
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center select-none opacity-50">
          <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-500">Profile Not Found</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <Helmet>
          <title>Developer Not Found | Property Listify</title>
          <meta name="robots" content="noindex" />
        </Helmet>

        <div className="container py-20 text-center">
          <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Developer Not Found</h2>
          <p className="text-slate-500 mb-6">
            The developer profile you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation('/developers')}>Browse All Developers</Button>
        </div>
      </div>
    );
  }

  // Construct JSON-LD Schema
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: profile.name,
    image: profile.logo,
    description: profile.description,
    url: window.location.href,
    address: profile.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: profile.address,
        }
      : undefined,
    telephone: profile.phones && profile.phones.length > 0 ? profile.phones[0] : undefined,
    email: profile.emails && profile.emails.length > 0 ? profile.emails[0] : undefined,
    sameAs: profile.website ? [profile.website] : [],
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${className}`}>
      {!hideNavbar && (
        <Helmet>
          <title>{`${profile.name} - Property Developer Profile | Property Listify`}</title>
          <meta
            name="description"
            content={
              profile.description
                ? profile.description.slice(0, 160)
                : `Learn more about ${profile.name}, a property developer on Property Listify.`
            }
          />
          <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
        </Helmet>
      )}

      {/* Hero Section */}
      <div
        className={`${hideNavbar ? 'rounded-xl overflow-hidden shadow-sm mx-4 mt-4' : ''} bg-gradient-to-b from-indigo-900 to-indigo-800 text-white pt-24 pb-16`}
      >
        <div className="container">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white/10 overflow-hidden border-2 border-white/20 shrink-0 flex items-center justify-center">
              {profile.logo ? (
                <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-12 w-12 text-white/50" />
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{profile.name}</h1>

                {profile.stats.isVerified && (
                  <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-500/50 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}

                {profile.stats.isTrusted && (
                  <Badge className="bg-indigo-500/20 text-indigo-100 border-indigo-500/50 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Trusted Partner
                  </Badge>
                )}
              </div>

              {profile.address && (
                <div className="flex items-center gap-2 text-indigo-200 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.address}</span>
                </div>
              )}

              {profile.description && (
                <p className="text-indigo-100 text-lg max-w-2xl mb-4 leading-relaxed line-clamp-3">
                  {profile.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-indigo-200">
                {profile.stats.establishedYear && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Est. {profile.stats.establishedYear}</span>
                  </div>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        {/* Developments Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" />
              Developments by {profile.name}
            </h2>

            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() =>
                setLocation(`/developer/create-development?brandProfileId=${profile.id}`)
              }
            >
              + Add Development
            </Button>
          </div>

          {!isLoadingDevs && developments && developments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {developments.map((dev: any) => {
                // Parse images safely
                let images: string[] = [];
                try {
                  const rawImages =
                    typeof dev.images === 'string' ? JSON.parse(dev.images) : dev.images;
                  if (Array.isArray(rawImages)) {
                    images = rawImages
                      .map((img: any) => {
                        if (typeof img === 'string') return img;
                        if (typeof img === 'object' && img !== null && 'url' in img) return img.url;
                        return '';
                      })
                      .filter(Boolean);
                  }
                } catch (e) {
                  images = [];
                }

                return (
                  <DevelopmentCard
                    key={dev.id}
                    id={dev.slug || String(dev.id)}
                    title={dev.name}
                    rating={Number(dev.rating) || 0}
                    location={`${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`}
                    description={dev.description || ''}
                    image={images[0] || ''}
                    unitTypes={dev.unitTypes || []}
                    highlights={(dev.highlights as string[]) || []}
                    developer={{
                      name: profile.name,
                      isFeatured: !!profile.stats.isVerified,
                    }}
                    imageCount={images.length}
                    isFeatured={!!dev.isFeatured}
                    status={dev.status}
                    nature={dev.nature}
                  />
                );
              })}
            </div>
          ) : !isLoadingDevs ? (
            <div className="bg-slate-100 rounded-xl p-12 text-center">
              <Home className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Developments Listed</h3>
              <p className="text-slate-500">
                This developer does not have any active listings on Property Listify.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-96 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Claim CTA (only for unmanaged platform brands, and not in dashboard mode) */}
        {!hideNavbar && profile.type === 'brand' && (
          <div className="bg-slate-100 rounded-xl p-6 mt-8 text-center max-w-2xl mx-auto">
            <p className="text-slate-600 mb-3">
              Are you part of the <strong>{profile.name}</strong> team?
            </p>
            <Button
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              onClick={() => setLocation('/developer/setup')}
            >
              Claim This Profile
            </Button>
          </div>
        )}
      </div>

      {/* Footer Disclaimer - Only show on full page */}
      {!hideNavbar && (
        <div className="bg-slate-100 py-6">
          <div className="container">
            <p className="text-center text-sm text-slate-500 max-w-2xl mx-auto">
              Developer information is provided for identification purposes only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
