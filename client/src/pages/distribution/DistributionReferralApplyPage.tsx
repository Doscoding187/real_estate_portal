import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import {
  publicShortlistStorageKey,
  readSavedSelections,
} from '@/components/distribution/distributionShortlistStorage';
import { readCheckfitSnapshot } from '@/components/distribution/distributionCheckfitStorage';
import '@/styles/advertise-responsive.css';

type PartnerType = 'agent' | 'individual' | '';

const ACCOUNT_LOGIN_PATH = '/login?next=/distribution/partner/overview';
const partnerTypeLabels: Record<Exclude<PartnerType, ''>, string> = {
  agent: 'Property Agent',
  individual: 'Individual Referrer',
};

export default function DistributionReferralApplyPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    partnerType: '' as PartnerType,
  });

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setForm(current => ({
      ...current,
      fullName: current.fullName || user.name || '',
      email: user.email || current.email,
    }));
  }, [isAuthenticated, user?.email, user?.name]);

  const interestedIn = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('interestedIn');
    }
    return null;
  }, []);

  const carried = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const shortlistCount =
      Object.keys(readSavedSelections(publicShortlistStorageKey('sale'))).length +
      Object.keys(readSavedSelections(publicShortlistStorageKey('rent'))).length;
    const checkfit = readCheckfitSnapshot();
    if (shortlistCount === 0 && !checkfit) return null;
    return { shortlistCount, checkfit };
  }, []);

  const formatRand = (value: number) => `R${Math.round(value).toLocaleString('en-ZA')}`;

  const notes = useMemo(() => {
    let baseNote = !form.partnerType
      ? 'Applicant type: Not specified'
      : `Applicant type: ${partnerTypeLabels[form.partnerType]}`;
    if (interestedIn) {
      baseNote += ` | Interested Development ID: ${interestedIn}`;
    }
    return baseNote;
  }, [form.partnerType, interestedIn]);

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
    !authLoading &&
    form.fullName.trim().length >= 2 &&
    form.email.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.partnerType !== '';

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
        title="Join | Property Listify Distribution Network"
        description="Apply to participate in Property Listify's Distribution Network. Access and any referral payout depend on approval and active program terms."
        canonicalUrl="/distribution-network/apply"
        ogType="website"
      />
      <div className="min-h-screen bg-slate-50">
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg">
          <div className="container flex h-16 items-center justify-between">
            <button
              type="button"
              onClick={() => setLocation('/distribution-network')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Distribution Network
            </button>
            <Link
              href={ACCOUNT_LOGIN_PATH}
              className="text-sm font-medium text-primary hover:text-[var(--brand-blue-hover)]"
            >
              Already have a Property Listify account? Sign in
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          className="advertise-page relative overflow-x-hidden bg-slate-50 pt-16 text-slate-900"
        >
          <section className="relative overflow-hidden py-14 md:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.08),transparent_40%)]" />

            <div className="container relative max-w-xl">
              <div className="mb-5 text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Distribution Referral Access
                </div>
                <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  Join the{' '}
                  <span className="bg-[linear-gradient(135deg,var(--info),var(--brand-blue))] bg-clip-text text-transparent">
                    Referral Network
                  </span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">
                  No buyer is required to apply. Use the email on your Property Listify account; if
                  you are new, create an account with that same email after applying. Approved
                  Distribution access will be attached to that account.
                </p>
              </div>

              {carried ? (
                <div className="mb-5 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-slate-700">
                  <p className="mb-2 font-semibold text-slate-900">Carried from this browser</p>
                  <ul className="space-y-1">
                    {carried.shortlistCount > 0 ? (
                      <li>
                        Your shortlist has{' '}
                        <strong>
                          {carried.shortlistCount} selected option
                          {carried.shortlistCount === 1 ? '' : 's'}
                        </strong>
                        . After you sign in, the saved search-only shortlist is attached to your
                        account and appears on your referrer dashboard.
                      </li>
                    ) : null}
                    {carried.checkfit ? (
                      <li>
                        Your check-fit shows an indicative purchase price up to{' '}
                        <strong>{formatRand(carried.checkfit.result.estimatedPurchasePrice)}</strong>{' '}
                        at {carried.checkfit.assumptions.annualInterestRate.toFixed(2)}% interest.
                        Indicative only — not an approval. It stays on this device.
                      </li>
                    ) : null}
                  </ul>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    A saved shortlist is not a financial check fit or a submitted referral. No
                    prospect identity or contact details are included.
                  </p>
                </div>
              ) : null}

              <Card className="border-slate-200 bg-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.18)]">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <div className="space-y-5 text-center py-4">
                      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check className="h-7 w-7" />
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        Application Received
                      </h2>
                      <p className="mx-auto max-w-xs text-sm text-slate-600">
                        We review every application. After approval, your Distribution membership
                        and Distribution ID will be connected to the Property Listify account using
                        this email. If you are new, create your account with this same email. You
                        will use one login for both workspaces.
                      </p>
                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button variant="outline" onClick={() => setLocation('/distribution-network')}>
                          Explore Opportunities
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setLocation(
                              isAuthenticated
                                ? user?.role === 'agent'
                                  ? '/agent/dashboard'
                                  : '/distribution/partner/overview'
                                : ACCOUNT_LOGIN_PATH,
                            )
                          }
                        >
                          {isAuthenticated ? 'Return to my dashboard' : 'Sign in or create account'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Full Name</label>
                          <Input
                            value={form.fullName}
                            onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="Your full name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">Email</label>
                          <Input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="name@domain.com"
                            readOnly={Boolean(isAuthenticated && user?.email)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-slate-700">
                            Phone / WhatsApp
                          </label>
                          <Input
                            value={form.phone}
                            onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+27 ..."
                          />
                        </div>
                        <div className="space-y-1.5">
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
                            <option value="agent">Property Agent</option>
                            <option value="individual">Individual Referrer</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Button
                          variant="conversion"
                          className="w-full h-11"
                          disabled={!canSubmit || submitMutation.isPending}
                          onClick={handleSubmit}
                        >
                          {submitMutation.isPending ? 'Submitting...' : 'Submit application'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Link
                          href={ACCOUNT_LOGIN_PATH}
                          className="block text-center text-sm font-medium text-primary hover:text-[var(--brand-blue-hover)]"
                        >
                          Already have a Property Listify account? Sign in
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
