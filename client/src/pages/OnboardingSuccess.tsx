// @ts-nocheck
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { CommercialActivationNotice } from '@/components/commercial/CommercialActivationNotice';

export default function OnboardingSuccess() {
  const [, navigate] = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Agency preparation workspace ready
          </h1>
          <p className="text-gray-600">
            Your agency identity and workspace are saved. Continue preparing your team and private
            inventory while commercial activation remains protected.
          </p>
        </div>

        <div className="mb-6">
          <CommercialActivationNotice />
        </div>

        <Button
          onClick={() => navigate('/agency/dashboard?welcome=true')}
          className="w-full"
          size="lg"
        >
          Open Agency workspace
          <span className="ml-2">→</span>
        </Button>

        <p className="mt-6 text-center text-xs text-gray-500">
          Publishing and marketplace activation remain available only after the approved commercial
          entitlement is enabled.
        </p>
      </div>
    </div>
  );
}
