import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Camera,
  ClipboardCheck,
  Droplets,
  FileCheck2,
  FileText,
  Hammer,
  HardHat,
  Home,
  Landmark,
  MapPinned,
  PackageCheck,
  Paintbrush,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Sun,
  Truck,
  Wrench,
  Zap,
  createLucideIcon,
} from 'lucide-react';
import type { ServiceCategory } from './catalog';
import { SERVICES_IMAGES } from './media';
import { getServiceGuidesForTopic } from './serviceGuides';

const DrainagePipeIcon = createLucideIcon('DrainagePipe', [
  ['path', { d: 'M5 4v7a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v1', key: 'pipe' }],
  ['path', { d: 'M3 4h4', key: 'inlet' }],
  ['path', { d: 'M17 20h4', key: 'outlet' }],
  ['path', { d: 'M13 8h4a3 3 0 0 1 3 3v1', key: 'trap' }],
  ['path', { d: 'M16 8h4', key: 'drain' }],
]);

const GeyserIcon = createLucideIcon('Geyser', [
  ['rect', { x: '7', y: '3', width: '10', height: '18', rx: '2', key: 'tank' }],
  ['path', { d: 'M9 7h6', key: 'top' }],
  ['path', { d: 'M9 11h6', key: 'middle' }],
  ['path', { d: 'M12 15h.01', key: 'indicator' }],
  ['path', { d: 'M10 21v1', key: 'left-pipe' }],
  ['path', { d: 'M14 21v1', key: 'right-pipe' }],
]);

/**
 * Curated category-page content, not a provider catalogue or availability feed.
 *
 * A pathway applies a real directory text filter when the visitor chooses it,
 * but it does not assert that a matching provider is published in every area.
 * The page therefore gives each category a useful destination without creating
 * a second service authority or fabricated marketplace inventory.
 */
export type CategoryServicePathway = {
  key: string;
  title: string;
  description: string;
  query: string;
  planningKey?: string;
  icon: LucideIcon;
};

export type CategoryPlanningOption = {
  key: string;
  title: string;
  description: string;
  nextStep: string;
};

export type CategoryGuide = {
  slug?: string;
  title: string;
  description: string;
  icon: LucideIcon;
  image?: string;
};

export type ServiceCategoryLandingContent = {
  title: string;
  description: string;
  heroImage: string;
  featureImage: string;
  providerImage: string;
  guideImages: string[];
  featureTitle: string;
  featureDescription: string;
  serviceIntro: string;
  guideIntro: string;
  servicePathways: CategoryServicePathway[];
  planningOptions: CategoryPlanningOption[];
  requestDetails: string[];
  guides: CategoryGuide[];
};

export type ServiceFocusLandingOverride = Partial<
  Pick<
    ServiceCategoryLandingContent,
    | 'title'
    | 'description'
    | 'heroImage'
    | 'featureImage'
    | 'providerImage'
    | 'guideImages'
    | 'featureTitle'
    | 'featureDescription'
    | 'serviceIntro'
    | 'guideIntro'
    | 'servicePathways'
    | 'planningOptions'
    | 'requestDetails'
    | 'guides'
  >
>;

function categoryGuides(topicKey: string): CategoryGuide[] {
  return getServiceGuidesForTopic(topicKey).map(guide => ({
    slug: guide.slug,
    title: guide.cardTitle,
    description: guide.summary,
    icon: guide.icon,
    image: guide.image,
  }));
}

const GENERAL_PLANNING: CategoryPlanningOption[] = [
  {
    key: 'prompt-attention',
    title: 'Needs prompt attention',
    description:
      'Something needs to be assessed soon, and you want to explain the immediate issue.',
    nextStep:
      'Describe what happened, when it started, what is affected, and any access constraints.',
  },
  {
    key: 'planned-work',
    title: 'Planned work',
    description:
      'You know what needs attention and want to arrange work around your preferred timing.',
    nextStep:
      'Share the current condition, property context, preferred timing, and the outcome you want.',
  },
  {
    key: 'comparison',
    title: 'Exploring options',
    description: 'You are still working out which service or professional is the best fit.',
    nextStep:
      'Explain your goal and ask the provider what information they need before they can advise.',
  },
  {
    key: 'project',
    title: 'A larger project',
    description:
      'This request is part of a renovation, move, sale preparation, or another multi-step project.',
    nextStep:
      'Outline the scope, access, target timeframe, and any plans, documents, or photos that are useful.',
  },
];

