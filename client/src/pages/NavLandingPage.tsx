import LegalDocumentPage, { LegalDocumentUnavailable } from './LegalDocumentPage';
import { useEffect } from 'react';
import { Link } from 'wouter';
import { HomeLayout } from '@/layouts/HomeLayout';
import { Button } from '@/components/ui/button';
import { applySeo } from '@/lib/seo';
import { isHomepageHeroJourneyEnabled, isJourneyRouteHeld } from '@/lib/publicNavigation';
import { landingPages, NAV_LANDING_ALIASES, type LandingPageConfig } from '@/lib/navLandingPages';

function getPageConfig(): LandingPageConfig {
  if (typeof window === 'undefined') {
    return landingPages['/insights/market-trends'];
  }

  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  return (
    landingPages[path] ||
    landingPages[NAV_LANDING_ALIASES[path]] ||
    landingPages['/insights/market-trends']
  );
}

export default function NavLandingPage() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (
    ['/terms', '/legal/terms', '/legal/consumer-rights', '/legal/dispute-resolution'].includes(path)
  ) {
    return <LegalDocumentPage kind="terms" />;
  }
  if (
    [
      '/privacy',
      '/legal/privacy',
      '/cookies',
      '/legal/cookies',
      '/compliance',
      '/legal/compliance',
    ].includes(path)
  ) {
    return <LegalDocumentPage kind="privacy" />;
  }
  if (path.startsWith('/legal/') || ['/cookies', '/compliance'].includes(path)) {
    const titles: Record<string, string> = {
      '/legal/consumer-rights': 'Consumer Rights',
      '/legal/dispute-resolution': 'Dispute Resolution',
      '/legal/cookies': 'Cookie Policy',
      '/cookies': 'Cookie Policy',
      '/legal/compliance': 'Compliance',
      '/compliance': 'Compliance',
    };
    return <LegalDocumentUnavailable title={titles[path] || 'Legal document'} />;
  }
  return <GenericNavLandingPage />;
}

function GenericNavLandingPage() {
  const page = getPageConfig();
  // Consumer Services CTAs are hidden while the Services journey is held.
  const servicesHeld = isJourneyRouteHeld('services');
  const isServicesHref = (href?: string) => href === '/services' || href?.startsWith('/services/');
  const primaryCtaEnabled =
    (!page.primaryCta.href.startsWith('/property-to-rent') ||
      isHomepageHeroJourneyEnabled('rent')) &&
    !(servicesHeld && isServicesHref(page.primaryCta.href));
  const secondaryCtaEnabled =
    (!page.secondaryCta?.href.startsWith('/new-developments') ||
      isHomepageHeroJourneyEnabled('developments')) &&
    !(servicesHeld && isServicesHref(page.secondaryCta?.href));

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
              {primaryCtaEnabled ? (
                <Link href={page.primaryCta.href}>
                  <Button className="w-full sm:w-auto">{page.primaryCta.label}</Button>
                </Link>
              ) : null}
              {page.secondaryCta && secondaryCtaEnabled ? (
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
