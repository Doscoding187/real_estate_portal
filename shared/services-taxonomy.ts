/**
 * Canonical Services taxonomy authority (seed-derived).
 *
 * This module is the single source of truth for service taxonomy identifiers
 * shared by the database seed migration, server-side validation, and the
 * client. Provider-created strings must never become taxonomy authority.
 *
 * Parity with the canonical seed migration is enforced by an executable
 * contract test.
 */

export const SERVICE_TAXONOMY_LEVELS = ['family', 'category', 'service'] as const;

export type ServiceTaxonomyLevel = (typeof SERVICE_TAXONOMY_LEVELS)[number];

export type ServiceTaxonomySeedNode = {
  id: number;
  parentSlug: string | null;
  slug: string;
  level: ServiceTaxonomyLevel;
  name: string;
  description?: string;
  iconKey?: string;
  sortOrder: number;
};

export const SERVICE_TAXONOMY_SEED: ServiceTaxonomySeedNode[] = [
  // ── Families ───────────────────────────────────────────────────────────────
  { id: 1, parentSlug: null, slug: 'home-improvement', level: 'family', name: 'Home Improvement', iconKey: 'Hammer', sortOrder: 1 },
  { id: 2, parentSlug: null, slug: 'finance-legal', level: 'family', name: 'Finance & Legal', iconKey: 'Scale', sortOrder: 2 },
  { id: 3, parentSlug: null, slug: 'moving-relocation', level: 'family', name: 'Moving & Relocation', iconKey: 'Truck', sortOrder: 3 },
  { id: 4, parentSlug: null, slug: 'inspection-compliance', level: 'family', name: 'Inspection & Compliance', iconKey: 'ClipboardCheck', sortOrder: 4 },
  { id: 5, parentSlug: null, slug: 'insurance-protection', level: 'family', name: 'Insurance & Cover', iconKey: 'ShieldCheck', sortOrder: 5 },
  { id: 6, parentSlug: null, slug: 'media-marketing', level: 'family', name: 'Media & Marketing', iconKey: 'Camera', sortOrder: 6 },
  { id: 7, parentSlug: null, slug: 'professional-services', level: 'family', name: 'Professional Services', iconKey: 'DraftingCompass', sortOrder: 7 },

  // ── Home Improvement categories ────────────────────────────────────────────
  { id: 10, parentSlug: 'home-improvement', slug: 'electrical', level: 'category', name: 'Electrical', sortOrder: 1 },
  { id: 11, parentSlug: 'home-improvement', slug: 'plumbing', level: 'category', name: 'Plumbing', sortOrder: 2 },
  { id: 12, parentSlug: 'home-improvement', slug: 'painting-decorating', level: 'category', name: 'Painting & Decorating', sortOrder: 3 },
  { id: 13, parentSlug: 'home-improvement', slug: 'renovations-alterations', level: 'category', name: 'Renovations & Alterations', sortOrder: 4 },
  { id: 14, parentSlug: 'home-improvement', slug: 'solar-backup-power', level: 'category', name: 'Solar & Backup Power', sortOrder: 5 },
  { id: 15, parentSlug: 'home-improvement', slug: 'building-contracting', level: 'category', name: 'Building & Contracting', sortOrder: 6 },

  // ── Finance & Legal categories ─────────────────────────────────────────────
  { id: 20, parentSlug: 'finance-legal', slug: 'home-finance', level: 'category', name: 'Home Finance', sortOrder: 1 },
  { id: 21, parentSlug: 'finance-legal', slug: 'conveyancing-transfer', level: 'category', name: 'Conveyancing & Transfer', sortOrder: 2 },
  { id: 22, parentSlug: 'finance-legal', slug: 'property-legal-advice', level: 'category', name: 'Property Legal Advice', sortOrder: 3 },

  // ── Moving & Relocation categories ─────────────────────────────────────────
  { id: 30, parentSlug: 'moving-relocation', slug: 'household-moves', level: 'category', name: 'Household Moves', sortOrder: 1 },
  { id: 31, parentSlug: 'moving-relocation', slug: 'specialist-moves', level: 'category', name: 'Specialist Moves', sortOrder: 2 },
  { id: 32, parentSlug: 'moving-relocation', slug: 'storage-logistics', level: 'category', name: 'Storage & Logistics', sortOrder: 3 },

  // ── Inspection & Compliance categories ─────────────────────────────────────
  { id: 40, parentSlug: 'inspection-compliance', slug: 'property-inspections', level: 'category', name: 'Property Inspections', sortOrder: 1 },
  { id: 41, parentSlug: 'inspection-compliance', slug: 'compliance-certificates', level: 'category', name: 'Compliance Certificates', sortOrder: 2 },
  { id: 42, parentSlug: 'inspection-compliance', slug: 'energy-efficiency', level: 'category', name: 'Energy Efficiency', sortOrder: 3 },

  // ── Insurance & Cover categories ───────────────────────────────────────────
  { id: 50, parentSlug: 'insurance-protection', slug: 'buildings-cover', level: 'category', name: 'Buildings Cover', sortOrder: 1 },
  { id: 51, parentSlug: 'insurance-protection', slug: 'contents-cover', level: 'category', name: 'Contents Cover', sortOrder: 2 },
  { id: 52, parentSlug: 'insurance-protection', slug: 'landlord-cover', level: 'category', name: 'Landlord Cover', sortOrder: 3 },

  // ── Media & Marketing categories ───────────────────────────────────────────
  { id: 60, parentSlug: 'media-marketing', slug: 'listing-photography', level: 'category', name: 'Listing Photography', sortOrder: 1 },
  { id: 61, parentSlug: 'media-marketing', slug: 'video-tours', level: 'category', name: 'Video Tours', sortOrder: 2 },
  { id: 62, parentSlug: 'media-marketing', slug: 'home-staging', level: 'category', name: 'Home Staging', sortOrder: 3 },
  { id: 63, parentSlug: 'media-marketing', slug: 'aerial-drone-media', level: 'category', name: 'Aerial & Drone Media', sortOrder: 4 },

  // ── Professional Services categories ───────────────────────────────────────
  { id: 70, parentSlug: 'professional-services', slug: 'architecture', level: 'category', name: 'Architecture', sortOrder: 1 },
  { id: 71, parentSlug: 'professional-services', slug: 'structural-engineering', level: 'category', name: 'Structural Engineering', sortOrder: 2 },
  { id: 72, parentSlug: 'professional-services', slug: 'project-management', level: 'category', name: 'Project Management', sortOrder: 3 },
  { id: 73, parentSlug: 'professional-services', slug: 'land-surveying', level: 'category', name: 'Land Surveying', sortOrder: 4 },

  // ── Home Improvement services ──────────────────────────────────────────────
  { id: 100, parentSlug: 'electrical', slug: 'electrical-installations', level: 'service', name: 'Electrical Installations', sortOrder: 1 },
  { id: 101, parentSlug: 'electrical', slug: 'electrical-fault-repairs', level: 'service', name: 'Electrical Fault Repairs', sortOrder: 2 },
  { id: 102, parentSlug: 'electrical', slug: 'lighting-installations', level: 'service', name: 'Lighting Installations', sortOrder: 3 },
  { id: 110, parentSlug: 'plumbing', slug: 'plumbing-repairs', level: 'service', name: 'Plumbing Repairs', sortOrder: 1 },
  { id: 111, parentSlug: 'plumbing', slug: 'bathroom-kitchen-plumbing', level: 'service', name: 'Bathroom & Kitchen Plumbing', sortOrder: 2 },
  { id: 112, parentSlug: 'plumbing', slug: 'geyser-installation-repair', level: 'service', name: 'Geyser Installation & Repair', sortOrder: 3 },
  { id: 120, parentSlug: 'painting-decorating', slug: 'interior-painting', level: 'service', name: 'Interior Painting', sortOrder: 1 },
  { id: 121, parentSlug: 'painting-decorating', slug: 'exterior-painting', level: 'service', name: 'Exterior Painting', sortOrder: 2 },
  { id: 130, parentSlug: 'renovations-alterations', slug: 'kitchen-renovations', level: 'service', name: 'Kitchen Renovations', sortOrder: 1 },
  { id: 131, parentSlug: 'renovations-alterations', slug: 'bathroom-renovations', level: 'service', name: 'Bathroom Renovations', sortOrder: 2 },
  { id: 132, parentSlug: 'renovations-alterations', slug: 'home-additions', level: 'service', name: 'Home Additions', sortOrder: 3 },
  { id: 140, parentSlug: 'solar-backup-power', slug: 'solar-panel-installation', level: 'service', name: 'Solar Panel Installation', sortOrder: 1 },
  { id: 141, parentSlug: 'solar-backup-power', slug: 'inverter-battery-backup', level: 'service', name: 'Inverter & Battery Backup', sortOrder: 2 },
  { id: 150, parentSlug: 'building-contracting', slug: 'alterations-outbuildings', level: 'service', name: 'Alterations & Outbuildings', sortOrder: 1 },
  { id: 151, parentSlug: 'building-contracting', slug: 'waterproofing', level: 'service', name: 'Waterproofing', sortOrder: 2 },

  // ── Finance & Legal services ───────────────────────────────────────────────
  { id: 200, parentSlug: 'home-finance', slug: 'bond-origination', level: 'service', name: 'Bond Origination', sortOrder: 1 },
  { id: 201, parentSlug: 'home-finance', slug: 'bond-prequalification', level: 'service', name: 'Bond Prequalification', sortOrder: 2 },
  { id: 210, parentSlug: 'conveyancing-transfer', slug: 'property-transfers', level: 'service', name: 'Property Transfers', sortOrder: 1 },
  { id: 220, parentSlug: 'property-legal-advice', slug: 'lease-agreements', level: 'service', name: 'Lease Agreements', sortOrder: 1 },
  { id: 221, parentSlug: 'property-legal-advice', slug: 'purchase-contract-review', level: 'service', name: 'Purchase Contract Review', sortOrder: 2 },

  // ── Moving & Relocation services ───────────────────────────────────────────
  { id: 300, parentSlug: 'household-moves', slug: 'local-household-moves', level: 'service', name: 'Local Household Moves', sortOrder: 1 },
  { id: 301, parentSlug: 'household-moves', slug: 'long-distance-moves', level: 'service', name: 'Long-Distance Moves', sortOrder: 2 },
  { id: 302, parentSlug: 'household-moves', slug: 'packing-services', level: 'service', name: 'Packing Services', sortOrder: 3 },
  { id: 310, parentSlug: 'specialist-moves', slug: 'fragile-speciality-moves', level: 'service', name: 'Fragile & Speciality Moves', sortOrder: 1 },
  { id: 320, parentSlug: 'storage-logistics', slug: 'short-term-storage', level: 'service', name: 'Short-Term Storage', sortOrder: 1 },

  // ── Inspection & Compliance services ───────────────────────────────────────
  { id: 400, parentSlug: 'property-inspections', slug: 'pre-purchase-inspections', level: 'service', name: 'Pre-Purchase Inspections', sortOrder: 1 },
  { id: 401, parentSlug: 'property-inspections', slug: 'snag-inspections', level: 'service', name: 'Snag Inspections', sortOrder: 2 },
  { id: 402, parentSlug: 'property-inspections', slug: 'rental-inspections', level: 'service', name: 'Rental Inspections', sortOrder: 3 },
  { id: 410, parentSlug: 'compliance-certificates', slug: 'electrical-coc', level: 'service', name: 'Electrical COC', sortOrder: 1 },
  { id: 411, parentSlug: 'compliance-certificates', slug: 'gas-compliance-certificate', level: 'service', name: 'Gas Compliance Certificate', sortOrder: 2 },
  { id: 412, parentSlug: 'compliance-certificates', slug: 'electric-fence-certificate', level: 'service', name: 'Electric Fence Certificate', sortOrder: 3 },
  { id: 420, parentSlug: 'energy-efficiency', slug: 'energy-audits', level: 'service', name: 'Energy Audits', sortOrder: 1 },

  // ── Insurance & Cover services ─────────────────────────────────────────────
  { id: 500, parentSlug: 'buildings-cover', slug: 'homeowners-buildings-cover', level: 'service', name: 'Homeowners Buildings Cover', sortOrder: 1 },
  { id: 510, parentSlug: 'contents-cover', slug: 'household-contents-cover', level: 'service', name: 'Household Contents Cover', sortOrder: 1 },
  { id: 520, parentSlug: 'landlord-cover', slug: 'landlord-portfolio-cover', level: 'service', name: 'Landlord Portfolio Cover', sortOrder: 1 },

  // ── Media & Marketing services ─────────────────────────────────────────────
  { id: 600, parentSlug: 'listing-photography', slug: 'listing-photo-packages', level: 'service', name: 'Listing Photo Packages', sortOrder: 1 },
  { id: 610, parentSlug: 'video-tours', slug: 'walkthrough-video-tours', level: 'service', name: 'Walkthrough Video Tours', sortOrder: 1 },
  { id: 620, parentSlug: 'home-staging', slug: 'home-staging-consultations', level: 'service', name: 'Home Staging Consultations', sortOrder: 1 },
  { id: 630, parentSlug: 'aerial-drone-media', slug: 'drone-footage', level: 'service', name: 'Drone Footage', sortOrder: 1 },

  // ── Professional Services services ─────────────────────────────────────────
  { id: 700, parentSlug: 'architecture', slug: 'residential-alteration-design', level: 'service', name: 'Residential Alteration Design', sortOrder: 1 },
  { id: 701, parentSlug: 'architecture', slug: 'new-home-design', level: 'service', name: 'New Home Design', sortOrder: 2 },
  { id: 702, parentSlug: 'architecture', slug: 'building-plan-submissions', level: 'service', name: 'Building Plan Submissions', sortOrder: 3 },
  { id: 710, parentSlug: 'structural-engineering', slug: 'structural-assessments', level: 'service', name: 'Structural Assessments', sortOrder: 1 },
  { id: 720, parentSlug: 'project-management', slug: 'renovation-project-management', level: 'service', name: 'Renovation Project Management', sortOrder: 1 },
  { id: 730, parentSlug: 'land-surveying', slug: 'land-surveys', level: 'service', name: 'Land Surveys', sortOrder: 1 },
];

const NODE_BY_SLUG = new Map(SERVICE_TAXONOMY_SEED.map(node => [node.slug, node]));

export function taxonomySeedBySlug(slug: string): ServiceTaxonomySeedNode | undefined {
  return NODE_BY_SLUG.get(slug);
}

export function taxonomyFamilySlugs(): string[] {
  return SERVICE_TAXONOMY_SEED.filter(node => node.level === 'family').map(node => node.slug);
}

export function isTaxonomySlug(value: string): boolean {
  return NODE_BY_SLUG.has(value);
}

/** Verification dimensions that gate automatic introduction per family slug. */
export const FAMILY_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS: Record<string, string[]> = {
  'finance-legal': ['identity', 'business_registration', 'professional_registration'],
  'insurance-protection': ['identity', 'business_registration'],
};

export const DEFAULT_AUTO_INTRODUCTION_VERIFICATION_REQUIREMENTS = ['identity'] as const;
