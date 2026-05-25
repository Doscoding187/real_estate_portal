import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';

type FunnelStep = 'profile' | 'contact' | 'done';

type QualificationState = {
  preferredCity: string;
  grossMonthlyIncomeRange: string;
  grossMonthlyIncome?: number;
  employmentType:
    | 'permanently_employed'
    | 'self_employed'
    | 'business_owner'
    | 'contract_worker'
    | 'government_employee'
    | 'not_currently_employed'
    | 'other';
  buyingMode: 'solo' | 'joint' | 'unsure';
  creditReportStatus:
    | 'checked_good'
    | 'checked_unsure'
    | 'not_checked_recently'
    | 'needs_help'
    | 'prefer_not_to_say';
};

type ContactState = {
  fullName: string;
  phone: string;
  email: string;
  preferredContactMethod: 'phone' | 'whatsapp' | 'email' | 'any';
  contactPermission: boolean;
  marketingConsent: boolean;
};

const incomeOptions = [
  { label: 'Below R15,000', value: 'below_15000', amount: 12_000 },
  { label: 'R15,000 - R25,000', value: '15000_25000', amount: 20_000 },
  { label: 'R25,000 - R35,000', value: '25000_35000', amount: 30_000 },
  { label: 'R35,000 - R50,000', value: '35000_50000', amount: 42_000 },
  { label: 'R50,000+', value: '50000_plus', amount: 55_000 },
];

const parseImages = (imagesValue: unknown): string[] => {
  if (!imagesValue) return [];
  let parsed = imagesValue;
  if (typeof imagesValue === 'string') {
    try {
      parsed = JSON.parse(imagesValue);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any) => (typeof item === 'string' ? item : item?.url || item?.src || ''))
    .filter(Boolean);
};

const formatMoney = (value?: number | string | null) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 'Price on request';
  return `From R${numberValue.toLocaleString('en-ZA')}`;
};

const getUtmParams = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmTerm: params.get('utm_term'),
    fbclid: params.get('fbclid'),
    gclid: params.get('gclid'),
    referrerUrl: document.referrer || null,
    landingPageUrl: window.location.href,
  };
};

