import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
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
  transactionType: 'all' | 'sale' | 'rent' | 'auction';
  participantType: 'buyer' | 'renter' | 'bidder' | 'developer' | 'manager' | 'supporting';
  readinessRole:
    | 'submission'
    | 'qualification'
    | 'lease'
    | 'auction_registration'
    | 'auction_terms'
    | 'payout'
    | 'supporting';
  requiredForStage?: string | null;
  blocksPayout: boolean;
  reviewOwner: 'manager' | 'admin' | 'developer' | 'system';
  publiclyShareable: boolean;
  programmeSpecific: boolean;
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

type BrochureConfigDraft = {
  headline: string;
  description: string;
  highlightBulletsText: string;
  amenityLabelsText: string;
  heroImageUrl: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

type ReadinessCounts = {
  live: number;
  enabledBlocked: number;
  readyToEnable: number;
  blocked: number;
  loading: number;
};

type AdminReadinessStatus =
  | 'loading'
  | 'live'
  | 'enabled_blocked'
  | 'ready_to_enable'
  | 'needs_setup';

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

const documentCodeLabelMap: Record<RequiredDocumentDraft['documentCode'], string> = {
  id_document: 'ID Document',
  proof_of_address: 'Proof of Address',
  proof_of_income: 'Payslips / Proof of Income',
  bank_statement: 'Bank Statement',
  pre_approval: 'Pre-Approval',
  signed_offer_to_purchase: 'Offer to Purchase',
  sale_agreement: 'Sale Agreement',
  attorney_instruction_letter: 'Attorney Instruction Letter',
  transfer_documents: 'Transfer Documents',
  custom: 'Custom Document',
};

const transactionTypeOptions: Array<{ value: RequiredDocumentDraft['transactionType']; label: string }> = [
  { value: 'all', label: 'All lanes' },
  { value: 'sale', label: 'Sale' },
  { value: 'rent', label: 'Rental' },
  { value: 'auction', label: 'Auction' },
];

const participantTypeOptions: Array<{ value: RequiredDocumentDraft['participantType']; label: string }> = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'renter', label: 'Renter' },
  { value: 'bidder', label: 'Bidder' },
  { value: 'developer', label: 'Developer' },
  { value: 'manager', label: 'Manager' },
  { value: 'supporting', label: 'Supporting' },
];

const readinessRoleOptions: Array<{ value: RequiredDocumentDraft['readinessRole']; label: string }> = [
  { value: 'submission', label: 'Submission' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'lease', label: 'Lease' },
  { value: 'auction_registration', label: 'Auction registration' },
  { value: 'auction_terms', label: 'Auction terms' },
  { value: 'payout', label: 'Payout' },
  { value: 'supporting', label: 'Supporting' },
];

const reviewOwnerOptions: Array<{ value: RequiredDocumentDraft['reviewOwner']; label: string }> = [
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'system', label: 'System' },
];

