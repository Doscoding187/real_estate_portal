import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Calculator, Info, Loader2, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Button } from '@/components/ui/button';

export default function PartnerReferralAcceleratorPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) setLocation('/login');
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-10 pt-7 md:px-7">
        <section>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe0f8] bg-[#eff5fe] px-3 py-1 text-[12px] font-medium text-[#1d6fe3]">
            <Calculator className="h-3.5 w-3.5" /> Budget and property fit
          </span>
          <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0b1c3f]">
            Income-based estimates are not ready yet
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
            We are finalizing the assumptions behind purchase estimates before showing matches based
            on someone's income. For now, you can explore current properties by listed price, area,
            bedrooms, and whether the person wants to buy or rent.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="conversion" onClick={() => setLocation('/distribution/partner/developments')}>
              <Search className="mr-2 h-4 w-4" /> Find property opportunities
            </Button>
            <Button variant="outline" onClick={() => setLocation('/distribution/partner/referrals')}>
              My deals
            </Button>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-[#cfe0f8] bg-[#eff5fe] p-5 text-[12.5px] leading-5 text-[#33507e] md:grid-cols-2 md:p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">What you can do now.</span> Browse
              opportunities by listed price, area, and bedrooms, and start an introduction when the
              person is ready.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe3]" />
            <p>
              <span className="font-semibold text-[#0b1c3f]">A listed price is not an approval.</span>{' '}
              A listed price does not mean a lender will approve them. Estimates will appear only
              once the approved assessment model is in place.
            </p>
          </div>
        </section>
      </main>
    </ReferralAppShell>
  );
}
