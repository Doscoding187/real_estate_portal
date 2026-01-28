/**
 * Location Utility Functions
 * Helper functions for normalizing and validating location data.
 * Part of Phase 1 Quick Fix for location consistency.
 */

/**
 * Slugify a location name for consistent querying
 * Converts "Alberton" -> "alberton", "Sky City" -> "sky-city"
 */
export function slugifyLocation(locationName: string | null | undefined): string | null {
  if (!locationName) return null;

  return locationName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Normalize location fields for a property
 * Converts province, city, suburb to lowercase slugs for consistent querying
 */
export function normalizeLocationFields<
  T extends { province?: string | null; city?: string | null; suburb?: string | null },
>(data: T): T {
  return {
    ...data,
    province: data.province ? data.province.toLowerCase().trim() : data.province,
    city: data.city ? data.city.toLowerCase().trim() : data.city,
    // Keep suburb as-is for now since it's often in address field
  };
}

/**
 * Validate that required location fields are present
 * Returns an error message if validation fails, null if valid
 */
export function validateLocationForPublish(data: {
  province?: string | null;
  city?: string | null;
  status?: string;
}): string | null {
  // Only validate if publishing (available, published)
  const publishingStatuses = ['available', 'published'];
  if (data.status && publishingStatuses.includes(data.status)) {
    if (!data.province || data.province.trim() === '') {
      return 'Province is required to publish a property';
    }
    if (!data.city || data.city.trim() === '') {
      return 'City is required to publish a property';
    }
  }
  return null;
}
