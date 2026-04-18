import { useCallback, useEffect, useMemo, useState } from 'react';
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
  category: 'developer_document' | 'client_required_document';
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
  templateFileUrl?: string | null;
  templateFileName?: string | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
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

type BrandOnboardingPreset = {
  commissionModel: 'flat_percentage' | 'flat_amount';
  defaultCommissionPercent: number | null;
  defaultCommissionAmount: number | null;
  tierAccessPolicy: 'restricted' | 'open' | 'invite_only';
  payoutMilestone:
    | 'attorney_instruction'
    | 'attorney_signing'
    | 'bond_approval'
    | 'transfer_registration'
    | 'occupation'
    | 'custom';
  payoutMilestoneNotes: string | null;
  currencyCode: string;
  isActive: boolean;
  primaryManagerUserId: number | null;
  documents: RequiredDocumentDraft[];
};

type ReadinessCounts = {
  enabled: number;
  readyToEnable: number;
  blocked: number;
  loading: number;
};

const payoutMilestones = [
  'attorney_instruction',
  'attorney_signing',
  'bond_approval',
  'transfer_registration',
  'occupation',
  'custom',
] as const;

const clientDocumentCodeOptions: Array<{ value: RequiredDocumentDraft['documentCode']; label: string }> = [
  { value: 'id_document', label: 'ID Document' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'proof_of_income', label: 'Payslips / Proof of Income' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'pre_approval', label: 'Pre-Approval' },
  { value: 'custom', label: 'Custom Client Document' },
];

const developerDocumentCodeOptions: Array<{
  value: RequiredDocumentDraft['documentCode'];
  label: string;
}> = [
  { value: 'signed_offer_to_purchase', label: 'Offer to Purchase' },
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'attorney_instruction_letter', label: 'Attorney Instruction Letter' },
  { value: 'transfer_documents', label: 'Transfer Documents' },
  { value: 'custom', label: 'Custom Developer Document' },
];

const blockerSectionMap: Record<string, string> = {
  PROGRAM_MISSING: 'section-program',
  PROGRAM_INACTIVE: 'section-program',
  PROGRAM_VALIDATION_ERROR: 'section-program',
  COMMISSION_MISSING: 'section-commission',
  PAYOUT_MILESTONE_MISSING: 'section-payout',
  CURRENCY_MISSING: 'section-currency',
  MANAGER_MISSING: 'section-manager',
  REQUIRED_DOCS_MISSING: 'section-client-docs',
};

function statusBadge(value: boolean, trueLabel: string, falseLabel: string) {
  return <Badge variant={value ? 'default' : 'secondary'}>{value ? trueLabel : falseLabel}</Badge>;
}

function getBlockerSectionId(blockerCode: string) {
  return blockerSectionMap[blockerCode] || 'section-program';
}

function getPrimaryReadinessMessage(readiness?: ProgramReadiness | null) {
  if (!readiness) return 'Loading readiness status...';
  if (readiness.state.isReferralEnabled) {
    return 'Referrals are live for this development.';
  }
  if (readiness.canEnableReferral) {
    return 'Ready to enable referrals.';
  }
  return readiness.blockers[0]?.message || 'Complete onboarding configuration before enabling referrals.';
}

