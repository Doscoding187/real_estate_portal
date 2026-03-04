import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  LogIn,
  Target,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { SEOHead } from '@/components/advertise/SEOHead';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

const REFERRAL_APPLY_PATH = '/distribution-network/apply';

const HERO_ROTATION_MS = 4000;

const heroRotatorMessages = [
  {
    prefix:
      'Know a friend, colleague, or client buying in a new development? Refer them and earn up to ',
    suffix: ' when they sign.',
  },
  {
    prefix:
      'Already living in a new development? Refer your next neighbour and earn up to ',
    suffix: ' at signing.',
  },
  {
    prefix:
      "Have a buyer who doesn't match your stock? Submit them through our network and earn up to ",
    suffix: ' per successful referral.',
  },
  {
    prefix:
      'Know someone who qualifies for a new development home? Earn up to ',
    suffix: ' per successful referral.',
  },
];

const problemCards = [
  {
    title: 'You already speak to buyers every day.',
    detail:
      "Some want new developments, but you do not always have access. Instead of losing them, refer them and add an income stream alongside your resale business.",
  },
  {
    title: 'Living in a new development?',
    detail:
      'If a friend, colleague, or family member wants to move in, your introduction could earn up to R25,000 when they sign. Turn proximity into payout.',
  },
  {
    title: 'Know someone planning to buy?',
    detail:
      'Instead of only sharing advice or a brochure, submit the referral through our network and earn a structured payout when the deal closes.',
  },
];

const howItWorksSteps = [
  {
    title: 'Submit the Qualified Buyer',
    description:
      'Enter the referral details and upload the required documents through our structured submission form.',
    icon: ClipboardCheck,
  },
  {
    title: 'We Match & Manage the Deal',
    description:
      'Our team routes the buyer to an approved development and manages the submission process through to approval.',
    icon: Target,
  },
  {
    title: 'Track Progress. Get Paid After Signing.',
    description:
      'Follow the deal through to attorney signing with full visibility. Referral payout is paid once the transaction confirms.',
    icon: CircleDollarSign,
  },
];

