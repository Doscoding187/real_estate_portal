import { useState } from 'react';
import { getProvinceGuideCover } from '@/lib/provinceGuideImages';

interface ProvinceGuideHeroProps {
  provinceName: string;
  provinceSlug: string;
}

export function ProvinceGuideHero({ provinceName, provinceSlug }: ProvinceGuideHeroProps) {
  const cover = getProvinceGuideCover(provinceSlug);
  const [failedSource, setFailedSource] = useState<string>();
  const desktop = cover?.desktop;
  return (
    <section
      className="provincial-hero provincial-hero--map-cover"
      aria-labelledby="province-page-title"
      data-testid="province-guide-hero"
    >
      {desktop && failedSource !== desktop && (
        <picture className="province-guide-cover" aria-hidden="true">
          {cover?.mobile && <source media="(max-width: 640px)" srcSet={cover.mobile} />}
          <img
            src={desktop}
            alt=""
            fetchPriority="high"
            decoding="async"
            onError={() => setFailedSource(desktop)}
          />
        </picture>
      )}
      <div className="province-guide-cover__shade" aria-hidden="true" />
      <div className="provincial-rail provincial-hero__inner">
        <div className="provincial-hero__copy">
          <p className="provincial-eyebrow">Province guide · South Africa</p>
          <h1 id="province-page-title">Explore {provinceName}</h1>
          <p className="provincial-hero__proposition">
            Get to know the cities and neighbourhoods, explore available property, and connect with
            local professionals.
          </p>
        </div>
      </div>
      <span className="province-guide-cover__label">Province illustration</span>
    </section>
  );
}
