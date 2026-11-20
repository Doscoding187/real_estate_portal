/** Required credit for place data (GeoNames CC BY 4.0, Wikidata CC0). Shared by public footers. */
export function PlaceDataAttribution({ className = '' }: { className?: string }) {
  return (
    <p data-testid="footer-data-attribution" className={`text-xs text-slate-500 ${className}`}>
      Place data includes{' '}
      <a
        href="https://www.geonames.org"
        target="_blank"
        rel="noopener noreferrer"
        className="underline transition-colors hover:text-blue-400"
      >
        GeoNames (geonames.org, CC BY 4.0)
      </a>{' '}
      and Wikidata.
    </p>
  );
}
