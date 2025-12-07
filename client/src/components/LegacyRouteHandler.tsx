import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Static map for instant redirects of popular cities
// In a full implementation, this could call an API to lookup unknown cities
const CITY_PROVINCE_MAP: Record<string, string> = {
  'johannesburg': 'gauteng',
  'cape-town': 'western-cape',
  'durban': 'kwazulu-natal',
  'pretoria': 'gauteng',
  'sandton': 'gauteng',
  'randburg': 'gauteng',
  'centurion': 'gauteng',
  'midrand': 'gauteng',
  'roodepoort': 'gauteng',
  'kempton-park': 'gauteng',
  'benoni': 'gauteng',
  'boksburg': 'gauteng',
  'alberton': 'gauteng',
  'edenvale': 'gauteng',
  'germiston': 'gauteng',
  'springs': 'gauteng',
  'brakpan': 'gauteng',
  'krugersdorp': 'gauteng',
  'stellenbosch': 'western-cape',
  'somerset-west': 'western-cape',
  'paarl': 'western-cape',
  'george': 'western-cape',
  'knysna': 'western-cape',
  'mossel-bay': 'western-cape',
  'hermanus': 'western-cape',
  'bellville': 'western-cape',
  'durbanville': 'western-cape',
  'ballito': 'kwazulu-natal',
  'umhlanga': 'kwazulu-natal',
  'pietermaritzburg': 'kwazulu-natal',
  'richards-bay': 'kwazulu-natal',
  'bloemfontein': 'free-state',
  'port-elizabeth': 'eastern-cape',
  'gqeberha': 'eastern-cape',
  'east-london': 'eastern-cape',
  'polokwane': 'limpopo',
  'nelspruit': 'mpumalanga',
  'mbombela': 'mpumalanga',
  'rustenburg': 'north-west',
  'kimberley': 'northern-cape',
  'mahikeng': 'north-west',
  'witbank': 'mpumalanga',
  'emalahleni': 'mpumalanga',
  'potchefstroom': 'north-west'
};

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
