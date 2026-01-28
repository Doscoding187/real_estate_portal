import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CITY_PROVINCE_MAP } from '@/lib/locationUtils';

/**
 * Handles redirect for City Shortcuts (e.g., /property-for-sale/johannesburg)
 * Redirects to Canonical URL (e.g., /property-for-sale/gauteng/johannesburg)
 */
export function CityShortcutRedirect({ params }: { params: { city: string } }) {
  const [location, setLocation] = useLocation();
  const { city } = params;

  useEffect(() => {
    const province = CITY_PROVINCE_MAP[city.toLowerCase()] || 'gauteng'; // Fallback? Need to be careful.
    // Preserving the transaction root from the current location
    const root = location.startsWith('/property-to-rent')
      ? 'property-to-rent'
      : 'property-for-sale';

    setLocation(`/${root}/${province}/${city}`, { replace: true });
  }, [city, location, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy City URLs (e.g., /gauteng/johannesburg)
 * Redirects to /property-for-sale/gauteng/johannesburg
 */
export function LegacyCityRedirect({ params }: { params: { province: string; city: string } }) {
  const [, setLocation] = useLocation();
  const { province, city } = params;

  useEffect(() => {
    setLocation(`/property-for-sale/${province}/${city}`, { replace: true });
  }, [province, city, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy Suburb URLs (e.g., /gauteng/johannesburg/sandton)
 * Redirects to /property-for-sale/gauteng/johannesburg/sandton
 */
export function LegacySuburbRedirect({
  params,
}: {
  params: { province: string; city: string; suburb: string };
}) {
  const [, setLocation] = useLocation();
  const { province, city, suburb } = params;

  useEffect(() => {
    setLocation(`/property-for-sale/${province}/${city}/${suburb}`, { replace: true });
  }, [province, city, suburb, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles migration of Legacy Province URLs (e.g., /gauteng)
 * Redirects to /property-for-sale/gauteng
 */
export function LegacyProvinceRedirect({ params }: { params: { province: string } }) {
  const [, setLocation] = useLocation();
  const { province } = params;

  useEffect(() => {
    // Check if it's a known province or potentially a city without province (legacy issue?)
    // For now assume strictly province if it matches
    setLocation(`/property-for-sale/${province}`, { replace: true });
  }, [province, setLocation]);

  return <RedirectMessage />;
}

/**
 * Handles really old legacy city routes (e.g., /city/johannesburg)
 */
export function OldLegacyCityRedirect({ params }: { params: { slug: string } }) {
  const [, setLocation] = useLocation();
  const { slug } = params;

  useEffect(() => {
    const province = CITY_PROVINCE_MAP[slug.toLowerCase()] || 'gauteng';
    setLocation(`/property-for-sale/${province}/${slug}`, { replace: true });
  }, [slug, setLocation]);

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
