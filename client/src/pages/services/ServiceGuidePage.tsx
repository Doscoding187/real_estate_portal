import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import {
  getServiceGuideBySlug,
  getServiceGuideCategoryPath,
  getServiceGuidePath,
  getServiceGuidesForTopic,
} from '@/features/services/serviceGuides';
import { applySeo } from '@/lib/seo';
import { buildServiceBreadcrumbStructuredData } from '@/features/services/seoStructuredData';

export default function ServiceGuidePage() {
  const [, params] = useRoute('/services/guides/:slug');
  const guide = getServiceGuideBySlug(params?.slug);

  useEffect(() => {
    if (!guide) {
      applySeo({
        title: 'Service Guide Not Found | Property Listify',
        description: 'This Service guide could not be found.',
        noindex: true,
      });
      return;
    }

    const canonicalPath = getServiceGuidePath(guide.slug);
    applySeo({
      title: `${guide.title} | Property Listify Services`,
      description: guide.summary,
      canonicalPath,
      image: guide.image,
      structuredData: [
        buildServiceBreadcrumbStructuredData([
          { label: 'Home', path: '/' },
          { label: 'Services', path: '/services' },
          { label: 'Guides', path: '/services/guides' },
          { label: guide.title },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: guide.summary,
          image: new URL(guide.image, window.location.origin).toString(),
          mainEntityOfPage: new URL(canonicalPath, window.location.origin).toString(),
          citation: guide.sources.map(source => source.url),
        },
      ],
    });
  }, [guide]);

  const relatedGuides = guide
    ? getServiceGuidesForTopic(guide.topicKey).filter(item => item.slug !== guide.slug)
    : [];

  return (
    <div className="min-h-screen bg-white text-[#0B1B2A]">
      <EnhancedNavbar />
      <main>
        {!guide ? (
          <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
            <BookOpen className="mx-auto h-10 w-10 text-[#168363]" aria-hidden="true" />
            <h1 className="mt-4 text-3xl font-bold">We couldn’t find that guide</h1>
            <p className="mt-3 text-[#4B5C6B]">
              The guide may have moved. Browse the Services guide library to find another one.
            </p>
            <Link
              href="/services/guides"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#087A5C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#06694F]"
            >
              Browse service guides <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <>
            <div className="border-b border-[#E5EDF1] bg-[#F7FAFB] px-4 py-4 md:px-6">
              <nav
                aria-label="Breadcrumb"
                className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 text-xs text-[#667788]"
              >
                <Link href="/services" className="hover:text-[#087A5C]">
                  Services
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <Link href="/services/guides" className="hover:text-[#087A5C]">
                  Guides
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-current="page" className="font-medium text-[#314558]">
                  {guide.title}
                </span>
              </nav>
            </div>

            <article className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
              <Link
                href="/services/guides"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087A5C] hover:text-[#116E54]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All service guides
              </Link>
              <div className="mt-7 max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087A5C]">
                  {guide.categoryLabel}
                  {guide.topicLabel !== guide.categoryLabel && ` · ${guide.topicLabel}`}
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] md:text-5xl">
                  {guide.title}
                </h1>
                <p className="mt-4 text-base leading-7 text-[#4B5C6B] md:text-lg">
                  {guide.summary}
                </p>
              </div>

              <figure className="mt-8 overflow-hidden rounded-2xl bg-[#EDF8F6]">
                <img
                  src={guide.image}
                  alt={guide.imageAlt}
                  className="max-h-[460px] w-full object-cover"
                />
              </figure>

              <div className="mt-9 space-y-8">
                {guide.sections.map(section => (
                  <section key={section.heading}>
                    <h2 className="text-xl font-bold tracking-[-0.02em] md:text-2xl">
                      {section.heading}
                    </h2>
                    {section.paragraphs?.map(paragraph => (
                      <p key={paragraph} className="mt-3 text-sm leading-7 text-[#34495A] md:text-base">
                        {paragraph}
                      </p>
                    ))}
                    {section.points && (
                      <ul className="mt-4 space-y-3">
                        {section.points.map(point => (
                          <li key={point} className="flex gap-3 text-sm leading-6 text-[#34495A] md:text-base">
                            <span
                              aria-hidden="true"
                              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#168363]"
                            />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              <aside className="mt-9 rounded-2xl border border-[#DCEBE6] bg-[#F0FAF6] p-5 md:p-6">
                <p className="text-sm leading-6 text-[#34495A]">
                  This guide is general information to help you prepare. A qualified professional
                  should assess the work, and local requirements can vary by municipality and job.
                </p>
                <Link
                  href={getServiceGuideCategoryPath(guide)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#087A5C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#06694F]"
                >
                  Explore {guide.topicLabel} services
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </aside>

              {guide.sources.length > 0 && (
                <section className="mt-10 border-t border-[#E5EDF1] pt-6" aria-labelledby="guide-sources-heading">
                  <h2 id="guide-sources-heading" className="text-lg font-bold">
                    Sources and further information
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {guide.sources.map(source => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#087A5C] underline decoration-[#9BCDBB] underline-offset-4 hover:text-[#075A45]"
                        >
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>

            {relatedGuides.length > 0 && (
              <section className="bg-[#F7FAFB] px-4 py-10 md:px-6 md:py-12">
                <div className="mx-auto max-w-7xl">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087A5C]">
                        Keep exploring
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">More {guide.topicLabel} guides</h2>
                    </div>
                    <Link
                      href="/services/guides"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#087A5C] hover:text-[#116E54]"
                    >
                      View all guides <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedGuides.slice(0, 3).map(related => (
                      <Link
                        key={related.slug}
                        href={getServiceGuidePath(related.slug)}
                        className="group flex items-center gap-4 rounded-xl border border-[#E3EBF0] bg-white p-3 transition hover:border-[#168363]/40 hover:shadow-md"
                      >
                        <img
                          src={related.image}
                          alt=""
                          className="h-16 w-20 rounded-lg object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-[#0B1B2A]">{related.title}</span>
                          <span className="mt-1 block text-xs font-semibold text-[#087A5C]">
                            Read guide <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <ServicesSiteFooter />
    </div>
  );
}
