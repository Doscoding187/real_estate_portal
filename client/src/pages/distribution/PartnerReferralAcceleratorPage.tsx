import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-6 md:px-7">
        <Card className="mx-auto max-w-3xl border-primary/15 bg-white shadow-sm">
          <CardContent className="p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Budget and property fit</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">Income-based estimates are not ready yet</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We are finalizing the assumptions behind purchase estimates before showing matches based on someone’s income. For now, you can explore current properties by listed price, area, bedrooms, and whether the person wants to buy or rent. A listed price does not mean a lender will approve them.
            </p>
            <Button className="mt-5" onClick={() => setLocation('/distribution/partner/developments')}>
              Find property opportunities
            </Button>
          </CardContent>
        </Card>
      </main>
    </ReferralAppShell>
  );
}
