import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Camera,
  ClipboardCheck,
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
} from 'lucide-react';
import type { ServiceCategory } from './catalog';
import { SERVICES_IMAGES } from './media';

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
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ServiceCategoryLandingContent = {
  title: string;
  description: string;
  heroImage: string;
  serviceIntro: string;
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
    | 'serviceIntro'
    | 'servicePathways'
    | 'planningOptions'
    | 'requestDetails'
    | 'guides'
  >
>;

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
    serviceIntro:
      'Choose the kind of work you are planning. The directory uses the selected wording to narrow published provider information; always review each provider’s listed services before you enquire.',
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
    guides: [
      {
        title: 'Describe the current condition',
        description:
          'A short description of the issue and the affected area gives a provider useful context before they respond.',
        icon: ScanSearch,
      },
      {
        title: 'Plan access and timing',
        description:
          'Mention site access, occupants, preferred timing and any work that needs coordination with another trade.',
        icon: MapPinned,
      },
      {
        title: 'Confirm scope before buying',
        description:
          'If you have a material or product in mind, ask the provider to confirm suitability before you commit to it.',
        icon: FileCheck2,
      },
    ],
  },
  finance_legal: {
    title: 'Finance & legal services',
    description:
      'Explore published finance and legal professionals for property decisions, documentation and transaction support. Review each provider’s listed services before you enquire.',
    heroImage: SERVICES_IMAGES.categories.finance_legal,
    serviceIntro:
      'Start with the property decision you need help with. A service focus narrows the directory; the provider confirms whether your circumstances are within their scope.',
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
    guides: [
      {
        title: 'Know your next property step',
        description:
          'State whether you are comparing options, preparing an application, or already in a transaction process.',
        icon: ClipboardCheck,
      },
      {
        title: 'Prepare questions, not assumptions',
        description:
          'Ask what documents, affordability information, or property details a provider needs before giving direction.',
        icon: FileText,
      },
      {
        title: 'Protect private information',
        description:
          'Use the first message to establish fit; only provide sensitive documents through an agreed, appropriate channel.',
        icon: ShieldCheck,
      },
    ],
  },
  moving: {
    title: 'Moving & storage services',
    description:
      'Explore published providers for moving, packing, storage and relocation support. Compare listed coverage and service information before choosing who to contact.',
    heroImage: SERVICES_IMAGES.categories.moving,
    serviceIntro:
      'A move is easier to describe when you start with its size, timing and access requirements. Use a pathway to focus the directory on the work you need.',
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
    guides: [
      {
        title: 'Make an inventory',
        description:
          'A simple list of rooms, larger items and special handling needs helps a provider understand the move.',
        icon: ClipboardCheck,
      },
      {
        title: 'Check property access',
        description:
          'Mention stairs, lifts, parking, security procedures, loading times and any estate or building requirements.',
        icon: MapPinned,
      },
      {
        title: 'Plan the handover',
        description:
          'Set out the date range and whether storage or staged collection is relevant before you ask for support.',
        icon: PackageCheck,
      },
    ],
  },
  inspection_compliance: {
    title: 'Inspection & compliance services',
    description:
      'Explore published inspection and compliance providers for property condition, certificates and project checks. Confirm the exact requirement with the provider you choose.',
    heroImage: SERVICES_IMAGES.categories.inspection_compliance,
    serviceIntro:
      'Use a service pathway to explain the type of inspection or compliance work you are considering. The provider confirms their scope, timing and requirements.',
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
    guides: [
      {
        title: 'Be specific about the requirement',
        description:
          'Use the provider’s published services as a starting point, then ask whether they handle your exact inspection or compliance need.',
        icon: ClipboardCheck,
      },
      {
        title: 'Share useful property context',
        description:
          'Property type, project stage and known concerns can help a provider assess whether they are a good fit.',
        icon: Home,
      },
      {
        title: 'Confirm documentation needs',
        description:
          'Ask the provider which information, records or site access they need before the work can be planned.',
        icon: FileText,
      },
    ],
  },
  insurance: {
    title: 'Property insurance services',
    description:
      'Explore published insurance providers for property-related cover discussions. Compare the provider’s listed services and confirm suitability for your circumstances before proceeding.',
    heroImage: SERVICES_IMAGES.categories.insurance,
    serviceIntro:
      'Start with the property and cover context you want to discuss. A directory focus helps you find published information; it is not an insurance recommendation or quote.',
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
    guides: [
      {
        title: 'Describe the property context',
        description:
          'Explain the property type and your relationship to it so the provider can establish whether they can help.',
        icon: Home,
      },
      {
        title: 'Ask clear cover questions',
        description:
          'Use the initial enquiry to clarify what a provider can discuss; do not assume a listed service is a policy offer.',
        icon: ShieldCheck,
      },
      {
        title: 'Keep account details private',
        description:
          'Avoid sharing policy numbers or sensitive identity details until you have established an appropriate channel with the provider.',
        icon: FileCheck2,
      },
    ],
  },
  media_marketing: {
    title: 'Property media & marketing services',
    description:
      'Explore published providers for photography, video, virtual tours, staging and property marketing support. Review each provider’s listed services before you enquire.',
    heroImage: SERVICES_IMAGES.categories.media_marketing,
    serviceIntro:
      'Choose the presentation or marketing work you are planning. Include the property purpose and deadline so a provider can decide whether the request is a fit.',
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
    guides: [
      {
        title: 'Define the property goal',
        description:
          'Explain whether the content is for a sale, rental, development, campaign or ongoing business use.',
        icon: Landmark,
      },
      {
        title: 'Prepare access and presentation',
        description:
          'Mention keys, occupants, on-site contacts and any preparation still needed before a visit.',
        icon: MapPinned,
      },
      {
        title: 'Share the delivery context',
        description:
          'State where you expect to use the content and any timing constraints, then confirm deliverables directly with the provider.',
        icon: Camera,
      },
    ],
  },
};

