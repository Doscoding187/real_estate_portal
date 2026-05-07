import { useEffect } from 'react';
import { Link } from 'wouter';
import { HomeLayout } from '@/layouts/HomeLayout';
import { Button } from '@/components/ui/button';
import { applySeo } from '@/lib/seo';

type ServiceTopicConfig = {
  slug: string;
  title: string;
  description: string;
  categoryHref: string;
  requestHref: string;
  sections: Array<{ title: string; body: string }>;
};

export const SERVICE_TOPIC_PAGES: Record<string, ServiceTopicConfig> = {
  'home-loans': {
    slug: 'home-loans',
    title: 'Home Loan Services',
    description:
      'Find finance and bond support for buying property, comparing loan options, and preparing a stronger application.',
    categoryHref: '/services/finance-legal',
    requestHref: '/services/request/finance_legal',
    sections: [
      {
        title: 'Bond application support',
        body: 'Connect buyers with finance professionals who understand deposits, affordability, documents, and bank requirements.',
      },
      {
        title: 'Pre-approval readiness',
        body: 'Help buyers understand what they can afford before they move deeper into the property listing engine.',
      },
      {
        title: 'Finance and legal cluster',
        body: 'This topic belongs inside Services because it is a provider-matching workflow, not a property listing page.',
      },
    ],
  },
  'property-valuation': {
    slug: 'property-valuation',
    title: 'Property Valuation Services',
    description:
      'Find valuation support for sellers, landlords, investors, and homeowners preparing to price a property.',
    categoryHref: '/services/finance-legal',
    requestHref: '/services/request/finance_legal',
    sections: [
      {
        title: 'Seller pricing support',
        body: 'Valuation services help sellers turn area demand and comparable stock into a credible asking price.',
      },
      {
        title: 'Professional context',
        body: 'This page should support valuation requests while the property engine handles live listings and location pages.',
      },
      {
        title: 'Future report layer',
        body: 'The page can later connect to property reports, sold-price context, and agent valuation workflows.',
      },
    ],
  },
  'legal-services': {
    slug: 'legal-services',
    title: 'Property Legal Services',
    description:
      'Find conveyancers, legal advisors, compliance specialists, and document support for property transactions.',
    categoryHref: '/services/finance-legal',
    requestHref: '/services/request/finance_legal',
    sections: [
      {
        title: 'Conveyancing and transfer',
        body: 'Legal providers support buyers and sellers through offers, transfer documents, and registration milestones.',
      },
      {
        title: 'Lease and contract review',
        body: 'Renters, landlords, and sellers need clear terms before signing documents or accepting offers.',
      },
      {
        title: 'Compliance support',
        body: 'Legal and compliance needs belong in Services so users can move from education to provider matching.',
      },
    ],
  },
  'home-insurance': {
    slug: 'home-insurance',
    title: 'Home Insurance Services',
    description:
      'Find insurance providers for buildings cover, household contents, investment properties, and ownership changes.',
    categoryHref: '/services/insurance',
    requestHref: '/services/request/insurance',
    sections: [
      {
        title: 'Cover for buyers',
        body: 'New buyers need insurance guidance before transfer, occupation, or bond registration deadlines.',
      },
      {
        title: 'Cover for owners',
        body: 'Owners and landlords need clear insurance options for buildings, contents, and rental risk.',
      },
      {
        title: 'Provider matching',
        body: 'Insurance is a service workflow, so this page anchors the topic inside the Services engine.',
      },
    ],
  },
  'interior-design': {
    slug: 'interior-design',
    title: 'Interior Design Services',
    description:
      'Find interior design, decorating, staging, and styling support for homes, rentals, and properties preparing for sale.',
    categoryHref: '/services/home-improvement',
    requestHref: '/services/request/home_improvement',
    sections: [
      {
        title: 'Move-in improvements',
        body: 'Buyers and renters can use design support to plan layouts, finishes, storage, and room function.',
      },
      {
        title: 'Sale preparation',
        body: 'Sellers can use staging and styling to improve buyer confidence and listing presentation.',
      },
      {
        title: 'Home improvement cluster',
        body: 'Design belongs in Services because the user intent is hiring a provider after property discovery.',
      },
    ],
  },
};

export function getServiceTopicPage(slug: string) {
  return SERVICE_TOPIC_PAGES[slug];
}

export function ServiceTopicPage({ topic }: { topic: ServiceTopicConfig }) {
  useEffect(() => {
    applySeo({
      title: `${topic.title} | Services | Property Listify`,
      description: topic.description,
      canonicalPath: `/services/${topic.slug}`,
    });
  }, [topic]);

  return (
    <HomeLayout>
      <main className="bg-white pt-24">
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="container py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Services
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              {topic.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
              {topic.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={topic.requestHref}>
                <Button className="w-full sm:w-auto">Request matches</Button>
              </Link>
              <Link href={topic.categoryHref}>
                <Button variant="outline" className="w-full sm:w-auto">
                  Browse related providers
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {topic.sections.map(section => (
              <article
                key={section.title}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </HomeLayout>
  );
}
