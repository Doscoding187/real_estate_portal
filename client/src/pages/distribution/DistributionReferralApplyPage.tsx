import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CircleHelp,
  ShieldCheck,
  UserCheck2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ListingNavbar } from '@/components/ListingNavbar';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import '@/styles/advertise-responsive.css';
import '@/styles/advertise-focus-indicators.css';

type YesNo = 'yes' | 'no' | '';
type PipelineStage = 'ready_now' | 'within_90_days' | 'building_pipeline' | '';
type BudgetRange =
  | 'under_r750k'
  | 'r750k_r1_5m'
  | 'r1_5m_r3m'
  | 'r3m_r5m'
  | 'over_r5m'
  | '';
type PartnerType = 'independent_agent' | 'small_brokerage' | 'referral_partner' | 'individual' | '';

type QualificationState = {
  licensed: YesNo;
  hasBuyerNow: YesNo;
  pipelineStage: PipelineStage;
};

type ApplicationState = {
  fullName: string;
  phone: string;
  email: string;
  cityProvince: string;
  budgetRange: BudgetRange;
  partnerType: PartnerType;
  notes: string;
};

const whatThisIs = [
  'Access to partnered new developments',
  'Structured submission workflow',
  'Manager-reviewed deal processing',
  'Transparent commission payout tracking',
];

const whatThisIsNot = [
  'A marketing mandate',
  'An agency agreement',
  'A subscription model',
  'A developer contract',
];

const whoCanJoin = [
  'Independent property agents',
  'Small brokerages',
  'Referral partners',
  'Individuals with qualified buyers',
];

const pipelineStageLabels: Record<Exclude<PipelineStage, ''>, string> = {
  ready_now: 'Buyer is ready now',
  within_90_days: 'Likely within 90 days',
  building_pipeline: 'Building pipeline',
};

const budgetRangeLabels: Record<Exclude<BudgetRange, ''>, string> = {
  under_r750k: 'Under R750,000',
  r750k_r1_5m: 'R750,000 - R1,500,000',
  r1_5m_r3m: 'R1,500,000 - R3,000,000',
  r3m_r5m: 'R3,000,000 - R5,000,000',
  over_r5m: 'Over R5,000,000',
};

const partnerTypeLabels: Record<Exclude<PartnerType, ''>, string> = {
  independent_agent: 'Independent Property Agent',
  small_brokerage: 'Small Brokerage',
  referral_partner: 'Referral Partner',
  individual: 'Individual With Qualified Buyer',
};

function yesNoLabel(value: YesNo) {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return 'Not specified';
}

