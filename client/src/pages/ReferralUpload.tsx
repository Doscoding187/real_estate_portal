import { useState, type FormEvent } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { ShieldCheck, UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'payslip', label: 'Payslip' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'credit_report', label: 'Credit Report' },
  { value: 'id_document', label: 'ID Document' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'other', label: 'Other' },
] as const;

type DocumentTypeValue = (typeof DOCUMENT_TYPE_OPTIONS)[number]['value'];

const READINESS_LABELS: Record<string, string> = {
  quick_estimate: 'Quick Estimate',
  awaiting_documents: 'Awaiting Documents',
  under_review: 'Under Review',
  verified_estimate: 'Verified Estimate',
  matched_to_development: 'Matched to Development',
  submitted_to_partner: 'Submitted to Partner',
};

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function readinessLabel(value: string) {
  return READINESS_LABELS[value] || value;
}

export default function ReferralUpload() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute('/referral-upload/:token');
  const token = matched ? String(params?.token || '').trim() : '';

  const [documentType, setDocumentType] = useState<DocumentTypeValue>('payslip');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [consentText, setConsentText] = useState('');
  const [submissionState, setSubmissionState] = useState<{
    documentCount: number;
    readinessStatus: string;
  } | null>(null);

  const uploadMutation = trpc.distribution.qualification.recordDocumentUpload.useMutation({
    onSuccess: data => {
      setSubmissionState({
        documentCount: Number(data.documentCount || 0),
        readinessStatus: String(data.readinessStatus || ''),
      });
      setFileName('');
      setFileUrl('');
      setConsentText('');
      toast.success('Document received. Your agent will be notified.');
    },
    onError: error => {
      toast.error(error.message || 'Unable to record document.');
    },
  });

  const canSubmit =
    token.length >= 16 &&
    fileName.trim().length >= 2 &&
    isHttpUrl(fileUrl.trim()) &&
    consentConfirmed &&
    !uploadMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || token.length < 16) {
      toast.error('This secure link is invalid.');
      return;
    }
    if (fileName.trim().length < 2) {
      toast.error('Add a valid file name.');
      return;
    }
    if (!isHttpUrl(fileUrl.trim())) {
      toast.error('Provide a valid secure URL (https://...).');
      return;
    }
    if (!consentConfirmed) {
      toast.error('Consent confirmation is required.');
      return;
    }

    uploadMutation.mutate({
      token,
      documentType,
      fileName: fileName.trim(),
      fileUrl: fileUrl.trim(),
      consentConfirmed: true,
      consentText: consentText.trim() || undefined,
    });
  };

  if (!matched || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-lg border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Invalid Upload Link
            </CardTitle>
            <CardDescription>
              This secure link is missing or malformed. Request a fresh link from your agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-5">
        <Card className="border-slate-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Secure Document Upload
            </CardTitle>
            <CardDescription>
              Quick Qual remains an estimate. Upload documents for a stronger Verified Qual assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-medium text-slate-900">Recommended checklist</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>3 months payslips</li>
                <li>3 months bank statements</li>
                <li>Credit report (or consent)</li>
                <li>ID document</li>
                <li>Proof of address</li>
              </ul>
            </div>
            <p>
              If your file is stored locally, upload it to a secure share link first, then paste the URL
              here.
            </p>
            {submissionState && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <p className="font-medium">Upload recorded</p>
                <p className="text-sm">
                  Documents received: {submissionState.documentCount}
                  <br />
                  Status: {readinessLabel(submissionState.readinessStatus)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <UploadCloud className="h-5 w-5 text-indigo-600" />
              Submit a Document
            </CardTitle>
            <CardDescription>Tokenized session. No account login required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Document type</p>
                <Select
                  value={documentType}
                  onValueChange={value => setDocumentType(value as DocumentTypeValue)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">File name</p>
                  <Input
                    placeholder="e.g. payslip_jan_2026.pdf"
                    value={fileName}
                    onChange={event => setFileName(event.target.value)}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">File URL</p>
                  <Input
                    placeholder="https://..."
                    value={fileUrl}
                    onChange={event => setFileUrl(event.target.value)}
                    maxLength={2000}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Consent statement (optional)
                </p>
                <Input
                  placeholder="Optional context for your uploaded document"
                  value={consentText}
                  onChange={event => setConsentText(event.target.value)}
                  maxLength={255}
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Checkbox
                  id="consent-confirmed"
                  checked={consentConfirmed}
                  onCheckedChange={checked => setConsentConfirmed(Boolean(checked))}
                />
                <label htmlFor="consent-confirmed" className="text-sm text-slate-700">
                  I confirm I am providing this document to assess affordability.
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!canSubmit}>
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Submit Document'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation('/')}>
                  Close
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