export default function DevelopmentLeadFunnelPage() {
  const [, campaignParams] = useRoute('/campaign/:slug');
  const campaignSlug = campaignParams?.slug || null;
  const [step, setStep] = useState<FunnelStep>('profile');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [profile, setProfile] = useState<QualificationState>({
    preferredCity: 'Johannesburg South',
    grossMonthlyIncomeRange: '25000_35000',
    grossMonthlyIncome: 30_000,
    employmentType: 'permanently_employed',
    buyingMode: 'solo',
    creditReportStatus: 'not_checked_recently',
  });
  const [contact, setContact] = useState<ContactState>({
    fullName: '',
    phone: '',
    email: '',
    preferredContactMethod: 'whatsapp',
    contactPermission: true,
    marketingConsent: false,
  });

  const developmentsQuery = trpc.developer.listPublicDevelopments.useQuery({ limit: 8 });
  const startSession = trpc.leadRouting.startSession.useMutation({
    onSuccess: result => setSessionToken(result.sessionToken),
  });
  const saveQualification = trpc.leadRouting.saveQualificationProfile.useMutation();
  const captureLead = trpc.leadRouting.captureBuyerLead.useMutation();
  const recordDevelopmentMatches = trpc.leadRouting.recordDevelopmentMatches.useMutation();
  const createRoutingDecision = trpc.leadRouting.createRoutingDecision.useMutation();

  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    startSession.mutate({
      campaignSlug,
      ...getUtmParams(),
      metadata: { entryMode: campaignSlug ? 'campaign' : 'discovery' },
    });
  }, [campaignSlug, startSession]);

  const developments = developmentsQuery.data || [];
  const selectedIncome = incomeOptions.find(
    option => option.value === profile.grossMonthlyIncomeRange,
  );
  const matchedDevelopments = useMemo(() => {
    const city = profile.preferredCity.trim().toLowerCase();
    return [...developments]
      .map((development: any) => {
        const locationMatch = Boolean(
          city &&
          String(development.city || '')
            .toLowerCase()
            .includes(city.toLowerCase()),
        );
        const price = Number(development.priceFrom || 0);
        const estimatedIncome = price > 0 ? Math.round(price * 0.035) : null;
        const incomeFit =
          !estimatedIncome ||
          !profile.grossMonthlyIncome ||
          profile.grossMonthlyIncome >= estimatedIncome;
        const score =
          (locationMatch ? 40 : 10) + (incomeFit ? 30 : 12) + (development.isFeatured ? 10 : 0);
        return {
          ...development,
          leadScore: score,
          incomeFit,
          estimatedIncome,
          locationMatch,
          campaignEligible: Boolean(development.isFeatured),
          distributionReady: false,
          submissionAllowed: false,
        };
      })
      .sort((a: any, b: any) => b.leadScore - a.leadScore)
      .slice(0, 4);
  }, [developments, profile.grossMonthlyIncome, profile.preferredCity]);

  const primaryMatch = matchedDevelopments[0] as any;
  const selectedDevelopment =
    matchedDevelopments.find(
      (development: any) => Number(development.id) === selectedDevelopmentId,
    ) || primaryMatch;

  async function handleProfileContinue() {
    const amount = incomeOptions.find(
      option => option.value === profile.grossMonthlyIncomeRange,
    )?.amount;
    const answers = {
      sessionToken,
      preferredProvince: 'Gauteng',
      preferredCity: profile.preferredCity,
      grossMonthlyIncomeRange: selectedIncome?.label || profile.grossMonthlyIncomeRange,
      grossMonthlyIncome: amount,
      employmentType: profile.employmentType,
      buyingMode: profile.buyingMode,
      creditReportStatus: profile.creditReportStatus,
      metadata: { surface: 'development_lead_funnel' },
    };

    if (sessionToken) await saveQualification.mutateAsync(answers);
    setProfile(current => ({ ...current, grossMonthlyIncome: amount }));
    setStep('contact');
  }

  async function handleSubmitLead() {
    if (!contact.fullName.trim() || (!contact.phone.trim() && !contact.email.trim())) return;

    const lead = await captureLead.mutateAsync({
      sessionToken,
      fullName: contact.fullName,
      phone: contact.phone || null,
      email: contact.email || null,
      preferredContactMethod: contact.preferredContactMethod,
      contactPermission: contact.contactPermission,
      marketingConsent: contact.marketingConsent,
      privacyPolicyVersion: '2026-05-25',
      metadata: {
        selectedDevelopmentId: selectedDevelopment?.id ?? null,
        sourceSurface: 'development_lead_funnel',
      },
    });

    const recordedMatches = await recordDevelopmentMatches.mutateAsync({
      buyerLeadId: lead.buyerLeadId,
      sessionId: lead.sessionId,
      campaignId: lead.campaignId,
      sourceType: lead.sourceType,
      selectedDevelopmentId: selectedDevelopment ? Number(selectedDevelopment.id) : null,
      matches: matchedDevelopments.map((development: any) => ({
        developmentId: Number(development.id),
        matchScore: Number(development.leadScore || 0),
        matchLabel: development.leadScore >= 75 ? 'good_match' : 'possible_match',
        matchReasons: [
          {
            code: development.locationMatch ? 'location_match' : 'location_review',
            label: development.locationMatch
              ? 'Preferred area is close to this development.'
              : 'Area should be reviewed with an advisor.',
            points: development.locationMatch ? 40 : 10,
          },
          {
            code: development.incomeFit ? 'income_likely_suitable' : 'income_review',
            label: development.incomeFit
              ? 'Income appears suitable for light matching.'
              : 'Income should be reviewed with an advisor.',
            points: development.incomeFit ? 30 : 12,
          },
        ],
        incomeEligible: Boolean(development.incomeFit),
        locationMatch: Boolean(development.locationMatch),
        campaignEligible: Boolean(development.campaignEligible),
        distributionReady: Boolean(development.distributionReady),
        submissionAllowed: Boolean(development.submissionAllowed),
      })),
    });

    const selectedRecordedMatch = recordedMatches.matches.find(match => match.selectedByBuyer);

    await createRoutingDecision.mutateAsync({
      buyerLeadId: lead.buyerLeadId,
      sessionId: lead.sessionId,
      campaignId: lead.campaignId,
      sourceType: lead.sourceType,
      preferredContactMethod: contact.preferredContactMethod,
      creditReportStatus: profile.creditReportStatus,
      match: selectedRecordedMatch
        ? {
            selectedMatchId: selectedRecordedMatch.id,
            developmentId: selectedRecordedMatch.developmentId,
            distributionReady: selectedRecordedMatch.distributionReady,
            submissionAllowed: selectedRecordedMatch.submissionAllowed,
            matchLabel: selectedRecordedMatch.matchLabel,
          }
        : null,
      metadata: { selectedDevelopmentName: selectedDevelopment?.name ?? null },
    });

    setStep('done');
  }

  const isSubmitting =
    saveQualification.isPending ||
    captureLead.isPending ||
    recordDevelopmentMatches.isPending ||
    createRoutingDecision.isPending;

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Property Listify</p>
              <p className="text-xs text-slate-500">Development options</p>
            </div>
          </div>
          <a className="text-sm font-medium text-emerald-800" href="tel:+27000000000">
            <Phone className="mr-2 inline h-4 w-4" /> Speak to an advisor
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              {campaignSlug ? campaignSlug.replace(/-/g, ' ') : 'Available developments'}
            </p>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                Find homes that may fit your budget and area
              </h1>
              <p className="text-base leading-7 text-slate-600 sm:text-lg">
                Explore current development options, then share a few details so an advisor can help
                check affordability and the next best step.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {developmentsQuery.isLoading ? (
              <div className="flex min-h-56 items-center justify-center rounded-md border border-slate-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
              </div>
            ) : matchedDevelopments.length ? (
              matchedDevelopments.map((development: any) => {
                const images = parseImages(development.images);
                const isSelected = Number(selectedDevelopment?.id) === Number(development.id);
                return (
                  <button
                    key={development.id}
                    type="button"
                    onClick={() => setSelectedDevelopmentId(Number(development.id))}
                    className={`overflow-hidden rounded-md border bg-white text-left transition hover:border-emerald-700 ${
                      isSelected
                        ? 'border-emerald-700 ring-2 ring-emerald-700/15'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="aspect-[16/9] bg-slate-100">
                      {images[0] ? (
                        <img src={images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Home className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-950">
                          {development.name}
                        </h2>
                        <p className="mt-1 flex items-center text-sm text-slate-500">
                          <MapPin className="mr-1 h-4 w-4" />
                          {[development.suburb, development.city].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-emerald-800">
                          {formatMoney(development.priceFrom)}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                          {development.incomeFit ? 'Likely suitable' : 'Advisor review'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">
                We are loading available options for this area.
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          {step === 'profile' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Refine your options</h2>
                <p className="mt-1 text-sm text-slate-500">
                  This helps us show homes that may suit your profile.
                </p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Preferred area</span>
                <Input
                  value={profile.preferredCity}
                  onChange={event => setProfile({ ...profile, preferredCity: event.target.value })}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Monthly gross income</span>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={profile.grossMonthlyIncomeRange}
                  onChange={event =>
                    setProfile({ ...profile, grossMonthlyIncomeRange: event.target.value })
                  }
                >
                  {incomeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Employment type</span>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={profile.employmentType}
                  onChange={event =>
                    setProfile({ ...profile, employmentType: event.target.value as any })
                  }
                >
                  <option value="permanently_employed">Permanently employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="business_owner">Business owner</option>
                  <option value="contract_worker">Contract worker</option>
                  <option value="government_employee">Government employee</option>
                  <option value="not_currently_employed">Not currently employed</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(['solo', 'joint', 'unsure'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setProfile({ ...profile, buyingMode: mode })}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      profile.buyingMode === mode
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {mode === 'solo' ? 'Alone' : mode === 'joint' ? 'Joint' : 'Unsure'}
                  </button>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Credit report status</span>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={profile.creditReportStatus}
                  onChange={event =>
                    setProfile({ ...profile, creditReportStatus: event.target.value as any })
                  }
                >
                  <option value="checked_good">Checked, looks good</option>
                  <option value="checked_unsure">Checked, not sure</option>
                  <option value="not_checked_recently">Not checked recently</option>
                  <option value="needs_help">Need help checking</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>

              <Button
                className="w-full"
                onClick={handleProfileContinue}
                disabled={!sessionToken && startSession.isPending}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 'contact' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Send me the next steps</h2>
                <p className="mt-1 text-sm text-slate-500">
                  An advisor can review your details and help with the selected development.
                </p>
              </div>

              <Input
                placeholder="Full name"
                value={contact.fullName}
                onChange={event => setContact({ ...contact, fullName: event.target.value })}
              />
              <Input
                placeholder="Phone number"
                value={contact.phone}
                onChange={event => setContact({ ...contact, phone: event.target.value })}
              />
              <Input
                placeholder="Email address"
                value={contact.email}
                onChange={event => setContact({ ...contact, email: event.target.value })}
              />

              <label className="block space-y-2">
                <span className="text-sm font-medium">Preferred contact</span>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={contact.preferredContactMethod}
                  onChange={event =>
                    setContact({ ...contact, preferredContactMethod: event.target.value as any })
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone call</option>
                  <option value="email">Email</option>
                  <option value="any">Any</option>
                </select>
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-600">
                <Checkbox
                  checked={contact.contactPermission}
                  onCheckedChange={checked =>
                    setContact({ ...contact, contactPermission: checked === true })
                  }
                />
                I agree that Property Listify may contact me about these property options.
              </label>

              <label className="flex items-start gap-3 text-sm text-slate-600">
                <Checkbox
                  checked={contact.marketingConsent}
                  onCheckedChange={checked =>
                    setContact({ ...contact, marketingConsent: checked === true })
                  }
                />
                Send me relevant property updates and affordability guidance.
              </label>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('profile')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitLead}
                  disabled={
                    isSubmitting ||
                    !contact.fullName.trim() ||
                    (!contact.phone.trim() && !contact.email.trim())
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Your request is in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We have saved your details and selected options. An advisor can now review the
                  next best step with you.
                </p>
              </div>
              <Button className="w-full" asChild>
                <a href="https://wa.me/27000000000">Open WhatsApp</a>
              </Button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
