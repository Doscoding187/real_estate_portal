import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, LockKeyhole, Monitor, Smartphone } from 'lucide-react';
import type { RouterOutputs } from '@/lib/trpc';
import ServiceProviderProfilePage, {
  type ProviderWebsitePublicProfile,
} from '@/pages/services/ServiceProviderProfilePage';
import type { OnboardingState } from './useOnboardingReducer';

type SavedProviderProfile = NonNullable<RouterOutputs['servicesEngine']['myProviderProfile']>;

function currentOrSaved(
  current: string,
  saved: string | null | undefined,
  stepIsDirty: boolean,
) {
  if (stepIsDirty) return current.trim() || null;
  return current.trim() || saved || null;
}

export function buildProviderWebsitePreviewProfile(
  profile: SavedProviderProfile | null | undefined,
  state: OnboardingState,
): ProviderWebsitePublicProfile {
  const servicesFromState = state.services
    .filter(service => service.isActive && service.displayName.trim())
    .map((service, index) => ({
      id: service.recordId || index + 1,
      category: service.category,
      code:
        service.code ||
        service.displayName.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 80),
      displayName: service.displayName.trim(),
      description: service.description.trim() || null,
      minPrice: service.minPrice && Number.isInteger(Number(service.minPrice))
        ? Number(service.minPrice)
        : null,
      maxPrice: service.maxPrice && Number.isInteger(Number(service.maxPrice))
        ? Number(service.maxPrice)
        : null,
      currency: 'ZAR',
    }));
  const savedServices = (profile?.services || [])
    .filter(service => service.isActive)
    .map(({ isActive: _isActive, ...service }) => service);
  const services = state.dirtySteps[3] || servicesFromState.length > 0
    ? servicesFromState
    : savedServices;

  const locationsFromState = state.locations.flatMap((location, index) =>
    location.place
      ? [{
          id: location.recordId || index + 1,
          canonicalPlaceId: location.place.canonicalPlaceId,
          label: location.place.label,
          isPrimary: location.isPrimary,
        }]
      : [],
  );
  const savedLocations = (profile?.locations || []).map(location => ({
    id: location.id,
    canonicalPlaceId: location.canonicalPlaceId,
    label: location.label || 'Selected service area',
    isPrimary: location.isPrimary,
  }));
  const locations = state.dirtySteps[4] || locationsFromState.length > 0
    ? locationsFromState
    : savedLocations;

  const stepOneDirty = Boolean(state.dirtySteps[1]);
  const stepTwoDirty = Boolean(state.dirtySteps[2]);
  const parsedYears = state.businessYearsInOperation.trim()
    ? Number(state.businessYearsInOperation)
    : null;
  const yearsFromState = parsedYears != null && Number.isInteger(parsedYears) ? parsedYears : null;
  const bio = currentOrSaved(state.bio, profile?.bio || profile?.description, stepOneDirty);
  const submissionStatus = profile?.submissionStatus || 'draft';
  const publicationStatus: ProviderWebsitePublicProfile['publicationStatus'] = profile?.isPublished
    ? 'published'
    : submissionStatus === 'rejected'
      ? 'rejected'
      : 'pending_review';

  return {
    providerId: profile?.providerId || 0,
    companyName: currentOrSaved(state.companyName, profile?.companyName, stepOneDirty) || 'Your business name',
    description: bio,
    logoUrl: currentOrSaved(state.logoUrl, profile?.logoUrl, stepOneDirty),
    verificationStatus: profile?.verificationStatus || 'pending',
    isPublished: Boolean(profile?.isPublished),
    publicationStatus,
    headline: currentOrSaved(state.headline, profile?.headline, stepOneDirty),
    bio,
    websiteUrl: currentOrSaved(state.websiteUrl, profile?.websiteUrl, stepTwoDirty),
    businessType: stepOneDirty ? state.businessType : state.businessType || profile?.businessType || null,
    websiteTemplate: state.dirtySteps[5]
      ? state.websiteTemplate
      : profile?.websiteTemplate || state.websiteTemplate,
    businessYearsInOperation: stepTwoDirty
      ? yearsFromState
      : yearsFromState ?? profile?.businessYearsInOperation ?? null,
    operatingHours: currentOrSaved(state.operatingHours, profile?.operatingHours, stepTwoDirty),
    socialLinks: {
      facebook: currentOrSaved(state.socialLinks.facebook, profile?.socialLinks?.facebook, stepTwoDirty),
      instagram: currentOrSaved(state.socialLinks.instagram, profile?.socialLinks?.instagram, stepTwoDirty),
      linkedin: currentOrSaved(state.socialLinks.linkedin, profile?.socialLinks?.linkedin, stepTwoDirty),
    },
    projects: (profile?.projects || [])
      .filter(project => project.moderationStatus === 'published')
      .map(({ moderationStatus: _moderationStatus, ...project }) => project),
    credentials: (profile?.credentials || [])
      .filter(credential => credential.status === 'verified')
      .map(({ status: _status, reference: _reference, originalFileName: _fileName, mimeType: _mimeType, byteSize: _byteSize, ...credential }) => credential),
    // Rating only counts when real reviews exist; renderers show "No published reviews yet" otherwise.
    averageRating: (profile?.reviewCount || 0) > 0 ? profile?.averageRating || 0 : 0,
    reviewCount: profile?.reviewCount || 0,
    acceptingRequests: profile?.acceptingRequests ?? null,
    gallery: profile?.gallery || [],
    services,
    locations,
    reviews: profile?.reviews || [],
    responsePerformance: {
      windowDays: 90,
      measuredLeads: 0,
      medianResponseSeconds: 0,
      sampleReady: false,
    },
  };
}