export const SERVICE_CATEGORY_LANDING_CONTENT: Record<
  ServiceCategory,
  ServiceCategoryLandingContent
> = {
  home_improvement: {
    title: 'Home improvement services',
    description:
      'Explore published providers for property repairs, maintenance, improvements and project work. Check each provider’s listed service and coverage before sending a request.',
    heroImage: SERVICES_IMAGES.categories.home_improvement,
    featureImage: '/images/services/trade-renovations.jpg',
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      '/images/services/trade-plumbing.jpg',
      '/images/services/trade-renovations.jpg',
      '/images/services/trade-painting.jpg',
    ],
    featureTitle: 'Make the next property improvement easier to plan',
    featureDescription:
      'Start with the work you can see, then use a provider’s published services and coverage to decide who is appropriate to contact.',
    serviceIntro:
      'Choose the kind of work you are planning. The directory uses the selected wording to narrow published provider information; always review each provider’s listed services before you enquire.',
    guideIntro:
      'Practical advice and project checklists to help you plan home improvement work.',
    servicePathways: [
      {
        key: 'plumbing',
        title: 'Plumbing & maintenance',
        description: 'Leaks, fixtures, drains, pipework and planned plumbing work.',
        query: 'plumbing',
        icon: Wrench,
      },
      {
        key: 'electrical',
        title: 'Electrical work',
        description: 'Electrical repairs, installations and lighting-related work.',
        query: 'electrical',
        icon: Zap,
      },
      {
        key: 'solar',
        title: 'Solar & backup power',
        description: 'Solar, battery, inverter and backup-power discussions.',
        query: 'solar',
        icon: Sun,
      },
      {
        key: 'roofing',
        title: 'Roofing & waterproofing',
        description: 'Roof condition, gutters, waterproofing and rainwater concerns.',
        query: 'roofing',
        icon: HardHat,
      },
      {
        key: 'renovations',
        title: 'Renovations & building',
        description: 'Building work, kitchens, bathrooms, finishes and larger improvements.',
        query: 'renovations',
        icon: Hammer,
      },
      {
        key: 'painting',
        title: 'Painting & decorating',
        description: 'Painting, plaster repair, decorating and finish preparation.',
        query: 'painting',
        icon: Paintbrush,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'What needs attention, the relevant property area, and the outcome you want.',
      'Any access, timing, budget, or product constraints that could affect the work.',
      'Photos, dimensions, or existing-product details where they will help a provider assess the request.',
    ],
    guides: categoryGuides('home_improvement'),
  },
  finance_legal: {
    title: 'Finance & legal services',
    description:
      'Explore published finance and legal professionals for property decisions, documentation and transaction support. Review each provider’s listed services before you enquire.',
    heroImage: SERVICES_IMAGES.categories.finance_legal,
    featureImage: SERVICES_IMAGES.categories.finance_legal,
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      SERVICES_IMAGES.categories.finance_legal,
      SERVICES_IMAGES.categories.inspection_compliance,
      SERVICES_IMAGES.ecosystem,
    ],
    featureTitle: 'Bring useful property context to the first conversation',
    featureDescription:
      'Published service information helps you identify a suitable professional. The provider confirms the scope that applies to your circumstances.',
    serviceIntro:
      'Start with the property decision you need help with. A service focus narrows the directory; the provider confirms whether your circumstances are within their scope.',
    guideIntro:
      'Practical prompts to help you prepare for property finance and legal conversations.',
    servicePathways: [
      {
        key: 'bond',
        title: 'Bond & home finance',
        description: 'Finance preparation, bond-related support and affordability discussions.',
        query: 'bond',
        icon: Landmark,
      },
      {
        key: 'conveyancing',
        title: 'Conveyancing',
        description: 'Transfer, registration and property transaction process support.',
        query: 'conveyancing',
        icon: FileCheck2,
      },
      {
        key: 'legal',
        title: 'Property legal support',
        description: 'Property-related legal guidance, documents and process questions.',
        query: 'legal',
        icon: FileText,
      },
      {
        key: 'valuation',
        title: 'Valuation support',
        description: 'Property value, pricing and report-related discussions.',
        query: 'valuation',
        icon: Banknote,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'Whether you are buying, selling, refinancing, renting, or planning ahead.',
      'The property or transaction stage, and any relevant dates or deadlines.',
      'The question you need answered, without sharing unnecessary sensitive financial or identity information in an initial enquiry.',
    ],
    guides: categoryGuides('finance_legal'),
  },
  moving: {
    title: 'Moving & storage services',
    description:
      'Explore published providers for moving, packing, storage and relocation support. Compare listed coverage and service information before choosing who to contact.',
    heroImage: SERVICES_IMAGES.categories.moving,
    featureImage: SERVICES_IMAGES.categories.moving,
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      SERVICES_IMAGES.categories.moving,
      SERVICES_IMAGES.ecosystem,
      SERVICES_IMAGES.categories.home_improvement,
    ],
    featureTitle: 'Plan the move before you send an enquiry',
    featureDescription:
      'A clear picture of the move, property access and timing helps you identify providers whose published services may fit the work.',
    serviceIntro:
      'A move is easier to describe when you start with its size, timing and access requirements. Use a pathway to focus the directory on the work you need.',
    guideIntro: 'Planning tips to help you prepare for a household move.',
    servicePathways: [
      {
        key: 'moving',
        title: 'Local moving',
        description: 'Household, apartment and property move discussions.',
        query: 'moving',
        icon: Truck,
      },
      {
        key: 'packing',
        title: 'Packing support',
        description: 'Packing, unpacking and move preparation conversations.',
        query: 'packing',
        icon: PackageCheck,
      },
      {
        key: 'storage',
        title: 'Storage',
        description: 'Short- or longer-term storage needs connected to a move.',
        query: 'storage',
        icon: Home,
      },
      {
        key: 'relocation',
        title: 'Relocation planning',
        description: 'Move timing, property handover and relocation coordination.',
        query: 'relocation',
        icon: MapPinned,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'The origin and destination areas, move date range, and property access considerations.',
      'What needs to move, including large, fragile, or unusual items.',
      'Whether packing, storage, disassembly, or other support is part of the request.',
    ],
    guides: categoryGuides('moving'),
  },
  inspection_compliance: {
    title: 'Inspection & compliance services',
    description:
      'Explore published inspection and compliance providers for property condition, certificates and project checks. Confirm the exact requirement with the provider you choose.',
    heroImage: SERVICES_IMAGES.categories.inspection_compliance,
    featureImage: SERVICES_IMAGES.categories.inspection_compliance,
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      SERVICES_IMAGES.categories.inspection_compliance,
      SERVICES_IMAGES.ecosystem,
      SERVICES_IMAGES.categories.home_improvement,
    ],
    featureTitle: 'Start with the property requirement you need to address',
    featureDescription:
      'Use published provider information as a starting point, then confirm the exact inspection, certificate or project-check requirement directly with the professional.',
    serviceIntro:
      'Use a service pathway to explain the type of inspection or compliance work you are considering. The provider confirms their scope, timing and requirements.',
    guideIntro:
      'Practical guides to help you prepare for property checks and compliance conversations.',
    servicePathways: [
      {
        key: 'inspection',
        title: 'Property inspections',
        description: 'Condition, defect and property-inspection discussions.',
        query: 'inspection',
        icon: ScanSearch,
      },
      {
        key: 'compliance',
        title: 'Compliance support',
        description: 'Property compliance questions and requirement checks.',
        query: 'compliance',
        icon: ClipboardCheck,
      },
      {
        key: 'certificate',
        title: 'Certificates',
        description: 'Certificate-related service discussions and documentation.',
        query: 'certificate',
        icon: FileCheck2,
      },
      {
        key: 'snag',
        title: 'Snag & handover checks',
        description: 'New-build, renovation and handover observations.',
        query: 'snag',
        icon: HardHat,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'The property type, location and why the inspection or certificate is needed.',
      'The relevant transaction, handover, sale or project stage and any known deadline.',
      'Existing reports, photographs, plans or concerns that give useful context.',
    ],
    guides: categoryGuides('inspection_compliance'),
  },
  insurance: {
    title: 'Property insurance services',
    description:
      'Explore published insurance providers for property-related cover discussions. Compare the provider’s listed services and confirm suitability for your circumstances before proceeding.',
    heroImage: SERVICES_IMAGES.categories.insurance,
    featureImage: SERVICES_IMAGES.categories.insurance,
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      SERVICES_IMAGES.categories.insurance,
      SERVICES_IMAGES.ecosystem,
      SERVICES_IMAGES.categories.home_improvement,
    ],
    featureTitle: 'Give the provider the property context they need',
    featureDescription:
      'A published provider profile can help you decide who to contact. It is not a recommendation, quote or confirmation of cover.',
    serviceIntro:
      'Start with the property and cover context you want to discuss. A directory focus helps you find published information; it is not an insurance recommendation or quote.',
    guideIntro: 'Helpful prompts to prepare questions about property and contents cover.',
    servicePathways: [
      {
        key: 'insurance',
        title: 'Property insurance',
        description: 'General property-cover and policy discussions.',
        query: 'insurance',
        icon: ShieldCheck,
      },
      {
        key: 'buildings',
        title: 'Buildings cover',
        description: 'Building and physical-property cover questions.',
        query: 'buildings',
        icon: Home,
      },
      {
        key: 'contents',
        title: 'Contents cover',
        description: 'Household contents and property-related cover discussions.',
        query: 'contents',
        icon: PackageCheck,
      },
      {
        key: 'landlord',
        title: 'Investment & landlord context',
        description: 'Property investment and landlord cover conversations.',
        query: 'landlord',
        icon: Landmark,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'The property type and ownership or tenancy context relevant to your question.',
      'Whether you are comparing cover, reviewing a change, or preparing for an ownership milestone.',
      'Questions about scope and exclusions to discuss directly with an appropriately authorised provider.',
    ],
    guides: categoryGuides('insurance'),
  },
  media_marketing: {
    title: 'Property media & marketing services',
    description:
      'Explore published providers for photography, video, virtual tours, staging and property marketing support. Review each provider’s listed services before you enquire.',
    heroImage: SERVICES_IMAGES.categories.media_marketing,
    featureImage: SERVICES_IMAGES.categories.media_marketing,
    providerImage: SERVICES_IMAGES.providerNetworkCta,
    guideImages: [
      SERVICES_IMAGES.categories.media_marketing,
      SERVICES_IMAGES.categories.home_improvement,
      SERVICES_IMAGES.ecosystem,
    ],
    featureTitle: 'Present the property with a clear purpose in mind',
    featureDescription:
      'Use the intended property outcome, audience and timing to find providers whose published media or marketing services are relevant.',
    serviceIntro:
      'Choose the presentation or marketing work you are planning. Include the property purpose and deadline so a provider can decide whether the request is a fit.',
    guideIntro:
      'Planning guides for property photography, video and marketing work.',
    servicePathways: [
      {
        key: 'photography',
        title: 'Property photography',
        description: 'Photography and listing-image planning for a property.',
        query: 'photography',
        icon: Camera,
      },
      {
        key: 'video',
        title: 'Video & walkthroughs',
        description: 'Property video, walkthrough and visual-storytelling discussions.',
        query: 'video',
        icon: Camera,
      },
      {
        key: 'virtual',
        title: 'Virtual tours',
        description: 'Virtual-tour and digital-viewing support conversations.',
        query: 'virtual',
        icon: ScanSearch,
      },
      {
        key: 'staging',
        title: 'Staging & presentation',
        description: 'Property presentation, styling and listing-preparation work.',
        query: 'staging',
        icon: Sparkles,
      },
    ],
    planningOptions: GENERAL_PLANNING,
    requestDetails: [
      'The property purpose: sale, rental, development, portfolio or another use.',
      'The property type, location, intended channels and any publication deadline.',
      'The content you need and any access, styling or preparation constraints that affect the work.',
    ],
    guides: categoryGuides('media_marketing'),
  },
};