export default function DistributionNetworkPublicPage() {
  const [, setLocation] = useLocation();
  const stickyVisible = useMobileStickyCTA('distribution-network-hero');
  const [heroMessageIndex, setHeroMessageIndex] = useState(0);
  const [isHeroRotatorPaused, setIsHeroRotatorPaused] = useState(false);

  useEffect(() => {
    if (isHeroRotatorPaused) return;
    const intervalId = window.setInterval(() => {
      setHeroMessageIndex(prev => (prev + 1) % heroRotatorMessages.length);
    }, HERO_ROTATION_MS);
    return () => window.clearInterval(intervalId);
  }, [isHeroRotatorPaused]);

  return (
    <>
      <SEOHead
        title="Distribution Network | Property Listify"
        description="Qualification-led referral distribution for approved developments, with clear stage tracking and referral payout visibility."
        canonicalUrl="https://platform.com/distribution-network"
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      <div className="min-h-screen bg-slate-50">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/">
              <span className="flex cursor-pointer items-center gap-2 text-lg font-bold text-slate-900">
                <Building2 className="h-5 w-5 text-blue-600" />
                Property Listify
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="hidden border-slate-300 bg-white text-slate-700 sm:inline-flex"
                onClick={() => setLocation('/book-strategy')}
              >
                Book Strategy Call
              </Button>
              <Button
                size="sm"
                className="border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white hover:opacity-95"
                onClick={() => setLocation(REFERRAL_APPLY_PATH)}
              >
                Apply to Join
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-600 hover:text-slate-900"
                aria-label="Sign in"
                onClick={() => setLocation('/login')}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main id="main-content" className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900">
          <section
            id="distribution-network-hero"
            className="relative overflow-hidden pb-10 pt-10 md:pb-14 md:pt-12"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(37,99,235,0.14),transparent_35%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:60px_60px]" />

            <div className="container relative text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                <span className="h-2 w-2 rounded-full bg-[linear-gradient(135deg,#2563eb,#06b6d4)]" />
                Structured Referral Network
              </div>

              <h1 className="mx-auto mb-6 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Turn Qualified Buyers Into{' '}
                <span className="bg-[linear-gradient(135deg,#06b6d4,#2563eb)] bg-clip-text text-transparent">
                  Predictable Referral Payouts
                </span>
              </h1>

              <div
                className="mx-auto mb-10 max-w-3xl"
                onMouseEnter={() => setIsHeroRotatorPaused(true)}
                onMouseLeave={() => setIsHeroRotatorPaused(false)}
              >
                <div className="relative min-h-[90px] sm:min-h-[72px]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={heroMessageIndex}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.26, ease: 'easeOut' }}
                      className="mx-auto max-w-3xl text-lg text-slate-600"
                    >
                      {heroRotatorMessages[heroMessageIndex].prefix}
                      <span className="font-semibold text-slate-900">R25,000</span>
                      {heroRotatorMessages[heroMessageIndex].suffix}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  {heroRotatorMessages.map((_, index) => (
                    <button
                      key={`hero-rotator-dot-${index}`}
                      type="button"
                      aria-label={`Show message ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === heroMessageIndex ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      onClick={() => setHeroMessageIndex(index)}
                    />
                  ))}
                </div>

                <p className="mt-3 text-xs text-slate-500 sm:text-sm">
                  Payout after attorney signing - Amount varies by development
                </p>
              </div>

              <div className="cta-button-group mx-auto mb-12 flex w-full max-w-md flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 w-full border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] px-8 text-base text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.55)] sm:w-auto"
                  onClick={() => setLocation(REFERRAL_APPLY_PATH)}
                >
                  Apply to Join
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full border-slate-300 bg-white px-8 text-base text-slate-700 sm:w-auto"
                  onClick={() => setLocation('/book-strategy')}
                >
                  Book Strategy Call
                </Button>
              </div>

            </div>
          </section>

          <section id="problem-framing" className="scroll-mt-24 bg-white py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
                  The Buyer Is Already in Your Network.
                </h2>
                <p className="text-slate-600">
                  You are closer to a referral payout than you think. Existing relationships can become structured
                  opportunity when submitted through the right path.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                {problemCards.map(card => (
                  <Card
                    key={card.title}
                    className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]"
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                        <X className="h-4 w-4" />
                      </div>
                      <h3 className="mb-3 text-lg font-semibold text-slate-900">{card.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600">{card.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="scroll-mt-24 bg-white py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  How it works
                </div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
                  From Introduction to Income - In 3 Simple Steps
                </h2>
              </div>

              <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
                {howItWorksSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="text-center">
                      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mb-2 text-base font-semibold text-slate-900">{step.title}</h3>
                      <p className="text-sm text-slate-600">{step.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="referral-payouts" className="scroll-mt-24 py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Referral payout transparency
                </div>
                <h2 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
                  How Much You Earn. When You Get Paid. No Surprises.
                </h2>
                <p className="text-slate-600">
                  Earn between R15,000 - R45,000 per successful referral, depending on development and unit type.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                <Card className="pricing-card border-transparent bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white shadow-[0_25px_60px_-12px_rgba(37,99,235,0.25)]">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-100">
                      Payout certainty
                    </p>
                    <h3 className="mb-4 text-xl font-semibold">Your Commission Is Locked at Submission</h3>
                    <ul className="space-y-2 text-sm text-blue-50">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                        Once the deal is submitted, your agreed referral payout is snapshot-protected and cannot
                        change.
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="pricing-card border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Settlement gate</p>
                    <h3 className="mb-4 text-xl font-semibold text-slate-900">Paid After Attorney Signing</h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                        Commission is released once the legal milestone confirms. No vague payout timelines.
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="pricing-card border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">Reporting</p>
                    <h3 className="mb-4 text-xl font-semibold text-slate-900">Track Every Stage Until Payout</h3>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                        See exactly where your referral sits - from submission to signing.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          <section className="py-14 md:py-20">
            <div className="container">
              <div className="rounded-2xl bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_45%,#0f172a_100%)] px-6 py-14 text-center shadow-[0_30px_80px_-38px_rgba(8,47,116,0.85)] sm:px-8 sm:py-16">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                  Every month you wait is income left on the table.
                </p>
                <h2 className="mx-auto mb-4 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                  You Already Have Buyers. We Have Stock. Plug In.
                </h2>
                <p className="mx-auto max-w-2xl text-sm text-blue-100">
                  If you know someone ready to buy in a new development, do not let the opportunity pass. Submit the
                  referral. We handle the process. You earn when it signs.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 w-full border-0 bg-white px-8 text-slate-900 hover:bg-slate-100 sm:w-auto"
                    onClick={() => setLocation(REFERRAL_APPLY_PATH)}
                  >
                    Apply to Join
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full border-blue-200 bg-transparent px-8 text-white hover:bg-white/10 sm:w-auto"
                    onClick={() => setLocation('/book-strategy')}
                  >
                    Book Strategy Call
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      <MobileStickyCTA
        label="Apply to Join"
        href={REFERRAL_APPLY_PATH}
        isVisible={stickyVisible}
        onClick={() => setLocation(REFERRAL_APPLY_PATH)}
      />
    </>
  );
}
