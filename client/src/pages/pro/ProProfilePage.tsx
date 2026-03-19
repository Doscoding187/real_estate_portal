import { useEffect, useMemo, useState } from 'react';
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

function linesToServices(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [category, code, displayName] = line.split(',').map(part => part.trim());
      const safeCategory = SERVICE_CATEGORIES.some(item => item.value === category)
        ? (category as ServiceCategory)
        : ('home_improvement' as ServiceCategory);
      return {
        category: safeCategory,
        code: code || `code-${Math.random().toString(36).slice(2, 7)}`,
        displayName: displayName || code || 'Service',
      };
    });
}

function linesToLocations(text: string) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [suburb, city, province] = line.split(',').map(part => part.trim());
      return {
        suburb: suburb || undefined,
        city: city || undefined,
        province: province || undefined,
        isPrimary: index === 0,
      };
    });
}

export default function ProProfilePage() {
  useAuth({ redirectOnUnauthenticated: true });

  useEffect(() => {
    applySeo({
      title: 'Provider Profile Setup | Services Pro',
      description: 'Configure your provider profile, services, locations, and directory details.',
      canonicalPath: '/pro/profile',
      noindex: true,
    });
  }, []);

  const myProfileQuery = trpc.servicesEngine.myProviderProfile.useQuery();

  const registerIdentity = trpc.servicesEngine.registerProviderIdentity.useMutation({
    onSuccess: () => {
      toast.success('Provider identity created');
      myProfileQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Could not create provider identity'),
  });
  const saveProfile = trpc.servicesEngine.upsertProviderProfile.useMutation({
    onSuccess: () => toast.success('Profile updated'),
    onError: error => toast.error(error.message || 'Could not save profile'),
  });
  const replaceServices = trpc.servicesEngine.replaceProviderServices.useMutation({
    onSuccess: () => toast.success('Services updated'),
    onError: error => toast.error(error.message || 'Could not update services'),
  });
  const replaceLocations = trpc.servicesEngine.replaceProviderLocations.useMutation({
    onSuccess: () => toast.success('Service locations updated'),
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
  const [locationsText, setLocationsText] = useState('');

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
    setLocationsText(
      (profile.locations || [])
        .map((item: any) => [item.suburb, item.city, item.province].filter(Boolean).join(', '))
        .join('\n'),
    );
  }, [profile]);

  const saving = useMemo(
    () =>
      registerIdentity.isPending ||
      saveProfile.isPending ||
      replaceServices.isPending ||
      replaceLocations.isPending,
    [registerIdentity.isPending, saveProfile.isPending, replaceServices.isPending, replaceLocations.isPending],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Provider Setup</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Directory and profile configuration</h1>
      </header>
      <ProNavigation />

      {!profile && (
        <Card>
          <CardHeader>
            <CardTitle>Create provider identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={companyName}
              onChange={event => setCompanyName(event.target.value)}
              placeholder="Company name"
            />
            <Button
              disabled={!companyName.trim() || registerIdentity.isPending}
              onClick={() => registerIdentity.mutate({ companyName: companyName.trim() })}
            >
              {registerIdentity.isPending ? 'Creating...' : 'Create profile'}
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
              <Textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="Bio" />
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
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={saving}
                  onClick={() => replaceServices.mutate({ services: linesToServices(servicesText) as any })}
                >
                  Save services
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => replaceLocations.mutate({ locations: linesToLocations(locationsText) as any })}
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
