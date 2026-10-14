import { Link } from 'wouter';
import { ArrowRight, Building2 } from 'lucide-react';
import { getCityGuideImage } from '@/lib/cityGuideImages';
import { useState } from 'react';

interface GuideMarket {
  slug: string;
  name: string;
  description: string;
  areaSlugs: readonly string[];
  city?: { slug: string; canonicalLocationId?: string | null } | null;
  inventory?: { total: number } | null;
  state: string;
}

function AreaImage({ provinceSlug, citySlug }: { provinceSlug: string; citySlug: string }) {
  const image = getCityGuideImage(provinceSlug, citySlug);
  const [failedSource, setFailedSource] = useState<string>();
  return (
    <span className="province-area-table__image" aria-hidden="true">
      {image && failedSource !== image.thumbnail ? (
        <img
          src={image.thumbnail}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          onError={() => setFailedSource(image.thumbnail)}
        />
      ) : (
        <Building2 size={22} />
      )}
    </span>
  );
}

function availability(market: GuideMarket) {
  if (!market.inventory || market.state === 'unavailable') return 'Inventory unavailable';
  if (market.inventory.total === 0) return 'No sale listings yet';
  return `${market.inventory.total.toLocaleString('en-ZA')} for sale`;
}

export function ProvinceAreaTable({
  markets,
  provinceSlug,
  guidesLoading = false,
}: {
  markets: readonly GuideMarket[];
  provinceSlug: string;
  guidesLoading?: boolean;
}) {
  return (
    <div className="province-area-table">
      <table aria-label="Explore province areas">
        <thead>
          <tr>
            <th scope="col">Area</th>
            <th scope="col" className="province-area-table__context">
              Get to know the area
            </th>
            <th scope="col">Guide</th>
          </tr>
        </thead>
        <tbody>
          {markets.map(market => {
            const city = market.city?.canonicalLocationId ? market.city : undefined;
            const status = availability(market);
            return (
              <tr key={market.slug}>
                <th scope="row">
                  <div className="province-area-table__identity">
                    <AreaImage provinceSlug={provinceSlug} citySlug={city?.slug || market.slug} />
                    <span>
                      <span className="province-area-table__name">{market.name}</span>
                      <span className="province-area-table__availability">{status}</span>
                    </span>
                  </div>
                </th>
                <td className="province-area-table__context">
                  <p>{market.description}</p>
                  {market.areaSlugs.length > 0 && (
                    <span className="province-area-table__areas">
                      Areas to explore:{' '}
                      {market.areaSlugs
                        .map(slug =>
                          slug
                            .split('-')
                            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                            .join(' '),
                        )
                        .join(' · ')}
                    </span>
                  )}
                </td>
                <td>
                  {city ? (
                    <Link
                      href={`/${provinceSlug}/${city.slug}`}
                      className="province-area-table__link"
                      aria-label={`Explore ${market.name}`}
                    >
                      Explore guide <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="province-area-table__unavailable">
                      {guidesLoading ? 'Loading guide…' : 'Guide unavailable'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="province-area-table__note">
        Availability reflects advertised homes for sale. You can explore an area guide even when no
        listings are available. Images are AI illustrations.
      </p>
    </div>
  );
}
