import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Twitter,
} from 'lucide-react';
import { applySeo } from '@/lib/seo';
import {
  AGENT_PROFILE_EVENTS,
  buildWhatsAppHref,
  parseDelimitedList,
  parseSocialLinksRecord,
  useAgentProfileTracker,
} from '@/lib/agentPresence';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Property Practitioner',
  principal_agent: 'Principal Property Practitioner',
  broker: 'Property Broker',
};

interface CanonicalAreaLink {
  name: string;
  type: 'suburb' | 'city' | 'province' | null;
  url: string | null;
}

interface InventoryCard {
  id: number;
  title: string;
  listingType?: string | null;
  displayPrice?: unknown;
  price?: unknown;
  suburb?: unknown;
  city?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  mainImage?: unknown;
  images?: Array<{ url?: string }> | null;
}

const zarFormat = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

function formatPropertyPrice(card: InventoryCard): string | null {
  const display = typeof card.displayPrice === 'string' ? card.displayPrice.trim() : '';
  if (display) return display;
  const numeric = Number(card.price);
  return Number.isFinite(numeric) && numeric > 0 ? zarFormat.format(numeric) : null;
}

function propertyLocationLine(card: InventoryCard): string {
  return [card.suburb, card.city]
    .filter(part => typeof part === 'string' && part.trim())
    .map(part => String(part).trim())
    .join(', ');
}

function primaryImageUrl(card: InventoryCard): string | null {
  if (typeof card.mainImage === 'string' && card.mainImage.trim()) return card.mainImage;
  return card.images?.find(image => typeof image?.url === 'string' && image.url)?.url || null;
}

function listingTypeLabel(card: InventoryCard): string | null {
  const value = String(card.listingType || '').toLowerCase();
  if (value === 'sale') return 'For Sale';
  if (value === 'rent') return 'To Rent';
  return null;
}

