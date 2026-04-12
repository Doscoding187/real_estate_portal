import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Building2,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  LogIn,
  Target,
  Zap,
  Users,
  Search,
  Lock,
  Repeat2,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileStickyCTA, useMobileStickyCTA } from '@/components/advertise/MobileStickyCTA';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

const REFERRAL_APPLY_PATH = '/distribution-network/apply';

const HERO_ROTATION_MS = 4000;

export default function DistributionNetworkPublicPage() {
  const [, setLocation] = useLocation();
  const stickyVisible = useMobileStickyCTA('distribution-network-hero');

  // Matcher State
  const [matchIncome, setMatchIncome] = useState('R40k - R60k / month');
  const [matchArea, setMatchArea] = useState('Roodepoort / West Rand');
  const [matchType, setMatchType] = useState('Either / Flexible');
  const [matchBeds, setMatchBeds] = useState('3 Bedrooms');

  const { data: developments, isLoading: isLoadingDevs } =
    trpc.developer.listPublicDevelopments.useQuery({ limit: 6 }, { staleTime: 1000 * 60 * 5 });

  const calculateQualifyingIncome = (priceFrom: number | null | undefined) => {
    if (!priceFrom) return 'Income dependent on unit type';
    const estRepayment = priceFrom * 0.0105;
    const estGross = estRepayment * 3.3;

    if (estGross >= 1000000) {
      return `Min R${(estGross / 1000000).toFixed(1)}m / month`;
    }
    return `Min R${(estGross / 1000).toFixed(0)}k / month`;
  };

  const handleReferClick = (devId?: number) => {
    const url = devId ? `${REFERRAL_APPLY_PATH}?interestedIn=${devId}` : REFERRAL_APPLY_PATH;
    setLocation(url);
  };

  const matcherResult = useMemo(() => {
    if (matchIncome === 'R15k - R25k / month') return { count: 1, payout: 'R18k - R20k' };
    if (matchIncome === 'R25k - R40k / month') return { count: 2, payout: 'R20k - R22k' };
    if (matchIncome === 'R40k - R60k / month') return { count: 3, payout: 'R22k - R25k' };
    return { count: 5, payout: 'R25k - R30k' };
  }, [matchIncome]);

  return (
    <>
      <SEOHead
        title="Distribution Network | Property Listify"
        description="Qualification-led referral distribution for approved developments, with clear stage guidance and referral payout visibility."
        canonicalUrl="/distribution-network"
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
                className="hidden border-slate-300 bg-white text-slate-700 sm:inline-flex hover:bg-slate-50"
                onClick={() => setLocation('/book-strategy')}
              >
                Book Strategy Call
              </Button>
              <Button
                size="sm"
                className="border-0 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white hover:opacity-95"
                onClick={() => handleReferClick()}
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

        <main
          id="main-content"
          className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900"
        >
          {/* HERO SECTION */}
          <section
            id="distribution-network-hero"
            className="relative overflow-hidden pb-12 pt-12 md:pb-16 md:pt-20 bg-slate-900 text-center"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.15),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(37,99,235,0.2),transparent_35%)]" />

            <div className="container relative text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-blue-300 uppercase">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                Referral Network Now Open
              </div>

              <h1 className="mx-auto mb-6 max-w-5xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-5xl">
                You Already Know Buyers.
                <br />
                <span className="bg-[linear-gradient(135deg,#67e8f9,#3b82f6)] bg-clip-text text-transparent">
                  Get Paid When They Buy Property.
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-4 font-light">
                No selling. No mandates. No listings to manage.
                <br />
                Just connect qualified buyers to the right development — and earn.
              </p>

              <div className="text-blue-200 text-sm md:text-base font-medium mb-10 flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4">
                <span>
                  Earn up to <strong className="text-blue-100 font-bold">R30,000</strong> per
                  referral
                </span>
                <span className="hidden md:inline">·</span>
                <span>Referral fee locked at submission</span>
                <span className="hidden md:inline">·</span>
                <span>Paid at attorney signing</span>
              </div>

              <div className="mx-auto mb-16 flex w-full max-w-md flex-col items-center justify-center gap-4 sm:max-w-none sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 border-0 bg-[linear-gradient(135deg,#3b82f6,#0ea5e9)] px-10 text-base font-bold text-white shadow-[0_12px_28px_-14px_rgba(59,130,246,0.6)] sm:w-auto hover:opacity-90 transition-transform hover:-translate-y-0.5"
                  onClick={() => handleReferClick()}
                >
                  Start Referring Now
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 border-slate-600 bg-transparent px-8 text-base text-slate-300 sm:w-auto hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  See How It Works
                </Button>
              </div>

              {/* SPEED & EASE BANNER */}
              <div className="border-t border-slate-800 pt-8 flex flex-wrap justify-center gap-x-12 gap-y-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-medium">Referral takes under 2 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Target className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium">We contact your buyer in 24hrs</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium">You don't need property knowledge</span>
                </div>
              </div>
            </div>
          </section>

          {/* MATCHER ENGINE */}
          <section className="scroll-mt-24 bg-[ линейная-заливка] py-16 md:py-24 border-b border-slate-200">
            <div className="container">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
                <div className="max-w-xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                    Smart Matching Tool
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl leading-tight mb-5">
                    We match your buyer for you.
                  </h2>
                  <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                    Tell us about the buyer — income, location, bedroom needs — and we instantly
                    show you which developments fit and your estimated payout.
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg text-slate-700 font-medium">
                    You don't need to know property details. You just need to know people. We handle
                    the rest.
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.1)] border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-0"></div>

                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Buyer's gross income
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={matchIncome}
                          onChange={e => setMatchIncome(e.target.value)}
                        >
                          <option>R15k - R25k / month</option>
                          <option>R25k - R40k / month</option>
                          <option>R40k - R60k / month</option>
                          <option>R60k+ / month</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Preferred area
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={matchArea}
                          onChange={e => setMatchArea(e.target.value)}
                        >
                          <option>Johannesburg South</option>
                          <option>Roodepoort / West Rand</option>
                          <option>North Riding / Sandton</option>
                          <option>Any area</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Property type
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={matchType}
                          onChange={e => setMatchType(e.target.value)}
                        >
                          <option>Apartment</option>
                          <option>Townhouse / House</option>
                          <option>Either / Flexible</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                        Bedrooms
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={matchBeds}
                          onChange={e => setMatchBeds(e.target.value)}
                        >
                          <option>1 Bedroom</option>
                          <option>2 Bedrooms</option>
                          <option>3 Bedrooms</option>
                          <option>4 Bedrooms</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Developments Matched
                      </p>
                      <p className="text-xl font-bold text-slate-900">
                        {matcherResult.count} Developments
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Potential Payout
                      </p>
                      <p className="text-2xl font-black text-blue-600">{matcherResult.payout}</p>
                    </div>
                  </div>

                  <Button
                    className="w-full h-14 bg-[linear-gradient(135deg,#0f172a,#1e293b)] text-white text-base font-bold shadow-lg hover:bg-slate-800 group"
                    onClick={() => handleReferClick()}
                  >
                    Submit Buyer Now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* PROBLEM FRAMING / WHY THIS WORKS */}
          <section id="problem-framing" className="bg-slate-50 py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                  Why This Works
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  The buyer is already in your network.
                </h2>
                <p className="text-lg text-slate-600">
                  You speak to buyers daily. You just haven't had a structured, transparent way to
                  monetize those conversations — until now.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      You already know buyers
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Colleagues, friends, family — people planning to buy property are in your
                      circle every single day.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                      <Search className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      We handle qualification
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      You don't need to know which development fits. Submit the buyer — we match,
                      qualify, and close. Your job ends at the referral.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Referral fee locked at submission
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      The moment you submit, your referral fee is confirmed and protected. No
                      disputes, no renegotiation at signing.
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-sm">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                      <Repeat2 className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Run it like a pipeline
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      This is repeatable. 5 active referrals running simultaneously = a R100k+
                      potential pipeline. Build it weekly.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* OPPORTUNITIES (REFERRAL CARDS) */}
          <section
            id="available-developments"
            className="scroll-mt-24 bg-white py-16 md:py-24 border-y border-slate-200/60"
          >
            <div className="container">
              <div className="mx-auto mb-12 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Referral Opportunities
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  High-Demand Developments. Ready Now.
                </h2>
                <p className="text-lg text-slate-600">
                  You don't need a mandate. Submit your pre-qualified buyers to any of these
                  developments and secure your referral fee.
                </p>
              </div>

              {isLoadingDevs ? (
                <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                  <Skeleton className="h-[400px] w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-[400px] w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-[400px] w-full rounded-2xl bg-slate-100" />
                </div>
              ) : developments && developments.length > 0 ? (
                <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {developments.map((dev, i) => {
                    const priceFrom = dev.priceFrom ? Number(dev.priceFrom) : null;
                    const qualifyingThreshold = calculateQualifyingIncome(priceFrom);

                    // Generate a deterministic gradient style based on index
                    const bgGradients = [
                      'linear-gradient(140deg, #0f172a 0%, #1e3a8a 100%)',
                      'linear-gradient(140deg, #064e3b 0%, #047857 100%)',
                      'linear-gradient(140deg, #312e81 0%, #4f46e5 100%)',
                      'linear-gradient(140deg, #451a03 0%, #b45309 100%)',
                      'linear-gradient(140deg, #172554 0%, #2563eb 100%)',
                      'linear-gradient(140deg, #3f3f46 0%, #52525b 100%)',
                    ];

                    const defaultBg = bgGradients[i % bgGradients.length];
                    const hasCover = !!dev.images?.[0]?.url;

                    return (
                      <div
                        key={dev.id}
                        className="opp-card relative hover:-translate-y-1 hover:border-blue-300 transition-all"
                      >
                        <div
                          className="opp-card-img theme-1"
                          style={{
                            backgroundImage: hasCover
                              ? `linear-gradient(to top, rgba(15,23,42,0.9), rgba(15,23,42,0)), url(${dev.images?.[0]?.url})`
                              : defaultBg,
                          }}
                        >
                          <span className="opp-availability">
                            {dev.status === 'selling'
                              ? 'Selling fast'
                              : dev.status?.replace('-', ' ')}
                          </span>
                          <div>
                            <div className="opp-name">{dev.name}</div>
                            <div className="opp-location">📍 {dev.suburb || dev.city}</div>
                          </div>
                        </div>
                        <div className="opp-body">
                          <div className="opp-qualify">
                            <div className="opp-qualify-dot"></div>
                            <p>Buyers earning {qualifyingThreshold} qualify</p>
                          </div>
                          <div className="opp-price-row">
                            <div className="opp-price">
                              From R
                              {(priceFrom || 0) >= 1000000
                                ? ((priceFrom || 0) / 1000000).toFixed(1) + 'm'
                                : ((priceFrom || 0) / 1000).toFixed(0) + 'k'}
                              <span>
                                From R{priceFrom ? ((priceFrom * 0.0105) / 1000).toFixed(0) : '0'}
                                k/month bond
                              </span>
                            </div>
                            <div className="opp-payout">
                              {dev.referrerCommissionType === 'flat' && dev.referrerCommissionAmount 
                                ? `Earn R${(dev.referrerCommissionAmount / 1000).toFixed(0)}k`
                                : dev.referrerCommissionType === 'percentage' && dev.referrerCommissionValue
                                  ? `Earn ${dev.referrerCommissionValue}% Comm.`
                                  : 'Earn up to R30k'}
                              <span>per referral</span>
                            </div>
                          </div>
                        </div>
                        <div className="opp-footer">
                          <button className="btn-refer" onClick={() => handleReferClick(dev.id)}>
                            Refer a Buyer
                          </button>
                          <button className="btn-details" onClick={() => handleReferClick(dev.id)}>
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Coming Soon Box */}
                  <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col justify-center items-center text-center p-8 hover:border-blue-300 hover:bg-blue-50/20 transition-colors">
                    <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-light border border-blue-200 mb-4">
                      +
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">More coming soon</h3>
                    <p className="text-sm text-slate-500 max-w-[200px] mb-6">
                      New developments added monthly. Join now to get early access.
                    </p>
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full"
                      onClick={() => handleReferClick()}
                    >
                      Apply Location Access
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl border border-slate-200 bg-white">
                  <p className="text-slate-500">
                    No active developments are currently available for referrals.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* THE REFERRAL TIMELINE (EARNING LOOP) */}
          <section id="how-it-works" className="scroll-mt-24 bg-slate-50 py-16 md:py-24">
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  The Referral Timeline
                </div>
                <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
                  How you make money — repeatably.
                </h2>
                <p className="text-lg text-slate-600">
                  A simple 4-step loop you can run with multiple buyers simultaneously. This is a
                  pipeline, not a one-off transaction.
                </p>
              </div>

              <div className="mx-auto max-w-5xl">
                <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12">
                  {/* Timeline connector (hidden on mobile) */}
                  <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-slate-200 border-t-2 border-dashed border-slate-300 z-0"></div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-slate-100 shadow-sm text-blue-600 font-black text-xl">
                      1
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Know a buyer</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Someone in your network is planning to buy. Income, area, rough budget —
                      that's all you need.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-slate-100 shadow-sm text-blue-600 font-black text-xl">
                      2
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      Submit their details
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Use our quick referral form. Takes 2 minutes. Your referral fee is locked the
                      moment you hit submit.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563eb,#06b6d4)] border-[6px] border-blue-100 shadow-md text-white font-black text-xl">
                      3
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">We qualify + match</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Our team contacts your buyer, qualifies them, and matches them to the right
                      development.
                    </p>
                  </div>

                  <div className="relative z-10 text-center px-4">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white border-[6px] border-emerald-100 shadow-sm text-emerald-600 font-black text-xl">
                      <CircleDollarSign className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-slate-900">Get paid at signing</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      When the sale is registered with the attorney, your referral payout is
                      processed. Clear milestone.
                    </p>
                  </div>
                </div>

                {/* Pipeline Box */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                  <div className="flex-1">
                    <p className="text-slate-600 text-sm md:text-base">
                      Run this with{' '}
                      <strong className="text-slate-900 font-bold">5 buyers simultaneously</strong>{' '}
                      = R90k - R150k potential pipeline. This is your distribution engine.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 md:max-w-md justify-center md:justify-end">
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Buyer 1 - Qualifying
                    </span>
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Buyer 2 - Matched
                    </span>
                    <span className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-semibold">
                      Buyer 3 - At Signing
                    </span>
                    <span className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full text-xs font-medium">
                      Buyer 4 - Submit →
                    </span>
                    <span className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-full text-xs font-medium">
                      Buyer 5 - Submit →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PAYOUT TRANSPARENCY */}
          <section
            id="referral-payouts"
            className="scroll-mt-24 py-16 md:py-24 bg-white border-t border-slate-200/60"
          >
            <div className="container">
              <div className="mx-auto mb-14 max-w-3xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Payout Transparency
                </div>
                <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  How Much You Earn. No Surprises.
                </h2>
                <p className="text-lg text-slate-600">
                  Your referral fee is confirmed at submission. What you see when you refer is
                  exactly what you get paid.
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 mb-10">
                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Payout certainty
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">
                      Referral Fee Locked at Submission
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      The moment your referral is submitted and accepted, your referral fee rate is
                      confirmed in writing. No renegotiation. No surprises at closing.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Settlement gate
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">
                      Paid After Attorney Signing
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Referral fee releases once the sale is registered through legal channels.
                      Milestone-based payment — no vague timelines or arbitrary delays.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                  <CardContent className="p-6 sm:p-8">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Visibility
                    </p>
                    <h3 className="mb-3 text-lg font-bold text-slate-900">Clear Stage Tracking</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      You're notified at every stage — submission, qualification, match, and
                      signing. No need to chase for updates or wonder what's happening.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mx-auto max-w-6xl bg-[linear-gradient(135deg,#f8fafc,#f1f5f9)] border border-slate-200 rounded-2xl p-8 text-center sm:p-12">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
                  Maximum referral payout per transaction
                </span>
                <div className="text-5xl sm:text-6xl font-black text-blue-600 tracking-tight mb-4">
                  R30,000
                </div>
                <p className="text-base text-slate-600 font-medium">
                  Earn between R18,000 and R30,000 depending on development and unit type
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  Referral fee confirmed at the time of referral submission · No mandate required
                </p>
              </div>
            </div>
          </section>

          {/* SOCIAL PROOF */}
          <section className="bg-slate-50 border-t border-slate-200 py-16">
            <div className="container">
              <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="text-3xl font-black text-slate-900 mb-2">R2.4M+</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    In referral fees
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="text-3xl font-black text-slate-900 mb-2">140+</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Buyers matched
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="text-3xl font-black text-slate-900 mb-2">48hr</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Avg. qualification time
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                  <div className="text-3xl font-black text-slate-900 mb-2">6+</div>
                  <div className="text-sm text-slate-600 font-medium tracking-wide">
                    Active developments
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="bg-slate-900 text-center py-20 px-6 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.2),transparent_60%)]" />
            <div className="container relative z-10 max-w-3xl mx-auto text-center">
              <h2 className="mb-4 text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                Your Network Is Worth
                <br />
                <span className="text-blue-400">More Than You Think.</span>
              </h2>
              <p className="mb-10 text-lg text-slate-400 font-light">
                Every month you wait is income left on the table. Join the network, submit your
                first referral, and start building your pipeline today.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="h-14 w-full border-0 bg-[linear-gradient(135deg,#3b82f6,#0ea5e9)] px-10 text-base font-bold text-white shadow-lg sm:w-auto hover:opacity-90 transition-transform hover:-translate-y-0.5"
                  onClick={() => handleReferClick()}
                >
                  Start Referring Now
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full border-slate-600 bg-transparent px-8 text-base text-slate-300 sm:w-auto hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => setLocation('/book-strategy')}
                >
                  Book a Strategy Call
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
      <MobileStickyCTA
        label="Start Referring"
        href={REFERRAL_APPLY_PATH}
        isVisible={stickyVisible}
        onClick={() => handleReferClick()}
      />
    </>
  );
}
