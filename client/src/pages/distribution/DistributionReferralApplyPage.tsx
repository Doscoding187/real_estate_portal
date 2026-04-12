import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SEOHead } from '@/components/advertise/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import '@/styles/advertise-responsive.css';

type PartnerType = 'independent_agent' | 'small_brokerage' | 'referral_partner' | 'individual' | '';

const partnerTypeLabels: Record<Exclude<PartnerType, ''>, string> = {
  independent_agent: 'Independent Property Agent',
  small_brokerage: 'Small Brokerage',
  referral_partner: 'Referral Partner',
  individual: 'Individual With Qualified Buyer',
};

export default function DistributionReferralApplyPage() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    partnerType: '' as PartnerType,
  });

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
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800">
              Already have access? Sign in
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
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                  Distribution Referral Access
                </div>
                <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  Join the{' '}
                  <span className="bg-[linear-gradient(135deg,#06b6d4,#2563eb)] bg-clip-text text-transparent">
                    Referral Network
                  </span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">
                  Takes 2 minutes. No buyer required to apply. We'll review and send your access
                  details by email.
                </p>
              </div>

              <Card className="border-slate-200 bg-white shadow-[0_16px_34px_-18px_rgba(15,23,42,0.18)]">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <div className="space-y-5 text-center py-4">
                      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-7 w-7" />
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        Application Received
                      </h2>
                      <p className="mx-auto max-w-xs text-sm text-slate-600">
                        We review every application manually. You'll receive access details by
                        email once approved.
                      </p>
                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button onClick={() => setLocation('/distribution-network')}>
                          Explore Opportunities
                        </Button>
                        <Button variant="outline" onClick={() => setLocation('/login')}>
                          Sign in
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
                            <option value="independent_agent">Independent Property Agent</option>
                            <option value="small_brokerage">Small Brokerage</option>
                            <option value="referral_partner">Referral Partner</option>
                            <option value="individual">Individual With Qualified Buyer</option>
                          </select>
                        </div>
                      </div>

                      <Button
                        className="w-full h-11 bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white"
                        disabled={!canSubmit || submitMutation.isPending}
                        onClick={handleSubmit}
                      >
                        {submitMutation.isPending ? 'Submitting...' : 'Get Access'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
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
