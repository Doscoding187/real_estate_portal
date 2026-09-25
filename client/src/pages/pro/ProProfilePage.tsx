import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';
import { applySeo } from '@/lib/seo';
import { ProNavigation } from '@/components/services/ProNavigation';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';

function normalizeLocationValue(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function locationIdentity(location: {
  countryCode?: string | null;
  province?: string | null;
  city?: string | null;
  suburb?: string | null;
}) {
  return [location.countryCode, location.province, location.city, location.suburb]
    .map(normalizeLocationValue)
    .join('|');
}

export function linesToServices(
  text: string,
  existingServices: any[] = [],
  activeOverrides: Record<string, boolean> = {},
) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [category, code, displayName] = line.split(',').map(part => part.trim());
      const previous =
        existingServices.find(
          service => code && service.code?.toLowerCase() === code.toLowerCase(),
        ) || {};
      const safeCategory = SERVICE_CATEGORIES.some(item => item.value === category)
        ? (category as ServiceCategory)
        : previous.category || ('home_improvement' as ServiceCategory);
      return {
        id: previous.id,
        category: safeCategory,
        code: code || previous.code || `code-${Math.random().toString(36).slice(2, 7)}`,
        displayName: displayName || previous.displayName || code || 'Service',
        description: previous.description ?? undefined,
        minPrice: previous.minPrice ?? undefined,
        maxPrice: previous.maxPrice ?? undefined,
        currency: 'ZAR' as const,
        isActive:
          activeOverrides[
            String(code || previous.code || '')
              .trim()
              .toLowerCase()
          ] ?? previous.isActive !== false,
      };
    });
}

export function linesToLocations(text: string, existingLocations: any[] = []) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [suburb, city, province] = line.split(',').map(part => part.trim());
      const identity = locationIdentity({ countryCode: 'ZA', suburb, city, province });
      const previous =
        existingLocations.find(
          location =>
            locationIdentity({
              ...location,
              countryCode: normalizeLocationValue(location.countryCode) || 'ZA',
            }) === identity,
        ) || {};
      return {
        id: previous.id,
        suburb: suburb || undefined,
        city: city || undefined,
        province: province || undefined,
        countryCode: previous.countryCode || 'ZA',
        postalCode: previous.postalCode ?? undefined,
        radiusKm: previous.radiusKm ?? 25,
        isPrimary: previous.isPrimary ?? index === 0,
      };
    })
    .filter(location => location.suburb || location.city || location.province);
}

