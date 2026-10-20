import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  SimpleHomeListingCard,
  type SimpleHomeListingCardProps,
} from '@/components/SimpleHomeListingCard';
import { normalizePublicPropertyCard } from '@/lib/property';
import type { PublicPropertyDetailPresentation } from '@shared/public-property-detail-presentation';
import { AgentProfileEnquiryDialog } from '@/components/agent/AgentProfileEnquiryDialog';
import { AgentInsightsSection } from '@/components/agent/AgentInsightsSection';
import { AgentVideoSection } from '@/components/agent/AgentVideoSection';
import { PresenceImage } from '@/components/PresenceImage';
import { selectPresenceImages } from '@/lib/presenceImages';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  House,
  Mail,
  MapPin,
  Menu,
  X,
  MessageCircle,
  Phone,
  Send,
  Share2,
} from 'lucide-react';
import { applySeo } from '@/lib/seo';
import {
  AGENT_PROFILE_EVENTS,
  buildWhatsAppHref,
  parseDelimitedList,
  parseSocialLinksRecord,
  useAgentProfileTracker,
} from '@/lib/agentPresence';
import './AgentMicrosite.css';

const ROLE_LABELS: Record<string, string> = {
  agent: 'Property Practitioner',
  principal_agent: 'Principal Property Practitioner',
  broker: 'Property Broker',
};
interface CanonicalAreaLink {
  canonicalLocationId: string;
  name: string;
  type: 'suburb' | 'city' | 'province' | null;
  url: string | null;
}
interface InventoryCard extends Record<string, unknown> {
  id: number;
  title: string;
  detailPresentation?: PublicPropertyDetailPresentation;
  images?: Array<{ url: string; isPrimary?: number; displayOrder?: number }>;
}
function publicInventoryCardData(card: InventoryCard): SimpleHomeListingCardProps {
  // The public inventory DTO exposes one price; the shared normalizer accepts
  // intent-specific price fields. Embedded pricing contracts retain precedence.
  const normalized = normalizePublicPropertyCard({
    ...card,
    ...(card.listingType === 'rent' ? { monthlyRent: card.price } : { askingPrice: card.price }),
  });
  const detail = card.detailPresentation;
  return {
    id: normalized.id,
    href: normalized.href,
    title: normalized.title,
    city: normalized.city,
    suburb: normalized.suburb,
    locationLabel: detail?.location?.label || normalized.location,
    price: normalized.price,
    image: normalized.image,
    area: normalized.area,
    yardSize: normalized.yardSize,
    bedrooms: normalized.bedrooms,
    bathrooms: normalized.bathrooms,
    propertyType: normalized.propertyType,
    listingType: normalized.listingType === 'rent' ? 'rent' : 'sale',
    badgeLabel: normalized.listingType === 'rent' ? 'To rent' : 'For sale',
  };
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
  const [isInventoryPage, inventoryParams] = useRoute('/agents/:slug/properties');
  const [isAliasInventoryPage, aliasInventoryParams] = useRoute('/a/:slug/properties');
  const allProperties = isInventoryPage || isAliasInventoryPage;
  const slug =
    slugParams?.slug ||
    aliasParams?.slug ||
    inventoryParams?.slug ||
    aliasInventoryParams?.slug ||
    '';
  const track = useAgentProfileTracker();
  const profileQuery = trpc.agent.getPublicProfileBySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false },
  );
  const profile = profileQuery.data;
  const displayName =
    profile?.displayName?.trim() ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    'Agent';
  const areas = useMemo<CanonicalAreaLink[]>(
    () => profile?.canonicalAreas || [],
    [profile?.canonicalAreas],
  );
  const primaryArea =
    areas.find(area => area.type === 'suburb' && area.url) ||
    areas.find(area => area.url) ||
    areas[0];
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [intent, setIntent] = useState<'all' | 'sale' | 'rent'>('all');
  const [inventoryArea, setInventoryArea] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [cursor, setCursor] = useState<number | undefined>();
  const [previousCursors, setPreviousCursors] = useState<Array<number | undefined>>([]);
  const [isEnquiryDialogOpen, setIsEnquiryDialogOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [coverImages, setCoverImages] = useState<
    ({ slug: string } & ReturnType<typeof selectPresenceImages>) | null
  >(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const inventoryQuery = trpc.agent.getPublicInventoryPageForAgent.useQuery(
    {
      slug,
      limit: allProperties ? 12 : 6,
      cursor,
      listingType: intent === 'all' ? undefined : intent,
      canonicalPlaceId: inventoryArea || undefined,
      sort,
    },
    { enabled: !!slug && !!profile, retry: false },
  );
  const inventoryLocationsQuery = trpc.agent.getPublicInventoryLocationsForAgent.useQuery(
    { slug },
    { enabled: !!slug && !!profile, retry: false, staleTime: 60_000 },
  );
  const inventoryLocations = inventoryLocationsQuery.data || [];
  const inventory = useMemo<InventoryCard[]>(
    () => (inventoryQuery.data?.items || []) as InventoryCard[],
    [inventoryQuery.data?.items],
  );
  const displayedInventory =
    !allProperties && inventoryQuery.data?.nextCursor != null && inventory.length >= 6
      ? inventory.slice(0, 5)
      : inventory;
  const portfolioImages = useMemo(
    () =>
      selectPresenceImages(
        inventory.map(card => ({
          primary: publicInventoryCardData(card).image,
          images: card.images || [],
        })),
      ),
    [inventory],
  );
  useEffect(() => {
    if (!profile || !inventoryQuery.data || intent !== 'all' || inventoryArea || cursor) return;
    setCoverImages(current =>
      current?.slug === slug &&
      current.hero === portfolioImages.hero &&
      current.contact === portfolioImages.contact &&
      current.hasListingPhoto === portfolioImages.hasListingPhoto
        ? current
        : { slug, ...portfolioImages },
    );
  }, [profile, inventoryQuery.data, portfolioImages, intent, inventoryArea, cursor, slug]);
  const specializations = parseDelimitedList(profile?.specialization);
  const languages = parseDelimitedList(profile?.languages);
  const socialLinks = parseSocialLinksRecord(profile?.socialLinks);
  const whatsappHref = buildWhatsAppHref(
    profile?.whatsapp || profile?.phone,
    `Hello ${displayName}, I found your profile on Property Listify.`,
  );
  const trackedAgentIdRef = useRef<number | null>(null);
  const profileHref = `/agents/${slug}`;
  const propertiesHref = `/agents/${slug}/properties`;

  useEffect(() => {
    setIntent('all');
    setInventoryArea('');
    setSort('newest');
    setCursor(undefined);
    setPreviousCursors([]);
    setShowAllAreas(false);
    setMobileNavigationOpen(false);
    setIsEnquiryDialogOpen(false);
  }, [slug, allProperties]);

  useEffect(() => {
    if (!profile || trackedAgentIdRef.current === profile.id) return;
    trackedAgentIdRef.current = profile.id;
    track(AGENT_PROFILE_EVENTS.profileView, { slug: profile.slug, agentId: profile.id });
  }, [profile, track]);

  useEffect(() => {
    if (!profile) return;
    const description =
      profile.bio?.trim() ||
      `${displayName}, ${ROLE_LABELS[profile.role || ''] || 'Property practitioner'}${primaryArea ? ` serving ${primaryArea.name}` : ''}.`;
    applySeo({
      title: `${allProperties ? 'Properties with ' : ''}${displayName} | Property Listify`,
      description: description.slice(0, 180),
      canonicalPath: allProperties ? propertiesHref : profileHref,
      image: toAbsoluteUrl(profile.profileImage),
      twitterCard: profile.profileImage ? 'summary_large_image' : 'summary',
    });
  }, [profile, displayName, primaryArea, allProperties, profileHref, propertiesHref]);

  const resetPage = () => {
    setCursor(undefined);
    setPreviousCursors([]);
  };
  const handleShare = async () => {
    track(AGENT_PROFILE_EVENTS.share, { slug });
    const url = `${window.location.origin}${profileHref}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareFeedback('Profile link copied');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setShareFeedback('Copy the profile URL from your address bar to share it.');
    }
  };

  if (profileQuery.isLoading)
    return (
      <main className="agent-site agent-site-state">
        <p>Loading professional profile...</p>
      </main>
    );
  if (!profile)
    return (
      <main className="agent-site agent-site-state">
        <Building2 size={44} />
        <h1>Profile not available</h1>
        <p>This agent profile is not publicly available.</p>
        <Link className="as-button as-outline" href="/agents">
          Browse Property Listify agents
        </Link>
      </main>
    );

  const initials = `${profile.firstName?.charAt(0) || ''}${profile.lastName?.charAt(0) || ''}`;
  const firstName = profile.firstName || displayName;
  const shortArea = primaryArea?.name.split(',')[0];
  const roleLabel = ROLE_LABELS[profile.role || ''] || 'Property Practitioner';
  const pageImages = coverImages?.slug === slug ? coverImages : portfolioImages;
  const openEnquiryDialog = (surface: 'header' | 'hero' | 'contact' | 'mobile') => {
    track(AGENT_PROFILE_EVENTS.contactCta, {
      slug: profile.slug,
      agentId: profile.id,
      action: 'send_enquiry',
      surface,
    });
    setIsEnquiryDialogOpen(true);
  };
  const areaGuide = (area: CanonicalAreaLink) =>
    area.url ? (
      <a
        className="as-area-guide-action"
        aria-label={`Explore guide for ${area.name}`}
        data-testid="area-guide-link"
        href={area.url}
        onClick={() =>
          track(AGENT_PROFILE_EVENTS.areaGuideClick, {
            slug: profile.slug,
            agentId: profile.id,
            area: area.name,
            target: area.url,
          })
        }
      >
        Explore this area <ArrowRight size={14} />
      </a>
    ) : null;
  const whatsapp = (className = 'as-button as-whatsapp') =>
    whatsappHref ? (
      <a
        className={className}
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        onClick={() => track(AGENT_PROFILE_EVENTS.whatsappClick, { slug })}
      >
        <MessageCircle size={18} />
        <span>WhatsApp</span>
      </a>
    ) : null;
  const call = (className = 'as-contact-link') =>
    profile.phone ? (
      <a
        className={className}
        href={`tel:${profile.phone}`}
        onClick={() => track(AGENT_PROFILE_EVENTS.callClick, { slug })}
      >
        <Phone size={17} />
        <span>Call</span>
      </a>
    ) : null;
  const hasAbout =
    !!profile.bio?.trim() ||
    !!specializations.length ||
    !!languages.length ||
    !!profile.licenseNumber ||
    !!Object.keys(socialLinks).length;
  const hasInventory =
    inventory.length > 0 ||
    allProperties ||
    intent !== 'all' ||
    !!inventoryArea ||
    inventoryQuery.isLoading ||
    inventoryQuery.isError ||
    inventoryQuery.data?.nextCursor != null;

  return (
    <div className="agent-site">
      <header className="as-header">
        <div className="as-shell as-header-inner">
          <Link className="as-brand" href={profileHref}>
            <House size={25} aria-hidden="true" />
            <span>Property Listify</span>
          </Link>
          <nav className="as-nav" aria-label="Agent page">
            <a href={allProperties ? propertiesHref : '#current-properties'}>Properties</a>
            {areas.length > 0 && (
              <a href={allProperties ? `${profileHref}#areas` : '#areas'}>Areas</a>
            )}
            <a href={allProperties ? `${profileHref}#insights` : '#insights'}>Advice</a>
            {hasAbout && <a href={allProperties ? `${profileHref}#about` : '#about'}>About</a>}
          </nav>
          <div className="as-header-actions">
            <button
              className="as-share"
              onClick={() => void handleShare()}
              aria-label="Share this profile"
              data-testid="share-profile"
            >
              <Share2 size={17} />
              <span>Share</span>
            </button>
            <button
              className="as-button as-primary as-header-enquiry"
              onClick={() => openEnquiryDialog('header')}
            >
              Contact agent
            </button>
            <button
              className="as-menu-toggle"
              aria-label="Agent page menu"
              aria-expanded={mobileNavigationOpen}
              aria-controls="agent-mobile-navigation"
              onClick={() => setMobileNavigationOpen(!mobileNavigationOpen)}
            >
              {mobileNavigationOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {mobileNavigationOpen && (
          <nav
            id="agent-mobile-navigation"
            className="as-mobile-nav"
            aria-label="Mobile agent page"
            onClick={() => setMobileNavigationOpen(false)}
          >
            <a href={allProperties ? propertiesHref : '#current-properties'}>Agent's listings</a>
            {areas.length > 0 && (
              <a href={allProperties ? `${profileHref}#areas` : '#areas'}>Areas</a>
            )}
            <a href={allProperties ? `${profileHref}#insights` : '#insights'}>Advice</a>
            {hasAbout && <a href={allProperties ? `${profileHref}#about` : '#about'}>About</a>}
            <a href="#contact">Contact agent</a>
          </nav>
        )}
        {shareFeedback && (
          <p className="as-share-feedback" role="status">
            {shareFeedback}
          </p>
        )}
      </header>

      {allProperties ? (
        <section className="as-collection-header as-shell">
          <Link href={profileHref} className="as-text-link">
            <ArrowLeft size={16} />
            Back to {firstName}'s profile
          </Link>
          <p className="as-eyebrow">Current properties</p>
          <h1>Properties with {firstName}</h1>
          <p>Explore available listings and open a property for its details and enquiry options.</p>
        </section>
      ) : (
        <>
          <section className="as-hero as-hero-with-image">
            <PresenceImage
              className="as-hero-image"
              src={pageImages.hero}
              fallbackSrc={PROPERTY_IMAGE_FALLBACK}
              alt=""
              aria-hidden="true"
            />
            <div className="as-hero-shade" />
            <div className="as-shell as-hero-inner">
              <div className="as-hero-copy">
                <p className="as-eyebrow">{roleLabel}</p>
                <h1 data-testid="agent-name">{displayName}</h1>
                <p className="as-hero-position">
                  Helping you find your place{shortArea ? ` in ${shortArea}` : ''}.
                </p>
                {primaryArea && (
                  <p className="as-hero-location">
                    <MapPin size={16} />
                    {primaryArea.name}
                    {areas.length > 1
                      ? ` · ${areas.length - 1} more service ${areas.length === 2 ? 'area' : 'areas'}`
                      : ''}
                  </p>
                )}
                {profile.agency && (
                  <p className="as-affiliation" data-testid="agency-affiliation">
                    Currently with <strong>{profile.agency.name}</strong>
                  </p>
                )}
                <div className="as-hero-actions" data-testid="hero-contact-actions">
                  {hasInventory && (
                    <a className="as-button as-light" href="#current-properties">
                      Explore my properties <ArrowRight size={17} />
                    </a>
                  )}
                  {whatsapp('as-button as-blueprint-whatsapp')}
                  {(!hasInventory || !whatsappHref) && (
                    <button
                      className="as-button as-light-outline"
                      data-testid="send-profile-enquiry"
                      onClick={() => openEnquiryDialog('hero')}
                    >
                      <Send size={17} />
                      Send enquiry
                    </button>
                  )}
                </div>
                <div className="as-trust-strip">
                  {hasInventory && (
                    <a href="#current-properties">
                      <House size={23} />
                      <span>
                        Current
                        <br />
                        listings
                      </span>
                    </a>
                  )}

                  {areas.length > 0 && (
                    <span>
                      <MapPin size={17} />
                      <strong>{areas.length}</strong> service{' '}
                      {areas.length === 1 ? 'area' : 'areas'}
                    </span>
                  )}
                  {profile.yearsExperience != null && profile.yearsExperience > 0 && (
                    <span>{profile.yearsExperience}+ years experience</span>
                  )}
                  {profile.isVerified === 1 && (
                    <span data-testid="verified-badge">
                      <CheckCircle2 size={17} />
                      Profile verified
                    </span>
                  )}
                </div>
              </div>
              <div className={`as-portrait ${profile.profileImage ? '' : 'as-portrait-fallback'}`}>
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={displayName} />
                ) : (
                  <>
                    <span className="as-initials">{initials}</span>
                    <span className="as-portrait-name">{displayName}</span>
                    <span className="as-portrait-role">{roleLabel}</span>
                  </>
                )}
              </div>
              {pageImages.hasListingPhoto && (
                <span className="as-hero-caption">
                  A property currently represented by {firstName}
                </span>
              )}
            </div>
          </section>
        </>
      )}

      <main className="as-shell as-main">
        {hasInventory && (
          <section
            id="current-properties"
            data-testid="inventory-section"
            className="as-inventory-section"
          >
            {!allProperties && (
              <div className="as-section-heading">
                <div>
                  <p className="as-eyebrow">Current portfolio</p>
                  <h2>Agent's listings</h2>
                  <p className="as-section-description">
                    A selection of current properties represented by {firstName}.<br />
                    Open a listing for photos, details and enquiry options.
                  </p>
                </div>
                {inventoryQuery.data?.nextCursor != null && (
                  <Link
                    data-testid="view-all-properties"
                    className="as-text-link"
                    href={propertiesHref}
                    onClick={() =>
                      track(AGENT_PROFILE_EVENTS.contactCta, {
                        slug,
                        action: 'view_all_properties',
                      })
                    }
                  >
                    View all properties <ArrowRight size={17} />
                  </Link>
                )}
              </div>
            )}
            <div className="as-inventory-controls">
              <div className="as-intent-tabs" role="group" aria-label="Property intent">
                {(['all', 'sale', 'rent'] as const).map(value => (
                  <button
                    key={value}
                    aria-pressed={intent === value}
                    className={intent === value ? 'is-selected' : ''}
                    onClick={() => {
                      setIntent(value);
                      resetPage();
                    }}
                  >
                    {value === 'all' ? 'All properties' : value === 'sale' ? 'For sale' : 'To rent'}
                  </button>
                ))}
              </div>
              <div className="as-selects">
                {inventoryLocations.length > 0 && (
                  <label>
                    <span className="sr-only">Filter properties by area</span>
                    <select
                      aria-label="Filter properties by area"
                      value={inventoryArea}
                      onChange={event => {
                        setInventoryArea(event.target.value);
                        resetPage();
                      }}
                    >
                      <option value="">All areas</option>
                      {inventoryLocations.map(location => (
                        <option key={location.canonicalPlaceId} value={location.canonicalPlaceId}>
                          {location.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {allProperties && (
                  <label>
                    <span className="sr-only">Property order</span>
                    <select
                      aria-label="Property order"
                      value={sort}
                      onChange={event => {
                        setSort(event.target.value as 'newest' | 'oldest');
                        resetPage();
                      }}
                    >
                      <option value="newest">Newest added</option>
                      <option value="oldest">Oldest added</option>
                    </select>
                  </label>
                )}
              </div>
            </div>
            {inventoryQuery.isLoading ? (
              <p className="as-inventory-status" role="status">
                Loading properties...
              </p>
            ) : inventoryQuery.isError ? (
              <div className="as-inventory-status" role="alert">
                <p>Properties couldn't be loaded. Please try again.</p>
                <button
                  className="as-button as-outline"
                  onClick={() => void inventoryQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="as-property-grid">
                  {displayedInventory.map(card => (
                    <div key={card.id} data-testid="inventory-card">
                      <SimpleHomeListingCard
                        {...publicInventoryCardData(card)}
                        onOpen={() =>
                          track(AGENT_PROFILE_EVENTS.listingClick, {
                            slug: profile.slug,
                            agentId: profile.id,
                            propertyId: card.id,
                          })
                        }
                      />
                    </div>
                  ))}
                  {!allProperties && inventoryQuery.data?.nextCursor != null && (
                    <Link className="as-portfolio-card" href={propertiesHref}>
                      <House size={32} />
                      <p className="as-eyebrow">Keep exploring</p>
                      <h3>
                        More properties,
                        <br />
                        more possibilities.
                      </h3>
                      <p>Browse {firstName}'s available listings by area and sale or rental.</p>
                      <span className="as-button as-primary">
                        View all properties <ArrowRight size={17} />
                      </span>
                    </Link>
                  )}
                </div>
                {!inventory.length && (
                  <p className="as-inventory-status">
                    {inventoryQuery.data?.nextCursor != null
                      ? 'No public properties in this batch. Continue to check the next page.'
                      : 'No current properties match these filters.'}
                  </p>
                )}
                {allProperties && (
                  <nav className="as-pagination" aria-label="Property pages">
                    <button
                      className="as-button as-outline"
                      disabled={!previousCursors.length || inventoryQuery.isFetching}
                      onClick={() => {
                        setCursor(previousCursors[previousCursors.length - 1]);
                        setPreviousCursors(previousCursors.slice(0, -1));
                      }}
                    >
                      <ChevronLeft size={17} />
                      Previous
                    </button>
                    <span>Page {previousCursors.length + 1}</span>
                    <button
                      className="as-button as-outline"
                      disabled={
                        inventoryQuery.data?.nextCursor == null || inventoryQuery.isFetching
                      }
                      onClick={() => {
                        setPreviousCursors([...previousCursors, cursor]);
                        setCursor(inventoryQuery.data?.nextCursor ?? undefined);
                      }}
                    >
                      Next
                      <ChevronRight size={17} />
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        )}

        {!allProperties && areas.length > 0 && (
          <section id="areas" className="as-area-section" data-testid="areas-section">
            <div className="as-area-layout">
              <div className="as-area-intro" data-testid="area-guides-intro">
                <p className="as-eyebrow">Local expertise</p>
                <h2>Areas I work in</h2>
                <p>
                  Explore {firstName}'s service areas and their local guides before your next move.
                </p>
                <a className="as-button as-primary as-all-area-guides" href="/tools/area-guides">
                  Explore all area guides <ArrowRight size={16} />
                </a>
              </div>
              <div className="as-area-picker" role="group" aria-label="Service area guides">
                {(showAllAreas ? areas : areas.slice(0, 4)).map(area => (
                  <article
                    key={area.canonicalLocationId}
                    className="as-area-option"
                    data-testid="area-guide-card"
                    aria-label={area.name}
                  >
                    <PresenceImage
                      className="as-area-image"
                      alt=""
                      loading="lazy"
                      width={320}
                      height={180}
                      aria-hidden="true"
                    />
                    <div className="as-area-card-body">
                      <h3>{area.name.split(',')[0]}</h3>
                      <p>{area.name.split(',').slice(1).join(',').trim() || 'Service area'}</p>
                      {area.url ? (
                        areaGuide(area)
                      ) : (
                        <p className="as-area-guide-unavailable">Guide not available yet</p>
                      )}
                    </div>
                  </article>
                ))}
                {areas.length > 4 && (
                  <button
                    className="as-text-link as-more-areas"
                    onClick={() => setShowAllAreas(!showAllAreas)}
                  >
                    {showAllAreas ? 'Show fewer areas' : `See all ${areas.length} areas`}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {!allProperties && <AgentInsightsSection area={primaryArea} />}
        {!allProperties && <AgentVideoSection key={slug} slug={slug} agentName={displayName} />}

        {!allProperties && hasAbout && (
          <section id="about" className="as-about" data-testid="about-section">
            <div>
              <p className="as-eyebrow">Meet your property professional</p>
              <h2>About {displayName}</h2>
              {profile.bio?.trim() && <p className="as-bio">{profile.bio}</p>}
              {specializations.length > 0 && (
                <div className="as-specializations">
                  {specializations.map(value => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              )}
            </div>
            {(profile.agency ||
              languages.length > 0 ||
              profile.licenseNumber ||
              Object.keys(socialLinks).length > 0) && (
              <aside className="as-professional-details">
                <h3>Professional details</h3>
                {profile.agency && (
                  <p data-testid="agency-detail">
                    <Building2 size={17} />
                    {profile.agency.name}
                  </p>
                )}
                {languages.length > 0 && <p>Languages: {languages.join(', ')}</p>}
                {profile.licenseNumber && <p>Registration supplied: {profile.licenseNumber}</p>}
                {Object.keys(socialLinks).length > 0 && (
                  <div className="as-socials">
                    {Object.entries(socialLinks).map(([name, href]) => (
                      <a key={name} href={href} target="_blank" rel="noreferrer">
                        {name}
                      </a>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </section>
        )}

        <section id="contact" className="as-contact" data-testid="contact-section">
          <PresenceImage
            className="as-contact-image"
            src={pageImages.contact}
            alt=""
            loading="lazy"
            aria-hidden="true"
          />
          <div className="as-contact-copy">
            <p className="as-eyebrow">Let's talk</p>
            <h2>Let's talk.</h2>
            <p>
              Whether you're buying, selling or renting, tell {firstName} what you have in mind.
            </p>
            <div className="as-contact-actions" data-testid="contact-actions">
              {whatsapp()}
              {call('as-button as-light')}
              {profile.email && (
                <a
                  className="as-button as-light"
                  href={`mailto:${profile.email}`}
                  onClick={() => track(AGENT_PROFILE_EVENTS.emailClick, { slug })}
                >
                  <Mail size={17} />
                  Email
                </a>
              )}
            </div>
          </div>
          <AgentProfileEnquiryDialog
            key={profile.id}
            onSubmitted={() =>
              track(AGENT_PROFILE_EVENTS.contactCta, {
                slug: profile.slug,
                agentId: profile.id,
                action: 'send_enquiry',
                surface: 'contact',
              })
            }
            presentation="inline"
            open={true}
            onOpenChange={() => {}}
            agentId={profile.id}
            agentName={displayName}
          />
        </section>
      </main>

      <footer className="as-footer">
        <div className="as-shell as-footer-inner">
          <div>
            <strong>{displayName}</strong>
            <p>{roleLabel}</p>
          </div>
          <nav aria-label="Profile footer">
            <Link href={propertiesHref}>Properties</Link>
            <a href="/agents">Agent directory</a>
            <a href="/advertise">Get your own presence</a>
          </nav>
          <p>
            Powered by <a href="/">Property Listify</a>
          </p>
        </div>
      </footer>
      <div className="as-mobile-contact" data-testid="mobile-contact-actions">
        {whatsapp()}
        {profile.phone ? (
          call('as-button as-outline')
        ) : (
          <button className="as-button as-outline" onClick={() => openEnquiryDialog('mobile')}>
            Send enquiry
          </button>
        )}
      </div>
      <AgentProfileEnquiryDialog
        open={isEnquiryDialogOpen}
        onOpenChange={setIsEnquiryDialogOpen}
        agentId={profile.id}
        agentName={displayName}
      />
    </div>
  );
}
