import { useMemo } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function AgentMicrosite() {
  const [, agentsParams] = useRoute('/agents/:slug');
  const [, shortParams] = useRoute('/a/:slug');
  const slug = agentsParams?.slug || shortParams?.slug || '';

  const query = trpc.agent.getPublicProfileBySlug.useQuery(
    { slug },
    {
      enabled: Boolean(slug),
      refetchOnWindowFocus: false,
    },
  );

  const profile = query.data;
  const locationLabel = useMemo(() => (profile?.areasServed || []).join(', '), [profile]);

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading profile...</p>
      </div>
    );
  }

  if (query.error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Agent profile not found</h1>
          <p className="text-slate-600 mt-2">This profile may be unavailable or unpublished.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-slate-900 text-white py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{profile.displayName}</h1>
              <p className="text-slate-300 mt-1">
                {profile.focus ? profile.focus.replace('_', ' ') : 'Real estate agent'}
              </p>
              {locationLabel && (
                <p className="text-slate-300 mt-2 inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {locationLabel}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.phone && (
                <Button asChild variant="secondary">
                  <a href={`tel:${profile.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              {profile.email && (
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {profile.bio && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-slate-700">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {(profile.specializations?.length > 0 || profile.propertyTypes?.length > 0) && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {profile.specializations?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specializations.map((item: string) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile.propertyTypes?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Property Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.propertyTypes.map((item: string) => (
                      <Badge key={item} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Listings</h2>
            {profile.listingsPreview?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {profile.listingsPreview.map((listing: any) => (
                  <div key={listing.id} className="rounded-lg border p-3 bg-white">
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-sm text-slate-500">
                      {[listing.city, listing.province].filter(Boolean).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No public listings yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
