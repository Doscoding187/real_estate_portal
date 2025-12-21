import { Helmet } from 'react-helmet';
import { useLocation } from 'wouter';

interface MetaControlProps {
  canonicalUrl?: string; // Explicit canonical URL (e.g., from backend or constructed)
  forceNoIndex?: boolean; // Manual override
}

export function MetaControl({ canonicalUrl, forceNoIndex = false }: MetaControlProps) {
  const [location] = useLocation();

  // Logic to determine if page should be noindexed
  const shouldNoIndex = () => {
    if (forceNoIndex) return true;

    // Check for query parameters that trigger noindex
    // Note: wouter's useLocation only returns the path, not the query string.
    // We need to use window.location.search directly or rely on a wrapper that parses it.
    // Assuming client-side, window.location is available.
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      
      // List of query params that are "safe" (don't trigger noindex) - if any?
      // The user specified: "price, amenities, sort, pagination" should be noindex.
      // Basically, if there are ANY functional filters in the query params, we should noindex.
      // Exceptions might be tracking IDs or simple view toggles?
      // Strict rule from plan: "Any URL with query parameters" -> noindex.
      // But we might have some "safe" params in the future?
      // For now, let's implement the strict rule, perhaps allowing 'page=1' if we want (but plan says pagination > 1).
      
      // Let's iterate over keys.
      const unsafeParams = ['minPrice', 'maxPrice', 'sort', 'amenities', 'page', 'type', 'bed', 'bath'];
      
      for (const key of searchParams.keys()) {
        if (unsafeParams.includes(key) || unsafeParams.some(p => key.includes(p))) {
            return true;
        }
        // Strict approach: if ANY filter param exists.
        // Let's assume most searchParams imply a filtered view that we might not want indexed unless it's a "clean" URL.
      }
      
      // Specific check for pagination > 1
      const page = searchParams.get('page');
      if (page && parseInt(page) > 1) return true;
    }

    return false;
  };

  const isNoIndex = shouldNoIndex();
  
  // Construct default canonical if not provided
  // This assumes the current clean path is the canonical unless we are on a shortcut.
  // Ideally, the parent page passes the correct authoritative canonical.
  const currentCanonical = canonicalUrl ? canonicalUrl : 
    (typeof window !== 'undefined' ? `${window.location.origin}${location}` : '');

  return (
    <Helmet>
      {isNoIndex && <meta name="robots" content="noindex, follow" />}
      {!isNoIndex && <meta name="robots" content="index, follow" />}
      {currentCanonical && <link rel="canonical" href={currentCanonical} />}
    </Helmet>
  );
}
