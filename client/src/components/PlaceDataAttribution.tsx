const linkClass = 'underline transition-colors hover:text-blue-400';

/** Required credit for place data (GeoNames CC BY 4.0, Wikidata CC0). Shared by public footers. */
export function PlaceDataAttribution({ className = '' }: { className?: string }) {
  return (
    <p data-testid="footer-data-attribution" className={`text-xs text-slate-500 ${className}`}>
      Place data includes{' '}
      <a
        href="https://www.geonames.org"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        GeoNames
      </a>{' '}
      (geonames.org, CC BY 4.0) and{' '}
      <a
        href="https://www.wikidata.org"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Wikidata
      </a>{' '}
      (CC0).
    </p>
  );
}
