import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingSuccess() {
  const [, navigate] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);

  const agencyId = queryParams.get('agency_id');
  const sessionId = queryParams.get('session_id');

  const [autoTriggerAttempted, setAutoTriggerAttempted] = useState(false);
  const [manualTriggerNeeded, setManualTriggerNeeded] = useState(false);

  // Query agency status
  const {
    data: agency,
    refetch,
    isLoading,
  } = trpc.agency.getById.useQuery(
    { id: Number(agencyId) },
    {
      enabled: !!agencyId,
      refetchInterval: data => {
        // Stop polling once active
        if (data?.subscriptionStatus === 'active') return false;
        // In dev, only poll if auto-trigger succeeded
        if (import.meta.env.DEV) return autoTriggerAttempted ? 2000 : false;
        // In prod, poll for webhook (usually <5 seconds)
        return 2000;
      },
    },
  );

  const triggerWebhook = trpc.dev?.triggerWebhookManual.useMutation();
  const isActive = agency?.subscriptionStatus === 'active';

  // AUTO-TRIGGER in dev mode (simulate webhook)
  useEffect(() => {
    if (import.meta.env.DEV && agencyId && !autoTriggerAttempted && !isActive) {
      const autoTrigger = async () => {
        try {
          console.log('🔧 [DEV] Auto-triggering webhook...');

          await triggerWebhook?.mutateAsync({
            agencyId: Number(agencyId),
            planId: 1, // Default plan, will be set from actual selection
          });

          console.log('✅ [DEV] Webhook auto-triggered successfully');
          setAutoTriggerAttempted(true);

          // Refetch to get updated status
          setTimeout(() => refetch(), 500);
        } catch (error) {
          console.error('❌ [DEV] Auto-trigger failed:', error);
          setAutoTriggerAttempted(true);
          setManualTriggerNeeded(true);
          toast.error('Webhook auto-trigger failed. Use manual button below.');
        }
      };

      // Trigger after 1 second (let the page load first)
      const timeout = setTimeout(autoTrigger, 1000);
      return () => clearTimeout(timeout);
    }
  }, [agencyId, autoTriggerAttempted, isActive, triggerWebhook, refetch]);

  // Manual trigger handler
  const handleManualTrigger = async () => {
    if (!triggerWebhook) return;

    try {
      await triggerWebhook.mutateAsync({
        agencyId: Number(agencyId),
        planId: 1,
      });

      toast.success('Webhook triggered! Check console for emails.');
      setManualTriggerNeeded(false);

      // Refetch status
      setTimeout(() => refetch(), 500);
    } catch (error) {
      console.error('Manual trigger failed:', error);
      toast.error('Failed to trigger webhook. Check console.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your payment has been processed by Stripe.</p>
        </div>

        {/* Activation Status */}
        {!isActive ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">Activating your agency...</p>
                <p className="text-sm text-blue-700">
                  {import.meta.env.DEV
                    ? 'Simulating webhook processing'
                    : 'Processing payment webhook'}
                </p>
                {import.meta.env.DEV && (
                  <p className="text-xs text-blue-600 mt-2">
                    This usually takes 1-2 seconds locally
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 mb-1">Agency Activated! 🎉</p>
                <p className="text-sm text-green-700">Team invitations have been sent</p>
                {import.meta.env.DEV && (
                  <p className="text-xs text-green-600 mt-2">
                    📧 Check your terminal for email logs
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Trigger (if auto-trigger failed) */}
        {import.meta.env.DEV && manualTriggerNeeded && !isActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-2">Auto-trigger failed</p>
                <p className="text-xs text-yellow-700 mb-3">
                  Click below to manually activate the webhook:
                </p>
                <Button
                  onClick={handleManualTrigger}
                  disabled={triggerWebhook?.isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {triggerWebhook?.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Triggering...
                    </>
                  ) : (
                    '🔧 Trigger Webhook Manually'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={() => navigate('/agency/dashboard?welcome=true')}
          disabled={!isActive}
          className="w-full"
          size="lg"
        >
          {isActive ? (
            <>
              Continue to Dashboard
              <span className="ml-2">→</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Waiting for activation...
            </>
          )}
        </Button>

        {/* Dev Debug Info */}
        {import.meta.env.DEV && (
          <details className="mt-6 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">🔍 Debug Information</summary>
            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
              <dl className="space-y-2">
                <div>
                  <dt className="font-medium text-gray-700">Agency ID:</dt>
                  <dd className="text-gray-600 font-mono">{agencyId || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Session ID:</dt>
                  <dd className="text-gray-600 font-mono text-xs break-all">
                    {sessionId || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Status:</dt>
                  <dd className="text-gray-600">{agency?.subscriptionStatus || 'Loading...'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-700">Auto-trigger:</dt>
                  <dd className="text-gray-600">
                    {autoTriggerAttempted ? '✅ Attempted' : '⏳ Pending'}
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        )}

        {/* Production Note */}
        {!import.meta.env.DEV && (
          <p className="text-xs text-gray-500 text-center mt-6">
            If activation takes longer than 30 seconds, please contact support.
          </p>
        )}
      </div>
    </div>
  );
}