const documentStarterPacks: Array<{
  id: string;
  label: string;
  description: string;
  category: RequiredDocumentDraft['category'];
  documents: Array<
    Pick<
      RequiredDocumentDraft,
      | 'documentCode'
      | 'documentLabel'
      | 'isRequired'
      | 'transactionType'
      | 'participantType'
      | 'readinessRole'
      | 'blocksPayout'
      | 'publiclyShareable'
      | 'programmeSpecific'
    >
  >;
}> = [
  {
    id: 'bond-buyer',
    label: 'Bond buyer pack',
    description: 'ID, income, bank statement, and pre-approval for financed buyers.',
    category: 'client_required_document',
    documents: [
      {
        documentCode: 'id_document',
        documentLabel: 'ID Document',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'submission',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'proof_of_income',
        documentLabel: 'Latest payslip or proof of income',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'qualification',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'bank_statement',
        documentLabel: '3 months bank statements',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'qualification',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'pre_approval',
        documentLabel: 'Bond pre-approval',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'qualification',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
    ],
  },
  {
    id: 'cash-buyer',
    label: 'Cash buyer pack',
    description: 'Lean checklist for buyers who do not need bond finance.',
    category: 'client_required_document',
    documents: [
      {
        documentCode: 'id_document',
        documentLabel: 'ID Document',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'submission',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'proof_of_address',
        documentLabel: 'Proof of address',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'submission',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'bank_statement',
        documentLabel: 'Proof of funds or bank confirmation',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'buyer',
        readinessRole: 'qualification',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
    ],
  },
  {
    id: 'developer-application',
    label: 'Developer application pack',
    description: 'Developer-specific forms the referrer downloads, gets signed, and re-uploads.',
    category: 'developer_document',
    documents: [
      {
        documentCode: 'sale_agreement',
        documentLabel: 'Sale agreement',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'developer',
        readinessRole: 'payout',
        blocksPayout: true,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'custom',
        documentLabel: 'Building contract',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'developer',
        readinessRole: 'payout',
        blocksPayout: true,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'custom',
        documentLabel: 'Price tracker / price schedule',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'developer',
        readinessRole: 'supporting',
        blocksPayout: false,
        publiclyShareable: false,
        programmeSpecific: true,
      },
      {
        documentCode: 'signed_offer_to_purchase',
        documentLabel: 'Offer to purchase',
        isRequired: true,
        transactionType: 'sale',
        participantType: 'developer',
        readinessRole: 'payout',
        blocksPayout: true,
        publiclyShareable: false,
        programmeSpecific: true,
      },
    ],
  },
  {
    id: 'supporting',
    label: 'Supporting document pack',
    description: 'Reference files the referrer can share, but that do not block the application.',
    category: 'developer_document',
    documents: [
      {
        documentCode: 'custom',
        documentLabel: 'Unit / house plans',
        isRequired: false,
        transactionType: 'all',
        participantType: 'supporting',
        readinessRole: 'supporting',
        blocksPayout: false,
        publiclyShareable: true,
        programmeSpecific: false,
      },
      {
        documentCode: 'custom',
        documentLabel: 'Site map',
        isRequired: false,
        transactionType: 'all',
        participantType: 'supporting',
        readinessRole: 'supporting',
        blocksPayout: false,
        publiclyShareable: true,
        programmeSpecific: false,
      },
      {
        documentCode: 'custom',
        documentLabel: 'Specifications',
        isRequired: false,
        transactionType: 'all',
        participantType: 'supporting',
        readinessRole: 'supporting',
        blocksPayout: false,
        publiclyShareable: true,
        programmeSpecific: false,
      },
      {
        documentCode: 'transfer_documents',
        documentLabel: 'Transfer and costs guide',
        isRequired: false,
        transactionType: 'sale',
        participantType: 'supporting',
        readinessRole: 'supporting',
        blocksPayout: false,
        publiclyShareable: true,
        programmeSpecific: false,
      },
    ],
  },
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

function getAdminReadinessStatus(readiness?: ProgramReadiness | null): AdminReadinessStatus {
  if (!readiness) return 'loading';
  if (readiness.state.isReferralEnabled && readiness.canEnableReferral) return 'live';
  if (readiness.state.isReferralEnabled && !readiness.canEnableReferral) return 'enabled_blocked';
  if (readiness.canEnableReferral) return 'ready_to_enable';
  return 'needs_setup';
}

function getBlockerSectionId(blockerCode: string) {
  return blockerSectionMap[blockerCode] || 'section-program';
}

function isRequiredDocumentSchemaNotReadyError(error: any) {
  const message = String(error?.message || '');
  const trpcCode = String(error?.data?.code || error?.shape?.data?.code || '');
  return (
    trpcCode === 'PRECONDITION_FAILED' &&
    message.includes('Required document schema is not ready yet')
  );
}

function getPrimaryReadinessMessage(readiness?: ProgramReadiness | null) {
  const status = getAdminReadinessStatus(readiness);
  if (status === 'loading') return 'Loading readiness status...';
  if (status === 'live') {
    return 'Referrals are live for this development.';
  }
  if (status === 'enabled_blocked') {
    return 'Referrals are enabled, but buyer submissions are blocked until setup is complete.';
  }
  if (status === 'ready_to_enable') {
    return 'Ready to enable referrals.';
  }
  return readiness?.blockers[0]?.message || 'Complete onboarding configuration before enabling referrals.';
}

function getReadinessCounts(readinessByDevelopmentId: Record<number, ProgramReadiness | null | undefined>) {
  return Object.values(readinessByDevelopmentId).reduce<ReadinessCounts>(
    (counts, readiness) => {
      if (!readiness) {
        counts.loading += 1;
        return counts;
      }
      switch (getAdminReadinessStatus(readiness)) {
        case 'live':
          counts.live += 1;
          break;
        case 'enabled_blocked':
          counts.enabledBlocked += 1;
          break;
        case 'ready_to_enable':
          counts.readyToEnable += 1;
          break;
        case 'needs_setup':
          counts.blocked += 1;
          break;
      }
      return counts;
    },
    { live: 0, enabledBlocked: 0, readyToEnable: 0, blocked: 0, loading: 0 },
  );
}

function toFileBaseName(filename: string | null | undefined) {
  if (!filename) return '';
  const trimmed = String(filename).trim();
  if (!trimmed) return '';
  const withoutPath = trimmed.split(/[\\/]/).pop() || trimmed;
  const withoutExt = withoutPath.replace(/\.[^.]+$/, '');
  return withoutExt.trim();
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function joinLines(value: unknown) {
  return Array.isArray(value)
    ? value
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join('\n')
    : '';
}

function getDefaultDocumentSemantics(
  category: RequiredDocumentDraft['category'] = 'client_required_document',
): Pick<
  RequiredDocumentDraft,
  | 'transactionType'
  | 'participantType'
  | 'readinessRole'
  | 'requiredForStage'
  | 'blocksPayout'
  | 'reviewOwner'
  | 'publiclyShareable'
  | 'programmeSpecific'
> {
  if (category === 'developer_document') {
    return {
      transactionType: 'all',
      participantType: 'developer',
      readinessRole: 'supporting',
      requiredForStage: null,
      blocksPayout: false,
      reviewOwner: 'manager',
      publiclyShareable: false,
      programmeSpecific: true,
    };
  }

  return {
    transactionType: 'all',
    participantType: 'supporting',
    readinessRole: 'supporting',
    requiredForStage: null,
    blocksPayout: false,
    reviewOwner: 'manager',
    publiclyShareable: false,
    programmeSpecific: true,
  };
}

function normalizeDocumentDraft(document: Partial<RequiredDocumentDraft>): RequiredDocumentDraft {
  const category =
    document.category === 'developer_document' ? 'developer_document' : 'client_required_document';
  const defaults = getDefaultDocumentSemantics(category);

  return {
    ...defaults,
    category,
    id: document.id,
    transactionType: document.transactionType || defaults.transactionType,
    participantType: document.participantType || defaults.participantType,
    readinessRole: document.readinessRole || defaults.readinessRole,
    requiredForStage:
      typeof document.requiredForStage === 'string' && document.requiredForStage.trim()
        ? document.requiredForStage.trim()
        : null,
    blocksPayout: Boolean(document.blocksPayout),
    reviewOwner: document.reviewOwner || defaults.reviewOwner,
    publiclyShareable: Boolean(document.publiclyShareable),
    programmeSpecific:
      typeof document.programmeSpecific === 'boolean'
        ? document.programmeSpecific
        : defaults.programmeSpecific,
    documentCode: (document.documentCode || 'custom') as RequiredDocumentDraft['documentCode'],
    documentLabel: String(document.documentLabel || ''),
    templateFileUrl: document.templateFileUrl || null,
    templateFileName: document.templateFileName || null,
    isRequired: Boolean(document.isRequired),
    isActive: typeof document.isActive === 'boolean' ? document.isActive : true,
    sortOrder: Number(document.sortOrder || 0),
  };
}

function getEmptyBrochureConfig(): BrochureConfigDraft {
  return {
    headline: '',
    description: '',
    highlightBulletsText: '',
    amenityLabelsText: '',
    heroImageUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  };
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
      {statusBadge(state.programExists, 'Setup: Created', 'Setup: Missing')}
      {statusBadge(state.isActive, 'Setup: Active', 'Setup: Paused')}
      {statusBadge(state.isReferralEnabled, 'Accepting referrals: On', 'Accepting referrals: Off')}
      {statusBadge(hasCommission, 'Referral reward: Set', 'Referral reward: Missing')}
      {statusBadge(Boolean(state.payoutMilestone), 'Payout trigger: Set', 'Payout trigger: Missing')}
      {statusBadge(Boolean(state.currencyCode), 'Payout currency: Set', 'Payout currency: Missing')}
      {statusBadge(state.hasActivePrimaryManager, 'Manager: Assigned', 'Manager: Missing')}
      {statusBadge(state.requiredRequiredDocsCount > 0, 'Application docs: Ready', 'Application docs: Missing')}
    </div>
  );
}

function ReadinessChecklist({ readiness }: { readiness?: ProgramReadiness | null }) {
  if (!readiness) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const { state } = readiness;
  const hasReward =
    state.commissionModel === 'flat_percentage'
      ? Boolean(state.defaultCommissionPercent && state.defaultCommissionPercent > 0)
      : state.commissionModel === 'flat_amount'
        ? Boolean(state.defaultCommissionAmount && state.defaultCommissionAmount > 0)
        : false;
  const checklist = [
    {
      label: 'Create referral setup',
      done: state.programExists,
      help: 'The development has a partner program record.',
    },
    {
      label: 'Keep setup active',
      done: state.isActive,
      help: 'Paused programs cannot accept buyer submissions.',
    },
    {
      label: 'Set referral reward',
      done: hasReward,
      help: 'Referrers need to know the reward before submitting buyers.',
    },
    {
      label: 'Choose payout trigger',
      done: Boolean(state.payoutMilestone),
      help: 'This tells referrers when reward progress moves forward.',
    },
    {
      label: 'Set payout currency',
      done: Boolean(state.currencyCode),
      help: 'Rewards must show a clear currency.',
    },
    {
      label: 'Assign primary manager',
      done: state.hasActivePrimaryManager,
      help: 'Every buyer needs an accountable handler.',
    },
    {
      label: 'Add application document checklist',
      done: state.requiredRequiredDocsCount > 0,
      help: 'The deal checklist needs at least one required application document.',
    },
  ];

  return (
    <div className="space-y-2">
      {checklist.map(item => (
        <div
          key={item.label}
          className={`rounded border p-2 ${
            item.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
          }`}
        >
          <div className="flex items-start gap-2">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <div>
              <p className={item.done ? 'text-sm font-medium text-emerald-900' : 'text-sm font-medium text-amber-950'}>
                {item.label}
              </p>
              <p className="text-xs text-slate-600">{item.help}</p>
            </div>
          </div>
        </div>
      ))}
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
  const accessQuery = trpc.distribution.admin.getDevelopmentAccess.useQuery({
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
  const setBrochureConfigMutation =
    trpc.distribution.admin.setDevelopmentBrochureConfig.useMutation();
  const setReferralEnabledMutation = trpc.distribution.admin.setProgramReferralEnabled.useMutation();
  const onboardDevelopmentMutation =
    trpc.distribution.admin.onboardDevelopmentToPartnerNetwork.useMutation();
  const setBrandPresetMutation = trpc.distribution.admin.setBrandOnboardingPreset.useMutation();
  const presignUploadMutation = trpc.upload.presign.useMutation();

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
  const [brochureConfig, setBrochureConfig] = useState<BrochureConfigDraft>(
    getEmptyBrochureConfig,
  );
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [uploadingDocumentIndex, setUploadingDocumentIndex] = useState<number | null>(null);

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
      (preset.documents || []).map((document, index) => ({
        ...normalizeDocumentDraft(document),
        id: undefined,
        sortOrder: index,
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
      .map((document: any) => normalizeDocumentDraft({
        id: Number(document.id),
        category: document.category,
        transactionType: document.transactionType,
        participantType: document.participantType,
        readinessRole: document.readinessRole,
        requiredForStage: document.requiredForStage,
        blocksPayout: Boolean(document.blocksPayout),
        reviewOwner: document.reviewOwner,
        publiclyShareable: Boolean(document.publiclyShareable),
        programmeSpecific:
          typeof document.programmeSpecific === 'boolean' ? document.programmeSpecific : true,
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
    const config = (accessQuery.data?.entity as any)?.brochureConfigJson || {};
    setBrochureConfig({
      headline: String(config.headline || ''),
      description: String(config.description || ''),
      highlightBulletsText: joinLines(config.highlightBullets),
      amenityLabelsText: joinLines(config.amenityLabels),
      heroImageUrl: String(config.heroImageUrl || ''),
      contactName: String(config.contactName || ''),
      contactPhone: String(config.contactPhone || ''),
      contactEmail: String(config.contactEmail || ''),
    });
  }, [accessQuery.data, development.developmentId]);

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
    setBrochureConfigMutation.isPending ||
    setReferralEnabledMutation.isPending ||
    setBrandPresetMutation.isPending ||
    isApplyingTemplate;
  const readinessStatus = getAdminReadinessStatus(readinessQuery.data as ProgramReadiness | null);

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

  function addDocument(category: RequiredDocumentDraft['category'], isRequired = true) {
    setDocuments(current => [
      ...current,
      {
        ...getDefaultDocumentSemantics(category),
        category,
        documentCode: 'custom',
        documentLabel: '',
        templateFileUrl: null,
        templateFileName: null,
        isRequired,
        isActive: true,
        sortOrder: current.length,
      },
    ]);
  }

  function addDeveloperDocument(label: string, isRequired: boolean) {
    setDocuments(current => [
      ...current,
      {
        ...getDefaultDocumentSemantics('developer_document'),
        category: 'developer_document',
        documentCode: 'custom',
        documentLabel: label,
        templateFileUrl: null,
        templateFileName: null,
        isRequired,
        isActive: true,
        sortOrder: current.length,
      },
    ]);
  }

  function applyDocumentStarterPack(packId: string) {
    const pack = documentStarterPacks.find(item => item.id === packId);
    if (!pack) return;

    setDocuments(current => {
      const retained = current.filter(document => document.category !== pack.category);
      const nextPackDocuments = pack.documents.map((document, index) => ({
        ...getDefaultDocumentSemantics(pack.category),
        id: undefined,
        category: pack.category,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel,
        templateFileUrl: null,
        templateFileName: null,
        isRequired: document.isRequired,
        isActive: true,
        sortOrder: retained.length + index,
        transactionType: document.transactionType,
        participantType: document.participantType,
        readinessRole: document.readinessRole,
        blocksPayout: document.blocksPayout,
        publiclyShareable: document.publiclyShareable,
        programmeSpecific: document.programmeSpecific,
      }));

      return [...retained, ...nextPackDocuments].map((document, index) => ({
        ...document,
        sortOrder: index,
      }));
    });
    toast.success(`${pack.label} applied`);
  }

  function resolveDocumentLabel(document: RequiredDocumentDraft) {
    const typedLabel = document.documentLabel.trim();
    if (typedLabel) return typedLabel;

    if (document.category === 'developer_document') {
      const fileLabel = toFileBaseName(document.templateFileName);
      if (fileLabel) return fileLabel;
    }

    return documentCodeLabelMap[document.documentCode] || 'Custom Document';
  }

  async function handleSourceDocumentUpload(index: number, file: File | null) {
    if (!file) return;
    setUploadingDocumentIndex(index);
    try {
      const { url, publicUrl } = await presignUploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        propertyId: `distribution-development-${development.developmentId}`,
      });

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Document upload failed (${uploadResponse.status}).`);
      }

      updateDocumentAtIndex(index, item => ({
        ...item,
        templateFileUrl: publicUrl,
        templateFileName: file.name,
        documentLabel: item.documentLabel.trim() || toFileBaseName(file.name),
      }));
      toast.success('Source document uploaded.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload source document.');
    } finally {
      setUploadingDocumentIndex(null);
    }
  }

  function renderDocumentSection(input: {
    title: string;
    description: string;
    category: RequiredDocumentDraft['category'];
    rows: Array<{ document: RequiredDocumentDraft; index: number }>;
    addLabel: string;
    sectionId: string;
    role: 'developer_application' | 'supporting' | 'buyer_application';
  }) {
    const packs = documentStarterPacks.filter(pack => {
      if (input.role === 'developer_application') return pack.id === 'developer-application';
      if (input.role === 'supporting') return pack.id === 'supporting';
      return pack.category === input.category;
    });
    const isSupportingSection = input.role === 'supporting';
    const isDeveloperApplicationSection = input.role === 'developer_application';

    return (
      <Card id={input.sectionId}>
        <CardHeader>
          <CardTitle className="text-base">{input.title}</CardTitle>
          <CardDescription>{input.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {packs.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {packs.map(pack => (
                <div key={pack.id} className="rounded border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-sm font-medium text-slate-900">{pack.label}</p>
                  <p className="mt-1 text-xs text-slate-600">{pack.description}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => applyDocumentStarterPack(pack.id)}
                  >
                    Use pack
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {isDeveloperApplicationSection ? (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Common developer application forms
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Add custom forms with the developer's own terminology. These are required and will
                appear on the deal checklist for signing and re-upload.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Sale agreement', 'Building contract', 'Price tracker', 'House plan acknowledgement'].map(label => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addDeveloperDocument(label, true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {isSupportingSection ? (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Common supporting files
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Add the files each development normally needs, then upload the actual plan, map,
                or specification PDF per row.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Unit / house plans', 'Site map', 'Specifications', 'Price list'].map(label => (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addDeveloperDocument(label, false)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {input.rows.map(({ document, index }, rowIndex) => (
            <div key={`${document.id || 'new'}-${index}`} className="rounded border p-2">
              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1.4fr)_auto_auto_auto]">
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
                  className="min-w-[220px]"
                  value={document.documentLabel}
                  onChange={event =>
                    updateDocumentAtIndex(index, item => ({
                      ...item,
                      documentLabel: event.target.value,
                    }))
                  }
                  placeholder={
                    input.category === 'developer_document' && document.documentCode === 'custom'
                      ? 'Custom document name'
                      : 'Document title'
                  }
                />

                <div className="flex items-center gap-2 rounded border px-2 text-xs">
                  <span>{isSupportingSection ? 'Shareable' : 'Required'}</span>
                  <Switch
                    checked={isSupportingSection ? document.isActive : document.isRequired}
                    disabled={isDeveloperApplicationSection}
                    onCheckedChange={checked =>
                      updateDocumentAtIndex(index, item =>
                        isSupportingSection
                          ? { ...item, isActive: checked }
                          : { ...item, isRequired: checked },
                      )
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
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-slate-700">
                      {isSupportingSection ? 'Upload supporting file' : 'Upload application template'}
                    </label>
                    <div className="rounded border border-slate-200 bg-slate-50 p-2">
                      <p className="mb-2 text-xs text-slate-600">
                        {isSupportingSection
                          ? 'Use this for development-specific files like plans, site maps, specifications, price lists, or terms.'
                          : 'Use this for developer-specific forms the referrer must download, get signed, and re-upload.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        disabled={isSaving || uploadingDocumentIndex === index}
                        onChange={event => {
                          const file = event.target.files?.[0] || null;
                          void handleSourceDocumentUpload(index, file);
                          event.currentTarget.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSaving || uploadingDocumentIndex === index}
                        onClick={() =>
                          updateDocumentAtIndex(index, item => ({
                            ...item,
                            templateFileUrl: null,
                            templateFileName: null,
                          }))
                        }
                      >
                        Clear
                      </Button>
                      {uploadingDocumentIndex === index ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </span>
                      ) : null}
                      </div>
                    </div>
                    {document.templateFileUrl ? (
                      <a
                        href={document.templateFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Upload className="h-3 w-3" />
                        {isSupportingSection ? 'Supporting file ready' : 'Application template ready'}
                        {document.templateFileName ? ` (${document.templateFileName})` : ''}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {isSupportingSection
                          ? 'No supporting file uploaded yet. The label can still be saved as a placeholder.'
                          : 'No application template uploaded yet. Upload the developer-specific form before expecting referrers to download it.'}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                <div className="grid gap-2 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Transaction lane
                    </label>
                    <Select
                      value={document.transactionType}
                      onValueChange={value =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          transactionType: value as RequiredDocumentDraft['transactionType'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Participant
                    </label>
                    <Select
                      value={document.participantType}
                      onValueChange={value =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          participantType: value as RequiredDocumentDraft['participantType'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {participantTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Readiness role
                    </label>
                    <Select
                      value={document.readinessRole}
                      onValueChange={value =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          readinessRole: value as RequiredDocumentDraft['readinessRole'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {readinessRoleOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Review owner
                    </label>
                    <Select
                      value={document.reviewOwner}
                      onValueChange={value =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          reviewOwner: value as RequiredDocumentDraft['reviewOwner'],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewOwnerOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto_auto_auto]">
                  <Input
                    value={document.requiredForStage || ''}
                    onChange={event =>
                      updateDocumentAtIndex(index, item => ({
                        ...item,
                        requiredForStage: event.target.value,
                      }))
                    }
                    placeholder="Required stage"
                  />

                  <div className="flex items-center gap-2 rounded border bg-white px-2 text-xs">
                    <span>Blocks payout</span>
                    <Switch
                      checked={document.blocksPayout}
                      onCheckedChange={checked =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          blocksPayout: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded border bg-white px-2 text-xs">
                    <span>Public</span>
                    <Switch
                      checked={document.publiclyShareable}
                      onCheckedChange={checked =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          publiclyShareable: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded border bg-white px-2 text-xs">
                    <span>Programme-specific</span>
                    <Switch
                      checked={document.programmeSpecific}
                      onCheckedChange={checked =>
                        updateDocumentAtIndex(index, item => ({
                          ...item,
                          programmeSpecific: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!input.rows.length ? (
            <div className="rounded border border-dashed p-3 text-sm text-slate-500">
              No {input.category === 'developer_document' ? 'developer' : 'client'} documents configured yet.
            </div>
          ) : null}

          <Button
            variant="outline"
            onClick={() => addDocument(input.category, !isSupportingSection)}
          >
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
        transactionType: document.transactionType,
        participantType: document.participantType,
        readinessRole: document.readinessRole,
        requiredForStage: document.requiredForStage?.trim() || null,
        blocksPayout: document.blocksPayout,
        reviewOwner: document.reviewOwner,
        publiclyShareable: document.publiclyShareable,
        programmeSpecific: document.programmeSpecific,
        documentCode: document.documentCode,
        documentLabel: resolveDocumentLabel(document),
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
        transactionType: document.transactionType,
        participantType: document.participantType,
        readinessRole: document.readinessRole,
        requiredForStage: document.requiredForStage?.trim() || null,
        blocksPayout: document.blocksPayout,
        reviewOwner: document.reviewOwner,
        publiclyShareable: document.publiclyShareable,
        programmeSpecific: document.programmeSpecific,
        documentCode: document.documentCode,
        documentLabel: resolveDocumentLabel(document),
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

  function buildBrochureConfigInput() {
    return {
      headline: brochureConfig.headline.trim() || null,
      description: brochureConfig.description.trim() || null,
      highlightBullets: splitLines(brochureConfig.highlightBulletsText).slice(0, 8),
      amenityLabels: splitLines(brochureConfig.amenityLabelsText).slice(0, 8),
      heroImageUrl: brochureConfig.heroImageUrl.trim() || null,
      contactName: brochureConfig.contactName.trim() || null,
      contactPhone: brochureConfig.contactPhone.trim() || null,
      contactEmail: brochureConfig.contactEmail.trim() || null,
    };
  }

  async function saveConfigurationForDevelopment(
    targetDevelopmentId: number,
    targetReferralEnabled: boolean,
    preserveDocumentIds: boolean,
  ): Promise<{ documentsSaved: boolean }> {
    await onboardDevelopmentMutation.mutateAsync({
      developmentId: targetDevelopmentId,
    });

    const programResult = await upsertProgramMutation.mutateAsync(
      buildProgramInput(targetDevelopmentId, targetReferralEnabled),
    );

    if (targetDevelopmentId === development.developmentId) {
      await setBrochureConfigMutation.mutateAsync({
        developmentId: targetDevelopmentId,
        brochureConfig: buildBrochureConfigInput(),
      });
    }

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

    try {
      await setDocsMutation.mutateAsync(buildDocumentsInput(targetDevelopmentId, preserveDocumentIds));
    } catch (error: any) {
      if (isRequiredDocumentSchemaNotReadyError(error)) {
        return { documentsSaved: false };
      }
      throw error;
    }

    await Promise.all([
      utils.distribution.admin.getProgramReadiness.invalidate({
        developmentId: targetDevelopmentId,
      }),
      utils.distribution.admin.getDevelopmentRequiredDocuments.invalidate({
        developmentId: targetDevelopmentId,
      }),
      utils.distribution.admin.getDevelopmentAccess.invalidate({
        developmentId: targetDevelopmentId,
      }),
    ]);

    return { documentsSaved: true };
  }

  async function handleSave() {
    const keepReferralsLive = readinessStatus === 'live';
    const saveResult = await saveConfigurationForDevelopment(
      development.developmentId,
      keepReferralsLive,
      true,
    );

    await Promise.all([
      readinessQuery.refetch(),
      docsQuery.refetch(),
      accessQuery.refetch(),
      Promise.resolve(onMutationSuccess([development.developmentId])),
    ]);
    if (saveResult.documentsSaved) {
      toast.success(keepReferralsLive ? 'Live referral setup saved' : 'Referral setup saved as draft');
    } else {
      toast.error(
        'Core setup saved, but document checklist was not saved. Run latest distribution DB migrations and retry Save setup.',
      );
    }
  }

  async function handleEnableReferrals() {
    try {
      const saveResult = await saveConfigurationForDevelopment(development.developmentId, false, true);
      await setReferralEnabledMutation.mutateAsync({
        developmentId: development.developmentId,
        enabled: true,
      });

      await Promise.all([
        readinessQuery.refetch(),
        docsQuery.refetch(),
        accessQuery.refetch(),
        Promise.resolve(onMutationSuccess([development.developmentId])),
      ]);
      if (saveResult.documentsSaved) {
        toast.success('Referrals enabled');
      } else {
        toast.error(
          'Referrals were enabled, but document checklist was not saved. Run latest distribution DB migrations and save setup again.',
        );
      }
    } catch (error: any) {
      toast.error(error?.message || 'Save setup first, then enable referrals when all blockers are clear');
    }
  }

  async function handleApplyTemplateToOtherDevelopments() {
    if (!otherDevelopments.length) return;

    setIsApplyingTemplate(true);
    try {
      const targetDevelopmentIds = otherDevelopments.map(row => row.developmentId);
      let hasDocumentSchemaBlocker = false;
      for (const row of otherDevelopments) {
        const result = await saveConfigurationForDevelopment(row.developmentId, false, false);
        if (!result.documentsSaved) {
          hasDocumentSchemaBlocker = true;
        }
      }

      await Promise.resolve(onMutationSuccess(targetDevelopmentIds));
      if (hasDocumentSchemaBlocker) {
        toast.error(
          `Applied core setup to ${otherDevelopments.length} development${
            otherDevelopments.length === 1 ? '' : 's'
          }, but document checklists were skipped. Run latest distribution DB migrations, then apply again.`,
        );
      } else {
        toast.success(
          `Applied onboarding defaults to ${otherDevelopments.length} development${
            otherDevelopments.length === 1 ? '' : 's'
          }. Referrals remain disabled on targets.`,
        );
      }
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
          <CardTitle className="text-base">Referral Setup Checklist</CardTitle>
          <CardDescription>
            Complete these items before buyers can be submitted for this development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReadinessStatusChips readiness={readinessQuery.data as any} />
          <ReadinessChecklist readiness={readinessQuery.data as any} />
          {readinessStatus === 'enabled_blocked' ? (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <p className="font-medium">Enabled but not accepting submissions</p>
              <p className="mt-1">
                This development has the referral switch on, but setup is incomplete. Save the setup
                as a draft or fix the blockers before enabling again.
              </p>
            </div>
          ) : null}
          {readinessQuery.data?.canEnableReferral === false ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="mb-1 font-medium">Next setup actions:</p>
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
              {readinessStatus === 'live'
                ? 'Referrals are enabled for this development.'
                : 'Ready to enable referrals.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card id="section-program">
        <CardHeader>
          <CardTitle className="text-base">Referral Reward & Payout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div id="section-commission" className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Referral reward type</p>
              <Select
                value={commissionModel}
                onValueChange={value => setCommissionModel(value as 'flat_percentage' | 'flat_amount')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_percentage">Percentage of sale</SelectItem>
                  <SelectItem value="flat_amount">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                {commissionModel === 'flat_percentage' ? 'Reward percentage' : 'Reward amount'}
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
              <p className="text-xs font-medium text-slate-700">Who can submit buyers?</p>
              <Select value={tierAccessPolicy} onValueChange={value => setTierAccessPolicy(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restricted">Approved partners only</SelectItem>
                  <SelectItem value="open">Open referrers and partners</SelectItem>
                  <SelectItem value="invite_only">Invite-only partners</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1" id="section-payout">
              <p className="text-xs font-medium text-slate-700">When does payout progress?</p>
              <Select value={payoutMilestone} onValueChange={value => setPayoutMilestone(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payoutMilestones.map(milestone => (
                    <SelectItem key={milestone} value={milestone}>
                      {milestone.replace(/_/g, ' ')}
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
              <p className="text-xs font-medium text-slate-700">Payout currency</p>
              <Input
                value={currencyCode}
                onChange={event => setCurrencyCode(event.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            <div className="flex items-end justify-between rounded border p-2">
              <div>
                <p className="text-xs font-medium text-slate-700">Setup active</p>
                <p className="text-[11px] text-slate-500">Paused setups cannot accept buyers.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="section-brochure">
        <CardHeader>
          <CardTitle className="text-base">Buyer Brochure</CardTitle>
          <CardDescription>
            Control the buyer-facing brochure copy for this development. Empty fields fall back to the
            published development content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Brochure headline</p>
              <Input
                value={brochureConfig.headline}
                onChange={event =>
                  setBrochureConfig(current => ({ ...current, headline: event.target.value }))
                }
                maxLength={120}
                placeholder={development.developmentName}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Hero image URL</p>
              <Input
                value={brochureConfig.heroImageUrl}
                onChange={event =>
                  setBrochureConfig(current => ({ ...current, heroImageUrl: event.target.value }))
                }
                placeholder="Use development hero image"
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">Brochure description</p>
            <Textarea
              value={brochureConfig.description}
              onChange={event =>
                setBrochureConfig(current => ({ ...current, description: event.target.value }))
              }
              maxLength={900}
              rows={4}
              placeholder="Short buyer-focused introduction for this development"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Buyer highlights</p>
              <Textarea
                value={brochureConfig.highlightBulletsText}
                onChange={event =>
                  setBrochureConfig(current => ({
                    ...current,
                    highlightBulletsText: event.target.value,
                  }))
                }
                rows={6}
                placeholder={'One highlight per line\nClose to schools\nModern finishes\nSecure estate access'}
              />
              <p className="text-[11px] text-slate-500">Up to 8 lines appear in the brochure.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Amenity labels</p>
              <Textarea
                value={brochureConfig.amenityLabelsText}
                onChange={event =>
                  setBrochureConfig(current => ({
                    ...current,
                    amenityLabelsText: event.target.value,
                  }))
                }
                rows={6}
                placeholder={'One amenity per line\nKids play parks\nSolar backup\nEasy highway access'}
              />
              <p className="text-[11px] text-slate-500">Used in the icon row near the brochure footer.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Contact name</p>
              <Input
                value={brochureConfig.contactName}
                onChange={event =>
                  setBrochureConfig(current => ({ ...current, contactName: event.target.value }))
                }
                maxLength={120}
                placeholder="Sales"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Contact phone</p>
              <Input
                value={brochureConfig.contactPhone}
                onChange={event =>
                  setBrochureConfig(current => ({ ...current, contactPhone: event.target.value }))
                }
                maxLength={50}
                placeholder="On request"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Contact email</p>
              <Input
                value={brochureConfig.contactEmail}
                onChange={event =>
                  setBrochureConfig(current => ({ ...current, contactEmail: event.target.value }))
                }
                maxLength={320}
                placeholder="Use brand public email"
              />
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
        title: 'Development Application Documents',
        description:
          'Required developer-specific forms that affect the deal application, such as sale agreements, building contracts, price trackers, or house plan acknowledgements.',
        category: 'developer_document',
        rows: documents
          .map((document, index) => ({ document, index }))
          .filter(item => item.document.category === 'developer_document' && item.document.isRequired),
        addLabel: 'Add Application Document',
        sectionId: 'section-developer-docs',
        role: 'developer_application',
      })}

      {renderDocumentSection({
        title: 'Supporting Documents',
        description:
          'Optional reference files referrers can download or share with buyers. These do not block application progress.',
        category: 'developer_document',
        rows: documents
          .map((document, index) => ({ document, index }))
          .filter(item => item.document.category === 'developer_document' && !item.document.isRequired),
        addLabel: 'Add Supporting File',
        sectionId: 'section-supporting-docs',
        role: 'supporting',
      })}

      {renderDocumentSection({
        title: 'Buyer Application Documents',
        description:
          'Buyers must provide these documents before the referral can move cleanly through qualification.',
        category: 'client_required_document',
        rows: documents
          .map((document, index) => ({ document, index }))
          .filter(item => item.document.category === 'client_required_document'),
        addLabel: 'Add Client Document',
        sectionId: 'section-client-docs',
        role: 'buyer_application',
      })}

      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white p-3">
        {readinessStatus === 'enabled_blocked' ? (
          <p className="mr-auto max-w-[260px] text-xs text-red-600">
            This setup is enabled but blocked. Saving now will keep it as a draft until it is ready.
          </p>
        ) : readinessStatus === 'ready_to_enable' ? (
          <p className="mr-auto max-w-[260px] text-xs text-emerald-700">
            Setup is ready. Save first, then enable referrals for buyers.
          </p>
        ) : null}
        {otherDevelopments.length ? (
          <Button variant="outline" onClick={handleApplyTemplateToOtherDevelopments} disabled={isSaving}>
            {isApplyingTemplate
              ? 'Applying Defaults...'
              : `Apply Current Setup to Other ${otherDevelopments.length} Development${
                  otherDevelopments.length === 1 ? '' : 's'
                }`}
          </Button>
        ) : null}
        <Button variant="outline" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save setup'}
        </Button>
        {readinessStatus === 'live' ? (
          <Button variant="outline" disabled>
            Referrals live
          </Button>
        ) : (
          <Button
            variant="conversion"
            onClick={handleEnableReferrals}
            disabled={isSaving || readinessStatus !== 'ready_to_enable'}
          >
            {setReferralEnabledMutation.isPending ? 'Enabling...' : 'Enable referrals'}
          </Button>
        )}
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
  const readinessStatus = getAdminReadinessStatus(readinessQuery.data as ProgramReadiness | null);
  const blockers = inlineBlockers.length
    ? inlineBlockers
    : ((readinessQuery.data?.blockers || []) as Array<{ code: string; message: string }>);
  const primaryMessage = getPrimaryReadinessMessage(readinessQuery.data as ProgramReadiness | null);
  const blockerCount = blockers.length;
  const statusClassName =
    readinessStatus === 'live'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : readinessStatus === 'enabled_blocked'
        ? 'border-red-200 bg-red-50 text-red-700'
        : readinessStatus === 'ready_to_enable'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-amber-200 bg-amber-50 text-amber-900';
  const statusLabel =
    readinessStatus === 'live'
      ? 'Live'
      : readinessStatus === 'enabled_blocked'
        ? 'Enabled but blocked'
        : readinessStatus === 'ready_to_enable'
          ? 'Ready for activation'
          : isReadinessLoading
            ? 'Loading readiness'
            : 'Next action';

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
              disabled={
                setReferralEnabledMutation.isPending ||
                (!isReferralEnabled && readinessStatus !== 'ready_to_enable')
              }
            />
          </div>
        </div>
      </div>

      {isSelected ? (
        <>
          <div
            className={`mt-2 rounded border p-2 text-xs ${statusClassName}`}
          >
            <p className="font-medium">{statusLabel}</p>
            <p className="mt-1">{primaryMessage}</p>
            {!isReadinessLoading && readinessStatus !== 'live' && blockers.length ? (
              <div className="mt-2 space-y-1">
                {blockers.map(blocker => (
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
              </div>
            ) : null}
            {isReadinessLoading ? (
              <p className="mt-2 text-[11px] text-slate-600">
                Checking program, manager, payout, currency, and document readiness...
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
          <span className="text-slate-700">
            {isReadinessLoading
              ? 'Checking setup status...'
              : blockerCount > 0
                ? `${blockerCount} setup blocker${blockerCount === 1 ? '' : 's'}`
                : primaryMessage}
          </span>
          {!isReadinessLoading && blockerCount > 0 ? (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={onConfigure}>
              Open setup
            </Button>
          ) : null}
        </div>
      )}

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
          ...developmentIds.map(developmentId =>
            utils.distribution.admin.getDevelopmentAccess.invalidate({ developmentId }),
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
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-[1450px]">
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
            <div className="grid gap-4 lg:grid-cols-[minmax(420px,0.9fr)_minmax(0,1.6fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Development Referral Setup</CardTitle>
                  <CardDescription>
                    Work through each development, resolve setup blockers, then turn on buyer referrals.
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
                        Live
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-emerald-900">
                        {readinessCounts.live}
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Accepting buyer referrals now
                      </p>
                    </div>
                    <div className="rounded border bg-amber-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                        Needs setup
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-amber-900">
                        {readinessCounts.loading
                          ? '...'
                          : readinessCounts.blocked + readinessCounts.enabledBlocked}
                      </p>
                      <p className="text-[11px] text-amber-700">
                        {readinessCounts.loading
                          ? `${readinessCounts.loading} development${
                              readinessCounts.loading === 1 ? '' : 's'
                            } still loading readiness`
                          : `${readinessCounts.readyToEnable} ready to enable, ${readinessCounts.enabledBlocked} enabled but blocked`}
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
