import type { PropertyCardProps } from '@/components/PropertyCard';
// Normalizes raw API property objects to the props expected by PropertyCard.
export function normalizePropertyForUI(raw: any): PropertyCardProps | null {
  if (!raw || typeof raw !== 'object') return null;
  // Check for required fields
  if (!raw.id || !raw.title || raw.price == null) {
    return null;
  }
  return {
    id: String(raw.id),
    title: String(raw.title),
    price: Number(raw.price) ?? 0,
    location: raw.location ?? raw.city ?? raw.address ?? 'Unknown',
    image: raw.image ?? raw.coverImage ?? raw.images?.[0] ?? '/placeholder.jpg',
    description: raw.description ?? undefined,
  };
}