function buildSavedProviderWebsiteProfile(
  profile: SavedProviderProfile | null | undefined,
  selectedTemplate?: OnboardingState['websiteTemplate'],
): ProviderWebsitePublicProfile {
  const submissionStatus = profile?.submissionStatus || 'draft';
  const publicationStatus: ProviderWebsitePublicProfile['publicationStatus'] = profile?.isPublished
    ? 'published'
    : submissionStatus === 'rejected'
      ? 'rejected'
      : 'pending_review';
  return {
    providerId: profile?.providerId || 0,
    companyName: profile?.companyName || 'Your business name',
    description: profile?.bio || profile?.description || null,
    logoUrl: profile?.logoUrl || null,
    verificationStatus: profile?.verificationStatus || 'pending',
    isPublished: Boolean(profile?.isPublished),
    publicationStatus,
    headline: profile?.headline || null,
    bio: profile?.bio || profile?.description || null,
    websiteUrl: profile?.websiteUrl || null,
    businessType: profile?.businessType || null,
    websiteTemplate: selectedTemplate || profile?.websiteTemplate || 'corporate_brand',
    businessYearsInOperation: profile?.businessYearsInOperation ?? null,
    operatingHours: profile?.operatingHours || null,
    socialLinks: {
      facebook: profile?.socialLinks?.facebook || null,
      instagram: profile?.socialLinks?.instagram || null,
      linkedin: profile?.socialLinks?.linkedin || null,
    },
    projects: (profile?.projects || [])
      .filter(project => project.moderationStatus === 'published')
      .map(({ moderationStatus: _moderationStatus, ...project }) => project),
    credentials: (profile?.credentials || [])
      .filter(credential => credential.status === 'verified')
      .map(({ status: _status, reference: _reference, originalFileName: _fileName, mimeType: _mimeType, byteSize: _byteSize, ...credential }) => credential),
    // Rating only counts when real reviews exist; renderers show "No published reviews yet" otherwise.
    averageRating: (profile?.reviewCount || 0) > 0 ? profile?.averageRating || 0 : 0,
    reviewCount: profile?.reviewCount || 0,
    acceptingRequests: profile?.acceptingRequests ?? null,
    gallery: profile?.gallery || [],
    services: (profile?.services || [])
      .filter(service => service.isActive)
      .map(({ isActive: _isActive, ...service }) => service),
    locations: (profile?.locations || []).map(location => ({
      id: location.id,
      canonicalPlaceId: location.canonicalPlaceId,
      label: location.label || 'Selected service area',
      isPrimary: location.isPrimary,
    })),
    reviews: profile?.reviews || [],
    responsePerformance: {
      windowDays: 90,
      measuredLeads: 0,
      medianResponseSeconds: 0,
      sampleReady: false,
    },
  };
}