const PLUMBING_FOCUS: ServiceFocusLandingOverride = {
  title: 'Plumbing & maintenance',
  description:
    'Explore published provider information for repairs, maintenance, installations and larger plumbing projects. Choose a provider whose listed service and coverage fit your request.',
  heroImage: '/images/services/trade-plumbing.jpg',
  serviceIntro:
    'Start with the plumbing work you have in mind. These pathways help you describe the request; they do not confirm emergency, same-day, material, or project availability.',
  servicePathways: [
    {
      key: 'leak-repair',
      title: 'Leaks & plumbing repairs',
      description: 'Leaks, fixtures, pipes and visible water-related concerns.',
      query: 'plumbing',
      planningKey: 'prompt-attention',
      icon: Wrench,
    },
    {
      key: 'bathroom-installation',
      title: 'Bathroom installations',
      description: 'Fixture replacements, new fittings and bathroom plumbing work.',
      query: 'plumbing',
      planningKey: 'installation',
      icon: Home,
    },
    {
      key: 'drainage',
      title: 'Drainage & blockages',
      description: 'Drain, water-flow and blockage concerns to discuss with a provider.',
      query: 'plumbing',
      planningKey: 'prompt-attention',
      icon: ScanSearch,
    },
    {
      key: 'geyser',
      title: 'Geyser work',
      description: 'Geyser repair, replacement and installation conversations.',
      query: 'plumbing',
      planningKey: 'installation',
      icon: Sun,
    },
    {
      key: 'maintenance',
      title: 'Maintenance & servicing',
      description: 'Planned maintenance and recurring plumbing issues.',
      query: 'plumbing',
      planningKey: 'planned-work',
      icon: Wrench,
    },
    {
      key: 'project',
      title: 'Renovation plumbing',
      description: 'Plumbing within a bathroom, kitchen or larger improvement project.',
      query: 'plumbing',
      planningKey: 'project',
      icon: Hammer,
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
    'Where the issue or planned work is located, and what you can see or hear.',
    'The existing fixture or installation, plus photos or measurements where they are useful.',
    'Any fixture, finish, or material preference — then ask the provider to confirm compatibility before buying.',
  ],
  guides: [
    {
      title: 'Before a plumbing repair',
      description:
        'Describe the visible issue, when it started and whether access or water isolation affects the assessment.',
      icon: Wrench,
    },
    {
      title: 'Planning a fixture replacement',
      description:
        'Share the existing setup and measurements where known, then confirm product compatibility with the provider.',
      icon: FileCheck2,
    },
    {
      title: 'Preparing a larger project',
      description:
        'For a kitchen or bathroom project, outline the scope, plans, access and timeline before you contact a provider.',
      icon: Hammer,
    },
  ],
};

const SERVICE_FOCUS_OVERRIDES: Record<string, ServiceFocusLandingOverride> = {
  plumbing: PLUMBING_FOCUS,
};

export function getServiceFocusLandingOverride(serviceKey: string | null | undefined) {
  if (!serviceKey) return null;
  return SERVICE_FOCUS_OVERRIDES[serviceKey] || null;
}
