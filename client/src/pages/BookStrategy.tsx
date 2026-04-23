import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, CalendarDays, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/advertise/SEOHead';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import {
  getAdvertiserRoleFromUnknown,
  getAdvertiserRoleSlug,
  setStoredAdvertiserPath,
  getStoredAdvertiserRole,
  setStoredAdvertiserRole,
  type AdvertiserRole,
} from '@/lib/advertise/onboarding';

type FormState = {
  fullName: string;
  email: string;
  role: AdvertiserRole | '';
  portfolioSize: '1-10' | '11-50' | '51-200' | '200+' | '';
  budgetBand: 'starter' | 'growth' | 'premium' | 'enterprise' | '';
};

const defaultForm: FormState = {
  fullName: '',
  email: '',
  role: '',
  portfolioSize: '',
  budgetBand: '',
};

export default function BookStrategy() {
  const [, setLocation] = useLocation();
  const preselectedRole = useMemo(() => {
    const fromQuery = getAdvertiserRoleFromUnknown(
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null,
    );
    return fromQuery || getStoredAdvertiserRole();
  }, []);
  const [form, setForm] = useState<FormState>({ ...defaultForm, role: preselectedRole || '' });
  const [readyForBooking, setReadyForBooking] = useState(false);
  const [calendarLoaded, setCalendarLoaded] = useState(false);

  useEffect(() => {
    setStoredAdvertiserPath('strategy_call');
  }, []);

  const calendarUrl = useMemo(
    () =>
      (import.meta as any).env?.VITE_STRATEGY_CALENDAR_URL ||
      'https://calendly.com/propertylistify/strategy-session',
    [],
  );

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (key === 'role' && value) {
      setStoredAdvertiserRole(value as AdvertiserRole);
    }
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    const isValid =
      form.fullName.trim() &&
      form.email.trim() &&
      form.role &&
      form.portfolioSize &&
      form.budgetBand;

    if (!isValid) return;

    setReadyForBooking(true);
    setCalendarLoaded(false);
    setStoredAdvertiserPath('strategy_call');
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'book_strategy',
      action: 'qualification_submitted',
      role: form.role,
      plan: form.budgetBand,
    });
  };

  const handleCalendarLoad = () => {
    setCalendarLoaded(true);
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'book_strategy',
      action: 'calendar_loaded',
      role: form.role || undefined,
    });
  };

  const handleBookingConfirmed = () => {
    if (!form.role) {
      setLocation('/get-started');
      return;
    }

    setStoredAdvertiserRole(form.role);
    setStoredAdvertiserPath('strategy_call');
    const confirmationHref = `/get-started/${getAdvertiserRoleSlug(form.role)}/confirmation`;
    trackFunnelStep({
      funnel: 'advertise_get_started',
      step: 'book_strategy',
      action: 'strategy_booked',
      role: form.role,
      path: 'strategy_call',
    });
    trackCTAClick({
      ctaLabel: 'Continue to Strategy Confirmation',
      ctaLocation: 'book_strategy_confirmation',
      ctaHref: confirmationHref,
    });
    setLocation(confirmationHref);
  };

  return (
    <>
      <SEOHead
        title="Book Strategy | Advertise With Us"
        description="Book a guided strategy session to position your property marketing for qualified buyer demand."
        canonicalUrl="/book-strategy"
        ogImage="/images/advertise-og-image.jpg"
        ogType="website"
      />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <button
            type="button"
            onClick={() =>
              setLocation(form.role ? `/get-started/${getAdvertiserRoleSlug(form.role)}` : '/get-started')
            }
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Onboarding
          </button>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardContent className="space-y-5 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Strategy Session
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">
                    Book Your Growth Strategy Call
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    Tell us a bit about your portfolio so we can align the right onboarding path.
                  </p>
                </div>

                <div className="grid gap-4">
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    placeholder="Full Name"
                    value={form.fullName}
                    onChange={e => handleChange('fullName', e.target.value)}
                  />
                  <input
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    placeholder="Work Email"
                    type="email"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                  />
                  <select
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    value={form.role}
                    onChange={e => handleChange('role', e.target.value as FormState['role'])}
                  >
                    <option value="">Role</option>
                    <option value="agent">Estate Agent</option>
                    <option value="agency">Real Estate Agency</option>
                    <option value="developer">Developer</option>
                    <option value="private_seller">Private Seller</option>
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    value={form.portfolioSize}
                    onChange={e =>
                      handleChange('portfolioSize', e.target.value as FormState['portfolioSize'])
                    }
                  >
                    <option value="">Portfolio Size</option>
                    <option value="1-10">1-10 listings/units</option>
                    <option value="11-50">11-50 listings/units</option>
                    <option value="51-200">51-200 listings/units</option>
                    <option value="200+">200+ listings/units</option>
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                    value={form.budgetBand}
                    onChange={e => handleChange('budgetBand', e.target.value as FormState['budgetBand'])}
                  >
                    <option value="">Budget Band</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={handleContinue}>
                  Continue to Calendar
                </Button>
                <p className="text-xs text-slate-500">
                  This keeps onboarding relevant and reduces setup friction.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                {!readyForBooking ? (
                  <div className="flex h-full min-h-[520px] flex-col items-center justify-center text-center">
                    <CalendarDays className="h-8 w-8 text-blue-700" />
                    <p className="mt-3 text-base font-medium text-slate-900">
                      Complete qualification to unlock booking
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-slate-600">
                      We use your details to prepare the strategy call around your market and growth
                      targets.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Qualification Complete
                    </p>
                    <iframe
                      title="Strategy booking calendar"
                      src={calendarUrl}
                      className="h-[560px] w-full rounded-md border border-slate-200"
                      onLoad={handleCalendarLoad}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        trackCTAClick({
                          ctaLabel: 'Open Strategy Calendar in New Tab',
                          ctaLocation: 'book_strategy_calendar',
                          ctaHref: calendarUrl,
                        });
                        window.open(calendarUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Open Calendar in New Tab
                    </Button>
                    <Button
                      className="w-full bg-blue-600 text-white hover:bg-blue-700"
                      disabled={!calendarLoaded}
                      onClick={handleBookingConfirmed}
                    >
                      I&apos;ve Booked My Strategy Session
                    </Button>
                    <p className="text-center text-xs text-slate-500">
                      Confirm after you complete your booking to continue with guided onboarding.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
