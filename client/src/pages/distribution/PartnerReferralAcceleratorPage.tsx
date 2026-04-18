import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AffordabilityForm } from '@/components/distribution/partner/AffordabilityForm';
import { ResultsPanel } from '@/components/distribution/partner/ResultsPanel';
import { MatchesGrid } from '@/components/distribution/partner/MatchesGrid';
import {
  QUALIFICATION_DISCLAIMER_LINES,
  type AcceleratorAssessment,
  type AcceleratorFormValues,
  type AcceleratorMatchSnapshot,
} from '@/components/distribution/partner/acceleratorTypes';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const DEFAULT_FORM_VALUES: AcceleratorFormValues = {
  subjectName: '',
  subjectPhone: '',
  grossIncomeMonthly: '',
  deductionsMonthly: '0',
  depositAmount: '0',
  province: '',
  city: '',
  suburb: '',
};

function parseMoneyInt(value: string, fallbackValue = 0) {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return fallbackValue;
  return Math.max(0, Math.round(parsed));
}

function base64ToBlob(base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export default function PartnerReferralAcceleratorPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [formValues, setFormValues] = useState<AcceleratorFormValues>(DEFAULT_FORM_VALUES);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const normalizedAssessmentId = assessmentId || ZERO_UUID;

  const createAssessmentMutation = trpc.distribution.partner.createAffordabilityAssessment.useMutation({
    onSuccess: result => {
      setAssessmentId(String(result.assessmentId));
      toast.success('Indicative affordability snapshot generated.');
    },
    onError: error => {
      toast.error(error.message || 'Unable to generate affordability snapshot.');
    },
  });

  const assessmentQuery = trpc.distribution.partner.getAffordabilityAssessment.useQuery(
    { assessmentId: normalizedAssessmentId },
    {
      enabled: Boolean(assessmentId),
      retry: false,
    },
  );

  const matchesQuery = trpc.distribution.partner.getAffordabilityMatches.useQuery(
    { assessmentId: normalizedAssessmentId },
    {
      enabled: false,
      retry: false,
    },
  );

  const exportPdfMutation = trpc.distribution.partner.exportQualificationPackPdf.useMutation({
    onSuccess: payload => {
      const blob = base64ToBlob(payload.base64, payload.mimeType);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = payload.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Qualification Pack downloaded.');
    },
    onError: error => {
      toast.error(error.message || 'Unable to export qualification pack.');
    },
  });

  const creditCheckMutation = trpc.distribution.partner.requestCreditCheckPlaceholder.useMutation({
    onSuccess: () => {
      toast.success('Credit-check placeholder request captured.');
      void assessmentQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Credit check request failed.');
    },
  });

  const assessment = (assessmentQuery.data || null) as AcceleratorAssessment | null;
  const matchSnapshot = (matchesQuery.data || null) as AcceleratorMatchSnapshot | null;
  const hasMatchSnapshot = Boolean(matchSnapshot?.matchSnapshotId);

  const locationFilter = useMemo(() => {
    const province = formValues.province.trim();
    const city = formValues.city.trim();
    const suburb = formValues.suburb.trim();
    if (!province && !city && !suburb) return undefined;
    return {
      province: province || undefined,
      city: city || undefined,
      suburb: suburb || undefined,
    };
  }, [formValues.city, formValues.province, formValues.suburb]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-8 pt-6 md:px-7">
        <Card>
          <CardHeader>
            <CardTitle>Referral Accelerator</CardTitle>
            <CardDescription>
              Run an indicative affordability snapshot, match qualifying developments, and export a
              Qualification Pack before referral submission.
            </CardDescription>
          </CardHeader>
        </Card>

        <AffordabilityForm
          values={formValues}
          onChange={next => setFormValues(current => ({ ...current, ...next }))}
          onSubmit={() => {
            const grossIncomeMonthly = parseMoneyInt(formValues.grossIncomeMonthly, 0);
            if (grossIncomeMonthly <= 0) {
              toast.error('Gross income monthly is required.');
              return;
            }
            setAssessmentId(null);
            createAssessmentMutation.mutate({
              subjectName: formValues.subjectName.trim() || undefined,
              subjectPhone: formValues.subjectPhone.trim() || undefined,
              grossIncomeMonthly,
              deductionsMonthly: parseMoneyInt(formValues.deductionsMonthly, 0),
              depositAmount: parseMoneyInt(formValues.depositAmount, 0),
              locationFilter,
            });
          }}
          isSubmitting={createAssessmentMutation.isPending}
        />

        {assessmentQuery.isLoading ? (
          <Card>
            <CardContent className="flex items-center gap-2 py-6 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading affordability results...
            </CardContent>
          </Card>
        ) : null}

        {assessment ? (
          <>
            <ResultsPanel
              assessment={assessment}
              onGetMatches={() => {
                if (!assessmentId) return;
                void matchesQuery.refetch();
              }}
              isLoadingMatches={matchesQuery.isFetching}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Primary Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {QUALIFICATION_DISCLAIMER_LINES.map(line => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={!hasMatchSnapshot || exportPdfMutation.isPending}
                    onClick={() => {
                      if (!assessmentId) return;
                      exportPdfMutation.mutate({ assessmentId });
                    }}
                  >
                    {exportPdfMutation.isPending
                      ? 'Generating PDF...'
                      : 'Download Qualification Pack (PDF)'}
                  </Button>
                </div>

                <div className="rounded border bg-white p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={consentChecked}
                      onCheckedChange={value => setConsentChecked(Boolean(value))}
                    />
                    <span>A credit check requires the client’s explicit consent.</span>
                  </label>
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      disabled={!assessmentId || !consentChecked || creditCheckMutation.isPending}
                      onClick={() => {
                        if (!assessmentId) return;
                        creditCheckMutation.mutate({
                          assessmentId,
                          consentGiven: consentChecked,
                        });
                      }}
                    >
                      {creditCheckMutation.isPending
                        ? 'Requesting...'
                        : 'Request Credit Check (Placeholder)'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {matchSnapshot ? (
          <MatchesGrid
            snapshot={matchSnapshot}
            assessmentId={assessmentId || ''}
            onSubmitReferral={developmentId => {
              if (!assessmentId) return;
              setLocation(
                `/distribution/partner/submit?developmentId=${developmentId}&assessmentId=${assessmentId}`,
              );
            }}
          />
        ) : null}
      </main>
    </ReferralAppShell>
  );
}
