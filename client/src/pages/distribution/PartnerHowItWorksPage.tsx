import { useLocation } from 'wouter';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FileText,
  Home,
  Info,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react';

const JOURNEY_STEPS = [
  {
    step: 1,
    icon: <User className="h-5 w-5" />,
    title: 'Understand their needs',
    body: 'Start with the person, not the property. Are they buying or renting, which area suits them, and what type of home do they have in mind? You do not need sales experience — your job is to listen and help them explore.',
  },
  {
    step: 2,
    icon: <Home className="h-5 w-5" />,
    title: 'Find suitable properties',
    body: 'Browse current sale and rental options by area, listed price, and bedrooms. Options come from what developers are actively marketing. Preliminary affordability is not active yet, so treat listed prices as the starting point and confirm fit with the person.',
  },
  {
    step: 3,
    icon: <ClipboardCheck className="h-5 w-5" />,
    title: "Introduce when they're ready",
    body: 'When they want to proceed, the referral flow guides you through the required permission and identity documents first, before any contact details. You choose the opportunity and submit the introduction. After that, progress appears only as it is recorded.',
  },
];

const AFTER_STEPS = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: 'The introduction and deal',
    body: 'Each introduction becomes a deal your team follows. You will see recorded milestones, what actually happened, what happens next, and who is responsible — never guessed states.',
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Referral payouts',
    body: 'Payouts follow the terms saved with each deal: potential, pending approval, approved, paid. Potential is not payable, approval is not payment, and a payment date appears only when the programme terms and verified progress support it.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Your shortlist',
    body: 'Exploring or printing a shortlist is not a referral. Shortlists stay in your browser with the prospect’s private details left out, and can be carried into your signed-in catalogue as a convenience.',
  },
];

export default function PartnerHowItWorksPage() {
  const [, setLocation] = useLocation();

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <button
            type="button"
            onClick={() => setLocation('/distribution/partner/overview')}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to overview
          </button>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            How referrals work
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            A simple path from someone you know to a recorded, verified referral outcome. No
            property-sales experience needed.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-3">
            {JOURNEY_STEPS.map(item => (
              <div key={item.step} className="rounded-lg border border-border bg-surface/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c7dbf5] bg-[#eef4fd] text-[12px] font-semibold text-[#1d6fe3]">
                    {item.step}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1d6fe3]">
                    {item.icon}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-[#0b1c3f]">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find opportunities
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/overview')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to overview
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[#0b1c3f]">What happens after you introduce someone</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {AFTER_STEPS.map(item => (
              <div key={item.title} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef4fd] text-[#1d6fe3]">
                  {item.icon}
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[#0b1c3f]">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-4">
          <Info className="h-4 w-4 shrink-0 text-[#1d6fe3]" />
          <p className="min-w-0 flex-1 text-[13px] leading-5 text-[#33507e]">
            Checking a shortlist does not mean a viewing is booked, a buyer is approved, a deal is
            complete, or a payout is earned. Every claim on this dashboard comes from a recorded
            event.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-[#9cc0ee] bg-white text-[#1d6fe3]"
            onClick={() => setLocation('/distribution/partner/overview')}
          >
            Go to overview <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      </main>
    </ReferralAppShell>
  );
}
