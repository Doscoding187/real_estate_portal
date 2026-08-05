import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { applySeo } from '@/lib/seo';

type StructuredDataValue = Record<string, unknown>;

interface MetaControlProps {
  canonicalUrl?: string; // Explicit canonical URL (e.g., from backend or constructed)
  forceNoIndex?: boolean; // Manual override
  title?: string;
  description?: string;
  image?: string;
  structuredData?: StructuredDataValue | StructuredDataValue[];
  geo?: {
    latitude: number | string;
    longitude: number | string;
    name?: string;
    region?: string;
  };
}

export function MetaControl({
  canonicalUrl,
  forceNoIndex = false,
  title,
  description,
  image,
  structuredData,
  geo,
}: MetaControlProps) {
  const [location] = useLocation();

  // Logic to determine if page should be noindexed
  const shouldNoIndex = () => {
    if (forceNoIndex) return true;

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);

      // ALLOWED params (Routing/Canonical-friendly)
      // These are params that essentially define the page content and are part of the canonical structure logic.
      const allowedParams = [
        'city',
        'suburb',
        'province',
        'locationId',
        'listingType',
        'propertyType', // propertyType maps to /houses-for-sale/, so it's canonical-safe usually
      ];

      // If we have ANY param that is NOT in the allowed list, we NoIndex.
      // This covers price, beds, sort, pagination, amenities, etc.
      for (const key of searchParams.keys()) {
        if (!allowedParams.includes(key)) {
          return true;
        }
      }
    }

    return false;
  };

  const isNoIndex = shouldNoIndex();

  // Construct default canonical if not provided
  // This assumes the current clean path is the canonical unless we are on a shortcut.
  // Ideally, the parent page passes the correct authoritative canonical.
  const currentCanonical = canonicalUrl
    ? canonicalUrl
    : typeof window !== 'undefined'
      ? `${window.location.origin}${location}`
      : '';
  const structuredDataItems = Array.isArray(structuredData)
    ? structuredData.filter(Boolean)
    : structuredData
      ? [structuredData]
      : [];

  useEffect(() => {
    applySeo({
      title,
      description,
      canonicalPath: currentCanonical,
      image,
      noindex: isNoIndex,
      structuredData: structuredDataItems,
      geo,
    });
  }, [currentCanonical, description, geo, image, isNoIndex, structuredDataItems, title]);

  return null;
}
