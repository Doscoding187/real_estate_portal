import type { PropertyCardProps } from '@/components/PropertyCard';

// Normalizes raw API property objects to the props expected by PropertyCard.
export function normalizePropertyForUI(raw: any): PropertyCardProps | null {
  if (!raw || typeof raw !== 'object') return null;

  // Check for required fields
  if (!raw.id || !raw.title || raw.price == null && raw.pricing?.askingPrice == null && raw.pricing?.monthlyRent == null) {
    return null;
  }

  // Extract property details safely - handle both direct object and JSON string
  let details = raw.propertyDetails || {};
  
  // If propertySettings exists and is a string, parse it
  if (raw.propertySettings) {
    try {
      details = typeof raw.propertySettings === 'string' 
        ? JSON.parse(raw.propertySettings) 
        : raw.propertySettings;
    } catch (e) {
      // If parsing fails, try propertyDetails
      details = raw.propertyDetails || {};
    }
  }
  
  // Determine price
  let price = Number(raw.price) || 0;
  if (raw.pricing) {
    price = Number(raw.pricing.askingPrice) || Number(raw.pricing.monthlyRent) || Number(raw.pricing.startingBid) || price;
  }

  // Determine building/floor area (house size, apartment size, floor size)
  const area = 
    Number(details.unitSizeM2) ||  // Apartment unit size
    Number(details.houseAreaM2) || // House building size
    Number(details.floorAreaM2) || // Commercial floor size
    Number(raw.area) || 
    undefined;

  // Determine yard/land size (separate from building size)
  // For houses: erfSizeM2 (plot/erf size)
  // For farms/land: landSizeM2OrHa or landSizeHa
  const yardSize = 
    Number(details.erfSizeM2) ||      // Erf/Plot size for houses
    Number(details.landSizeM2OrHa) || // Land size
    (Number(details.landSizeHa) ? Number(details.landSizeHa) * 10000 : undefined); // Convert hectares to m²

  // Determine agent/user info
  const agent = raw.user || raw.agent ? {
    name: raw.user?.name || raw.agent?.name || 'Property Agent',
    image: raw.user?.image || raw.agent?.image || raw.user?.avatar || raw.agent?.avatar,
  } : undefined;

  // Determine badges
  const badges: string[] = [];
  if (raw.status === 'sold') badges.push('Sold');
  if (raw.status === 'rented') badges.push('Rented');
  if (raw.featured) badges.push('Featured');
  if (raw.badges && Array.isArray(raw.badges)) {
    badges.push(...raw.badges);
  }

  // Determine media counts
  const imageCount = raw.images?.length || raw.media?.filter((m: any) => m.type === 'image').length || 0;
  const videoCount = raw.videos?.length || raw.media?.filter((m: any) => m.type === 'video').length || 0;

  return {
    id: String(raw.id),
    title: String(raw.title),
    price,
    location: raw.location?.city ? `${raw.location.suburb ? raw.location.suburb + ', ' : ''}${raw.location.city}` : (raw.city || raw.address || 'Unknown Location'),
    image: (() => {
      const img = raw.image || raw.coverImage || raw.images?.[0] || raw.media?.find((m: any) => m.isPrimary)?.url || raw.media?.[0]?.url || raw.mainImage || '/placeholder.jpg';
      if (typeof img === 'string' && !img.startsWith('http') && !img.startsWith('/')) {
        return `/${img}`;
      }
      return img;
    })(),
    description: raw.description || undefined,
    bedrooms: Number(details.bedrooms) || Number(raw.bedrooms) || undefined,
    bathrooms: Number(details.bathrooms) || Number(raw.bathrooms) || undefined,
    area, // Building/floor size
    yardSize, // Yard/land size (separate)
    propertyType: raw.propertyType ? raw.propertyType.charAt(0).toUpperCase() + raw.propertyType.slice(1).replace('_', ' ') : undefined,
    listingType: raw.listingType || raw.action || 'sale',
    status: raw.status === 'available' ? 'Ready to Move' : raw.status, // Map backend status to UI status
    transactionType: raw.transactionType || (raw.listingType === 'rent' ? 'Rent' : 'Sale'),
    agent,
    badges: badges.length > 0 ? badges : undefined,
    imageCount,
    videoCount,
    highlights: (() => {
      const source = raw.features || raw.amenities || raw.highlights;
      if (Array.isArray(source)) return source;
      if (typeof source === 'string') {
        try {
          const parsed = JSON.parse(source);
          return Array.isArray(parsed) ? parsed : undefined;
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    })(),
  };
}
