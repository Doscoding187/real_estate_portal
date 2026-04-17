import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PayoutRulesDisclosure } from '@/components/distribution/partner/PayoutRulesDisclosure';
import { toast } from 'sonner';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

type EligibilityReason = {
  code?: string;
  message: string;
};

export default function PartnerSubmitReferralPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [clientReference, setClientReference] = useState('');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [eligibilityBlockers, setEligibilityBlockers] = useState<string[]>([]);
  const [duplicateDealId, setDuplicateDealId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedDevelopmentId = Number(params.get('developmentId') || 0);
    const preselectedAssessmentId = String(params.get('assessmentId') || '').trim();
    if (preselectedDevelopmentId > 0) {
      setSelectedDevelopmentId(preselectedDevelopmentId);
    }
    setAssessmentId(preselectedAssessmentId || null);
  }, []);

  const eligibleDevelopmentsQuery =
    trpc.distribution.partner.listEligibleDevelopmentsForSubmission.useQuery(undefined, {
      enabled: isAuthenticated,
      retry: false,
    });

  const submitReferralMutation = trpc.distribution.partner.submitReferral.useMutation({
    onSuccess: result => {
      toast.success('Referral submitted successfully.');
      setLocation(`/distribution/partner/referrals/${Number(result.dealId)}`);
    },
    onError: error => {
      const errorData = (error as any)?.data || {};
      const errorCode = String(errorData.errorCode || '');
      if (errorCode === 'PROGRAM_NOT_ELIGIBLE') {
        const reasons = Array.isArray(errorData.reasons) ? (errorData.reasons as EligibilityReason[]) : [];
        setEligibilityBlockers(reasons.map(reason => reason.message).filter(Boolean));
        setDuplicateDealId(null);
        return;
      }
      if (errorCode === 'DUPLICATE_REFERRAL') {
        const existingDealId = Number(errorData.existingDealId || 0);
        setDuplicateDealId(existingDealId > 0 ? existingDealId : null);
        setEligibilityBlockers([]);
        return;
      }
      setEligibilityBlockers([error.message || 'Unable to submit referral.']);
      setDuplicateDealId(null);
    },
  });

  const eligibleItems = eligibleDevelopmentsQuery.data?.items || [];

  useEffect(() => {
    if (!eligibleItems.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!selectedDevelopmentId) {
      setSelectedDevelopmentId(Number(eligibleItems[0].developmentId));
      return;
    }
    const stillAvailable = eligibleItems.some(
      item => Number(item.developmentId) === Number(selectedDevelopmentId),
    );
    if (!stillAvailable) {
      setSelectedDevelopmentId(Number(eligibleItems[0].developmentId));
    }
  }, [eligibleItems, selectedDevelopmentId]);

  const selectedDevelopment = useMemo(
    () =>
      eligibleItems.find(
        item => Number(item.developmentId) === Number(selectedDevelopmentId || 0),
      ) || null,
    [eligibleItems, selectedDevelopmentId],
  );

  if (loading || eligibleDevelopmentsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-5xl px-4 pb-8 pt-6 md:px-7">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Submit Referral</CardTitle>
            <CardDescription>
              Select an eligible development, review payout rules, and submit your referral.
            </CardDescription>
          </CardHeader>
        </Card>

        {eligibleDevelopmentsQuery.error ? (
          <Card className="mb-4">
            <CardContent className="py-6 text-sm text-red-600">
              {eligibleDevelopmentsQuery.error.message}
            </CardContent>
          </Card>
        ) : null}

        {!eligibleDevelopmentsQuery.error && !eligibleItems.length ? (
          <Card className="mb-4">
            <CardContent className="py-6 text-sm text-slate-500">
              No referral-enabled developments are available yet.
            </CardContent>
          </Card>
        ) : null}

        {eligibleItems.length ? (
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Eligible Developments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {eligibleItems.map(item => {
                  const isSelected =
                    Number(item.developmentId) === Number(selectedDevelopmentId || 0);
                  return (
                    <button
                      key={item.developmentId}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      onClick={() => {
                        setSelectedDevelopmentId(Number(item.developmentId));
                        setEligibilityBlockers([]);
                        setDuplicateDealId(null);
                      }}
                    >
                      <p className="font-semibold">{item.developmentName}</p>
                      <p className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                        {[item.city, item.province].filter(Boolean).join(', ') || 'Location unavailable'}
                      </p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <PayoutRulesDisclosure developmentId={selectedDevelopmentId} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Referral Details</CardTitle>
                  <CardDescription>
                    {selectedDevelopment
                      ? `Submitting to ${selectedDevelopment.developmentName}`
                      : 'Select a development first'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessmentId ? (
                    <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                      This referral will attach affordability assessment <code>{assessmentId}</code>.
                    </div>
                  ) : null}
                  <Input
                    placeholder="Buyer full name"
                    value={buyerName}
                    onChange={event => setBuyerName(event.target.value)}
                  />
                  <Input
                    placeholder="Buyer phone"
                    value={buyerPhone}
                    onChange={event => setBuyerPhone(event.target.value)}
                  />
                  <Input
                    placeholder="Buyer email"
                    value={buyerEmail}
                    onChange={event => setBuyerEmail(event.target.value)}
                  />
                  <Input
                    placeholder="Client reference (optional idempotency key)"
                    value={clientReference}
                    onChange={event => setClientReference(event.target.value)}
                  />
                  <Textarea
                    placeholder="Notes (optional)"
                    rows={4}
                    value={notes}
                    onChange={event => setNotes(event.target.value)}
                  />

                  {eligibilityBlockers.length ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-semibold">Submission blocked</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {eligibilityBlockers.map(reason => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {duplicateDealId ? (
                    <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      A matching referral already exists for this development.
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/distribution/partner/referrals/${duplicateDealId}`)}
                        >
                          View existing referral
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    className="w-full"
                    disabled={submitReferralMutation.isPending || !selectedDevelopmentId}
                    onClick={() => {
                      if (!selectedDevelopmentId) {
                        toast.error('Select a development to continue.');
                        return;
                      }
                      if (!buyerName.trim() && !buyerPhone.trim() && !buyerEmail.trim()) {
                        toast.error('Provide at least buyer name, phone, or email.');
                        return;
                      }

                      setEligibilityBlockers([]);
                      setDuplicateDealId(null);
                      submitReferralMutation.mutate({
                        developmentId: Number(selectedDevelopmentId),
                        buyerName: buyerName.trim() || undefined,
                        buyerPhone: buyerPhone.trim() || undefined,
                        buyerEmail: buyerEmail.trim() || undefined,
                        notes: notes.trim() || undefined,
                        clientReference: clientReference.trim() || undefined,
                        assessmentId: assessmentId || undefined,
                      });
                    }}
                  >
                    {submitReferralMutation.isPending ? 'Submitting...' : 'Submit Referral'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </ReferralAppShell>
  );
}
