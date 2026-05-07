import { useEffect } from 'react';
import { Link } from 'wouter';
import { HomeLayout } from '@/layouts/HomeLayout';
import { Button } from '@/components/ui/button';
import { applySeo } from '@/lib/seo';

type LandingPageConfig = {
  title: string;
  eyebrow: string;
  description: string;
  canonicalPath: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  sections: Array<{ title: string; body: string; href?: string; linkLabel?: string }>;
};

const landingPages: Record<string, LandingPageConfig> = {
  '/insights/market-trends': {
    eyebrow: 'Insights',
    title: 'South African Property Market Trends',
    description:
      'Track buyer demand, area movement, pricing signals, and property search behaviour across the Property Listify marketplace.',
    canonicalPath: '/insights/market-trends',
    primaryCta: { label: 'Explore market activity', href: '/explore/home' },
    secondaryCta: { label: 'Browse properties for sale', href: '/property-for-sale' },
    sections: [
      {
        title: 'Area demand signals',
        body: 'Use this page as the market overview hub for city, suburb, and province demand trends.',
      },
      {
        title: 'Pricing movement',
        body: 'This will grow into a richer editorial and data layer for buyer, seller, and investor decisions.',
      },
      {
        title: 'Local market pages',
        body: 'Location pages remain the canonical property SEO layer. Insights pages explain the market around those searches.',
        href: '/property-for-sale/gauteng/johannesburg',
        linkLabel: 'View a location page',
      },
    ],
  },
  '/insights/property-insights': {
    eyebrow: 'Insights',
    title: 'Property Insights',
    description:
      'Research property types, location demand, affordability signals, and listing performance before making a move.',
    canonicalPath: '/insights/property-insights',
    primaryCta: { label: 'Search properties', href: '/property-for-sale' },
    secondaryCta: { label: 'Compare properties', href: '/compare' },
    sections: [
      {
        title: 'Buyer intelligence',
        body: 'A neutral research page for comparing locations, stock levels, and property options.',
      },
      {
        title: 'Seller intelligence',
        body: 'A future home for demand snapshots, pricing readiness, and listing preparation guidance.',
      },
      {
        title: 'Developer intelligence',
        body: 'A bridge into new development discovery without mixing this page into the listings engine.',
      },
    ],
  },
  '/insights/blog': {
    eyebrow: 'Insights',
    title: 'Property Listify Blog',
    description:
      'Editorial updates, property education, platform news, and local market explainers from Property Listify.',
    canonicalPath: '/insights/blog',
    primaryCta: { label: 'Explore stories', href: '/explore/home' },
    sections: [
      {
        title: 'Market explainers',
        body: 'Short-form and long-form content can live here as the Explore content engine matures.',
      },
      {
        title: 'Platform updates',
        body: 'Use this page to collect product announcements and property ecosystem education.',
      },
      {
        title: 'Local guides',
        body: 'Editorial pages can support location pages without replacing their canonical SEO role.',
      },
    ],
  },
  '/guides/buying-property': {
    eyebrow: 'Guides',
    title: 'Buying Property in South Africa',
    description:
      'A practical buyer guide for search, affordability, viewing, offers, conveyancing, and moving into a new home.',
    canonicalPath: '/guides/buying-property',
    primaryCta: { label: 'Start buying search', href: '/property-for-sale' },
    secondaryCta: { label: 'View new developments', href: '/new-developments' },
    sections: [
      {
        title: 'Plan your budget',
        body: 'Prepare affordability, deposit, bond, transfer, and monthly ownership costs.',
      },
      {
        title: 'Choose the right area',
        body: 'Compare transport, schools, amenities, safety signals, and future growth.',
      },
      {
        title: 'Move from shortlist to offer',
        body: 'Track saved listings, compare homes, and speak to verified agents.',
      },
    ],
  },
  '/guides/selling-property': {
    eyebrow: 'Guides',
    title: 'Selling Property in South Africa',
    description:
      'A seller guide for valuations, listing preparation, agent selection, buyer demand, offers, and transfer milestones.',
    canonicalPath: '/guides/selling-property',
    primaryCta: { label: 'Find an agent', href: '/agents' },
    secondaryCta: { label: 'Advertise property services', href: '/advertise/sell' },
    sections: [
      {
        title: 'Price with evidence',
        body: 'Use area demand, comparable stock, and seller goals to set a credible asking price.',
      },
      {
        title: 'Prepare the listing',
        body: 'Photography, documents, repairs, and staging all affect buyer confidence.',
      },
      {
        title: 'Manage the process',
        body: 'Keep enquiries, viewings, offers, and transfer steps visible from one workflow.',
      },
    ],
  },
  '/guides/renting-property': {
    eyebrow: 'Guides',
    title: 'Renting Property in South Africa',
    description:
      'A renter guide for area search, affordability, applications, lease checks, deposits, and moving preparation.',
    canonicalPath: '/guides/renting-property',
    primaryCta: { label: 'Search rentals', href: '/property-to-rent' },
    sections: [
      {
        title: 'Search by location',
        body: 'Start with city and suburb rental pages before refining by price or property type.',
      },
      {
        title: 'Prepare documents',
        body: 'Keep ID, income proof, references, and deposit readiness close before applying.',
      },
      {
        title: 'Check the lease',
        body: 'Review responsibilities, utilities, inspections, escalation, and cancellation terms.',
      },
    ],
  },
  '/tools/property-valuation': {
    eyebrow: 'Tools',
    title: 'Property Valuation',
    description:
      'A seller-focused valuation hub for preparing a pricing request, comparing nearby listings, and understanding demand signals.',
    canonicalPath: '/tools/property-valuation',
    primaryCta: { label: 'Find valuation support', href: '/services/property-valuation' },
    secondaryCta: { label: 'Find estate agents', href: '/agents' },
    sections: [
      {
        title: 'Valuation readiness',
        body: 'Collect property type, size, condition, improvements, and location details.',
      },
      {
        title: 'Local comparison',
        body: 'Compare active stock and recent demand signals in the same city or suburb.',
      },
      {
        title: 'Professional support',
        body: 'Use Services for valuation providers and the property engine for comparable listings.',
      },
    ],
  },
  '/tools/sold-house-prices': {
    eyebrow: 'Tools',
    title: 'Sold House Prices',
    description:
      'A thin research hub for sold-price education, comparable sales context, and future pricing data workflows.',
    canonicalPath: '/tools/sold-house-prices',
    primaryCta: { label: 'View market trends', href: '/insights/market-trends' },
    secondaryCta: { label: 'Search nearby listings', href: '/property-for-sale' },
    sections: [
      {
        title: 'Comparable context',
        body: 'Sold prices are most useful when matched to area, property type, condition, and timing.',
      },
      {
        title: 'Pricing confidence',
        body: 'This page can become the gateway to richer seller pricing data as the platform matures.',
      },
      {
        title: 'Agent support',
        body: 'A professional valuation remains the next best step where live sold data is incomplete.',
      },
    ],
  },
  '/tools/affordability-calculator': {
    eyebrow: 'Tools',
    title: 'Affordability Calculator',
    description:
      'Estimate buying power, monthly affordability, and deposit readiness before entering the property search flow.',
    canonicalPath: '/tools/affordability-calculator',
    primaryCta: { label: 'Search within budget', href: '/property-for-sale' },
    secondaryCta: { label: 'Find finance support', href: '/services/home-loans' },
    sections: [
      {
        title: 'Income and expenses',
        body: 'Affordability depends on verified income, debt obligations, deposit, and interest-rate sensitivity.',
      },
      {
        title: 'Search discipline',
        body: 'Use the estimate to keep property shortlists realistic before contacting agents or developers.',
      },
      {
        title: 'Finance support',
        body: 'Home loan and bond-originator services should stay inside the Services engine.',
      },
    ],
  },
  '/tools/bond-calculator': {
    eyebrow: 'Tools',
    title: 'Bond Calculator',
    description:
      'Estimate a monthly bond repayment and understand how loan amount, term, deposit, and interest rate shape affordability.',
    canonicalPath: '/tools/bond-calculator',
    primaryCta: { label: 'Find home loan help', href: '/services/home-loans' },
    secondaryCta: { label: 'Browse property for sale', href: '/property-for-sale' },
    sections: [
      {
        title: 'Monthly repayment planning',
        body: 'Bond estimates help buyers compare realistic price bands before shortlisting homes.',
      },
      {
        title: 'Interest-rate sensitivity',
        body: 'A small rate movement can meaningfully change monthly affordability.',
      },
      {
        title: 'Finance workflow',
        body: 'The next step belongs in the Services engine with finance and legal providers.',
      },
    ],
  },
  '/tools/property-reports': {
    eyebrow: 'Tools',
    title: 'Property Reports',
    description:
      'A research hub for future property reports covering location context, pricing signals, listing history, and buyer demand.',
    canonicalPath: '/tools/property-reports',
    primaryCta: { label: 'View property insights', href: '/insights/property-insights' },
    secondaryCta: { label: 'Search locations', href: '/property-for-sale' },
    sections: [
      {
        title: 'Location summary',
        body: 'Reports should explain the local market around a property, not duplicate listing pages.',
      },
      {
        title: 'Property context',
        body: 'Future reports can connect condition, features, pricing, and demand into a clear view.',
      },
      {
        title: 'Next best action',
        body: 'Buyers go to listings, service needs go to Services, and content discovery goes to Explore.',
      },
    ],
  },
  '/tools/area-guides': {
    eyebrow: 'Tools',
    title: 'Area Guides',
    description:
      'A navigation hub for researching cities, suburbs, local demand, amenities, and property opportunities across South Africa.',
    canonicalPath: '/tools/area-guides',
    primaryCta: { label: 'Explore Johannesburg', href: '/property-for-sale/gauteng/johannesburg' },
    secondaryCta: { label: 'Browse all property', href: '/property-for-sale' },
    sections: [
      {
        title: 'City pages',
        body: 'City pages remain the canonical location SEO pages for broad local demand.',
      },
      {
        title: 'Suburb pages',
        body: 'Suburb pages should capture deeper local search intent and nearby-area discovery.',
      },
      {
        title: 'Editorial support',
        body: 'Area guide content can explain lifestyle and market context around those canonical pages.',
      },
    ],
  },
  '/tools/sold-properties': {
    eyebrow: 'Tools',
    title: 'Sold Properties',
    description:
      'A seller and buyer research page for understanding how sold stock can inform pricing, timing, and negotiation.',
    canonicalPath: '/tools/sold-properties',
    primaryCta: { label: 'View sold price guide', href: '/tools/sold-house-prices' },
    secondaryCta: { label: 'Find valuation support', href: '/services/property-valuation' },
    sections: [
      {
        title: 'Historic context',
        body: 'Sold-property research should support pricing decisions without becoming a live listing page.',
      },
      {
        title: 'Area comparison',
        body: 'The strongest comparisons stay close to the same area, property type, and transaction period.',
      },
      {
        title: 'Professional advice',
        body: 'Use service providers or agents when the data needs interpretation.',
      },
    ],
  },
  '/legal/consumer-rights': {
    eyebrow: 'Legal',
    title: 'Consumer Rights',
    description:
      'A plain-language starting point for property consumer rights, responsible platform conduct, and where to get help.',
    canonicalPath: '/legal/consumer-rights',
    primaryCta: { label: 'Find legal services', href: '/services/legal-services' },
    sections: [
      {
        title: 'Buying and renting confidence',
        body: 'Consumers should understand documents, disclosures, deposits, offers, and lease obligations.',
      },
      {
        title: 'Professional advice',
        body: 'This page is informational and should route legal needs into the Services engine.',
      },
      {
        title: 'Platform trust',
        body: 'Clear rights content improves confidence across the property, services, and referral engines.',
      },
    ],
  },
  '/legal/dispute-resolution': {
    eyebrow: 'Legal',
    title: 'Dispute Resolution',
    description:
      'Guidance on resolving property-related disputes, gathering documentation, and finding appropriate professional support.',
    canonicalPath: '/legal/dispute-resolution',
    primaryCta: { label: 'Find legal services', href: '/services/legal-services' },
    sections: [
      {
        title: 'Document everything',
        body: 'Keep agreements, messages, proof of payment, photos, inspection notes, and timelines.',
      },
      {
        title: 'Use the right channel',
        body: 'Different disputes may belong with an agent, landlord, body corporate, service provider, or legal advisor.',
      },
      {
        title: 'Escalate carefully',
        body: 'Professional support should remain in the Services engine where legal providers can be matched.',
      },
    ],
  },
  '/legal/terms': {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description:
      'The starting point for Property Listify platform terms across property search, services, referrals, and partner workflows.',
    canonicalPath: '/legal/terms',
    primaryCta: { label: 'Contact support', href: '/company/contact' },
    sections: [
      {
        title: 'Platform use',
        body: 'Terms should define responsible use across public marketplace and authenticated workflows.',
      },
      {
        title: 'Marketplace roles',
        body: 'Buyers, renters, sellers, agents, developers, providers, and partners each need clear obligations.',
      },
      {
        title: 'Next revision',
        body: 'This thin page gives the route a canonical home until full legal copy is finalized.',
      },
    ],
  },
  '/legal/privacy': {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description:
      'A privacy hub for how Property Listify handles marketplace, account, lead, service, and referral data.',
    canonicalPath: '/legal/privacy',
    primaryCta: { label: 'Contact support', href: '/company/contact' },
    sections: [
      {
        title: 'Data collection',
        body: 'Property search, lead routing, saved searches, services, and referrals all require clear data handling.',
      },
      {
        title: 'User control',
        body: 'Privacy content should explain account, communication, and data-request options.',
      },
      {
        title: 'Trust layer',
        body: 'Privacy pages support confidence across every marketplace engine.',
      },
    ],
  },
  '/legal/cookies': {
    eyebrow: 'Legal',
    title: 'Cookie Policy',
    description:
      'Information about cookie and tracking use for analytics, marketplace performance, account sessions, and user experience.',
    canonicalPath: '/legal/cookies',
    primaryCta: { label: 'Contact support', href: '/company/contact' },
    sections: [
      {
        title: 'Session cookies',
        body: 'Authentication and dashboard workflows need reliable session behaviour.',
      },
      {
        title: 'Analytics cookies',
        body: 'Market and product analytics help improve search, services, and content discovery.',
      },
      {
        title: 'Consent direction',
        body: 'This page can expand into a full cookie-management explanation.',
      },
    ],
  },
  '/legal/compliance': {
    eyebrow: 'Legal',
    title: 'Compliance',
    description:
      'A compliance overview for marketplace trust, listing quality, partner behaviour, and service provider accountability.',
    canonicalPath: '/legal/compliance',
    primaryCta: { label: 'View consumer rights', href: '/legal/consumer-rights' },
    sections: [
      {
        title: 'Listing integrity',
        body: 'Property pages need accurate location, pricing, availability, and representative information.',
      },
      {
        title: 'Provider accountability',
        body: 'Service providers and referral partners need clear quality and conduct expectations.',
      },
      {
        title: 'Operational governance',
        body: 'Compliance content should support review, approval, audit, and dispute workflows.',
      },
    ],
  },
  '/support/help': {
    eyebrow: 'Support',
    title: 'Help Center',
    description:
      'A support starting point for buyers, renters, sellers, agents, developers, service providers, and referral partners.',
    canonicalPath: '/support/help',
    primaryCta: { label: 'Contact support', href: '/company/contact' },
    sections: [
      {
        title: 'Property search help',
        body: 'Guidance for location pages, saved searches, enquiries, comparisons, and listing detail pages.',
      },
      {
        title: 'Services help',
        body: 'Guidance for provider matching, requests, profiles, reviews, and service coverage areas.',
      },
      {
        title: 'Partner help',
        body: 'Guidance for referrals, distribution campaigns, documents, and commission visibility.',
      },
    ],
  },
  '/support/safety': {
    eyebrow: 'Support',
    title: 'Property Safety Tips',
    description:
      'Practical safety guidance for viewings, applications, service provider interactions, and property transactions.',
    canonicalPath: '/support/safety',
    primaryCta: { label: 'Read consumer rights', href: '/legal/consumer-rights' },
    sections: [
      {
        title: 'Viewing safety',
        body: 'Confirm agent/provider identity, meeting details, and property context before appointments.',
      },
      {
        title: 'Payment safety',
        body: 'Avoid rushed deposits, verify bank details, and keep written records of all commitments.',
      },
      {
        title: 'Service safety',
        body: 'Use matched providers, clear scopes, and documented quotes before work begins.',
      },
    ],
  },
  '/support/faq': {
    eyebrow: 'Support',
    title: 'Frequently Asked Questions',
    description:
      'Answers for common Property Listify questions across property search, services, advertising, referrals, and accounts.',
    canonicalPath: '/support/faq',
    primaryCta: { label: 'Contact support', href: '/company/contact' },
    sections: [
      {
        title: 'Property search',
        body: 'Questions about sale, rent, developments, location pages, agents, and enquiries.',
      },
      {
        title: 'Services marketplace',
        body: 'Questions about requesting quotes, providers, reviews, and local coverage.',
      },
      {
        title: 'Partner network',
        body: 'Questions about referrals, eligibility, campaigns, documents, and commission tracking.',
      },
    ],
  },
  '/company/about': {
    eyebrow: 'Company',
    title: 'About Property Listify',
    description:
      'Property Listify connects property search, services, discovery, and referral workflows into a South African property ecosystem.',
    canonicalPath: '/company/about',
    primaryCta: { label: 'Explore properties', href: '/property-for-sale' },
    secondaryCta: { label: 'Explore services', href: '/services' },
    sections: [
      {
        title: 'Property marketplace',
        body: 'Search and location pages help buyers and renters find property with stronger local context.',
      },
      {
        title: 'Services marketplace',
        body: 'Service pages connect property-stage needs to trusted local providers.',
      },
      {
        title: 'Distribution network',
        body: 'Referral workflows help partners participate in property demand and development campaigns.',
      },
    ],
  },
  '/company/contact': {
    eyebrow: 'Company',
    title: 'Contact Property Listify',
    description:
      'Reach the Property Listify team for platform, listing, service provider, advertising, or referral network enquiries.',
    canonicalPath: '/company/contact',
    primaryCta: { label: 'Advertise with us', href: '/advertise' },
    secondaryCta: { label: 'Join referral network', href: '/distribution-network' },
    sections: [
      {
        title: 'Property marketplace',
        body: 'For buyer, renter, seller, agent, developer, and agency questions.',
      },
      {
        title: 'Services marketplace',
        body: 'For provider onboarding, service matching, and local coverage enquiries.',
      },
      {
        title: 'Referral network',
        body: 'For distribution partners, referral managers, and campaign opportunities.',
      },
    ],
  },
  '/company/careers': {
    eyebrow: 'Company',
    title: 'Careers at Property Listify',
    description:
      'A lightweight careers page for future roles across product, property operations, distribution, services, and growth.',
    canonicalPath: '/company/careers',
    primaryCta: { label: 'Explore the platform', href: '/' },
    sections: [
      {
        title: 'Product and engineering',
        body: 'Build marketplace systems across property, services, discovery, and referral workflows.',
      },
      {
        title: 'Property operations',
        body: 'Help listings, locations, partners, and service providers become more useful and trustworthy.',
      },
      {
        title: 'Growth and partnerships',
        body: 'Support agents, developers, agencies, providers, and distribution partners.',
      },
    ],
  },
  '/company/press': {
    eyebrow: 'Company',
    title: 'Press and Media',
    description:
      'Press, media, and company information for Property Listify and its South African property marketplace ecosystem.',
    canonicalPath: '/company/press',
    primaryCta: { label: 'Read platform insights', href: '/insights/blog' },
    sections: [
      {
        title: 'Company story',
        body: 'Property Listify connects property search, services, discovery, and referrals into one marketplace.',
      },
      {
        title: 'Market commentary',
        body: 'Insights content can support future press releases and market data stories.',
      },
      {
        title: 'Brand resources',
        body: 'This page can grow into a media kit as the public brand matures.',
      },
    ],
  },
  '/company/partners': {
    eyebrow: 'Company',
    title: 'Partner with Property Listify',
    description:
      'Explore partnership paths for agencies, developers, service providers, finance partners, and referral partners.',
    canonicalPath: '/company/partners',
    primaryCta: { label: 'Join referral network', href: '/distribution-network' },
    secondaryCta: { label: 'Advertise with us', href: '/advertise' },
    sections: [
      {
        title: 'Property partners',
        body: 'Agents, agencies, and developers should connect through the property and advertising engines.',
      },
      {
        title: 'Service partners',
        body: 'Service providers should onboard through the Services engine.',
      },
      {
        title: 'Distribution partners',
        body: 'Referral partners should use the distribution network and partner workflows.',
      },
    ],
  },
  '/agencies': {
    eyebrow: 'Property Professionals',
    title: 'Find Estate Agencies',
    description:
      'A property-engine landing page for discovering estate agencies, local coverage, team strength, and listing expertise.',
    canonicalPath: '/agencies',
    primaryCta: { label: 'Find estate agents', href: '/agents' },
    secondaryCta: { label: 'Advertise agency services', href: '/advertise/sell/agencies' },
    sections: [
      {
        title: 'Agency discovery',
        body: 'This page gives agencies their own professional discovery surface instead of hiding them under agents.',
      },
      {
        title: 'Local coverage',
        body: 'Future agency profiles can connect teams, suburbs, listings, developments, and reviews.',
      },
      {
        title: 'Seller confidence',
        body: 'Sellers need a clear path to evaluate both individual agents and agency brands.',
      },
    ],
  },
};

