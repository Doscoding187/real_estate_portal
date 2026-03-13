import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type DevelopmentRow = {
  developmentId: number;
  developmentName: string;
  city?: string | null;
  province?: string | null;
  program?: any;
};

type ManagerOption = {
  userId: number;
  label: string;
};

type RequiredDocumentDraft = {
  id?: number;
  documentCode:
    | 'id_document'
    | 'proof_of_address'
    | 'proof_of_income'
    | 'bank_statement'
    | 'pre_approval'
    | 'signed_offer_to_purchase'
    | 'sale_agreement'
    | 'attorney_instruction_letter'
    | 'transfer_documents'
    | 'custom';
  documentLabel: string;
  isRequired: boolean;
  isActive: boolean;
};

type ProgramReadiness = {
  canEnableReferral: boolean;
  blockers: Array<{ code: string; message: string }>;
  state: {
    programExists: boolean;
    isActive: boolean;
    isReferralEnabled: boolean;
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    payoutMilestone: string | null;
    currencyCode: string | null;
    tierAccessPolicy: string | null;
    hasActivePrimaryManager: boolean;
    requiredDocsCount: number;
    requiredRequiredDocsCount: number;
  };
};

const payoutMilestones = [
  'attorney_instruction',
  'attorney_signing',
  'bond_approval',
  'transfer_registration',
  'occupation',
  'custom',
] as const;

const documentCodeOptions: Array<{ value: RequiredDocumentDraft['documentCode']; label: string }> = [
  { value: 'id_document', label: 'ID Document' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'proof_of_income', label: 'Proof of Income' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'pre_approval', label: 'Pre-Approval' },
  { value: 'signed_offer_to_purchase', label: 'Signed OTP' },
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'attorney_instruction_letter', label: 'Attorney Instruction Letter' },
  { value: 'transfer_documents', label: 'Transfer Documents' },
  { value: 'custom', label: 'Custom' },
];

const blockerSectionMap: Record<string, string> = {
  PROGRAM_MISSING: 'section-program',
  PROGRAM_INACTIVE: 'section-program',
  PROGRAM_VALIDATION_ERROR: 'section-program',
  COMMISSION_MISSING: 'section-commission',
  PAYOUT_MILESTONE_MISSING: 'section-payout',
  CURRENCY_MISSING: 'section-currency',
  MANAGER_MISSING: 'section-manager',
  REQUIRED_DOCS_MISSING: 'section-docs',
};

function statusBadge(value: boolean, trueLabel: string, falseLabel: string) {
  return <Badge variant={value ? 'default' : 'secondary'}>{value ? trueLabel : falseLabel}</Badge>;
}

export function ReadinessStatusChips({ readiness }: { readiness?: ProgramReadiness | null }) {
  if (!readiness) {
    return (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>
    );
  }

  const { state } = readiness;
  const hasCommission =
    state.commissionModel === 'flat_percentage'
      ? Boolean(state.defaultCommissionPercent && state.defaultCommissionPercent > 0)
      : state.commissionModel === 'flat_amount'
        ? Boolean(state.defaultCommissionAmount && state.defaultCommissionAmount > 0)
        : false;

  return (
    <div className="flex flex-wrap gap-1">
      {statusBadge(state.programExists, 'Program: Exists', 'Program: Missing')}
      {statusBadge(state.isActive, 'Active: On', 'Active: Off')}
      {statusBadge(state.isReferralEnabled, 'Referral: Enabled', 'Referral: Disabled')}
      {statusBadge(hasCommission, 'Commission: Set', 'Commission: Missing')}
      {statusBadge(Boolean(state.payoutMilestone), 'Milestone: Set', 'Milestone: Missing')}
      {statusBadge(Boolean(state.currencyCode), 'Currency: Set', 'Currency: Missing')}
      {statusBadge(state.hasActivePrimaryManager, 'Manager: Assigned', 'Manager: Missing')}
      {statusBadge(state.requiredRequiredDocsCount > 0, 'Docs: Configured', 'Docs: Missing')}
    </div>
  );
}