export default function ProProfilePage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const {
    status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useServiceProviderOnboardingStatus();

  useEffect(() => {
    applySeo({
      title: 'Provider Profile Setup | Services Pro',
      description: 'Configure your provider profile, services, locations, and directory details.',
      canonicalPath: '/service/profile',
      noindex: true,
    });
  }, []);

  const myProfileQuery = trpc.servicesEngine.myProviderProfile.useQuery();

  const registerIdentity = trpc.servicesEngine.registerProviderIdentity.useMutation({
    onSuccess: () => {
      toast.success('Partner profile created');
      myProfileQuery.refetch();
      refetchStatus();
    },
    onError: error => toast.error(error.message || 'Could not create partner profile'),
  });
  const saveProfile = trpc.servicesEngine.upsertProviderProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated');
      refetchStatus();
    },
    onError: error => toast.error(error.message || 'Could not save profile'),
  });
  const replaceServices = trpc.servicesEngine.replaceProviderServices.useMutation({
    onSuccess: () => {
      toast.success('Services updated');
      refetchStatus();
    },
    onError: error => toast.error(error.message || 'Could not update services'),
  });
  const replaceLocations = trpc.servicesEngine.replaceProviderLocations.useMutation({
    onSuccess: () => {
      toast.success('Service locations updated');
      refetchStatus();
    },
    onError: error => toast.error(error.message || 'Could not update locations'),
  });

  const profile = myProfileQuery.data;
  const [companyName, setCompanyName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [servicesText, setServicesText] = useState('');
  const [serviceActiveOverrides, setServiceActiveOverrides] = useState<Record<string, boolean>>({});
  const [locationsText, setLocationsText] = useState('');
  const [autoBootstrapAttempted, setAutoBootstrapAttempted] = useState(false);

  const bootstrapCompanyName = useMemo(() => {
    const explicitName = String(user?.name || '').trim();
    if (explicitName) return explicitName;
    const emailPrefix = String(user?.email || '')
      .split('@')[0]
      ?.replace(/[._-]+/g, ' ')
      .trim();
    return emailPrefix || 'Partner profile';
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (!profile) return;
    setCompanyName(profile.companyName || '');
    setHeadline(profile.headline || '');
    setBio(profile.bio || '');
    setContactEmail(profile.contactEmail || '');
    setContactPhone(profile.contactPhone || '');
    setWebsiteUrl(profile.websiteUrl || '');
    setServicesText(
      (profile.services || [])
        .map((item: any) => [item.category, item.code, item.displayName].filter(Boolean).join(', '))
        .join('\n'),
    );
    setServiceActiveOverrides({});
    setLocationsText(
      (profile.locations || [])
        .map((item: any) => [item.suburb, item.city, item.province].filter(Boolean).join(', '))
        .join('\n'),
    );
  }, [profile]);

  useEffect(() => {
    if (authLoading || myProfileQuery.isLoading || myProfileQuery.isFetching) return;
    if (user?.role !== 'service_provider') return;
    if (statusLoading) return;
    if (
      profile ||
      status?.hasProviderIdentity ||
      registerIdentity.isPending ||
      autoBootstrapAttempted
    )
      return;

    setAutoBootstrapAttempted(true);
    setCompanyName(current => current || bootstrapCompanyName);
    registerIdentity.mutate({ companyName: bootstrapCompanyName });
  }, [
    authLoading,
    autoBootstrapAttempted,
    bootstrapCompanyName,
    myProfileQuery.isFetching,
    myProfileQuery.isLoading,
    profile,
    registerIdentity,
    status?.hasProviderIdentity,
    statusLoading,
    user?.role,
  ]);

  const saving = useMemo(
    () =>
      registerIdentity.isPending ||
      saveProfile.isPending ||
      replaceServices.isPending ||
      replaceLocations.isPending,
    [
      registerIdentity.isPending,
      saveProfile.isPending,
      replaceServices.isPending,
      replaceLocations.isPending,
    ],
  );

  if (statusLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <p className="text-sm text-slate-500">Preparing your partner setup...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Partner Setup
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Directory and partner profile configuration
        </h1>
      </header>
      <ProNavigation />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Setup progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1">
              {status?.hasProviderIdentity ? 'Identity created' : 'Create identity'}
            </span>
            <span className="rounded-full border px-3 py-1">
              {status?.profileConfigured ? 'Public profile saved' : 'Complete public profile'}
            </span>
            <span className="rounded-full border px-3 py-1">
              {status?.servicesConfigured ? 'Services added' : 'Add services'}
            </span>
            <span className="rounded-full border px-3 py-1">
              {status?.locationsConfigured ? 'Coverage added' : 'Add service areas'}
            </span>
          </div>
          {status?.dashboardUnlocked ? (
            <div className="flex items-center justify-between gap-3">
              <p>
                Your profile details are complete. Directory publication is reviewed separately.
              </p>
              <Button variant="outline" onClick={() => setLocation('/service/dashboard')}>
                Open workspace
              </Button>
            </div>
          ) : (
            <p>Complete the checklist below before requesting directory review.</p>
          )}
        </CardContent>
      </Card>

      {profile && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Directory publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              {profile.isPublished
                ? 'Published in the public directory'
                : 'Held for directory review'}
            </p>
            <p>
              {profile.isPublished
                ? 'Consumers can discover this profile and send requests to your provider workspace.'
                : 'Your profile is saved privately until the platform review is complete.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!profile && (
        <Card>
          <CardHeader>
            <CardTitle>Create partner profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={companyName}
              onChange={event => setCompanyName(event.target.value)}
              placeholder="Business or trading name"
            />
            <Button
              disabled={!companyName.trim() || registerIdentity.isPending}
              onClick={() => registerIdentity.mutate({ companyName: companyName.trim() })}
            >
              {registerIdentity.isPending ? 'Creating...' : 'Create partner profile'}
            </Button>
          </CardContent>
        </Card>
      )}

      {profile && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Public profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={headline}
                onChange={event => setHeadline(event.target.value)}
                placeholder="Headline"
              />
              <Textarea
                value={bio}
                onChange={event => setBio(event.target.value)}
                placeholder="Bio"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={contactEmail}
                  onChange={event => setContactEmail(event.target.value)}
                  placeholder="Contact email"
                />
                <Input
                  value={contactPhone}
                  onChange={event => setContactPhone(event.target.value)}
                  placeholder="Contact phone"
                />
                <Input
                  value={websiteUrl}
                  onChange={event => setWebsiteUrl(event.target.value)}
                  placeholder="Website URL"
                />
              </div>
              <Button
                disabled={saving}
                onClick={() =>
                  saveProfile.mutate({
                    headline,
                    bio,
                    contactEmail: contactEmail || undefined,
                    contactPhone: contactPhone || undefined,
                    websiteUrl: websiteUrl || undefined,
                  })
                }
              >
                Save profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services and locations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Services (category, code, displayName)
                  </span>
                  <Textarea
                    value={servicesText}
                    onChange={event => setServicesText(event.target.value)}
                    placeholder="home_improvement, painting, Interior painting"
                    className="min-h-40"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Locations (suburb, city, province)
                  </span>
                  <Textarea
                    value={locationsText}
                    onChange={event => setLocationsText(event.target.value)}
                    placeholder="Bryanston, Johannesburg, Gauteng"
                    className="min-h-40"
                  />
                </label>
              </div>
              {profile?.services && profile.services.length > 0 && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service availability
                  </p>
                  {profile.services.map((service: any) => {
                    const serviceKey = String(service.code || service.id || service.displayName)
                      .trim()
                      .toLowerCase();
                    const checked =
                      serviceActiveOverrides[serviceKey] ?? service.isActive !== false;
                    return (
                      <label
                        key={service.id || serviceKey}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={event => {
                            const nextChecked = event.target.checked;
                            setServiceActiveOverrides(current => ({
                              ...current,
                              [serviceKey]: nextChecked,
                            }));
                          }}
                        />
                        <span>
                          {service.displayName || service.code || 'Service'} —{' '}
                          {checked ? 'Available for requests' : 'Inactive'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={saving}
                  onClick={() =>
                    replaceServices.mutate({
                      services: linesToServices(
                        servicesText,
                        profile?.services || [],
                        serviceActiveOverrides,
                      ),
                    })
                  }
                >
                  Save services
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    replaceLocations.mutate({
                      locations: linesToLocations(locationsText, profile?.locations || []),
                    })
                  }
                >
                  Save locations
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
