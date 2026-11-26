import { useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import {
  getServiceGuideCategoryPath,
  SERVICE_GUIDES,
} from '@/features/services/serviceGuides';
import { applySeo } from '@/lib/seo';

export default function ServicesGuidesPage() {
  const guideGroups = useMemo(() => {
    const groups = new Map<string, (typeof SERVICE_GUIDES)[number][]>();
    SERVICE_GUIDES.forEach(guide => {
      const group = groups.get(guide.topicKey) || [];
      group.push(guide);
      groups.set(guide.topicKey, group);
    });
    return Array.from(groups.values());
  }, []);

  useEffect(() => {
    applySeo({
      title: 'Service Guides | Property Listify',
      description:
        'Practical guides to help you understand property services, plan work and prepare useful questions for a professional.',
      canonicalPath: '/services/guides',
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F7FAFB] text-[#0B1B2A]">
      <EnhancedNavbar />
      <main>
        <section className="bg-white px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#667788]">
              <Link href="/services" className="transition hover:text-[#087A5C]">
                Services
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span aria-current="page" className="font-medium text-[#314558]">
                Guides
              </span>
            </nav>
            <div className="mt-8 max-w-3xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#087A5C]">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Property Listify Services
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] md:text-5xl">
                Practical guides for your property projects
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#4B5C6B] md:text-base md:leading-7">
                Learn what to look for, prepare useful questions and understand when it is time to
                speak with a service professional. We are building this library across the services
                available on Property Listify.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 md:px-6 md:py-14">
          {guideGroups.map(guides => {
            const firstGuide = guides[0];
            return (
              <section key={firstGuide.topicKey} aria-labelledby={`guide-group-${firstGuide.topicKey}`}>
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#087A5C]">
                      {firstGuide.categoryLabel}
                    </p>
                    <h2
                      id={`guide-group-${firstGuide.topicKey}`}
                      className="mt-1 text-2xl font-bold tracking-[-0.03em]"
                    >
                      {firstGuide.topicLabel} guides
                    </h2>
                  </div>
                  <Link
                    href={getServiceGuideCategoryPath(firstGuide)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#087A5C] hover:text-[#116E54]"
                  >
                    Explore services <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {guides.map(guide => (
                    <Link
                      key={guide.slug}
                      href={`/services/guides/${guide.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white shadow-[0_8px_24px_-20px_rgba(2,17,30,0.5)] transition hover:-translate-y-1 hover:border-[#168363]/40 hover:shadow-[0_18px_32px_-24px_rgba(2,17,30,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168363]"
                    >
                      <div className="aspect-[16/9] overflow-hidden bg-[#EDF8F6]">
                        <img
                          src={guide.image}
                          alt={guide.imageAlt}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-base font-bold leading-snug text-[#0B1B2A]">
                          {guide.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#4B5C6B]">
                          {guide.summary}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#087A5C]">
                          Read guide <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
          {SERVICE_GUIDES.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#C8D8E1] bg-white px-6 py-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[#168363]" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-bold">New service guides are on the way</h2>
              <p className="mt-2 text-sm text-[#4B5C6B]">
                Visit Services to explore categories and available professionals.
              </p>
            </div>
          )}
        </div>
      </main>
      <ServicesSiteFooter />
    </div>
  );
}
