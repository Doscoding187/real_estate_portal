import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CITY_PROVINCE_MAP, PROVINCE_SLUGS } from '@/lib/locationUtils';
import { generatePropertyUrl } from '@/lib/urlUtils';

function normalizeSlug(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getListingTypeFromLocation(location: string): 'sale' | 'rent' | 'auction' {
  if (location.startsWith('/property-to-rent')) {
    return 'rent';
  }

  if (location.startsWith('/property-auction')) {
    return 'auction';
  }

  return 'sale';
}

function inferProvinceSlug(city?: string, providedProvince?: string) {
  const normalizedProvidedProvince = normalizeSlug(providedProvince || '');
  if (normalizedProvidedProvince && PROVINCE_SLUGS.includes(normalizedProvidedProvince)) {
    return normalizedProvidedProvince;
  }

  const normalizedCity = normalizeSlug(city || '');
  return CITY_PROVINCE_MAP[normalizedCity] || null;
}

function buildCanonicalRedirectUrl(options: {
  city?: string;
  currentLocation?: string;
  listingType?: 'sale' | 'rent' | 'auction';
  province?: string;
  suburb?: string;
}) {
  const listingType =
    options.listingType ||
    (options.currentLocation ? getListingTypeFromLocation(options.currentLocation) : 'sale');

  const province = inferProvinceSlug(options.city, options.province);
  if (!province) {
    return null;
  }

  return generatePropertyUrl({
    listingType,
    province,
    ...(options.city ? { city: normalizeSlug(options.city) } : {}),
    ...(options.suburb ? { suburb: normalizeSlug(options.suburb) } : {}),
  });
}

/**
 * Handles redirect for City Shortcuts (e.g., /property-for-sale/johannesburg)
 * Redirects to Canonical URL (e.g., /property-for-sale?province=gauteng&city=johannesburg)
 */
export function CityShortcutRedirect({ params }: { params: { city: string } }) {
  const [location, setLocation] = useLocation();
  const { city } = params;

  useEffect(() => {
    const canonicalUrl = buildCanonicalRedirectUrl({
      city,
      currentLocation: location,
    });

    if (!canonicalUrl) {
      setLocation('/404', { replace: true });
      return;
    }

    setLocation(canonicalUrl, { replace: true });
  }, [city, location, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy City URLs (e.g., /gauteng/johannesburg)
 * Redirects to canonical property search results
 */
export function LegacyCityRedirect({ params }: { params: { province: string; city: string } }) {
  const [location, setLocation] = useLocation();
  const { province, city } = params;

  useEffect(() => {
    const canonicalUrl = buildCanonicalRedirectUrl({
      city,
      currentLocation: location,
      province,
    });

    if (!canonicalUrl) {
      setLocation('/404', { replace: true });
      return;
    }

    setLocation(canonicalUrl, { replace: true });
  }, [province, city, location, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy Suburb URLs (e.g., /gauteng/johannesburg/sandton)
 * Redirects to canonical property search results
 */
export function LegacySuburbRedirect({
  params,
}: {
  params: { province?: string; city: string; suburb: string };
}) {
  const [location, setLocation] = useLocation();
  const { province, city, suburb } = params;

  useEffect(() => {
    const canonicalUrl = buildCanonicalRedirectUrl({
      city,
      currentLocation: location,
      province,
      suburb,
    });

    if (!canonicalUrl) {
      setLocation('/404', { replace: true });
      return;
    }

    setLocation(canonicalUrl, { replace: true });
  }, [province, city, suburb, location, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy Province URLs (e.g., /gauteng)
 * Redirects to canonical property search results
 */
export function LegacyProvinceRedirect({ params }: { params: { province: string } }) {
  const [location, setLocation] = useLocation();
  const { province } = params;

  useEffect(() => {
    const normalizedProvince = normalizeSlug(province);
    if (!PROVINCE_SLUGS.includes(normalizedProvince)) {
      setLocation('/404', { replace: true });
      return;
    }

    setLocation(
      generatePropertyUrl({
        listingType: getListingTypeFromLocation(location),
        province: normalizedProvince,
      }),
      { replace: true },
    );
  }, [province, location, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles really old legacy city routes (e.g., /city/johannesburg)
 */
export function OldLegacyCityRedirect({ params }: { params: { slug: string } }) {
  const [location, setLocation] = useLocation();
  const { slug } = params;

  useEffect(() => {
    const canonicalUrl = buildCanonicalRedirectUrl({
      city: slug,
      currentLocation: location,
    });

    if (!canonicalUrl) {
      setLocation('/404', { replace: true });
      return;
    }

    setLocation(canonicalUrl, { replace: true });
  }, [slug, location, setLocation]);

  return <RedirectMessage />;
}

function RedirectMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-4 w-4 bg-blue-600 rounded-full mb-4 animate-bounce"></div>
        <p className="text-slate-500">Redirecting to new location...</p>
      </div>
    </div>
  );
}