function countLabel(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function toAbsoluteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${value.startsWith('/') ? '' : '/'}${value}`;
}

export default function AgentMicrosite() {
  const [, slugParams] = useRoute('/agents/:slug');
  const [, aliasParams] = useRoute('/a/:slug');
  const slug = slugParams?.slug || aliasParams?.slug || '';

  const track = useAgentProfileTracker();

  const profileQuery = trpc.agent.getPublicProfileBySlug.useQuery(
    { slug },
    {
      enabled: !!slug,
      retry: false,
    },
  );

  const inventoryQuery = trpc.agent.getPublicInventoryForAgent.useQuery(
    { slug },
    {
      enabled: !!slug && !!profileQuery.data,
      retry: false,
    },
  );

  const profile = profileQuery.data;

  const displayName = useMemo(() => {
    if (!profile) return '';
    return (
      profile.displayName?.trim() || `${profile.firstName} ${profile.lastName}`.trim() || 'Agent'
    );
  }, [profile]);

  const specializations = useMemo(
    () => parseDelimitedList(profile?.specialization),
    [profile?.specialization],
  );
  const languages = useMemo(() => parseDelimitedList(profile?.languages), [profile?.languages]);
  const socialLinks = useMemo(
    () => parseSocialLinksRecord(profile?.socialLinks),
    [profile?.socialLinks],
  );
  const areas = useMemo<CanonicalAreaLink[]>(
    () => (Array.isArray(profile?.canonicalAreas) ? profile.canonicalAreas : []),
    [profile?.canonicalAreas],
  );

  const primaryArea =
    areas.find(area => area.type === 'suburb' && area.url) ||
    areas.find(area => area.type === 'city' && area.url) ||
    null;

  const whatsappHref = useMemo(
    () =>
      buildWhatsAppHref(
        profile?.whatsapp || profile?.phone,
        `Hello ${displayName}, I found your profile on Property Listify.`,
      ),
    [profile?.whatsapp, profile?.phone, displayName],
  );

  const inventory = useMemo<InventoryCard[]>(
    () => (Array.isArray(inventoryQuery.data) ? (inventoryQuery.data as InventoryCard[]) : []),
    [inventoryQuery.data],
  );

  const trackedAgentIdRef = useRef<number | null>(null);
  const [showAllInventory, setShowAllInventory] = useState(false);
  const INVENTORY_PREVIEW_COUNT = 6;
  const visibleInventory = showAllInventory
    ? inventory
    : inventory.slice(0, INVENTORY_PREVIEW_COUNT);

  useEffect(() => {
    if (!profile || !slug) return;
    if (trackedAgentIdRef.current === profile.id) return;
    trackedAgentIdRef.current = profile.id;
    track(AGENT_PROFILE_EVENTS.profileView, {
      slug: profile.slug,
      agentId: profile.id,
    });
  }, [profile, slug]);

  useEffect(() => {
    if (!profile) return;
    const positioning =
      profile.bio?.trim() ||
      [
        ROLE_LABELS[profile.role || ''] || 'Property practitioner',
        primaryArea ? `specialising in ${primaryArea.name}` : '',
        profile.agency ? `with ${profile.agency.name}` : '',
      ]
        .filter(Boolean)
        .join(' ') + '.';

    applySeo({
      title: `${displayName} | Property Listify`,
      description: positioning.length > 180 ? `${positioning.slice(0, 177)}...` : positioning,
      canonicalPath: `/agents/${profile.slug}`,
      image: toAbsoluteUrl(profile.profileImage),
      twitterCard: profile.profileImage ? 'summary_large_image' : 'summary',
    });
  }, [profile, displayName, primaryArea]);

  const handleShare = async () => {
    track(AGENT_PROFILE_EVENTS.share, { slug });
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: displayName || 'Agent Profile',
          text: 'Check out this real estate agent profile.',
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to clipboard sharing.
      }
    }
    await navigator.clipboard.writeText(shareUrl);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F4C75] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading professional profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <main className="flex-1 flex items-center justify-center py-24 text-center px-6">
          <div>
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Profile not available</h1>
            <p className="text-muted-foreground mb-8">
              This agent profile is not publicly available.
            </p>
            <Button asChild variant="outline">
              <a href="/agents">Browse Property Listify agents</a>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`;
  const roleLabel = profile.role
    ? ROLE_LABELS[profile.role] || profile.role.replace(/_/g, ' ')
    : '';
  const hasContact = Boolean(whatsappHref || profile.phone || profile.email);

  const trackAreaGuideClick = (areaName: string, url: string) => {
    track(AGENT_PROFILE_EVENTS.areaGuideClick, {
      slug: profile.slug,
      agentId: profile.id,
      area: areaName,
      target: url,
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* A. Minimal agent-owned header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-3">
          <a
            href="/"
            className="flex items-center gap-2 min-w-0 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Back to Property Listify</span>
          </a>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleShare()}
              aria-label="Share this profile"
              data-testid="share-profile"
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center rounded-md bg-[#0F4C75] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A2540] transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </header>

      {/* B. Hero */}
      <section className="bg-gradient-to-br from-[#0A2540] via-[#0F4C75] to-[#3282B8] text-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-white/25 shadow-xl flex-shrink-0 bg-white/10 flex items-center justify-center text-5xl md:text-6xl font-bold">
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

            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl md:text-6xl font-bold tracking-tight leading-tight"
                data-testid="agent-name"
              >
                {displayName}
              </h1>

              <div className="mt-3 space-y-1.5">
                {roleLabel && <p className="text-lg md:text-xl text-blue-100">{roleLabel}</p>}
                {profile.agency && (
                  <p
                    className="text-base md:text-lg text-blue-200/90 flex items-center gap-2"
                    data-testid="agency-affiliation"
                  >
                    Currently with{' '}
                    <span className="font-semibold text-white">{profile.agency.name}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {primaryArea && (
                  <span className="inline-flex items-center gap-1.5 text-blue-100">
                    <MapPin className="h-4 w-4" />
                    {primaryArea.name}
                    {areas.length > 1 ? ` & surrounding areas` : ''}
                  </span>
                )}
                {profile.isVerified === 1 && (
                  <span
                    className="inline-flex items-center gap-1.5 text-emerald-300 font-medium"
                    data-testid="verified-badge"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verified
                  </span>
                )}
                {typeof profile.yearsExperience === 'number' && profile.yearsExperience > 0 && (
                  <span className="text-blue-100">{profile.yearsExperience}+ years experience</span>
                )}
              </div>

              {profile.bio && (
                <p className="mt-5 max-w-2xl text-blue-50/95 leading-relaxed line-clamp-3 md:line-clamp-none">
                  {profile.bio}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3" data-testid="hero-contact-actions">
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track(AGENT_PROFILE_EVENTS.whatsappClick, { slug })}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 font-medium text-white hover:bg-emerald-400 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    onClick={() => track(AGENT_PROFILE_EVENTS.callClick, { slug })}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 font-medium text-[#0F4C75] hover:bg-blue-50 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    onClick={() => track(AGENT_PROFILE_EVENTS.emailClick, { slug })}
                    className="inline-flex items-center gap-2 rounded-md border border-white/60 px-5 py-2.5 font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
                {inventory.length > 0 && (
                  <a
                    href="#current-properties"
                    onClick={() =>
                      track(AGENT_PROFILE_EVENTS.contactCta, { slug, action: 'view_properties' })
                    }
                    className="inline-flex items-center gap-2 rounded-md border border-white/60 px-5 py-2.5 font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    View current properties
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 md:px-8 py-14 md:py-20 space-y-16 md:space-y-24 pb-28 md:pb-16">
        {/* C. Primary area / local authority */}
        {primaryArea && (
          <section
            className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end border-b border-slate-200 pb-10"
            data-testid="primary-area-section"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3282B8] mb-3">
                Local market focus
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {profile.firstName}&rsquo;s {primaryArea.name}
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600 leading-relaxed">
                {displayName} serves the {primaryArea.name} area
                {areas.length > 1 ? ' and surrounding communities' : ''}. Explore the{' '}
                {primaryArea.name} area guide on Property Listify for local property insights and
                current market activity.
              </p>
            </div>
            {primaryArea.url && (
              <a
                href={primaryArea.url}
                onClick={() => trackAreaGuideClick(primaryArea.name, primaryArea.url!)}
                className="inline-flex items-center gap-2 rounded-md border border-[#0F4C75] px-5 py-2.5 font-medium text-[#0F4C75] hover:bg-[#0F4C75] hover:text-white transition-colors whitespace-nowrap"
                data-testid="area-guide-link"
              >
                {primaryArea.name} area guide
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </section>
        )}

        {/* D. Current inventory / mandates */}
        {inventory.length > 0 && (
          <section id="current-properties" data-testid="inventory-section">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3282B8] mb-3">
                Current properties
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Current properties represented by {profile.firstName}
              </h2>
              <p className="mt-3 text-slate-600 max-w-2xl">
                Live mandates from the Property Listify network. Each listing is maintained on the
                canonical Property Listify marketplace.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {visibleInventory.map(card => {
                const price = formatPropertyPrice(card);
                const location = propertyLocationLine(card);
                const image = primaryImageUrl(card);
                const beds = countLabel(card.bedrooms);
                const baths = countLabel(card.bathrooms);
                const badge = listingTypeLabel(card);
                return (
                  <a
                    key={card.id}
                    href={`/property/${card.id}`}
                    onClick={() =>
                      track(AGENT_PROFILE_EVENTS.listingClick, {
                        slug: profile.slug,
                        agentId: profile.id,
                        propertyId: card.id,
                      })
                    }
                    className="group block"
                    data-testid="inventory-card"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 border border-slate-200 relative">
                      {image ? (
                        <img
                          src={image}
                          alt={card.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <Building2 className="h-10 w-10" />
                        </div>
                      )}
                      {badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0F4C75] shadow-sm">
                          {badge}
                        </span>
                      )}
                    </div>
                    <div className="pt-4">
                      <h3 className="font-semibold leading-snug group-hover:text-[#0F4C75] transition-colors line-clamp-2">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{location || 'South Africa'}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        {price && <p className="font-bold text-[#0F4C75]">{price}</p>}
                        <p className="text-xs text-slate-500 ml-auto flex items-center gap-3">
                          {beds !== null && (
                            <span className="inline-flex items-center gap-1">
                              <BedDouble className="h-3.5 w-3.5" />
                              {beds}
                            </span>
                          )}
                          {baths !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Bath className="h-3.5 w-3.5" />
                              {baths}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {inventory.length > INVENTORY_PREVIEW_COUNT && !showAllInventory && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => {
                    track(AGENT_PROFILE_EVENTS.contactCta, {
                      slug,
                      action: 'view_all_properties',
                    });
                    setShowAllInventory(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-[#0F4C75] px-6 py-3 font-medium text-[#0F4C75] hover:bg-[#0F4C75] hover:text-white transition-colors"
                  data-testid="view-all-properties"
                >
                  View all current properties represented by {profile.firstName}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>
        )}

        {/* E. About / expertise */}
        <section className="grid gap-10 lg:grid-cols-[1.6fr_1fr]" data-testid="about-section">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3282B8] mb-3">
              About
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              About {displayName}
            </h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {profile.bio || `${displayName} has not added a public biography yet.`}
            </p>

            {specializations.length > 0 && (
              <>
                <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Specialisations
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {specializations.map(spec => (
                    <Badge key={spec} variant="secondary" className="text-sm px-3 py-1">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      {spec}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6 lg:border-l lg:border-slate-200 lg:pl-10">
            {(profile.licenseNumber || languages.length > 0 || profile.agency) && (
              <div className="rounded-xl border border-slate-200 p-6 space-y-4 bg-slate-50/60">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Professional details
                </h3>
                {profile.agency && (
                  <p
                    className="text-sm text-slate-700 flex items-start gap-2.5"
                    data-testid="agency-detail"
                  >
                    <Building2 className="h-4 w-4 mt-0.5 text-[#3282B8] flex-shrink-0" />
                    <span>
                      Currently with <span className="font-semibold">{profile.agency.name}</span>
                    </span>
                  </p>
                )}
                {profile.licenseNumber && (
                  <p className="text-sm text-slate-700 flex items-start gap-2.5">
                    <Award className="h-4 w-4 mt-0.5 text-[#3282B8] flex-shrink-0" />
                    <span>License: {profile.licenseNumber}</span>
                  </p>
                )}
                {languages.length > 0 && (
                  <p className="text-sm text-slate-700">
                    Languages: <span className="font-medium">{languages.join(', ')}</span>
                  </p>
                )}
                {Object.keys(socialLinks).length > 0 && (
                  <div className="flex gap-3 pt-2 border-t border-slate-200">
                    {socialLinks.facebook && (
                      <a
                        href={socialLinks.facebook}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Facebook"
                        className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-[#0F4C75] hover:bg-[#1877F2] hover:text-white transition-colors"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                        className="h-9 w-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 hover:bg-[#E1306C] hover:text-white transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {socialLinks.linkedin && (
                      <a
                        href={socialLinks.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="LinkedIn"
                        className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-colors"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a
                        href={socialLinks.twitter}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Twitter"
                        className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 hover:bg-[#1DA1F2] hover:text-white transition-colors"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>

        {/* F. Areas served */}
        {areas.length > 0 && (
          <section data-testid="areas-section">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3282B8] mb-3">
              Areas served
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">
              Where {profile.firstName} works
            </h2>
            <div className="flex flex-wrap gap-3">
              {areas.map(area =>
                area.url ? (
                  <a
                    key={`${area.name}-${area.url}`}
                    href={area.url}
                    onClick={() => trackAreaGuideClick(area.name, area.url!)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#0F4C75] hover:text-[#0F4C75] transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {area.name}
                  </a>
                ) : (
                  <span
                    key={area.name}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {area.name}
                  </span>
                ),
              )}
            </div>
          </section>
        )}

        {/* J. Conversion CTA */}
        {hasContact && (
          <section
            id="contact"
            className="rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#0F4C75] text-white p-8 md:p-14 text-center"
            data-testid="contact-section"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Work with {profile.firstName}
            </h2>
            <p className="mt-3 text-blue-100 max-w-xl mx-auto">
              Get in touch directly about buying, selling or renting property
              {primaryArea ? ` in ${primaryArea.name}` : ''}.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3" data-testid="contact-actions">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track(AGENT_PROFILE_EVENTS.contactCta, {
                      slug,
                      action: 'whatsapp',
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 font-medium hover:bg-emerald-400 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp {profile.firstName}
                </a>
              )}
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  onClick={() =>
                    track(AGENT_PROFILE_EVENTS.contactCta, {
                      slug,
                      action: 'call',
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-medium text-[#0F4C75] hover:bg-blue-50 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call {profile.firstName}
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  onClick={() =>
                    track(AGENT_PROFILE_EVENTS.contactCta, {
                      slug,
                      action: 'email',
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-white/60 px-6 py-3 font-medium hover:bg-white/10 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Email {profile.firstName}
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Subtle Property Listify presence */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Powered by{' '}
            <a href="/" className="font-semibold text-[#0F4C75] hover:underline">
              Property Listify
            </a>
          </p>
          <div className="flex items-center gap-6">
            <a href="/property-for-sale" className="hover:text-slate-800 transition-colors">
              Browse properties
            </a>
            <a href="/agents" className="hover:text-slate-800 transition-colors">
              Agent directory
            </a>
          </div>
        </div>
      </footer>

      {/* Restrained sticky mobile contact */}
      {hasContact && (
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 flex gap-3"
          data-testid="mobile-contact-bar"
        >
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                track(AGENT_PROFILE_EVENTS.whatsappClick, { slug, surface: 'mobile_bar' })
              }
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              onClick={() => track(AGENT_PROFILE_EVENTS.callClick, { slug, surface: 'mobile_bar' })}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#0F4C75] px-4 py-2.5 text-sm font-medium text-white"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}