function DevelopmentProgramConfigPanel({
  development,
  managerOptions,
  onSaved,
  focusSection,
}: {
  development: DevelopmentRow;
  managerOptions: ManagerOption[];
  onSaved: () => Promise<void> | void;
  focusSection?: string | null;
}) {
  const readinessQuery = trpc.distribution.admin.getProgramReadiness.useQuery({
    developmentId: development.developmentId,
  });
  const docsQuery = trpc.distribution.admin.getDevelopmentRequiredDocuments.useQuery({
    developmentId: development.developmentId,
  });

  const upsertProgramMutation = trpc.distribution.admin.upsertProgram.useMutation();
  const assignManagerMutation = trpc.distribution.admin.assignManagerToDevelopment.useMutation();
  const setDocsMutation = trpc.distribution.admin.setDevelopmentRequiredDocuments.useMutation();

  const [commissionModel, setCommissionModel] = useState<'flat_percentage' | 'flat_amount'>(
    development.program?.commissionModel === 'fixed_amount' ? 'flat_amount' : 'flat_percentage',
  );
  const [defaultCommissionPercent, setDefaultCommissionPercent] = useState('');
  const [defaultCommissionAmount, setDefaultCommissionAmount] = useState('');
  const [tierAccessPolicy, setTierAccessPolicy] = useState<'restricted' | 'open' | 'invite_only'>(
    'restricted',
  );
  const [payoutMilestone, setPayoutMilestone] =
    useState<(typeof payoutMilestones)[number]>('attorney_signing');
  const [payoutMilestoneNotes, setPayoutMilestoneNotes] = useState('');
  const [currencyCode, setCurrencyCode] = useState('ZAR');
  const [isActive, setIsActive] = useState(true);
  const [primaryManagerUserId, setPrimaryManagerUserId] = useState<string>('');
  const [documents, setDocuments] = useState<RequiredDocumentDraft[]>([]);

  useEffect(() => {
    const readiness = readinessQuery.data;
    const program = development.program || {};
    const model =
      (readiness?.state.commissionModel || program.commissionModel || 'flat_percentage') ===
      'flat_amount'
        ? 'flat_amount'
        : 'flat_percentage';

    setCommissionModel(model);
    setDefaultCommissionPercent(
      String(readiness?.state.defaultCommissionPercent ?? program.defaultCommissionPercent ?? ''),
    );
    setDefaultCommissionAmount(
      String(readiness?.state.defaultCommissionAmount ?? program.defaultCommissionAmount ?? ''),
    );
    setTierAccessPolicy(
      (readiness?.state.tierAccessPolicy || program.tierAccessPolicy || 'restricted') as
        | 'restricted'
        | 'open'
        | 'invite_only',
    );
    setPayoutMilestone(
      (readiness?.state.payoutMilestone || program.payoutMilestone || 'attorney_signing') as any,
    );
    setPayoutMilestoneNotes(String(program.payoutMilestoneNotes || ''));
    setCurrencyCode(String(readiness?.state.currencyCode || program.currencyCode || 'ZAR'));
    setIsActive(Boolean(readiness?.state.isActive ?? program.isActive ?? true));

    const primaryManager = (program?.managerAssignments || []).find(
      (assignment: any) => assignment.isPrimary && assignment.isActive,
    );
    setPrimaryManagerUserId(primaryManager ? String(primaryManager.managerUserId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [development.developmentId, readinessQuery.data]);

  useEffect(() => {
    const list = (docsQuery.data || [])
      .filter((document: any) => document.isActive)
      .sort((a: any, b: any) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((document: any) => ({
        id: Number(document.id),
        documentCode: document.documentCode as RequiredDocumentDraft['documentCode'],
        documentLabel: String(document.documentLabel || ''),
        isRequired: Boolean(document.isRequired),
        isActive: Boolean(document.isActive),
      }));
    setDocuments(list);
  }, [docsQuery.data, development.developmentId]);

  useEffect(() => {
    if (!focusSection) return;
    const element = document.getElementById(focusSection);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusSection]);

  const isSaving =
    upsertProgramMutation.isPending || assignManagerMutation.isPending || setDocsMutation.isPending;

  async function handleSave() {
    const programResult = await upsertProgramMutation.mutateAsync({
      developmentId: development.developmentId,
      isReferralEnabled: Boolean(readinessQuery.data?.state.isReferralEnabled),
      isActive,
      commissionModel,
      defaultCommissionPercent:
        commissionModel === 'flat_percentage' && defaultCommissionPercent !== ''
          ? Number(defaultCommissionPercent)
          : null,
      defaultCommissionAmount:
        commissionModel === 'flat_amount' && defaultCommissionAmount !== ''
          ? Number(defaultCommissionAmount)
          : null,
      tierAccessPolicy,
      payoutMilestone,
      payoutMilestoneNotes:
        payoutMilestone === 'custom' ? payoutMilestoneNotes.trim() || null : null,
      currencyCode: currencyCode.trim().toUpperCase(),
    });

    if (primaryManagerUserId) {
      await assignManagerMutation.mutateAsync({
        programId: Number(programResult.programId),
        managerUserId: Number(primaryManagerUserId),
        isPrimary: true,
        isActive: true,
        workloadCapacity: 0,
        timezone: null,
      });
    }

    await setDocsMutation.mutateAsync({
      developmentId: development.developmentId,
      documents: documents.map((document, index) => ({
        id: document.id,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel.trim() || 'Custom Document',
        isRequired: document.isRequired,
        sortOrder: index,
        isActive: document.isActive,
      })),
    });

    await Promise.all([readinessQuery.refetch(), docsQuery.refetch(), Promise.resolve(onSaved())]);
    toast.success('Program configuration saved');
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Readiness</CardTitle>
          <CardDescription>Server truth for referral enablement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ReadinessStatusChips readiness={readinessQuery.data as any} />
          {readinessQuery.data?.canEnableReferral === false ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="mb-1 font-medium">Fix these blockers:</p>
              <ul className="list-disc space-y-1 pl-4">
                {readinessQuery.data.blockers.map((blocker: any) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-700">Ready to enable referrals.</p>
          )}
        </CardContent>
      </Card>

      <Card id="section-program">
        <CardHeader>
          <CardTitle className="text-base">Program Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div id="section-commission" className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Commission model</p>
              <Select
                value={commissionModel}
                onValueChange={value => setCommissionModel(value as 'flat_percentage' | 'flat_amount')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_percentage">flat_percentage</SelectItem>
                  <SelectItem value="flat_amount">flat_amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                {commissionModel === 'flat_percentage' ? 'Default %' : 'Default amount'}
              </p>
              <Input
                type="number"
                step={commissionModel === 'flat_percentage' ? '0.01' : '1'}
                value={
                  commissionModel === 'flat_percentage'
                    ? defaultCommissionPercent
                    : defaultCommissionAmount
                }
                onChange={event =>
                  commissionModel === 'flat_percentage'
                    ? setDefaultCommissionPercent(event.target.value)
                    : setDefaultCommissionAmount(event.target.value)
                }
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Tier access policy</p>
              <Select value={tierAccessPolicy} onValueChange={value => setTierAccessPolicy(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">restricted</SelectItem>
                  <SelectItem value="open">open</SelectItem>
                  <SelectItem value="invite_only">invite_only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1" id="section-payout">
              <p className="text-xs font-medium text-slate-700">Payout milestone</p>
              <Select value={payoutMilestone} onValueChange={value => setPayoutMilestone(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payoutMilestones.map(milestone => (
                    <SelectItem key={milestone} value={milestone}>
                      {milestone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {payoutMilestone === 'custom' ? (
            <Textarea
              value={payoutMilestoneNotes}
              onChange={event => setPayoutMilestoneNotes(event.target.value)}
              placeholder="Custom payout milestone notes"
            />
          ) : null}

          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1" id="section-currency">
              <p className="text-xs font-medium text-slate-700">Currency code</p>
              <Input
                value={currencyCode}
                onChange={event => setCurrencyCode(event.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="flex items-end justify-between rounded border p-2">
              <p className="text-xs font-medium text-slate-700">Program active</p>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="section-manager">
        <CardHeader>
          <CardTitle className="text-base">Primary Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={primaryManagerUserId} onValueChange={setPrimaryManagerUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select primary manager" />
            </SelectTrigger>
            <SelectContent>
              {managerOptions.length ? (
                managerOptions.map(option => (
                  <SelectItem key={option.userId} value={String(option.userId)}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__none" disabled>
                  No approved managers found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card id="section-docs">
        <CardHeader>
          <CardTitle className="text-base">Program Required Documents</CardTitle>
          <CardDescription>
            Configure the document pack for this partner development. Standard documents can stay
            fixed and you can add multiple custom items like price structure, house plan, or
            budget requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.map((document, index) => (
            <div key={`${document.id || 'new'}-${index}`} className="rounded border p-2">
              <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto_auto_auto]">
                <Select
                  value={document.documentCode}
                  onValueChange={value =>
                    setDocuments(current =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, documentCode: value as RequiredDocumentDraft['documentCode'] }
                          : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCodeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={document.documentLabel}
                  onChange={event =>
                    setDocuments(current =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, documentLabel: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Document label"
                />

                <div className="flex items-center gap-2 rounded border px-2 text-xs">
                  <span>Required</span>
                  <Switch
                    checked={document.isRequired}
                    onCheckedChange={checked =>
                      setDocuments(current =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, isRequired: checked } : item,
                        ),
                      )
                    }
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      setDocuments(current => {
                        if (index === 0) return current;
                        const next = [...current];
                        const temp = next[index - 1];
                        next[index - 1] = next[index];
                        next[index] = temp;
                        return next;
                      })
                    }
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      setDocuments(current => {
                        if (index === current.length - 1) return current;
                        const next = [...current];
                        const temp = next[index + 1];
                        next[index + 1] = next[index];
                        next[index] = temp;
                        return next;
                      })
                    }
                    disabled={index === documents.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDocuments(current => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() =>
              setDocuments(current => [
                ...current,
                {
                  documentCode: 'custom',
                  documentLabel: '',
                  isRequired: true,
                  isActive: true,
                },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Custom Document
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}

function DevelopmentOnboardingRow({
  development,
  isSelected,
  onConfigure,
  onSaved,
  onFixNow,
}: {
  development: DevelopmentRow;
  isSelected: boolean;
  onConfigure: () => void;
  onSaved: () => Promise<void> | void;
  onFixNow: (blockerCode: string) => void;
}) {
  const readinessQuery = trpc.distribution.admin.getProgramReadiness.useQuery({
    developmentId: development.developmentId,
  });
  const setReferralEnabledMutation = trpc.distribution.admin.setProgramReferralEnabled.useMutation();
  const [inlineBlockers, setInlineBlockers] = useState<Array<{ code: string; message: string }>>([]);

  const isReferralEnabled = Boolean(readinessQuery.data?.state.isReferralEnabled);

  async function handleToggle(nextEnabled: boolean) {
    if (!nextEnabled) {
      setInlineBlockers([]);
      await setReferralEnabledMutation.mutateAsync({
        developmentId: development.developmentId,
        enabled: false,
      });
      await Promise.all([readinessQuery.refetch(), Promise.resolve(onSaved())]);
      toast.success('Referrals disabled');
      return;
    }

    try {
      setInlineBlockers([]);
      await setReferralEnabledMutation.mutateAsync({
        developmentId: development.developmentId,
        enabled: true,
      });
      await Promise.all([readinessQuery.refetch(), Promise.resolve(onSaved())]);
      toast.success('Referrals enabled');
    } catch (error: any) {
      const blockers = (error?.data?.blockers || []) as Array<{ code: string; message: string }>;
      if (error?.data?.errorCode === 'PROGRAM_NOT_READY' && blockers.length) {
        setInlineBlockers(blockers);
        toast.error('Program is not ready. Fix blockers first.');
      } else {
        toast.error(error?.message || 'Failed to update referral toggle');
      }
    }
  }

  return (
    <div className={`rounded border p-3 ${isSelected ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{development.developmentName}</p>
          <p className="text-xs text-slate-500">
            {development.city || 'Unknown city'}, {development.province || 'Unknown province'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={onConfigure}>
            Configure
          </Button>
          <div className="flex items-center gap-2 rounded border px-2 py-1">
            <span className="text-xs">{isReferralEnabled ? 'Enabled' : 'Disabled'}</span>
            <Switch
              checked={isReferralEnabled}
              onCheckedChange={checked => void handleToggle(checked)}
              disabled={setReferralEnabledMutation.isPending}
            />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <ReadinessStatusChips readiness={readinessQuery.data as any} />
      </div>

      {inlineBlockers.length ? (
        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <p className="mb-1 flex items-center gap-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Referral enable blocked
          </p>
          <ul className="space-y-1">
            {inlineBlockers.map(blocker => (
              <li key={`${development.developmentId}-${blocker.code}`} className="flex items-center justify-between gap-2">
                <span>{blocker.message}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => {
                    onConfigure();
                    onFixNow(blocker.code);
                  }}
                >
                  Fix now
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PartnerDevelopmentOnboardingDrawer({
  open,
  onOpenChange,
  brandProfileId,
  brandProfileName,
  developments,
  isLoading,
  isError,
  onRetry,
  managerOptions,
  onRefreshCatalog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandProfileId: number | null;
  brandProfileName: string;
  developments: DevelopmentRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  managerOptions: ManagerOption[];
  onRefreshCatalog: () => Promise<void> | void;
}) {
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [focusSection, setFocusSection] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!developments.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    setSelectedDevelopmentId(current =>
      current && developments.some(row => row.developmentId === current)
        ? current
        : developments[0].developmentId,
    );
  }, [open, developments]);

  const selectedDevelopment = useMemo(
    () => developments.find(row => row.developmentId === selectedDevelopmentId) || null,
    [developments, selectedDevelopmentId],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[1100px]">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Partner Development Onboarding</SheetTitle>
          <SheetDescription>
            {brandProfileId
              ? `Brand: ${brandProfileName || `#${brandProfileId}`}`
              : 'Select a brand profile to start onboarding.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : isError ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-sm text-red-600">Failed to load onboarding context.</p>
                <Button variant="outline" onClick={onRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : !developments.length ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                No eligible developments found for this brand profile.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Eligible Developments</CardTitle>
                  <CardDescription>
                    Configure each development and enable referrals when readiness is clear.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {developments.map(row => (
                    <DevelopmentOnboardingRow
                      key={row.developmentId}
                      development={row}
                      isSelected={selectedDevelopmentId === row.developmentId}
                      onConfigure={() => {
                        setSelectedDevelopmentId(row.developmentId);
                        setFocusSection(null);
                      }}
                      onSaved={onRefreshCatalog}
                      onFixNow={blockerCode => {
                        setSelectedDevelopmentId(row.developmentId);
                        setFocusSection(blockerSectionMap[blockerCode] || 'section-program');
                      }}
                    />
                  ))}
                </CardContent>
              </Card>

              <div>
                {selectedDevelopment ? (
                  <DevelopmentProgramConfigPanel
                    key={selectedDevelopment.developmentId}
                    development={selectedDevelopment}
                    managerOptions={managerOptions}
                    onSaved={onRefreshCatalog}
                    focusSection={focusSection}
                  />
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-slate-500">
                      Select a development to configure.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
