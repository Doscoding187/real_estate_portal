import { useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Globe2,
  MapPin,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { ServicesSiteFooter } from '@/components/services/ServicesSiteFooter';
import { Button } from '@/components/ui/button';
import { SERVICES_IMAGES } from '@/features/services/media';
import { SERVICE_CATEGORIES, toServiceCategorySlug } from '@/features/services/catalog';
import { useApiAvailability } from '@/components/ApiAvailabilityBoundary';
import { applySeo } from '@/lib/seo';

const APPLICATION_HREF = '/login?mode=register&role=service_provider';
const PAGE_TITLE = 'Grow Your Service Business | Property Listify Services';
const PAGE_DESCRIPTION =
  'Give your property-service business a professional online presence. Showcase your services and coverage, and apply for Property Listify’s free founding-provider pilot.';
const PAGE_URL = 'https://www.propertylistifysa.co.za/advertise/services';
const SOCIAL_IMAGE = `https://www.propertylistifysa.co.za${SERVICES_IMAGES.providerNetworkCta}`;

const BUSINESS_BENEFITS = [
  {
    icon: Globe2,
    title: 'A professional business presence',
    description:
      'Create a shareable Property Listify profile with your business information and dedicated pages for the services you offer.',
  },
  {
    icon: MapPin,
    title: 'Show the work and areas you cover',
    description:
      'Present your services, descriptions, listed coverage and pricing information where you choose to provide it.',
  },
  {
    icon: MessageSquareText,
    title: 'Manage customer enquiries',
    description:
      'Receive attributable customer requests through your public pages and manage them in your provider workspace.',
  },
];

const JOIN_STEPS = [
  {
    number: '01',
    icon: ClipboardCheck,
    title: 'Apply and verify your account',
    description:
      'Start with the existing provider registration process and verify your email address.',
  },
  {
    number: '02',
    icon: BriefcaseBusiness,
    title: 'Build your business profile',
    description:
      'Add your company details, describe your services and select the places where you operate.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Submit for publication review',
    description:
      'Your profile stays private while it is reviewed. Only an authorised reviewer can approve publication.',
  },
  {
    number: '04',
    icon: Globe2,
    title: 'Share your public presence',
    description:
      'If approved, share your Property Listify business URL and manage incoming requests in your workspace.',
  },
];

const QUESTIONS = [
  {
    question: 'Does applying publish my business automatically?',
    answer:
      'No. Your profile remains private while you complete onboarding and while it is awaiting review. An authorised reviewer controls publication.',
  },
  {
    question: 'Is the founding-provider pilot free?',
    answer:
      'The current controlled founding-provider pilot is free while Property Listify validates the product and commercial model. There is no active provider subscription, paid placement or per-enquiry fee in this pilot. Any future offer will require a separate decision and communication.',
  },
  {
    question: 'Will Property Listify guarantee me customers or enquiries?',
    answer:
      'No. A public presence gives customers a way to find your listed services and contact you through the platform, but we do not guarantee traffic, enquiries, bookings, work or revenue.',
  },
  {
    question: 'What kind of service business can apply?',
    answer:
      'The current catalogue covers home improvement, finance and legal, moving, inspection and compliance, insurance, and media and marketing services related to property.',
  },
  {
    question: 'What happens after I apply?',
    answer:
      'You will verify your email, complete your private business profile and submit it for review. Your public pages become eligible for discovery only after an authorised reviewer approves publication.',
  },
];

function ApplicationCta({
  unavailable,
  label,
  variant = 'primary',
}: {
  unavailable: boolean;
  label: string;
  variant?: 'primary' | 'light';
}) {
  if (unavailable) {
    return (
      <Button
        disabled
        className="h-auto min-h-12 rounded-full bg-slate-300 px-6 py-3 font-semibold text-slate-700"
      >
        Provider applications temporarily unavailable
      </Button>
    );
  }

  return (
    <Link
      href={APPLICATION_HREF}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
        variant === 'light'
          ? 'bg-white text-[#087A5C] hover:bg-emerald-50'
          : 'bg-[#087A5C] text-white shadow-[0_12px_28px_-14px_rgba(8,122,92,0.8)] hover:bg-[#06684e]'
      }`}
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export default function AdvertiseServicesPage() {
  const { isUnavailable } = useApiAvailability();

  useEffect(() => {
    applySeo({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      canonicalPath: '/advertise/services',
      image: SOCIAL_IMAGE,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        url: PAGE_URL,
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: SOCIAL_IMAGE,
        },
        about: {
          '@type': 'Service',
          name: 'Property Listify Services provider presence and customer enquiries',
          provider: {
            '@type': 'Organization',
            name: 'Property Listify',
            url: 'https://www.propertylistifysa.co.za',
          },
        },
      },
    });
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0B1B2A]">
      <EnhancedNavbar />

      <main>
        <section className="overflow-hidden bg-[#071B2C] text-white">
          <div className="mx-auto grid max-w-7xl lg:min-h-[560px] lg:grid-cols-[1.04fr_0.96fr]">
            <div className="flex flex-col justify-center px-5 py-14 sm:px-8 md:py-20 lg:px-10 xl:px-14">
              <nav
                aria-label="Breadcrumb"
                className="mb-8 flex items-center gap-2 text-xs text-slate-300"
              >
                <Link href="/advertise" className="transition hover:text-white">
                  Advertise with us
                </Link>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-current="page" className="font-medium text-white">
                  Service businesses
                </span>
              </nav>

              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Founding-provider pilot
              </p>
              <h1 className="mt-5 max-w-2xl font-sans text-4xl font-bold leading-[1.08] tracking-[-0.045em] sm:text-5xl xl:text-[58px]">
                More than a listing. A digital home for your service business.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 md:text-lg md:leading-8">
                Showcase your property services, explain where you work and give customers a clear
                way to enquire through Property Listify.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ApplicationCta unavailable={isUnavailable} label="Apply as a service provider" />
                <Link
                  href="/services"
                  className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-semibold text-white transition hover:text-emerald-200"
                >
                  Explore Services <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {isUnavailable && (
                <p
                  role="status"
                  className="mt-5 max-w-xl rounded-2xl border border-amber-200/30 bg-amber-100/10 p-4 text-sm leading-6 text-amber-100"
                >
                  Secure provider applications are temporarily unavailable while the application
                  service reconnects. No application has been accepted or saved. Please return once
                  availability is restored.
                </p>
              )}

              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">
                Apply, verify your email and complete your profile. Publication is reviewed, and
                approval does not guarantee customer enquiries.
              </p>
            </div>

            <div className="relative min-h-[320px] overflow-hidden sm:min-h-[430px] lg:min-h-full">
              <img
                src={SERVICES_IMAGES.providerNetworkCta}
                alt="A property-service professional meeting homeowners in their home"
                className="absolute inset-0 h-full w-full object-cover object-center"
                fetchPriority="high"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#071B2C]/65 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#071B2C]/20 lg:via-transparent lg:to-transparent"
                aria-hidden="true"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/95 p-4 text-[#0B1B2A] shadow-xl backdrop-blur sm:bottom-8 sm:left-8 sm:right-8 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#087A5C]">
                  Your business, your presence
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 sm:text-base">
                  A shareable company profile, service pages and a workspace for customer requests.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 bg-[#F5FAF8] px-4 py-6 md:px-6">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3 sm:gap-3">
            {[
              ['Free pilot', 'No provider fee during the controlled founding pilot'],
              ['Reviewed publication', 'Your profile stays private until it is approved'],
              ['Business presence', 'Create a public URL you can share if approved'],
            ].map(([title, copy]) => (
              <div key={title} className="flex items-start gap-3 sm:justify-center">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#087A5C]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-[#0B1B2A]">{title}</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-[#526273]">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="px-4 py-14 md:px-6 md:py-20"
          aria-labelledby="business-presence-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087A5C]">
                Built around your business
              </p>
              <h2
                id="business-presence-heading"
                className="mt-3 font-sans text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
              >
                Help customers understand what you do and how to reach you
              </h2>
              <p className="mt-4 text-base leading-7 text-[#526273]">
                Services connects discovery with a practical business presence. Your profile is more
                than a directory card: it brings your company information, services and customer
                enquiries together.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {BUSINESS_BENEFITS.map(benefit => {
                const Icon = benefit.icon;
                return (
                  <article
                    key={benefit.title}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-40px_rgba(11,27,42,0.4)] sm:p-7"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF5FF] text-[#1473C9]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold tracking-[-0.02em]">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#526273]">{benefit.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="bg-[#F5FAF8] px-4 py-14 md:px-6 md:py-20"
          aria-labelledby="how-to-join-heading"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087A5C]">
                A clear path from application to publication
              </p>
              <h2
                id="how-to-join-heading"
                className="mt-3 font-sans text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
              >
                Your next steps are straightforward
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#526273]">
                Your business can apply online. You stay in control of your profile details, while
                Property Listify reviews publication before the public can see it.
              </p>
              <div className="mt-7">
                <ApplicationCta unavailable={isUnavailable} label="Start your application" />
              </div>
            </div>

            <ol className="space-y-3">
              {JOIN_STEPS.map(step => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.number}
                    className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[auto_1fr] sm:items-start sm:p-6"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F6F0] text-[#087A5C]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-bold tracking-[0.12em] text-[#087A5C] sm:mt-3 sm:block">
                        STEP {step.number}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold sm:text-lg">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-[#526273]">{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section
          className="px-4 py-14 md:px-6 md:py-20"
          aria-labelledby="service-categories-heading"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087A5C]">
                  Property-related services
                </p>
                <h2
                  id="service-categories-heading"
                  className="mt-3 font-sans text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
                >
                  Find the category that fits your work
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#526273] sm:text-base">
                  The current Services catalogue includes six areas. Public provider availability
                  depends on reviewed businesses and their listed coverage.
                </p>
              </div>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#087A5C] hover:text-[#065e47]"
              >
                Browse the marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICE_CATEGORIES.map((category, index) => (
                <Link
                  key={category.value}
                  href={`/services/${toServiceCategorySlug(category.value)}`}
                  className="group flex min-h-28 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#9ad7c3] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  <span className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF5FF] text-sm font-bold text-[#1473C9]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block font-semibold text-[#0B1B2A]">{category.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#647487]">
                        {category.subtitle}
                      </span>
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[#087A5C] transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-14 md:px-6 md:pb-20" aria-labelledby="pilot-heading">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] bg-[#E8F7F1] lg:grid-cols-[1fr_auto]">
            <div className="p-6 sm:p-9 lg:p-12">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-[#087A5C]">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Founding-provider pilot
              </p>
              <h2
                id="pilot-heading"
                className="mt-4 max-w-3xl font-sans text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
              >
                Establish your presence while we learn what helps service businesses grow
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#405668] sm:text-base sm:leading-7">
                The current controlled pilot is free while Property Listify validates the product
                and commercial model. There is no active provider subscription, paid placement or
                per-enquiry fee in this pilot. Applying creates no payment obligation.
              </p>
              <ul className="mt-5 grid gap-2 text-sm font-medium text-[#244438] sm:grid-cols-2">
                {[
                  'A public business profile after approval',
                  'Service pages you can share',
                  'Listed service and coverage information',
                  'A workspace for customer requests',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#087A5C]"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-end bg-[linear-gradient(135deg,#d8f1e7,#c8e8f6)] p-6 sm:p-9 lg:w-72 lg:items-center">
              <div>
                <p className="text-sm font-semibold text-[#244438]">
                  Ready to introduce your business?
                </p>
                <p className="mt-1 text-xs leading-5 text-[#526b61]">
                  Apply online, verify your email and complete your profile for review.
                </p>
                <div className="mt-4">
                  <ApplicationCta
                    unavailable={isUnavailable}
                    label="Apply to the pilot"
                    variant="light"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="bg-[#F7FAFB] px-4 py-14 md:px-6 md:py-20"
          aria-labelledby="provider-faq-heading"
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#087A5C]">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Clear expectations
              </p>
              <h2
                id="provider-faq-heading"
                className="mt-3 font-sans text-3xl font-bold tracking-[-0.04em] sm:text-4xl"
              >
                Questions from service businesses
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#526273] sm:text-base sm:leading-7">
                Know what applying means before you get started.
              </p>
            </div>
            <div className="divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white px-5 sm:px-7">
              {QUESTIONS.map(item => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#0B1B2A] marker:hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F6F0] text-[#087A5C] transition group-open:rotate-45">
                      <span aria-hidden="true" className="text-xl leading-none">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-3 pr-8 text-sm leading-6 text-[#526273]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#071B2C] px-4 py-12 text-white md:px-6 md:py-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
                Property Listify Services
              </p>
              <h2 className="mt-2 font-sans text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
                Give customers a clearer way to discover your work.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Start your application and build a business presence that is ready for review.
              </p>
            </div>
            <ApplicationCta
              unavailable={isUnavailable}
              label="Start your application"
              variant="light"
            />
          </div>
        </section>
      </main>

      <ServicesSiteFooter />
    </div>
  );
}
