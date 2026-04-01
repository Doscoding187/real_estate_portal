import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AgentSetupWizard } from '../components/agent/AgentSetupWizard';
import { apiFetch } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type AgentOnboardingGuard = {
  packageSelected: boolean;
};

export default function AgentSetup() {
  const [, setLocation] = useLocation();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const result = await apiFetch<AgentOnboardingGuard>('/agent/onboarding-status');
        if (cancelled) return;

        if (!result.packageSelected) {
          setLocation('/agent/select-package');
          return;
        }
      } catch {
        if (!cancelled) {
          setLocation('/agent/select-package');
          return;
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAccess(false);
        }
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          Loading setup...
        </div>
      </div>
    );
  }

  return <AgentSetupWizard />;
}
