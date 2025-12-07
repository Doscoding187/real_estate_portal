import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CITY_PROVINCE_MAP } from '@/lib/locationUtils';

export function LegacyCityRedirect({ params }: { params: { slug: string } }) {
  const [, setLocation] = useLocation();
  const { slug } = params;

  useEffect(() => {
    // Default to Gauteng if unknown (or could handle with a 404 or backend lookup)
    const province = CITY_PROVINCE_MAP[slug.toLowerCase()] || 'gauteng';
    setLocation(`/${province}/${slug}`, { replace: true });
  }, [slug, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-4 w-4 bg-blue-600 rounded-full mb-4 animate-bounce"></div>
        <p className="text-slate-500">Redirecting to new location...</p>
      </div>
    </div>
  );
}

export function LegacySuburbRedirect({ params }: { params: { city: string; suburb: string } }) {
  const [, setLocation] = useLocation();
  const { city, suburb } = params;

  useEffect(() => {
    const province = CITY_PROVINCE_MAP[city.toLowerCase()] || 'gauteng';
    setLocation(`/${province}/${city}/${suburb}`, { replace: true });
  }, [city, suburb, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-4 w-4 bg-blue-600 rounded-full mb-4 animate-bounce"></div>
        <p className="text-slate-500">Redirecting to new location...</p>
      </div>
    </div>
  );
}