function getReadinessCounts(readinessByDevelopmentId: Record<number, ProgramReadiness | null | undefined>) {
  return Object.values(readinessByDevelopmentId).reduce<ReadinessCounts>(
    (counts, readiness) => {
      if (!readiness) {
        counts.loading += 1;
        return counts;
      }
      if (readiness.state.isReferralEnabled) {
        counts.enabled += 1;
      } else if (readiness.canEnableReferral) {
        counts.readyToEnable += 1;
      } else {
        counts.blocked += 1;
      }
      return counts;
    },
    { enabled: 0, readyToEnable: 0, blocked: 0, loading: 0 },
  );
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
  brandProfileId,
  managerOptions,
  onMutationSuccess,
  focusSection,
  otherDevelopments,
}: {
  development: DevelopmentRow;
  brandProfileId: number | null;
  managerOptions: ManagerOption[];
  onMutationSuccess: (developmentIds: number[]) => Promise<void> | void;
  focusSection?: string | null;
  otherDevelopments: DevelopmentRow[];
}) {
  const utils = trpc.useUtils();
  const readinessQuery = trpc.distribution.admin.getProgramReadiness.useQuery({
    developmentId: development.developmentId,
  });
  const docsQuery = trpc.distribution.admin.getDevelopmentRequiredDocuments.useQuery({
    developmentId: development.developmentId,
  });
  const brandPresetQuery = trpc.distribution.admin.getBrandOnboardingPreset.useQuery(
    {
      brandProfileId: Number(brandProfileId || 0),
    },
    {
      enabled: typeof brandProfileId === 'number' && brandProfileId > 0,
    },
  );

  const upsertProgramMutation = trpc.distribution.admin.upsertProgram.useMutation();
  const assignManagerMutation = trpc.distribution.admin.assignManagerToDevelopment.useMutation();
  const setDocsMutation = trpc.distribution.admin.setDevelopmentRequiredDocuments.useMutation();
  const onboardDevelopmentMutation =
    trpc.distribution.admin.onboardDevelopmentToPartnerNetwork.useMutation();
  const setBrandPresetMutation = trpc.distribution.admin.setBrandOnboardingPreset.useMutation();

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
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const applyPresetToForm = useCallback((preset: BrandOnboardingPreset) => {
    setCommissionModel(preset.commissionModel);
    setDefaultCommissionPercent(
      preset.defaultCommissionPercent != null ? String(preset.defaultCommissionPercent) : '',
    );
    setDefaultCommissionAmount(
      preset.defaultCommissionAmount != null ? String(preset.defaultCommissionAmount) : '',
    );
    setTierAccessPolicy(preset.tierAccessPolicy);
    setPayoutMilestone(preset.payoutMilestone);
    setPayoutMilestoneNotes(preset.payoutMilestoneNotes || '');
    setCurrencyCode(String(preset.currencyCode || 'ZAR'));
    setIsActive(Boolean(preset.isActive));
    setPrimaryManagerUserId(
      preset.primaryManagerUserId ? String(preset.primaryManagerUserId) : '',
    );
    setDocuments(
      (preset.documents || []).map(document => ({
        ...document,
        id: undefined,
      })),
    );
  }, []);

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
        category: (
          document.category === 'developer_document'
            ? 'developer_document'
            : 'client_required_document'
        ) as RequiredDocumentDraft['category'],
        documentCode: document.documentCode as RequiredDocumentDraft['documentCode'],
        documentLabel: String(document.documentLabel || ''),
        templateFileUrl: String(document.templateFileUrl || '') || null,
        templateFileName: String(document.templateFileName || '') || null,
        isRequired: Boolean(document.isRequired),
        isActive: Boolean(document.isActive),
        sortOrder: Number(document.sortOrder || 0),
      }));
    setDocuments(list);
  }, [docsQuery.data, development.developmentId]);

  useEffect(() => {
    if (!focusSection) return;
    const element = document.getElementById(focusSection);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusSection]);

  const isSaving =
    onboardDevelopmentMutation.isPending ||
    upsertProgramMutation.isPending ||
    assignManagerMutation.isPending ||
    setDocsMutation.isPending ||
    setBrandPresetMutation.isPending ||
    isApplyingTemplate;

  function getDocumentCodeOptions(category: RequiredDocumentDraft['category']) {
    return category === 'developer_document'
      ? developerDocumentCodeOptions
      : clientDocumentCodeOptions;
  }

  function updateDocumentAtIndex(index: number, updater: (document: RequiredDocumentDraft) => RequiredDocumentDraft) {
    setDocuments(current => current.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }

  function swapDocumentOrder(fromIndex: number, toIndex: number) {
    setDocuments(current => {
      if (toIndex < 0 || toIndex >= current.length) return current;
      const next = [...current];
      const temp = next[toIndex];
      next[toIndex] = next[fromIndex];
      next[fromIndex] = temp;
      return next.map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
    });
  }

  function removeDocument(index: number) {
    setDocuments(current =>
      current
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })),
    );
  }

  function addDocument(category: RequiredDocumentDraft['category']) {
    setDocuments(current => [
      ...current,
      {
        category,
        documentCode: 'custom',
        documentLabel: '',
        templateFileUrl: null,
        templateFileName: null,
        isRequired: true,
        isActive: true,
        sortOrder: current.length,
      },
    ]);
  }

  function renderDocumentSection(input: {
    title: string;
    description: string;
    category: RequiredDocumentDraft['category'];
    rows: Array<{ document: RequiredDocumentDraft; index: number }>;
    addLabel: string;
    sectionId: string;
  }) {
    return (
      <Card id={input.sectionId}>
        <CardHeader>
          <CardTitle className="text-base">{input.title}</CardTitle>
          <CardDescription>{input.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {input.rows.map(({ document, index }, rowIndex) => (
            <div key={`${document.id || 'new'}-${index}`} className="rounded border p-2">
              <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_auto_auto_auto]">
                <Select
                  value={document.documentCode}
                  onValueChange={value =>
                    updateDocumentAtIndex(index, item => ({
                      ...item,
                      documentCode: value as RequiredDocumentDraft['documentCode'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getDocumentCodeOptions(input.category).map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={document.documentLabel}
                  onChange={event =>
                    updateDocumentAtIndex(index, item => ({
                      ...item,
                      documentLabel: event.target.value,
                    }))
                  }
                  placeholder="Document title"
                />

                <div className="flex items-center gap-2 rounded border px-2 text-xs">
                  <span>Required</span>
                  <Switch
                    checked={document.isRequired}
                    onCheckedChange={checked =>
                      updateDocumentAtIndex(index, item => ({ ...item, isRequired: checked }))
                    }
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => swapDocumentOrder(index, input.rows[rowIndex - 1]?.index ?? index)}
                    disabled={rowIndex === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => swapDocumentOrder(index, input.rows[rowIndex + 1]?.index ?? index)}
                    disabled={rowIndex === input.rows.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Button size="icon" variant="destructive" onClick={() => removeDocument(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {input.category === 'developer_document' ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Input
                    value={document.templateFileUrl || ''}
                    onChange={event =>
                      updateDocumentAtIndex(index, item => ({
                        ...item,
                        templateFileUrl: event.target.value || null,
                      }))
                    }
                    placeholder="Template URL (https://...)"
                  />
                  <Input
                    value={document.templateFileName || ''}
                    onChange={event =>
                      updateDocumentAtIndex(index, item => ({
                        ...item,
                        templateFileName: event.target.value || null,
                      }))
                    }
                    placeholder="Template filename (optional)"
                  />
                </div>
              ) : null}
            </div>
          ))}

          {!input.rows.length ? (
            <div className="rounded border border-dashed p-3 text-sm text-slate-500">
              No {input.category === 'developer_document' ? 'developer' : 'client'} documents configured yet.
            </div>
          ) : null}

          <Button variant="outline" onClick={() => addDocument(input.category)}>
            <Plus className="mr-2 h-4 w-4" />
            {input.addLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  function buildProgramInput(targetDevelopmentId: number, isReferralEnabled: boolean) {
    return {
      developmentId: targetDevelopmentId,
      isReferralEnabled,
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
    };
  }

  function buildDocumentsInput(targetDevelopmentId: number, preserveIds: boolean) {
    return {
      developmentId: targetDevelopmentId,
      documents: documents.map((document, index) => ({
        id: preserveIds ? document.id : undefined,
        category: document.category,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel.trim() || 'Custom Document',
        templateFileUrl:
          document.category === 'developer_document'
            ? document.templateFileUrl?.trim() || null
            : null,
        templateFileName:
          document.category === 'developer_document'
            ? document.templateFileName?.trim() || null
            : null,
        isRequired: document.isRequired,
        sortOrder: index,
        isActive: document.isActive,
      })),
    };
  }

  function buildBrandPresetInput(): BrandOnboardingPreset {
    return {
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
      isActive,
      primaryManagerUserId: primaryManagerUserId ? Number(primaryManagerUserId) : null,
      documents: documents.map((document, index) => ({
        category: document.category,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel.trim() || 'Custom Document',
        templateFileUrl:
          document.category === 'developer_document'
            ? document.templateFileUrl?.trim() || null
            : null,
        templateFileName:
          document.category === 'developer_document'
            ? document.templateFileName?.trim() || null
            : null,
        isRequired: document.isRequired,
        isActive: document.isActive,
        sortOrder: index,
      })),
    };
  }

  async function saveConfigurationForDevelopment(
    targetDevelopmentId: number,
    targetReferralEnabled: boolean,
    preserveDocumentIds: boolean,
  ) {
    await onboardDevelopmentMutation.mutateAsync({
      developmentId: targetDevelopmentId,
    });

    const programResult = await upsertProgramMutation.mutateAsync(
      buildProgramInput(targetDevelopmentId, targetReferralEnabled),
    );

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

    await setDocsMutation.mutateAsync(buildDocumentsInput(targetDevelopmentId, preserveDocumentIds));

    await Promise.all([
      utils.distribution.admin.getProgramReadiness.invalidate({
        developmentId: targetDevelopmentId,
      }),
      utils.distribution.admin.getDevelopmentRequiredDocuments.invalidate({
        developmentId: targetDevelopmentId,
      }),
    ]);
  }

  async function handleSave() {
    await saveConfigurationForDevelopment(
      development.developmentId,
      Boolean(readinessQuery.data?.state.isReferralEnabled),
      true,
    );

    await Promise.all([
      readinessQuery.refetch(),
      docsQuery.refetch(),
      Promise.resolve(onMutationSuccess([development.developmentId])),
    ]);
    toast.success('Program configuration saved');
  }

  async function handleApplyTemplateToOtherDevelopments() {
    if (!otherDevelopments.length) return;

    setIsApplyingTemplate(true);
    try {
      const targetDevelopmentIds = otherDevelopments.map(row => row.developmentId);
      for (const row of otherDevelopments) {
        await saveConfigurationForDevelopment(row.developmentId, false, false);
      }

      await Promise.resolve(onMutationSuccess(targetDevelopmentIds));
      toast.success(
        `Applied onboarding defaults to ${otherDevelopments.length} development${
          otherDevelopments.length === 1 ? '' : 's'
        }. Referrals remain disabled on targets.`,
      );
    } catch (error: any) {
      toast.error(error?.message || 'Failed to apply onboarding defaults');
    } finally {
      setIsApplyingTemplate(false);
    }
  }

  async function handleSaveBrandPreset() {
    if (!brandProfileId) {
      toast.error('Select a brand-linked development before saving a brand preset');
      return;
    }

    await setBrandPresetMutation.mutateAsync({
      brandProfileId,
      preset: buildBrandPresetInput(),
    });
    await brandPresetQuery.refetch();
    toast.success('Brand onboarding preset saved');
  }

  function handleLoadBrandPreset() {
    const preset = brandPresetQuery.data?.preset as BrandOnboardingPreset | null | undefined;
    if (!preset) {
      toast.error('No saved brand preset found for this brand');
      return;
    }

    applyPresetToForm(preset);
    toast.success('Brand preset loaded into this development');
  }

  const brandPresetManagerLabel = managerOptions.find(
    option => option.userId === Number(brandPresetQuery.data?.preset?.primaryManagerUserId || 0),
  )?.label;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Preset</CardTitle>
          <CardDescription>
            Save this configuration as the reusable onboarding default for the selected brand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {brandPresetQuery.data?.preset ? (
            <div className="rounded border border-blue-200 bg-blue-50/70 p-3 text-xs text-slate-700">
              <p className="font-medium text-slate-900">Saved brand preset available</p>
              <p className="mt-1">
                {brandPresetQuery.data.preset.commissionModel},{' '}
                {brandPresetQuery.data.preset.currencyCode},{' '}
                {brandPresetQuery.data.preset.documents.length} document
                {brandPresetQuery.data.preset.documents.length === 1 ? '' : 's'}
                {brandPresetManagerLabel ? `, manager: ${brandPresetManagerLabel}` : ''}
              </p>
            </div>
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              No saved brand preset yet. Save the current development setup once, then reuse it
              across this brand.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleLoadBrandPreset}
              disabled={!brandPresetQuery.data?.preset || isSaving}
            >
              Load Brand Preset
            </Button>
            <Button variant="outline" onClick={handleSaveBrandPreset} disabled={isSaving}>
              {setBrandPresetMutation.isPending ? 'Saving Preset...' : 'Save Current as Brand Preset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Readiness</CardTitle>
          <CardDescription>Server truth for referral enablement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ReadinessStatusChips readiness={readinessQuery.data as any} />
          {readinessQuery.data?.canEnableReferral === false ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="mb-1 font-medium">Fix these blockers before enabling referrals:</p>
              <div className="space-y-1">
                {readinessQuery.data.blockers.map((blocker: any) => (
                  <div
                    key={blocker.code}
                    className="flex items-start justify-between gap-2 rounded border border-amber-200 bg-white/70 p-2"
                  >
                    <p>{blocker.message}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => {
                        const element = document.getElementById(getBlockerSectionId(blocker.code));
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-700">
              {readinessQuery.data?.state.isReferralEnabled
                ? 'Referrals are enabled for this development.'
                : 'Ready to enable referrals.'}
            </p>
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

      {renderDocumentSection({
        title: 'Developer Documents',
        description:
          'Define the development-side documents agents need to share with clients, such as offer to purchase, NCA forms, house plans, or development terms.',
        category: 'developer_document',
        rows: documents
          .map((document, index) => ({ document, index }))
          .filter(item => item.document.category === 'developer_document'),
        addLabel: 'Add Developer Document',
        sectionId: 'section-developer-docs',
      })}

      {renderDocumentSection({
        title: 'Client Required Documents',
        description:
          'Define the documents the buyer must submit back into the referral flow, such as ID copy, payslips, bank statements, and proof of address.',
        category: 'client_required_document',
        rows: documents
          .map((document, index) => ({ document, index }))
          .filter(item => item.document.category === 'client_required_document'),
        addLabel: 'Add Client Document',
        sectionId: 'section-client-docs',
      })}

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-3">
        {otherDevelopments.length ? (
          <Button variant="outline" onClick={handleApplyTemplateToOtherDevelopments} disabled={isSaving}>
            {isApplyingTemplate
              ? 'Applying Defaults...'
              : `Apply Current Setup to Other ${otherDevelopments.length} Development${
                  otherDevelopments.length === 1 ? '' : 's'
                }`}
          </Button>
        ) : null}
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
  onMutationSuccess,
  onFixNow,
  onReadinessLoaded,
}: {
  development: DevelopmentRow;
  isSelected: boolean;
  onConfigure: () => void;
  onMutationSuccess: (developmentIds: number[]) => Promise<void> | void;
  onFixNow: (blockerCode: string) => void;
  onReadinessLoaded: (developmentId: number, readiness: ProgramReadiness | null) => void;
}) {
  const readinessQuery = trpc.distribution.admin.getProgramReadiness.useQuery({
    developmentId: development.developmentId,
  });
  const setReferralEnabledMutation = trpc.distribution.admin.setProgramReferralEnabled.useMutation();
  const [inlineBlockers, setInlineBlockers] = useState<Array<{ code: string; message: string }>>([]);
  const isReadinessLoading = readinessQuery.isLoading && !readinessQuery.data;

  const isReferralEnabled = Boolean(readinessQuery.data?.state.isReferralEnabled);
  const blockers = inlineBlockers.length
    ? inlineBlockers
    : ((readinessQuery.data?.blockers || []) as Array<{ code: string; message: string }>);
  const primaryMessage = getPrimaryReadinessMessage(readinessQuery.data as ProgramReadiness | null);

  useEffect(() => {
    onReadinessLoaded(
      development.developmentId,
      (readinessQuery.data as ProgramReadiness | null | undefined) || null,
    );
  }, [development.developmentId, onReadinessLoaded, readinessQuery.data]);

  async function handleToggle(nextEnabled: boolean) {
    if (!nextEnabled) {
      setInlineBlockers([]);
      await setReferralEnabledMutation.mutateAsync({
        developmentId: development.developmentId,
        enabled: false,
      });
      await Promise.all([
        readinessQuery.refetch(),
        Promise.resolve(onMutationSuccess([development.developmentId])),
      ]);
      toast.success('Referrals disabled');
      return;
    }

    try {
      setInlineBlockers([]);
      await setReferralEnabledMutation.mutateAsync({
        developmentId: development.developmentId,
        enabled: true,
      });
      await Promise.all([
        readinessQuery.refetch(),
        Promise.resolve(onMutationSuccess([development.developmentId])),
      ]);
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

      <div
        className={`mt-2 rounded border p-2 text-xs ${
          isReferralEnabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : readinessQuery.data?.canEnableReferral
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        <p className="font-medium">
          {isReferralEnabled
            ? 'Referral status'
            : isReadinessLoading
              ? 'Loading readiness'
            : readinessQuery.data?.canEnableReferral
              ? 'Ready for activation'
              : 'Next action'}
        </p>
        <p className="mt-1">{primaryMessage}</p>
        {!isReadinessLoading && !isReferralEnabled && blockers.length ? (
          <div className="mt-2 space-y-1">
            {(isSelected ? blockers : blockers.slice(0, 1)).map(blocker => (
              <div
                key={`${development.developmentId}-${blocker.code}`}
                className="flex items-center justify-between gap-2"
              >
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
              </div>
            ))}
            {!isSelected && blockers.length > 1 ? (
              <p className="text-[11px] text-slate-600">
                {blockers.length - 1} more blocker{blockers.length - 1 === 1 ? '' : 's'} inside
                configuration.
              </p>
            ) : null}
          </div>
        ) : null}
        {isReadinessLoading ? (
          <p className="mt-2 text-[11px] text-slate-600">
            Checking program, manager, payout, currency, and document readiness...
          </p>
        ) : null}
      </div>

      {inlineBlockers.length ? (
        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <p className="mb-1 flex items-center gap-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Referral enable blocked
          </p>
          <p>Fix the blockers above, save the configuration, then try enabling again.</p>
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
  const utils = trpc.useUtils();
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [readinessByDevelopmentId, setReadinessByDevelopmentId] = useState<
    Record<number, ProgramReadiness | null>
  >({});
  const handleReadinessLoaded = useCallback(
    (developmentId: number, readiness: ProgramReadiness | null) => {
      setReadinessByDevelopmentId(current =>
        current[developmentId] === readiness ? current : { ...current, [developmentId]: readiness },
      );
    },
    [],
  );

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
  const readinessCounts = useMemo(
    () => getReadinessCounts(readinessByDevelopmentId),
    [readinessByDevelopmentId],
  );

  const handleMutationSuccess = useCallback(
    async (developmentIds: number[]) => {
      if (developmentIds.length) {
        setReadinessByDevelopmentId(current => {
          const next = { ...current };
          for (const developmentId of developmentIds) {
            delete next[developmentId];
          }
          return next;
        });

        await Promise.all([
          ...developmentIds.map(developmentId =>
            utils.distribution.admin.getProgramReadiness.invalidate({ developmentId }),
          ),
          ...developmentIds.map(developmentId =>
            utils.distribution.admin.getDevelopmentRequiredDocuments.invalidate({ developmentId }),
          ),
        ]);
      }

      await Promise.resolve(onRefreshCatalog());
    },
    [onRefreshCatalog, utils],
  );

  useEffect(() => {
    const activeIds = new Set(developments.map(row => row.developmentId));
    setReadinessByDevelopmentId(current => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([developmentId]) => activeIds.has(Number(developmentId))),
      ) as Record<number, ProgramReadiness | null>;
      return next;
    });
  }, [developments]);

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
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded border bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        In drawer
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {developments.length}
                      </p>
                    </div>
                    <div className="rounded border bg-emerald-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Referral live / ready
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-900">
                        {readinessCounts.enabled + readinessCounts.readyToEnable}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        {readinessCounts.enabled} enabled, {readinessCounts.readyToEnable} ready to enable
                      </p>
                    </div>
                    <div className="rounded border bg-amber-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                        Blocked
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-amber-900">
                        {readinessCounts.loading ? '...' : readinessCounts.blocked}
                      </p>
                      <p className="text-[11px] text-amber-700">
                        {readinessCounts.loading
                          ? `${readinessCounts.loading} development${
                              readinessCounts.loading === 1 ? '' : 's'
                            } still loading readiness`
                          : 'Needs onboarding setup before submissions can open'}
                      </p>
                    </div>
                  </div>
                  {developments.map(row => (
                    <DevelopmentOnboardingRow
                      key={row.developmentId}
                      development={row}
                      isSelected={selectedDevelopmentId === row.developmentId}
                  onConfigure={() => {
                        setSelectedDevelopmentId(row.developmentId);
                        setFocusSection(null);
                      }}
                      onMutationSuccess={handleMutationSuccess}
                      onFixNow={blockerCode => {
                        setSelectedDevelopmentId(row.developmentId);
                        setFocusSection(getBlockerSectionId(blockerCode));
                      }}
                      onReadinessLoaded={handleReadinessLoaded}
                    />
                  ))}
                </CardContent>
              </Card>

              <div>
                {selectedDevelopment ? (
                  <div className="space-y-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Configuring: {selectedDevelopment.developmentName}
                        </CardTitle>
                        <CardDescription>
                          {selectedDevelopment.city || 'Unknown city'},{' '}
                          {selectedDevelopment.province || 'Unknown province'}.
                          {` `}
                          Save this development directly, or apply its onboarding defaults to the
                          other developments in this brand.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                    <DevelopmentProgramConfigPanel
                      key={selectedDevelopment.developmentId}
                      development={selectedDevelopment}
                      brandProfileId={brandProfileId}
                      otherDevelopments={developments.filter(
                        row => row.developmentId !== selectedDevelopment.developmentId,
                      )}
                      managerOptions={managerOptions}
                      onMutationSuccess={handleMutationSuccess}
                      focusSection={focusSection}
                    />
                  </div>
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