export function ProviderBusinessSitePreview({
  profile,
  state,
  selectedTemplate,
}: {
  profile: SavedProviderProfile | null | undefined;
  state?: OnboardingState;
  selectedTemplate?: OnboardingState['websiteTemplate'];
}) {
  const [mobile, setMobile] = useState(false);
  const [previewRoot, setPreviewRoot] = useState<HTMLElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const previewProfile = state
    ? buildProviderWebsitePreviewProfile(profile, state)
    : buildSavedProviderWebsiteProfile(profile, selectedTemplate);
  const previewStatus =
    !state && profile?.isPublished && profile.verificationStatus === 'verified'
      ? 'Platform verified'
      : !state && profile?.isPublished
        ? 'Published provider'
        : profile?.submissionStatus === 'submitted'
      ? 'Submitted for review'
          : profile?.submissionStatus === 'changes_requested'
        ? 'Changes requested'
        : profile?.submissionStatus === 'rejected'
          ? 'Not approved · private'
          : 'Private draft';
  const previewDescription = state
    ? 'See how your information will appear on your website.'
    : profile?.isPublished
      ? 'Showing the approved business website and published content.'
      : 'Showing your saved draft. It remains private until an authorized reviewer approves it.';

  function preparePreviewFrame() {
    const frameDocument = frameRef.current?.contentDocument;
    if (!frameDocument) return;

    // Mirror the app's loaded stylesheets into a real document so the preview
    // responds to the iframe's viewport, not the outer onboarding window.
    for (const stylesheet of Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))) {
      frameDocument.head.append(stylesheet.cloneNode(true));
    }

    const reset = frameDocument.createElement('style');
    reset.textContent = 'html, body { margin: 0; min-height: 100%; padding: 0; } body { min-width: 0; }';
    frameDocument.head.append(reset);

    setPreviewRoot(frameDocument.getElementById('provider-site-preview-root'));
  }

  return (
    <section className="h-full rounded-2xl border border-[#dce7f5] bg-[#edf4ff] p-3 sm:p-4" aria-label="Business website preview">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7f5] pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[#071b4a]">
            <Monitor className="h-6 w-6 shrink-0" aria-hidden="true" />
            <p className="text-[15px] font-bold tracking-[-0.02em]">
              Your website preview
            </p>
            {!state && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
              {previewStatus}
            </span>
            )}
          </div>
          <p className="ml-8 mt-0.5 text-xs leading-5 text-[#25385d] sm:text-sm">
            {previewDescription}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-[#d7e1ee] bg-white p-1 shadow-sm">
          <button
            type="button"
            aria-label="Preview desktop website"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${!mobile ? 'bg-[#0868da] text-white shadow-[0_4px_12px_-4px_rgba(8,104,218,0.65)]' : 'text-[#52617a] hover:bg-[#f2f6fd]'}`}
          >
            <Monitor className="h-4 w-4" aria-hidden="true" />
            Desktop
          </button>
          <button
            type="button"
            aria-label="Preview mobile website"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${mobile ? 'bg-[#0868da] text-white shadow-[0_4px_12px_-4px_rgba(8,104,218,0.65)]' : 'text-[#52617a] hover:bg-[#f2f6fd]'}`}
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Mobile
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#dce4ef] bg-white p-0 shadow-[0_6px_20px_-14px_rgba(11,31,61,0.4)]">
        <div className={mobile
          ? 'mx-auto w-[392px] max-w-full overflow-hidden rounded-[1.35rem] border border-[#d2dbea] bg-white'
          : 'w-full overflow-hidden rounded-xl bg-white'}
        >
          <div className="flex h-10 items-center gap-2 border-b border-[#e1e7f0] bg-white px-3 sm:px-4">
            <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#e5eaf2] bg-[#fbfcfe] px-3 py-1 text-[10px] text-[#43516b] sm:text-xs">
              <LockKeyhole className="h-3 w-3 shrink-0 text-[#087a65]" aria-hidden="true" />
              <span className="truncate">propertylistify.co.za/services/provider/your-business</span>
            </div>
          </div>
          <iframe
            ref={frameRef}
            title={`Business website ${mobile ? 'mobile' : 'desktop'} preview`}
            onLoad={preparePreviewFrame}
            srcDoc="<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><base href='/'></head><body><div id='provider-site-preview-root'></div></body></html>"
            className={mobile ? 'block h-[660px] w-full border-0 bg-white' : 'block h-[450px] w-full border-0 bg-white'}
          />
        </div>
      </div>
      {state && (
        <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-[#0868da]">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          This is a preview of your website. It will update as you complete your profile.
        </p>
      )}
      {previewRoot && createPortal(
        <ServiceProviderProfilePage previewProfile={previewProfile} />,
        previewRoot,
      )}
    </section>
  );
}
