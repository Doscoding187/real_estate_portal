import { useMemo } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Award,
  Building2,
  CheckCircle,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Share2,
  Twitter,
} from 'lucide-react';

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim());
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(item => String(item).trim());
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).reduce(
        (acc, [key, link]) => {
          if (typeof link === 'string' && link.trim()) {
            acc[key] = link;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
    }
  } catch {
    return {};
  }

  return {};
}

export default function AgentMicrosite() {
  const [, slugParams] = useRoute('/agents/:slug');
  const [, aliasParams] = useRoute('/a/:slug');
  const slug = slugParams?.slug || aliasParams?.slug || '';

  const profileQuery = trpc.agent.getPublicProfileBySlug.useQuery(
    { slug },
    {
      enabled: !!slug,
      retry: false,
    },
  );

  const specialization = useMemo(
    () => parseList(profileQuery.data?.specialization),
    [profileQuery.data?.specialization],
  );
  const areasServed = useMemo(
    () => parseList(profileQuery.data?.areasServed),
    [profileQuery.data?.areasServed],
  );
  const languages = useMemo(
    () => parseList(profileQuery.data?.languages),
    [profileQuery.data?.languages],
  );
  const socialLinks = useMemo(
    () => parseSocialLinks(profileQuery.data?.socialLinks),
    [profileQuery.data?.socialLinks],
  );

  const profile = profileQuery.data;
  const displayName =
    profile?.displayName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  const initials = `${profile?.firstName?.charAt(0) || ''}${profile?.lastName?.charAt(0) || ''}`;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: displayName || 'Agent Profile',
        text: 'Check out this real estate agent profile.',
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {profileQuery.isLoading ? (
          <div className="container py-24 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F4C75] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading public profile...</p>
          </div>
        ) : !profile ? (
          <div className="container py-24 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Agent profile not found</h1>
            <p className="text-muted-foreground">
              This agent profile is not publicly available.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#0A2540] to-[#0F4C75] text-white py-12">
              <div className="container">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-4xl font-bold flex-shrink-0 border-4 border-white/30 overflow-hidden">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials || 'A'
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-bold">{displayName}</h1>
                      {profile.isVerified === 1 && <Badge className="bg-green-500">Verified</Badge>}
                    </div>

                    {profile.role && (
                      <div className="flex items-center gap-2 text-lg mb-4">
                        <Building2 className="h-5 w-5" />
                        <span className="capitalize">{profile.role.replace('_', ' ')}</span>
                      </div>
                    )}

                    <p className="text-gray-200 max-w-3xl mb-6">
                      {profile.bio ||
                        'Experienced real estate professional ready to help clients buy, sell, and rent property.'}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {profile.phone && (
                        <Button
                          className="bg-white text-[#0F4C75] hover:bg-gray-100"
                          onClick={() => (window.location.href = `tel:${profile.phone}`)}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Agent
                        </Button>
                      )}
                      {profile.email && (
                        <Button
                          variant="outline"
                          className="border-white text-white hover:bg-white/10"
                          onClick={() => (window.location.href = `mailto:${profile.email}`)}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email Agent
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="border-white text-white hover:bg-white/10"
                        onClick={handleShare}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="container py-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {profile.bio || 'This agent has not added a public biography yet.'}
                      </p>
                    </CardContent>
                  </Card>

                  {specialization.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Specializations</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {specialization.map(item => (
                          <Badge key={item} variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {item}
                          </Badge>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {(profile.yearsExperience || profile.totalSales) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.yearsExperience ? (
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-3xl font-bold text-[#0F4C75] mb-1">
                              {profile.yearsExperience}+
                            </div>
                            <div className="text-sm text-muted-foreground">Years Experience</div>
                          </CardContent>
                        </Card>
                      ) : null}

                      {profile.totalSales ? (
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-3xl font-bold text-[#0F4C75] mb-1">
                              {profile.totalSales}
                            </div>
                            <div className="text-sm text-muted-foreground">Properties Sold</div>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profile.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-[#0F4C75]" />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      {profile.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-[#0F4C75]" />
                          <span className="break-all">{profile.email}</span>
                        </div>
                      )}
                      {profile.licenseNumber && (
                        <div className="flex items-center gap-3">
                          <Award className="h-5 w-5 text-[#0F4C75]" />
                          <span>License: {profile.licenseNumber}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {areasServed.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Areas Served</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {areasServed.map(area => (
                          <div key={area} className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#0F4C75]" />
                            <span className="text-sm">{area}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {languages.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Languages</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {languages.map(language => (
                          <Badge key={language} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {Object.keys(socialLinks).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Connect</CardTitle>
                      </CardHeader>
                      <CardContent className="flex gap-3">
                        {socialLinks.facebook ? (
                          <a
                            href={socialLinks.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Facebook className="h-5 w-5" />
                          </a>
                        ) : null}
                        {socialLinks.instagram ? (
                          <a
                            href={socialLinks.instagram}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-colors"
                          >
                            <Instagram className="h-5 w-5" />
                          </a>
                        ) : null}
                        {socialLinks.linkedin ? (
                          <a
                            href={socialLinks.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-700 hover:text-white transition-colors"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        ) : null}
                        {socialLinks.twitter ? (
                          <a
                            href={socialLinks.twitter}
                            target="_blank"
                            rel="noreferrer"
                            className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center hover:bg-sky-500 hover:text-white transition-colors"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        ) : null}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="bg-[#0A2540] text-white py-8 mt-auto">
        <div className="container text-center text-sm text-gray-400">
          © 2025 Real Estate Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
