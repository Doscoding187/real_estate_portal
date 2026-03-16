const EXPLORE_UPLOAD_ALLOWED_ROLES = new Set([
  'super_admin',
  'agent',
  'agency_admin',
  'property_developer',
  // Future partner roles
  'contractor',
  'architect',
  'bond_originator',
  'interior_designer',
  'partner',
]);

export function canUploadToExploreRole(role?: string | null): boolean {
  if (!role) return false;
  return EXPLORE_UPLOAD_ALLOWED_ROLES.has(String(role).trim().toLowerCase());
}

