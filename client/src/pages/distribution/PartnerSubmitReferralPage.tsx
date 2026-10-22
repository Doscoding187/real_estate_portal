import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ReferralIntakePausedCard } from '@/components/distribution/partner/ReferralIntakePausedCard';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

export default function PartnerSubmitReferralPage() {
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
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-10 pt-6 md:px-7">
        <ReferralIntakePausedCard />
      </main>
    </ReferralAppShell>
  );
}