function getPageConfig(): LandingPageConfig {
  if (typeof window === 'undefined') {
    return landingPages['/insights/market-trends'];
  }

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const canonicalRedirects: Record<string, string> = {
    '/about': '/company/about',
    '/contact': '/company/contact',
    '/careers': '/company/careers',
    '/press': '/company/press',
    '/partners': '/company/partners',
    '/help': '/support/help',
    '/safety': '/support/safety',
    '/faq': '/support/faq',
    '/terms': '/legal/terms',
    '/privacy': '/legal/privacy',
    '/cookies': '/legal/cookies',
    '/compliance': '/legal/compliance',
  };

  return (
    landingPages[path] ||
    landingPages[canonicalRedirects[path]] ||
    landingPages['/insights/market-trends']
  );
}

export default function NavLandingPage() {
  const page = getPageConfig();

  useEffect(() => {
    applySeo({
      title: `${page.title} | Property Listify`,
      description: page.description,
      canonicalPath: page.canonicalPath,
    });
  }, [page]);

  return (
    <HomeLayout>
      <main className="bg-white pt-24">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="container py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
              {page.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={page.primaryCta.href}>
                <Button className="w-full sm:w-auto">{page.primaryCta.label}</Button>
              </Link>
              {page.secondaryCta ? (
                <Link href={page.secondaryCta.href}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {page.secondaryCta.label}
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="container py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {page.sections.map(section => (
              <article
                key={section.title}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.body}</p>
                {section.href && section.linkLabel ? (
                  <Link href={section.href}>
                    <span className="mt-4 inline-flex text-sm font-semibold text-blue-700">
                      {section.linkLabel}
                    </span>
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </HomeLayout>
  );
}