const PLUMBING_FOCUS: ServiceFocusLandingOverride = {
  title: 'Plumbing & maintenance',
  description:
    'From emergency repairs to installations, find plumbing professionals in your area.',
  heroImage: SERVICES_IMAGES.plumbingHero,
  featureImage: '/images/services/plumbing-faucet-feature.jpeg',
  providerImage: SERVICES_IMAGES.providerNetworkCta,
  guideImages: [
    '/images/services/trade-plumbing.jpg',
    SERVICES_IMAGES.plumbingProfessional,
    '/images/services/trade-renovations.jpg',
  ],
  featureTitle: 'Reliable Plumbing Services, When You Need Them',
  featureDescription:
    'Connect with experienced plumbing professionals who provide quality workmanship, transparent pricing and professional service across South Africa.',
  serviceIntro:
    'Start with the plumbing work you have in mind. These pathways help you describe the request; they do not confirm emergency, same-day, material, or project availability.',
  guideIntro: 'Expert advice, tips and guides to help you with your plumbing needs.',
  servicePathways: [
    {
      key: 'leak-repair',
      title: 'Leak Repairs\n& Plumbing',
      description: 'Leaks, fixtures, pipes and visible water-related concerns.',
      query: 'plumbing',
      planningKey: 'prompt-attention',
      icon: Droplets,
    },
    {
      key: 'bathroom-installation',
      title: 'Bathroom\nInstallations',
      description: 'Fixture replacements, new fittings and bathroom plumbing work.',
      query: 'plumbing',
      planningKey: 'installation',
      icon: Home,
    },
    {
      key: 'drainage',
      title: 'Drainage &\nBlockages',
      description: 'Drain, water-flow and blockage concerns to discuss with a provider.',
      query: 'plumbing',
      planningKey: 'prompt-attention',
      icon: DrainagePipeIcon,
    },
    {
      key: 'geyser',
      title: 'Geyser Repairs\n& Replacement',
      description: 'Geyser repair, replacement and installation conversations.',
      query: 'plumbing',
      planningKey: 'installation',
      icon: GeyserIcon,
    },
    {
      key: 'maintenance',
      title: 'Maintenance\n& Servicing',
      description: 'Planned maintenance and recurring plumbing issues.',
      query: 'plumbing',
      planningKey: 'planned-work',
      icon: Wrench,
    },
    {
      key: 'project',
      title: 'Emergency\nPlumbing',
      description: 'Urgent plumbing concerns to discuss when a provider is available.',
      query: 'plumbing',
      planningKey: 'prompt-attention',
      icon: Home,
    },
  ],
  planningOptions: [
    {
      key: 'prompt-attention',
      title: 'Needs prompt attention',
      description:
        'A leak, blockage, loss of water, or another issue needs an assessment as soon as a provider is available.',
      nextStep:
        'State where the issue is, when it started, whether water can be isolated safely, and any access constraints.',
    },
    {
      key: 'planned-work',
      title: 'Maintenance or repair',
      description: 'You want to resolve a recurring issue or arrange preventative plumbing work.',
      nextStep:
        'Describe the fixture, drain, pipework, or area involved and what has already been tried.',
    },
    {
      key: 'installation',
      title: 'Installation or replacement',
      description:
        'You are replacing a fixture, upgrading pipework, or planning a new installation.',
      nextStep:
        'Share the existing setup, measurements if known, and any fixture or finish preferences.',
    },
    {
      key: 'project',
      title: 'Renovation or larger project',
      description:
        'Plumbing is one part of a bathroom, kitchen, building, or property improvement project.',
      nextStep:
        'Outline the scope, drawings or photos if available, site access, and the target project timeline.',
    },
  ],
  requestDetails: [
    'Find local, approved professionals',
    'Compare services and read reviews',
    'Send one private enquiry',
  ],
  guides: categoryGuides('plumbing'),
};

const SERVICE_FOCUS_OVERRIDES: Record<string, ServiceFocusLandingOverride> = {
  plumbing: PLUMBING_FOCUS,
};

export function getServiceFocusLandingOverride(serviceKey: string | null | undefined) {
  if (!serviceKey) return null;
  return SERVICE_FOCUS_OVERRIDES[serviceKey] || null;
}
