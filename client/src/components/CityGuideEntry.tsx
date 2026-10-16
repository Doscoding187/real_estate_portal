import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, MapPin, Building } from 'lucide-react';
import { getCityGuideImage, getProvinceGuideImage } from '@/lib/cityGuideImages';
import { cn } from '@/lib/utils';

export interface CityGuideLocation {
  name: string;
  province: string;
  slug: string;
  provinceSlug: string;
  image?: string;
  propertyCount?: string;
  featured?: boolean;
}
function CityScene({ city }: { city: CityGuideLocation }) {
  const candidates = [
    getCityGuideImage(city.provinceSlug, city.slug),
    getProvinceGuideImage(city.provinceSlug),
    {
      thumbnail:
        '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg',
      srcSet: undefined,
      scope: 'general',
      alt: 'City guide illustration',
    },
  ].filter(
    (image, index, images) =>
      image && images.findIndex(other => other?.thumbnail === image.thumbnail) === index,
  );
  const [failedCount, setFailedCount] = useState(0);
  useEffect(() => setFailedCount(0), [city.provinceSlug, city.slug]);
  const artwork = candidates[failedCount];
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {artwork ? (
        <img
          src={artwork.thumbnail}
          srcSet={artwork.srcSet}
          sizes="64px"
          alt={artwork.alt || `AI-generated city scene of ${city.name}`}
          data-image-scope={artwork.scope}
          width={480}
          height={270}
          loading="lazy"
          decoding="async"
          onError={() => setFailedCount(count => count + 1)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
          <Building className="h-10 w-10 text-blue-600" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** Shared city-guide presentation for homepage and province discovery. */
export function CityGuideEntry({
  city,
  href,
  className,
  ariaLabel,
  unavailableLabel = 'Guide unavailable',
}: {
  city: CityGuideLocation;
  href?: string;
  className?: string;
  ariaLabel?: string;
  unavailableLabel?: string;
}) {
  const classes = cn(
    'group min-w-0 rounded-xl transition-colors',
    href &&
      'hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2774AE]',
    className,
  );
  const content = (
    <div className="flex h-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:gap-4 sm:border-transparent sm:bg-transparent">
      <CityScene city={city} />
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            'line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 sm:text-base',
            href && 'group-hover:text-[#2774AE]',
          )}
        >
          {city.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          {city.province}
        </p>
        {href ? (
          <span className="mt-1.5 inline-flex min-h-[24px] items-center gap-1.5 text-xs font-semibold text-[#2774AE]">
            Explore guide <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        ) : (
          <span className="mt-1.5 inline-flex min-h-[24px] items-center text-xs text-slate-500">
            {unavailableLabel}
          </span>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} aria-label={ariaLabel} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
