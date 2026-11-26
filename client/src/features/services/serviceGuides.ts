import type { LucideIcon } from 'lucide-react';
import {
  Camera,
  ClipboardCheck,
  Droplets,
  FileCheck2,
  FileText,
  Hammer,
  Home,
  Landmark,
  MapPinned,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import type { ServiceCategory } from './catalog';
import { toServiceCategorySlug } from './catalog';
import { SERVICES_IMAGES } from './media';

export type ServiceGuideSource = {
  label: string;
  url: string;
};

export type ServiceGuideSection = {
  heading: string;
  paragraphs?: string[];
  points?: string[];
};

export type ServiceGuide = {
  slug: string;
  category: ServiceCategory;
  categoryLabel: string;
  topicKey: string;
  topicLabel: string;
  serviceQuery?: string;
  title: string;
  cardTitle: string;
  summary: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  sections: ServiceGuideSection[];
  sources: ServiceGuideSource[];
};

type CategoryGuideInput = Omit<
  ServiceGuide,
  'topicKey' | 'topicLabel' | 'cardTitle' | 'sources'
>;

function categoryGuide(input: CategoryGuideInput): ServiceGuide {
  return {
    ...input,
    topicKey: input.category,
    topicLabel: input.categoryLabel,
    cardTitle: input.title,
    sources: [],
  };
}

const ADDITIONAL_CATEGORY_GUIDES: ServiceGuide[] = [
  categoryGuide({
    slug: 'describe-the-current-condition',
    category: 'home_improvement',
    categoryLabel: 'Home Improvement',
    title: 'Describe the current condition',
    summary:
      'A clear description of the affected area and what you have noticed helps a provider understand the work you want assessed.',
    image: '/images/services/trade-renovations.jpg',
    imageAlt: 'Home interior prepared for property improvement work',
    icon: ScanSearch,
    sections: [
      {
        heading: 'Record what you can see',
        points: [
          'Name the room, surface, fixture or area that needs attention.',
          'Describe visible changes and when you first noticed them.',
          'Add a clear photo or measurement if it helps explain the request.',
        ],
      },
      {
        heading: 'Explain the outcome you want',
        paragraphs: [
          'Tell the provider whether you are looking for a repair, replacement, improvement or an initial assessment. Mention any work that has already been done so the provider can ask focused follow-up questions.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'plan-access-and-timing',
    category: 'home_improvement',
    categoryLabel: 'Home Improvement',
    title: 'Plan access and timing',
    summary:
      'Share the access arrangements, occupants and timing constraints that could affect a property repair or improvement visit.',
    image: '/images/services/trade-plumbing.jpg',
    imageAlt: 'Plumbing fixture in a residential property',
    icon: MapPinned,
    sections: [
      {
        heading: 'Note the practical details',
        points: [
          'Mention stairs, lifts, parking, access codes or building procedures.',
          'Say whether someone needs to be home or meet the provider.',
          'Identify timing constraints, noisy-work limits or other trades on site.',
        ],
      },
      {
        heading: 'Coordinate work that depends on other tasks',
        paragraphs: [
          'If the job is part of a larger project, describe the sequence you have in mind and which parts are already arranged. Ask the provider what needs to happen before their work can begin.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'confirm-scope-before-buying',
    category: 'home_improvement',
    categoryLabel: 'Home Improvement',
    title: 'Confirm scope before buying',
    summary:
      'Before purchasing materials or fittings, share your plans and ask the provider to confirm what is suitable for the intended work.',
    image: '/images/services/trade-painting.jpg',
    imageAlt: 'Painting supplies for a home improvement project',
    icon: FileCheck2,
    sections: [
      {
        heading: 'Write down what is included',
        points: [
          'List the work areas, materials or products you have already selected.',
          'Ask whether preparation, removal, disposal and finishing are included.',
          'Confirm how changes or hidden conditions will be discussed.',
        ],
      },
      {
        heading: 'Check suitability before committing',
        paragraphs: [
          'Product compatibility can depend on the property and existing installation. Share the product details with the provider and confirm suitability before you buy or schedule work around it.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'know-your-next-property-step',
    category: 'finance_legal',
    categoryLabel: 'Finance & Legal',
    title: 'Know your next property step',
    summary:
      'Set out where you are in a property decision so a finance or legal professional can understand the context of your first enquiry.',
    image: SERVICES_IMAGES.categories.finance_legal,
    imageAlt: 'Property paperwork being reviewed at a desk',
    icon: Landmark,
    sections: [
      {
        heading: 'Summarise the situation',
        points: [
          'Say whether you are buying, selling, refinancing, transferring or planning ahead.',
          'Share the stage you have reached and any dates you already know.',
          'Describe the question you need help answering in plain language.',
        ],
      },
      {
        heading: 'Ask what happens next',
        paragraphs: [
          'Ask the professional to explain their role, what information they need to assess your request and what the next conversation would cover. This guide helps you prepare; it is not financial or legal advice.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'prepare-questions-property-professional',
    category: 'finance_legal',
    categoryLabel: 'Finance & Legal',
    title: 'Prepare questions, not assumptions',
    summary:
      'A short list of questions helps you establish a professional’s scope and understand what information to prepare.',
    image: SERVICES_IMAGES.categories.inspection_compliance,
    imageAlt: 'Property plans and documents being reviewed',
    icon: FileText,
    sections: [
      {
        heading: 'Make your questions specific',
        points: [
          'Ask whether the professional handles the kind of property matter you describe.',
          'Ask what documents or facts would help them understand your situation.',
          'Confirm how they explain their process, timing and any fees that may apply.',
        ],
      },
      {
        heading: 'Keep the first enquiry focused',
        paragraphs: [
          'Share enough context to establish fit, but avoid sending full identity or financial documents in an initial message. Ask the provider how sensitive information should be shared if it is needed later.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'protect-private-property-information',
    category: 'finance_legal',
    categoryLabel: 'Finance & Legal',
    title: 'Protect private information',
    summary:
      'Use your first message to establish fit and agree an appropriate channel before sharing sensitive financial or identity information.',
    image: SERVICES_IMAGES.ecosystem,
    imageAlt: 'Property and document planning materials',
    icon: ShieldCheck,
    sections: [
      {
        heading: 'Start with a brief summary',
        paragraphs: [
          'Describe the property matter and the type of professional support you are seeking. A short overview is usually a better first step than attaching private documents before you know who will receive them.',
        ],
      },
      {
        heading: 'Agree how documents will be handled',
        points: [
          'Ask which documents are necessary and why they are needed.',
          'Confirm the provider’s preferred secure method for sharing them.',
          'Do not send passwords, one-time codes or account credentials.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'make-a-moving-inventory',
    category: 'moving',
    categoryLabel: 'Moving Services',
    title: 'Make an inventory',
    summary:
      'A room-by-room outline of the move helps a provider understand its size and identify items that may need special handling.',
    image: SERVICES_IMAGES.categories.moving,
    imageAlt: 'Moving boxes prepared for a household relocation',
    icon: ClipboardCheck,
    sections: [
      {
        heading: 'List what needs to move',
        points: [
          'Count rooms and note large furniture or appliances.',
          'Identify fragile, valuable or unusually shaped items.',
          'Mention items that need to be dismantled, packed or left behind.',
        ],
      },
      {
        heading: 'Update the list as plans change',
        paragraphs: [
          'A simple inventory does not need to be exact. Share the best estimate you have and tell the provider if the move changes before the work is confirmed.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'check-moving-property-access',
    category: 'moving',
    categoryLabel: 'Moving Services',
    title: 'Check property access',
    summary:
      'Access at both addresses can affect how a move is planned, so describe parking, stairs, lifts and building procedures early.',
    image: SERVICES_IMAGES.ecosystem,
    imageAlt: 'Residential property access and surrounding area',
    icon: MapPinned,
    sections: [
      {
        heading: 'Check both ends of the move',
        points: [
          'Note stairs, lift dimensions, long carries and loading areas.',
          'Check whether parking, security access or a booking is required.',
          'Mention narrow entrances or large items that may be difficult to move.',
        ],
      },
      {
        heading: 'Ask what the provider needs to know',
        paragraphs: [
          'Share access details for both properties and ask whether a visit, measurements or photos would help them plan the work.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'plan-the-moving-handover',
    category: 'moving',
    categoryLabel: 'Moving Services',
    title: 'Plan the handover',
    summary:
      'Set out the dates, key handovers and storage needs that affect the move from one property to the next.',
    image: SERVICES_IMAGES.categories.home_improvement,
    imageAlt: 'Prepared residential interior ahead of a property handover',
    icon: PackageCheck,
    sections: [
      {
        heading: 'Write down the dates and dependencies',
        points: [
          'Share your preferred move date or date range.',
          'Mention when keys or access will be available at each property.',
          'Explain whether storage or a staged move may be needed.',
        ],
      },
      {
        heading: 'Confirm the plan with everyone involved',
        paragraphs: [
          'Ask the provider to confirm the agreed collection and delivery plan in writing, including any assumptions about access or storage.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'choose-the-right-property-inspection',
    category: 'inspection_compliance',
    categoryLabel: 'Inspection & Compliance',
    title: 'Be specific about the requirement',
    summary:
      'Explain why you need an inspection or compliance service and ask the provider whether their listed scope fits that purpose.',
    image: SERVICES_IMAGES.categories.inspection_compliance,
    imageAlt: 'Property inspection documents and checklist',
    icon: ClipboardCheck,
    sections: [
      {
        heading: 'Describe the purpose',
        points: [
          'Say whether the inspection relates to a purchase, sale, handover or project.',
          'Name the property type and any specific areas you want assessed.',
          'Share any known deadline or process requirement.',
        ],
      },
      {
        heading: 'Confirm the scope directly',
        paragraphs: [
          'Ask what the provider’s inspection includes, how findings are recorded and what limitations apply. A directory listing or general guide does not confirm that a particular report meets your needs.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'share-useful-property-context',
    category: 'inspection_compliance',
    categoryLabel: 'Inspection & Compliance',
    title: 'Share useful property context',
    summary:
      'Property type, project stage and known concerns give an inspection provider a clearer starting point for your enquiry.',
    image: SERVICES_IMAGES.categories.home_improvement,
    imageAlt: 'Residential property relevant to inspection planning',
    icon: Home,
    sections: [
      {
        heading: 'Include the basics',
        points: [
          'Describe the property type, approximate size and location.',
          'Explain whether it is occupied, under construction or being handed over.',
          'List visible concerns without presenting them as a confirmed diagnosis.',
        ],
      },
      {
        heading: 'Prepare access and records',
        paragraphs: [
          'Mention access arrangements and any relevant plans, previous reports or photographs. Ask the provider which records are useful before you send documents.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'confirm-inspection-documentation',
    category: 'inspection_compliance',
    categoryLabel: 'Inspection & Compliance',
    title: 'Confirm documentation needs',
    summary:
      'Ask what records, site access and follow-up steps apply to the inspection or compliance service you are considering.',
    image: SERVICES_IMAGES.categories.inspection_compliance,
    imageAlt: 'Inspection checklist and property records',
    icon: FileCheck2,
    sections: [
      {
        heading: 'Ask before the visit',
        points: [
          'Confirm what information to prepare and who should be present.',
          'Ask what format the findings or documents will take.',
          'Clarify whether any follow-up visit or additional service is separate.',
        ],
      },
      {
        heading: 'Keep the outcome in context',
        paragraphs: [
          'Ask the professional to explain what the report covers and what it does not cover. If another party has requested a particular certificate or format, confirm that requirement with them directly.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'describe-your-property-insurance-context',
    category: 'insurance',
    categoryLabel: 'Insurance',
    title: 'Describe the property context',
    summary:
      'Share the property and ownership context behind your question so an insurance provider can establish whether they can assist.',
    image: SERVICES_IMAGES.categories.insurance,
    imageAlt: 'Home exterior illustrating property insurance questions',
    icon: Home,
    sections: [
      {
        heading: 'Explain what you want to discuss',
        points: [
          'Describe whether the question relates to a home, rental, investment property or contents.',
          'Say whether you are exploring options or asking about an existing arrangement.',
          'Avoid including policy numbers or identity documents in an initial enquiry.',
        ],
      },
      {
        heading: 'Ask the provider to clarify next steps',
        paragraphs: [
          'Ask what information they need to understand your question and how to share it safely. This guide is general preparation, not insurance advice or confirmation of cover.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'ask-clear-property-cover-questions',
    category: 'insurance',
    categoryLabel: 'Insurance',
    title: 'Ask clear cover questions',
    summary:
      'Prepare questions about the situation you want to discuss and ask the provider to explain relevant terms in context.',
    image: SERVICES_IMAGES.categories.insurance,
    imageAlt: 'Property setting for a discussion about insurance cover',
    icon: ShieldCheck,
    sections: [
      {
        heading: 'Write down what you need to understand',
        points: [
          'Describe the property event or change behind your question.',
          'Ask which policy wording or information is relevant to the discussion.',
          'Request an explanation of any terms, limits or exclusions you do not understand.',
        ],
      },
      {
        heading: 'Use the provider’s written information',
        paragraphs: [
          'Do not assume that a general description confirms how a specific situation is covered. Ask the provider to direct you to the applicable written terms and explain what further information is needed.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'keep-insurance-details-private',
    category: 'insurance',
    categoryLabel: 'Insurance',
    title: 'Keep account details private',
    summary:
      'Start with a summary of your question and agree an appropriate channel before sharing policy or identity documents.',
    image: SERVICES_IMAGES.categories.finance_legal,
    imageAlt: 'Documents being reviewed in a private setting',
    icon: ShieldCheck,
    sections: [
      {
        heading: 'Share only what is needed to start',
        paragraphs: [
          'Explain the property situation and the kind of help you are seeking. Keep policy numbers, identity details and account credentials out of the first message.',
        ],
      },
      {
        heading: 'Confirm a suitable document channel',
        points: [
          'Ask which documents are necessary for the next step.',
          'Confirm how the provider securely receives private information.',
          'Never share passwords or one-time security codes.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'define-your-property-media-goal',
    category: 'media_marketing',
    categoryLabel: 'Media & Marketing',
    title: 'Define the property goal',
    summary:
      'The intended use of the content helps a media provider understand what you are trying to present and who it is for.',
    image: SERVICES_IMAGES.categories.media_marketing,
    imageAlt: 'Property prepared for marketing photography',
    icon: Camera,
    sections: [
      {
        heading: 'Describe the intended use',
        points: [
          'Say whether the content is for a sale, rental, development or business portfolio.',
          'Name the types of media you are considering, such as photography, video or a virtual tour.',
          'Share the channels and timing you have in mind.',
        ],
      },
      {
        heading: 'Ask what the provider will deliver',
        paragraphs: [
          'Confirm the expected outputs, editing, delivery format and any usage terms directly with the provider before the work is booked.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'prepare-access-and-presentation',
    category: 'media_marketing',
    categoryLabel: 'Media & Marketing',
    title: 'Prepare access and presentation',
    summary:
      'Plan property access and any preparation before a photography, video, staging or virtual-tour visit.',
    image: SERVICES_IMAGES.categories.home_improvement,
    imageAlt: 'Bright home interior prepared for a property media visit',
    icon: MapPinned,
    sections: [
      {
        heading: 'Make the visit straightforward',
        points: [
          'Confirm who will provide access and how long the visit may take.',
          'Mention occupants, pets, security procedures and rooms that are unavailable.',
          'Ask what cleaning, staging or preparation the provider expects.',
        ],
      },
      {
        heading: 'Coordinate the timing',
        paragraphs: [
          'If the property is being prepared for a launch, handover or campaign, share the key date and any work that must happen first.',
        ],
      },
    ],
  }),
  categoryGuide({
    slug: 'share-the-media-delivery-context',
    category: 'media_marketing',
    categoryLabel: 'Media & Marketing',
    title: 'Share the delivery context',
    summary:
      'Explain where and when you expect to use the final media so the provider can confirm suitable formats and deliverables.',
    image: SERVICES_IMAGES.categories.media_marketing,
    imageAlt: 'Property listing media being planned',
    icon: FileText,
    sections: [
      {
        heading: 'Tell the provider where the content will appear',
        points: [
          'List the website, listing, social channels or print materials you have in mind.',
          'Share image dimensions, file formats or deadlines if you already know them.',
          'Ask about delivery timing and how revisions are handled.',
        ],
      },
      {
        heading: 'Agree the handover',
        paragraphs: [
          'Before work starts, confirm which files you will receive, when they will be delivered and what permissions or usage terms apply.',
        ],
      },
    ],
  }),
];

/**
 * Editorial guide authority for the public Services guide library.
 * Add future category/topic guides here; listing cards, routes and related
 * guide links are derived from this registry rather than separate page copies.
 */
export const SERVICE_GUIDES: ServiceGuide[] = [
  {
    slug: 'common-plumbing-problems',
    category: 'home_improvement',
    categoryLabel: 'Plumbing & Maintenance',
    topicKey: 'plumbing',
    topicLabel: 'Plumbing & Maintenance',
    serviceQuery: 'plumbing',
    title: 'Common Plumbing Problems',
    cardTitle: 'Common Plumbing\nProblems',
    summary:
      'Leaks, slow drains, changes in water pressure and hot-water interruptions are easier to discuss when you can describe what changed and where it is happening.',
    image: '/images/services/plumbing-guide-common-problems.jpg',
    imageAlt: 'Kitchen tap running into a stainless-steel sink',
    icon: Wrench,
    sections: [
      {
        heading: 'Start with the symptoms',
        paragraphs: [
          'A symptom can help a plumber investigate, but it does not confirm the cause. Note whether you can see a drip or damp patch, whether a drain is slow, or whether hot water or pressure has changed.',
          'Write down which room and fixture are affected, when you first noticed the change, and whether it is constant or intermittent. A clear photo can help explain what you can see.',
        ],
      },
      {
        heading: 'Check for signs of an unseen leak',
        paragraphs: [
          'If it is safe and practical, turn off taps and water-using appliances, then observe your water meter. A meter that continues to register use may indicate a leak on the property; it is a reason to investigate, not a diagnosis.',
          'The City of Johannesburg advises customers to report leaks on municipal infrastructure and use a qualified plumber to investigate internal leaks. Responsibilities and reporting channels depend on your municipality.',
        ],
      },
      {
        heading: 'Prepare a useful first enquiry',
        points: [
          'Describe the affected fixture and the symptoms you have observed.',
          'Share when the issue started and whether it has changed over time.',
          'Mention previous repairs, access limits and any visible water damage.',
          'Ask the plumber what they need to assess the work and what the next step will be.',
        ],
      },
    ],
    sources: [
      {
        label: 'City of Johannesburg: monitor water use and check for leaks',
        url: 'https://joburg.org.za/media_/Newsroom/Pages/2026-News-Articles/City-urges-customers-to-monitor-water-use-to-avoid-high-bills.aspx',
      },
      {
        label: 'City of Cape Town: use an accredited plumber for household leaks and water installations',
        url: 'https://www.capetown.gov.za/media-and-news/always-use-an-accredited-plumber-for-household-leaks-and-water-installations/',
      },
    ],
  },
  {
    slug: 'geyser-maintenance-tips',
    category: 'home_improvement',
    categoryLabel: 'Plumbing & Maintenance',
    topicKey: 'plumbing',
    topicLabel: 'Plumbing & Maintenance',
    serviceQuery: 'plumbing',
    title: 'Geyser Maintenance Tips',
    cardTitle: 'Geyser Maintenance\nTips',
    summary:
      'Keep geyser checks observational. Record changes in hot-water supply or visible signs around the unit, and leave pressurised, electrical and installation work to a qualified professional.',
    image: '/images/services/plumbing-guide-geyser-maintenance.jpg',
    imageAlt: 'Domestic hot-water geyser installed in a home',
    icon: Droplets,
    sections: [
      {
        heading: 'Notice and record changes',
        paragraphs: [
          'From a safe position, note changes in hot-water supply, visible leaks or dampness around the geyser, and any unusual sounds. Record when the change began and whether it affects one tap or the whole home.',
          'Do not remove covers, adjust pressure or safety components, drain the cylinder, or work on electrical connections. A geyser is pressurised equipment; have a qualified plumber assess concerns you cannot safely resolve.',
        ],
      },
      {
        heading: 'Ask the right questions before work begins',
        points: [
          'Ask the plumber to explain the proposed work and what is included in the written quote.',
          'Confirm who will supply replacement parts and how the work will affect hot-water availability.',
          'Ask what paperwork or compliance records apply to the work in your municipality.',
          'Keep the quote, invoice and any compliance documents with your property records.',
        ],
      },
      {
        heading: 'After an installation or alteration',
        paragraphs: [
          'PIRB explains that geyser work has specific pressure-equipment and plumbing requirements and refers homeowners to a Certificate of Compliance for relevant work. Local inspection and notification processes can also apply; for example, the City of Cape Town describes a process for new, replaced or altered hot-water cylinders.',
          'Ask the professional to confirm which requirements apply to your address and the work being done. Do not rely on this guide as a substitute for an inspection or compliance advice.',
        ],
      },
    ],
    sources: [
      {
        label: 'PIRB: homeowners and pressure-equipment requirements for geysers',
        url: 'https://legacytwo.pirb.co.za/homeowners-and-their-responsibility-to-pressure-equipment-regulations/',
      },
      {
        label: 'City of Cape Town: certificate of approval for water installations',
        url: 'https://www.capetown.gov.za/city-connect/apply/municipal-services/water-and-sanitation/submit-a-certificate-of-approval-for-water-installations/',
      },
    ],
  },
  {
    slug: 'clearing-blocked-drains',
    category: 'home_improvement',
    categoryLabel: 'Plumbing & Maintenance',
    topicKey: 'plumbing',
    topicLabel: 'Plumbing & Maintenance',
    serviceQuery: 'plumbing',
    title: 'Clearing Blocked Drains',
    cardTitle: 'Clearing Blocked\nDrains',
    summary:
      'Describe which drains are affected and whether water is slow or backing up. Keep waste and cooking grease out of drains, and get help when a blockage is beyond a simple fixture issue.',
    image: '/images/services/plumbing-guide-blocked-drains.jpg',
    imageAlt: 'Floor drain set into tiled bathroom flooring',
    icon: FileCheck2,
    sections: [
      {
        heading: 'Work out what is affected',
        paragraphs: [
          'Note whether one sink, bath or shower is slow, or whether several fixtures are affected. Record whether water is backing up, when the problem started and whether it is getting worse. This information helps a plumber or municipality understand where to direct the report.',
          'Avoid contact with sewage or overflowing wastewater. If a public manhole or street sewer is involved, report it to your municipality rather than opening or entering the system.',
        ],
      },
      {
        heading: 'Keep common blockage materials out',
        points: [
          'Put wipes, nappies, sanitary products, rags and other rubbish in a bin, not the toilet.',
          'Wipe cooking fats and oils into a container or paper towel for disposal; do not pour them down the sink or toilet.',
          'Keep food scraps, sand and building rubble out of sinks, drains and manholes.',
          'Use a sink strainer to catch food and other solid waste.',
        ],
      },
      {
        heading: 'Know when to call for help',
        paragraphs: [
          'For a blockage on private property, the City of Cape Town advises calling a qualified, registered plumber. A blockage in the street or public sewer should be reported to the local authority.',
          'When you contact a professional, tell them which fixtures are affected and whether you have already used a product or tool. Do not mix drain-cleaning chemicals or continue using fixtures when wastewater is backing up.',
        ],
      },
    ],
    sources: [
      {
        label: 'City of Cape Town: prevent blocked sewers and report blockages',
        url: 'https://www.capetown.gov.za/family-and-home/residential-utility-services/residential-water-and-sanitation-services/prevent-blocked-sewers/',
      },
    ],
  },
  {
    slug: 'bathroom-renovation-checklist',
    category: 'home_improvement',
    categoryLabel: 'Plumbing & Maintenance',
    topicKey: 'plumbing',
    topicLabel: 'Plumbing & Maintenance',
    serviceQuery: 'plumbing',
    title: 'Bathroom Renovation Checklist',
    cardTitle: 'Bathroom Renovation\nChecklist',
    summary:
      'Plan the fixtures, layout, finishes and plumbing changes before work starts. A clear scope makes it easier to compare proposals and check local approval requirements.',
    image: '/images/services/plumbing-guide-bathroom-renovation.jpg',
    imageAlt: 'Bright bathroom with a freestanding bath and walk-in shower',
    icon: Hammer,
    sections: [
      {
        heading: 'Write down the scope',
        points: [
          'List the bath, shower, basin, toilet and storage changes you want.',
          'Mark which fixtures will stay in place and which may move.',
          'Choose the finishes and fittings you want to discuss, without assuming every product suits the existing plumbing.',
          'Note site access, household arrangements, budget range and target timing.',
        ],
      },
      {
        heading: 'Check plumbing and approval requirements',
        paragraphs: [
          'Ask a qualified plumber to assess the existing water and drainage arrangements before you finalise the layout. Moving a fixture can involve plumbing or drainage changes that are different from replacing a fitting in its existing position.',
          'Approval rules depend on the municipality and the work. The City of Cape Town distinguishes fitting changes without new or extended plumbing or drainage from work that may need plans or further enquiry. Confirm the rules with your own municipality before construction begins.',
        ],
      },
      {
        heading: 'Confirm the handover in writing',
        points: [
          'Ask for a written scope, itemised quote, work sequence and expected completion window.',
          'Confirm who supplies fixtures, removes old materials and protects nearby rooms.',
          'Ask how waterproofing and any hidden plumbing changes will be documented.',
          'Agree how changes to the scope or unexpected conditions will be approved and priced.',
        ],
      },
    ],
    sources: [
      {
        label: 'City of Cape Town: guide to minor works',
        url: 'https://www.capetown.gov.za/work-and-business/commercial-properties/build-or-renovate-your-property/guide-to-minor-works/',
      },
      {
        label: 'City of Cape Town: submit a building plan',
        url: 'https://www.capetown.gov.za/city-connect/apply/planning-building-and-development/building-plan-applications/submit-a-building-plan/',
      },
    ],
  },
  ...ADDITIONAL_CATEGORY_GUIDES,
];

export function getServiceGuideBySlug(slug: string | null | undefined): ServiceGuide | undefined {
  if (!slug) return undefined;
  return SERVICE_GUIDES.find(guide => guide.slug === slug);
}

export function getServiceGuidesForTopic(topicKey: string): ServiceGuide[] {
  return SERVICE_GUIDES.filter(guide => guide.topicKey === topicKey);
}

export function getServiceGuidePath(slug: string): string {
  return '/services/guides/' + encodeURIComponent(slug);
}

export function getServiceGuideCategoryPath(guide: ServiceGuide): string {
  const path = '/services/' + toServiceCategorySlug(guide.category);
  if (!guide.serviceQuery) return path;
  return path + '?query=' + encodeURIComponent(guide.serviceQuery);
}
