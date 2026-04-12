import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  ShieldCheck,
  UserCheck2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { DistributionFunnelNavbar } from '@/components/distribution/DistributionFunnelNavbar';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

type PartnerType = 'independent_agent' | 'small_brokerage' | 'referral_partner' | 'individual' | '';

type JoinFormState = {
  fullName: string;
  email: string;
  phone: string;
  partnerType: PartnerType;
};

const whoCanJoin = [
  'Independent property agents',
  'Small brokerages',
  'Referral partners',
  'Individuals with qualified buyers',
];

const whatThisIs = [
  'Access to partnered new developments',
  'Referral payout tracking visibility',
  'Structured deal progression workflow',
  'Manager-reviewed submissions after onboarding',
];

const whatThisIsNot = [
  'A requirement to submit a buyer before joining',
  'A marketing mandate',
  'An agency agreement',
  'A developer contract',
];

const partnerTypeLabels: Record<Exclude<PartnerType, ''>, string> = {
  independent_agent: 'Independent Property Agent',
  small_brokerage: 'Small Brokerage',
  referral_partner: 'Referral Partner',
  individual: 'Individual With Qualified Buyer',
};

const approvedDevelopmentShowcase = [
  { name: 'Greenstone Crest', area: 'Johannesburg' },
  { name: 'Palm View Residences', area: 'Pretoria' },
  { name: 'Harbour Point Living', area: 'Cape Town' },
  { name: 'Umdloti Heights', area: 'Durban' },
  { name: 'Midrand Gate', area: 'Midrand' },
  { name: 'Waterfall Signature', area: 'Waterfall City' },
];

const postJoinSteps = [
  {
    title: 'Browse approved developments',
    detail: 'See active opportunities and where your referrals can be matched.',
  },
  {
    title: 'Understand referral rules',
    detail: 'Review submission requirements and payout process in your dashboard onboarding.',
  },
  {
    title: 'Submit your first referral',
    detail: 'Only once you are inside and ready, submit buyer details in the referral workspace.',
  },
];

export default function DistributionReferralApplyPage() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<JoinFormState>({
    fullName: '',
    email: '',
    phone: '',
    partnerType: '',
  });

  const submitMutation = trpc.distribution.submitReferrerApplication.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Application submitted. Our distribution team will review it shortly.');
    },
    onError: error => {
      toast.error(error.message || 'Failed to submit application.');
    },
  });

  const canSubmit =
    form.fullName.trim().length >= 2 &&
    form.email.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.partnerType !== '';

  const interestedIn = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('interestedIn');
    }
    return null;
  }, []);

  const notes = useMemo(() => {
    let baseNote = !form.partnerType
      ? 'Applicant type: Not specified'
      : `Applicant type: ${partnerTypeLabels[form.partnerType]}`;
    if (interestedIn) {
      baseNote += ` | Interested Development ID: ${interestedIn}`;
    }
    return baseNote;
  }, [form.partnerType, interestedIn]);

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please complete full name, email, phone/WhatsApp, and applicant type.');
      return;
    }

    submitMutation.mutate({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      partnerType: form.partnerType as Exclude<PartnerType, ''>,
      notes,
    });
  };

  return (
    <>
      <SEOHead
        title="Join | Distribution Referral Network"
        description="Join the Distribution Referral Network and get access to approved developments with referral payout tracking."
        canonicalUrl="https://platform.com/distribution-network/apply"
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      <div className="min-h-screen bg-slate-50">
        <DistributionFunnelNavbar />

        <main
          id="main-content"
          className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900"
        >
          <section className="distribution-funnel-hero relative overflow-hidden py-10 md:py-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(37,99,235,0.14),transparent_35%)]" />

            <div className="container relative max-w-6xl">
              <button
                type="button"
                onClick={() => setLocation('/distribution-network')}
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Distribution Network
              </button>

              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  Distribution Referral Access
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Get in now
                </p>
                <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Join the{' '}
                  <span className="bg-[linear-gradient(135deg,#06b6d4,#2563eb)] bg-clip-text text-transparent">
                    Distribution Referral Network
                  </span>
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                  Get access to approved developments and referral payout tracking before you submit
                  your first buyer.
                </p>
              </div>

              <Card className="mx-auto mt-7 w-full max-w-3xl border-slate-200 bg-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.20)]">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <div className="space-y-5 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-6 w-6" />
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        Application Received
                      </h2>
                      <p className="mx-auto max-w-2xl text-sm text-slate-600">
                        We review every application manually. You will receive onboarding and access
                        details by email.
                      </p>
                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button onClick={() => setLocation('/distribution-network')}>
                          Back to Network Page
                        </Button>
                        <Button variant="outline" onClick={() => setLocation('/login')}>
                          Sign in
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900">Get Access</h2>
                        <p className="mt-2 text-sm text-slate-600">
                          No buyer details required to join. You can submit referrals after you see
                          approved developments.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Full Name</label>
                          <Input
                            value={form.fullName}
                            onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="Your full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Email</label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="name@domain.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">
                            Phone / WhatsApp
                          </label>
                          <Input
                            value={form.phone}
                            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+27 ..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">I am a...</label>
                          <select
                            value={form.partnerType}
                            onChange={e =>
                              setForm(prev => ({
                                ...prev,
                                partnerType: e.target.value as PartnerType,
                              }))
                            }
                            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                          >
                            <option value="">Select role</option>
                            <option value="independent_agent">Independent Property Agent</option>
                            <option value="small_brokerage">Small Brokerage</option>
                            <option value="referral_partner">Referral Partner</option>
                            <option value="individual">Individual With Qualified Buyer</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                        <Link
                          href="/login"
                          className="text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          Already have access? Sign in
                        </Link>
                        <Button
                          className="h-11 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white"
                          disabled={!canSubmit || submitMutation.isPending}
                          onClick={handleSubmit}
                        >
                          {submitMutation.isPending ? 'Submitting...' : 'Get Access'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="bg-white py-10 md:py-12">
            <div className="container max-w-6xl grid gap-5 md:grid-cols-3">
              <Card className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Who Can Join</h2>
                  <ul className="space-y-3">
                    {whoCanJoin.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <UserCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">What This Is</h2>
                  <ul className="space-y-3">
                    {whatThisIs.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">What This Is Not</h2>
                  <ul className="space-y-3">
                    {whatThisIsNot.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="py-10 md:py-14">
            <div className="container max-w-6xl">
              <div className="mx-auto mb-8 max-w-3xl text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Approved developments
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Developments You Can Refer To
                </h2>
                <p className="mt-3 text-sm text-slate-600 sm:text-base">
                  Preview current opportunities. More developments are added weekly.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {approvedDevelopmentShowcase.map(item => (
                  <Card
                    key={item.name}
                    className="border-slate-200 bg-white shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]"
                  >
                    <CardContent className="p-5">
                      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.area}</p>
                      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Payout tracking included
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="pb-14 md:pb-20">
            <div className="container max-w-6xl">
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Briefcase className="h-3.5 w-3.5" />
                  After You Join
                </div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Referral qualification happens inside your dashboard
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {postJoinSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Step {index + 1}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