export default function DistributionReferralApplyPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitted, setSubmitted] = useState(false);
  const [qualification, setQualification] = useState<QualificationState>({
    licensed: '',
    hasBuyerNow: '',
    pipelineStage: '',
  });
  const [application, setApplication] = useState<ApplicationState>({
    fullName: '',
    phone: '',
    email: '',
    cityProvince: '',
    budgetRange: '',
    partnerType: '',
    notes: '',
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

  const canAdvanceFromQualification =
    qualification.licensed !== '' && qualification.hasBuyerNow !== '' && qualification.pipelineStage !== '';

  const canSubmit =
    application.fullName.trim().length >= 2 &&
    application.email.trim().length > 0 &&
    application.phone.trim().length > 0 &&
    application.cityProvince.trim().length > 0 &&
    application.budgetRange !== '' &&
    qualification.licensed !== '' &&
    qualification.hasBuyerNow !== '';

  const structuredNotes = useMemo(() => {
    const noteRows = [
      `Licensed: ${yesNoLabel(qualification.licensed)}`,
      `Currently has buyer: ${yesNoLabel(qualification.hasBuyerNow)}`,
      `Pipeline stage: ${
        qualification.pipelineStage ? pipelineStageLabels[qualification.pipelineStage] : 'Not specified'
      }`,
      `City / Province: ${application.cityProvince.trim() || 'Not provided'}`,
      `Estimated budget range: ${
        application.budgetRange ? budgetRangeLabels[application.budgetRange] : 'Not provided'
      }`,
      `Applicant type: ${application.partnerType ? partnerTypeLabels[application.partnerType] : 'Not provided'}`,
    ];
    if (application.notes.trim()) {
      noteRows.push(`Additional notes: ${application.notes.trim()}`);
    }
    return noteRows.join('\n');
  }, [application, qualification]);

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please complete all required fields.');
      return;
    }
    submitMutation.mutate({
      fullName: application.fullName.trim(),
      email: application.email.trim(),
      phone: application.phone.trim(),
      notes: structuredNotes,
    });
  };

  return (
    <>
      <SEOHead
        title="Apply | Distribution Referral Network"
        description="Apply to join the Distribution Referral Network and submit qualified buyers for approved developments."
        canonicalUrl="https://platform.com/distribution-network/apply"
        ogImage="https://platform.com/images/advertise-og-image.jpg"
        ogType="website"
      />
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <main id="main-content" className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900">
          <section className="hero-section relative overflow-hidden pb-10 pt-12 md:pb-14 md:pt-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_40%),radial-gradient(circle_at_0%_30%,rgba(37,99,235,0.14),transparent_35%)]" />
            <div className="container relative">
              <button
                type="button"
                onClick={() => setLocation('/distribution-network')}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Distribution Network
              </button>

              <div className="mx-auto max-w-4xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  Referral Access Application
                </div>
                <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Join the Distribution Referral Network
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
                  Submit qualified buyers for approved new developments. Track your deals. Get paid
                  after signing.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white py-12 md:py-16">
            <div className="container grid gap-6 lg:grid-cols-3">
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
                  <p className="mt-4 text-xs text-slate-500">
                    You are not listing property. You are referring qualified buyers.
                  </p>
                </CardContent>
              </Card>

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
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container">
              <Card className="mx-auto max-w-4xl border-slate-200 bg-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.20)]">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <div className="space-y-5 text-center">
                      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-6 w-6" />
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-900">Application Received</h2>
                      <p className="mx-auto max-w-2xl text-sm text-slate-600">
                        We review every referral application manually. If approved, you will receive next-step
                        onboarding and access details by email.
                      </p>
                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button onClick={() => setLocation('/distribution-network')}>Back to Network Page</Button>
                        <Button variant="outline" onClick={() => setLocation('/book-strategy')}>
                          Book Strategy Call
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                            Application Flow
                          </p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                            {step === 1 ? 'Quick Qualification Step' : 'Referral Application Form'}
                          </h2>
                        </div>
                        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
                          <span
                            className={`rounded-full px-3 py-1 ${
                              step === 1 ? 'bg-slate-900 text-white' : 'text-slate-600'
                            }`}
                          >
                            1. Qualification
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 ${
                              step === 2 ? 'bg-slate-900 text-white' : 'text-slate-600'
                            }`}
                          >
                            2. Application
                          </span>
                        </div>
                      </div>

                      {step === 1 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Are you a licensed property practitioner?
                            </label>
                            <select
                              value={qualification.licensed}
                              onChange={e =>
                                setQualification(prev => ({
                                  ...prev,
                                  licensed: e.target.value as YesNo,
                                }))
                              }
                              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                            >
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Do you currently have a buyer to refer?
                            </label>
                            <select
                              value={qualification.hasBuyerNow}
                              onChange={e =>
                                setQualification(prev => ({
                                  ...prev,
                                  hasBuyerNow: e.target.value as YesNo,
                                }))
                              }
                              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                            >
                              <option value="">Select</option>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                            </select>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">
                              Which best describes your referral pipeline right now?
                            </label>
                            <select
                              value={qualification.pipelineStage}
                              onChange={e =>
                                setQualification(prev => ({
                                  ...prev,
                                  pipelineStage: e.target.value as PipelineStage,
                                }))
                              }
                              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                            >
                              <option value="">Select</option>
                              <option value="ready_now">Buyer is ready now</option>
                              <option value="within_90_days">Likely within 90 days</option>
                              <option value="building_pipeline">Building pipeline</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <Button
                              className="h-11 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white"
                              disabled={!canAdvanceFromQualification}
                              onClick={() => setStep(2)}
                            >
                              Continue to Application
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Full Name</label>
                            <Input
                              value={application.fullName}
                              onChange={e =>
                                setApplication(prev => ({ ...prev, fullName: e.target.value }))
                              }
                              placeholder="Your full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Phone</label>
                            <Input
                              value={application.phone}
                              onChange={e => setApplication(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+27 ..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <Input
                              type="email"
                              value={application.email}
                              onChange={e => setApplication(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="name@domain.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">City / Province</label>
                            <Input
                              value={application.cityProvince}
                              onChange={e =>
                                setApplication(prev => ({ ...prev, cityProvince: e.target.value }))
                              }
                              placeholder="Johannesburg, Gauteng"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Estimated Buyer Budget Range
                            </label>
                            <select
                              value={application.budgetRange}
                              onChange={e =>
                                setApplication(prev => ({
                                  ...prev,
                                  budgetRange: e.target.value as BudgetRange,
                                }))
                              }
                              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                            >
                              <option value="">Select budget range</option>
                              <option value="under_r750k">Under R750,000</option>
                              <option value="r750k_r1_5m">R750,000 - R1,500,000</option>
                              <option value="r1_5m_r3m">R1,500,000 - R3,000,000</option>
                              <option value="r3m_r5m">R3,000,000 - R5,000,000</option>
                              <option value="over_r5m">Over R5,000,000</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Who Are You Applying As?</label>
                            <select
                              value={application.partnerType}
                              onChange={e =>
                                setApplication(prev => ({
                                  ...prev,
                                  partnerType: e.target.value as PartnerType,
                                }))
                              }
                              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                            >
                              <option value="">Select applicant type</option>
                              <option value="independent_agent">Independent Property Agent</option>
                              <option value="small_brokerage">Small Brokerage</option>
                              <option value="referral_partner">Referral Partner</option>
                              <option value="individual">Individual With Qualified Buyer</option>
                            </select>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">
                              Additional Notes (Optional)
                            </label>
                            <textarea
                              value={application.notes}
                              onChange={e => setApplication(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Any context about your buyer profile, preferred developments, or timeline."
                              className="min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-600">
                              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                              <span>
                                Applications are reviewed manually before access is granted. Approval is based on
                                quality and fit for the referral workflow.
                              </span>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <Button variant="outline" onClick={() => setStep(1)} className="sm:w-auto">
                                Back
                              </Button>
                              <Button
                                disabled={!canSubmit || submitMutation.isPending}
                                className="bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white sm:w-auto"
                                onClick={handleSubmit}
                              >
                                {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="pb-14 md:pb-20">
            <div className="container">
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center sm:px-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Briefcase className="h-3.5 w-3.5" />
                  Referral Program Principle
                </div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  You already have buyers. We have approved developments.
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
                  This pathway is built for structured referral submissions and commission outcomes, not subscription
                  plan selection.
                </p>
                <div className="mt-5">
                  <Button variant="outline" onClick={() => setLocation('/distribution-network')}>
                    Explore Program Overview
                    <Building2 className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
