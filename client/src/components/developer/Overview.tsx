import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Filter,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatZARCompact } from '@/lib/utils';
import { useAuth } from '@/_core/hooks/useAuth';
import { useDeveloperOnboardingStatus } from '@/hooks/useDeveloperOnboardingStatus';

type Range = '7d' | '30d' | '90d';
type OverviewTransactionType = 'sale' | 'rent' | 'auction';
type DirectOutcomeIntent = {
  engine: 'sale' | 'rent';
  unit: any;
};

function normalizeOverviewTransactionType(value: unknown): OverviewTransactionType {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'for_rent' || normalized === 'rent' || normalized === 'to_rent') {
    return 'rent';
  }
  if (normalized === 'auction' || normalized === 'auctions') return 'auction';
  return 'sale';
}

export function getOverviewOperatingCopy(transactionType: unknown) {
  const normalized = normalizeOverviewTransactionType(transactionType);

  if (normalized === 'rent') {
    return {
      engineLabel: 'Rental Engine',
      riskLabel: 'Rental lead risk',
      readyLabel: 'Rental-fit leads',
      outcomeLabel: 'Lease outcomes',
      queueLabel: 'Work leasing queue',
      distributionLabel: 'Referral leasing readiness',
      distributionHelp:
        'Distribution should only open when lease terms, deposits, and partner access are ready.',
    };
  }

  if (normalized === 'auction') {
    return {
      engineLabel: 'Auction Engine',
      riskLabel: 'Bidder lead risk',
      readyLabel: 'Bidder-ready leads',
      outcomeLabel: 'Auction outcomes',
      queueLabel: 'Work bidder queue',
      distributionLabel: 'Referral auction readiness',
      distributionHelp:
        'Distribution should only open when auction packs, registration rules, and partner access are ready.',
    };
  }

  return {
    engineLabel: 'Sale Engine',
    riskLabel: 'Buyer lead risk',
    readyLabel: 'Qualified buyers',
    outcomeLabel: 'Sales outcomes',
    queueLabel: 'Work buyer queue',
    distributionLabel: 'Referral sales readiness',
    distributionHelp:
      'Distribution should only open when buyer costs, availability, and partner access are ready.',
  };
}

export function buildOverviewOperatingReadiness(input: {
  development?: any | null;
  stageCounts?: Record<string, any> | null;
  attention?: any | null;
  distributionSettings?: any | null;
  distributionSummary?: any | null;
}) {
  if (!input.development) return null;

  const copy = getOverviewOperatingCopy(input.development.transactionType);
  const stageCounts = input.stageCounts || {};
  const attention = input.attention || {};
  const distributionSettings = input.distributionSettings || {};
  const distributionSummary = input.distributionSummary || {};
  const warningCount = Number(attention.warningCount || 0);
  const breachCount = Number(attention.breachCount || 0);
  const riskCount = warningCount + breachCount;
  const distributionEnabled = distributionSettings.distributionEnabled === true;
  const eligiblePartnerCount = Number(distributionSettings.eligiblePartnerCount || 0);
  const referralDealCount = Number(distributionSummary.totalDeals || 0);

  let distributionState = 'Private';
  if (distributionEnabled && referralDealCount > 0) {
    distributionState = 'Active referral pipeline';
  } else if (distributionEnabled && eligiblePartnerCount > 0) {
    distributionState = 'Partner-ready';
  } else if (distributionEnabled) {
    distributionState = 'Needs partner access';
  }

  return {
    ...copy,
    developmentName: input.development.name || 'Selected development',
    riskCount,
    warningCount,
    breachCount,
    newLeadCount: Number(stageCounts.new || 0),
    readyCount: Number(stageCounts.qualified || 0),
    outcomeCount: Number(stageCounts.closed_won || 0),
    distributionEnabled,
    eligiblePartnerCount,
    referralDealCount,
    distributionState,
  };
}

function toOverviewPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatOverviewPriceRange(from: number | null, to?: number | null, suffix = ''): string {
  if (!from) return 'Not set';
  const rangeTo = to && to > from ? ` - ${formatZARCompact(to)}` : '';
  return `${formatZARCompact(from)}${rangeTo}${suffix}`;
}

function rangesMatch(
  leftFrom: number | null,
  leftTo: number | null,
  rightFrom: number | null,
  rightTo: number | null,
): boolean {
  if (!leftFrom || !rightFrom) return false;
  const normalizedLeftTo = leftTo && leftTo > 0 ? leftTo : leftFrom;
  const normalizedRightTo = rightTo && rightTo > 0 ? rightTo : rightFrom;
  return (
    Math.round(leftFrom) === Math.round(rightFrom) &&
    Math.round(normalizedLeftTo) === Math.round(normalizedRightTo)
  );
}

function getInventoryRange(items: any[], fromKeys: string[], toKeys: string[] = []) {
  const fromValues = items
    .flatMap(item => fromKeys.map(key => toOverviewPositiveNumber(item?.[key])))
    .filter((value): value is number => value != null);
  const toValues = items
    .flatMap(item => toKeys.map(key => toOverviewPositiveNumber(item?.[key])))
    .filter((value): value is number => value != null);

  if (fromValues.length === 0) return { from: null, to: null };
  return {
    from: Math.min(...fromValues),
    to: toValues.length > 0 ? Math.max(...toValues) : Math.max(...fromValues),
  };
}

export function buildOverviewPricingHealth(input: {
  development?: any | null;
  inventoryItems?: any[] | null;
}) {
  if (!input.development) return null;

  const transactionType = normalizeOverviewTransactionType(input.development.transactionType);
  const inventoryItems = Array.isArray(input.inventoryItems) ? input.inventoryItems : [];

  if (transactionType === 'rent') {
    const publicFrom = toOverviewPositiveNumber(input.development.monthlyRentFrom);
    const publicTo = toOverviewPositiveNumber(input.development.monthlyRentTo);
    const inventory = getInventoryRange(inventoryItems, ['monthlyRentFrom'], ['monthlyRentTo']);
    const aligned = rangesMatch(publicFrom, publicTo, inventory.from, inventory.to);

    return {
      transactionType,
      title: 'Rental pricing health',
      status: aligned ? 'Aligned' : 'Review needed',
      state: aligned ? 'aligned' : 'attention',
      publicLabel: 'Public rent range',
      publicValue: formatOverviewPriceRange(publicFrom, publicTo, ' / month'),
      inventoryLabel: 'Live unit rent range',
      inventoryValue: formatOverviewPriceRange(inventory.from, inventory.to, ' / month'),
      help: aligned
        ? 'Public rent language matches live rental inventory.'
        : 'Review development rent mirrors or rental unit pricing before promoting this package.',
    };
  }

  if (transactionType === 'auction') {
    const publicFrom = toOverviewPositiveNumber(input.development.startingBidFrom);
    const inventory = getInventoryRange(inventoryItems, ['startingBid']);
    const aligned = rangesMatch(publicFrom, publicFrom, inventory.from, inventory.from);

    return {
      transactionType,
      title: 'Auction bid health',
      status: aligned ? 'Aligned' : 'Review needed',
      state: aligned ? 'aligned' : 'attention',
      publicLabel: 'Public bid from',
      publicValue: formatOverviewPriceRange(publicFrom, null),
      inventoryLabel: 'Live lot bid from',
      inventoryValue: formatOverviewPriceRange(inventory.from, null),
      help: aligned
        ? 'Public bid language matches live auction lots.'
        : 'Review development bid mirrors or lot starting bids before pushing auction traffic.',
    };
  }

  const publicFrom = toOverviewPositiveNumber(input.development.priceFrom);
  const publicTo = toOverviewPositiveNumber(input.development.priceTo);
  const inventory = getInventoryRange(
    inventoryItems,
    ['priceFrom', 'basePriceFrom'],
    ['priceTo', 'basePriceTo'],
  );
  const aligned = rangesMatch(publicFrom, publicTo, inventory.from, inventory.to);

  return {
    transactionType,
    title: 'Sale pricing health',
    status: aligned ? 'Aligned' : 'Review needed',
    state: aligned ? 'aligned' : 'attention',
    publicLabel: 'Public price band',
    publicValue: formatOverviewPriceRange(publicFrom, publicTo),
    inventoryLabel: 'Live unit price band',
    inventoryValue: formatOverviewPriceRange(inventory.from, inventory.to),
    help: aligned
      ? 'Public price language matches live sale inventory.'
      : 'Review development price mirrors or unit sale pricing before sales follow-up.',
  };
}

function formatNumber(n?: number): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat().format(n);
}

function formatHours(hours?: number): string {
  if (typeof hours !== 'number' || Number.isNaN(hours)) return '0h';
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function formatMinutes(mins?: number): string {
  if (typeof mins !== 'number' || Number.isNaN(mins)) return '0m';
  if (mins < 60) return `${mins.toFixed(0)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

export function getOverviewAuctionLifecycleLabel(value: unknown): string {
  const normalized = String(value || 'scheduled')
    .trim()
    .toLowerCase();
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    registration_open: 'Registration open',
    active: 'Auction active',
    sold: 'Sold at auction',
    passed_in: 'Passed in',
    withdrawn: 'Withdrawn',
  };
  return labels[normalized] || 'Scheduled';
}

function formatOverviewAuctionWindow(startValue?: string | null, endValue?: string | null): string {
  const formatValue = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-ZA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const start = formatValue(startValue);
  const end = formatValue(endValue);
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Auction window not configured';
}

export function parseOverviewOperatingEventJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getOverviewOperatingEventNote(event: {
  metadata?: unknown;
  afterData?: unknown;
}): string {
  const metadata = parseOverviewOperatingEventJson(event.metadata);
  const afterData = parseOverviewOperatingEventJson(event.afterData);
  const note = metadata.note ?? afterData.note;
  return typeof note === 'string' ? note.trim() : '';
}

function formatOperatingEventTime(value?: string | null): string {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getOverviewOperatingEventLabel(eventType?: string | null): string {
  if (eventType === 'operating_note_added') return 'Operating note';
  if (eventType === 'distribution_handoff_created') return 'Referral handoff';
  return String(eventType || 'Operating event').replace(/_/g, ' ');
}

function formatDistributionStage(value?: string | null): string {
  return String(value || 'viewing_scheduled')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatDistributionCommissionStatus(value?: string | null): string {
  return String(value || 'not_ready')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatDistributionHandoffStatus(value?: string | null): string {
  const normalized = String(value || '').trim();
  const labels: Record<string, string> = {
    linked_only: 'Linked',
    review_requested: 'Review requested',
    stage_transition_requested: 'Stage review requested',
  };
  return labels[normalized] || 'Handoff recorded';
}

export default function Overview() {
  const { user } = useAuth();
  const { status: onboardingStatus, isLoading: onboardingLoading } = useDeveloperOnboardingStatus();
  const utils = trpc.useUtils();
  const [location, setLocation] = useLocation();
  const [range, setRange] = useState<Range>('30d');
  const [developmentFilter, setDevelopmentFilter] = useState<string>('all');
  const [isReferralAccessOpen, setIsReferralAccessOpen] = useState(false);
  const [handoffDeal, setHandoffDeal] = useState<any | null>(null);
  const [directOutcomeIntent, setDirectOutcomeIntent] = useState<DirectOutcomeIntent | null>(null);
  const [handoffNote, setHandoffNote] = useState('');
  const [operatingNote, setOperatingNote] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';

  const {
    data: developerProfile,
    isLoading: profileLoading,
    error: profileError,
  } = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    enabled: isSuperAdmin || Boolean(onboardingStatus?.hasProfile),
  });

  const {
    data: developments = [],
    isLoading: developmentsLoading,
    error: developmentsError,
  } = trpc.developer.getDevelopments.useQuery(undefined, {
    enabled: isSuperAdmin || Boolean(onboardingStatus?.dashboardUnlocked),
    refetchOnWindowFocus: false,
  });

  const selectedDevelopmentId =
    developmentFilter === 'all' ? undefined : Number(developmentFilter);
  const selectedDevelopment = useMemo(() => {
    if (!selectedDevelopmentId) return null;
    return developments.find((dev: any) => Number(dev.id) === selectedDevelopmentId) || null;
  }, [developments, selectedDevelopmentId]);
  const selectedDevelopmentTransactionType = normalizeOverviewTransactionType(
    selectedDevelopment?.transactionType,
  );

  const distributionSettingsQuery = trpc.developer.getDistributionSettings.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
    },
    {
      enabled: !!developerProfile && !!selectedDevelopmentId,
      refetchOnWindowFocus: false,
    },
  );

  const setDistributionEnabledMutation = trpc.developer.setDistributionEnabled.useMutation({
    onSuccess: async data => {
      toast.success(
        data.distributionEnabled
          ? 'Referral distribution enabled for this development.'
          : 'Referral distribution disabled for this development.',
      );
      await Promise.all([
        distributionSettingsQuery.refetch(),
        utils.developer.getLeads.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(error.message || 'Could not update referral distribution setting.');
    },
  });

  const distributionDashboardQuery = trpc.distribution.developer.dashboard.useQuery(
    {
      dealLimit: 1000,
    },
    {
      enabled:
        !!selectedDevelopmentId && distributionSettingsQuery.data?.distributionEnabled === true,
      refetchOnWindowFocus: false,
    },
  );

  const distributionDealsQuery = trpc.distribution.developer.listDeals.useQuery(
    {
      developmentId: selectedDevelopmentId || undefined,
      limit: 5,
    },
    {
      enabled: !!selectedDevelopmentId && distributionSettingsQuery.data?.distributionEnabled === true,
      refetchOnWindowFocus: false,
    },
  );

  const funnelKpisQuery = trpc.developer.getFunnelKPIs.useQuery(
    {
      range,
      developmentId: selectedDevelopmentId,
    },
    {
      enabled: !!developerProfile,
      refetchOnWindowFocus: false,
    },
  );

  const funnelAttentionQuery = trpc.developer.getFunnelAttention.useQuery(
    {
      range,
      developmentId: selectedDevelopmentId,
      limit: 5,
    },
    {
      enabled: !!developerProfile,
      refetchOnWindowFocus: false,
    },
  );

  const operatingEventsQuery = trpc.developer.getOperatingEvents.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
      limit: 5,
    },
    {
      enabled: !!developerProfile && !!selectedDevelopmentId,
      refetchOnWindowFocus: false,
    },
  );

  const saleOperatingInventoryQuery = trpc.developer.getSaleOperatingInventory.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
    },
    {
      enabled:
        !!developerProfile &&
        !!selectedDevelopmentId &&
        selectedDevelopmentTransactionType === 'sale',
      refetchOnWindowFocus: false,
    },
  );

  const rentalOperatingInventoryQuery = trpc.developer.getRentalOperatingInventory.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
    },
    {
      enabled:
        !!developerProfile &&
        !!selectedDevelopmentId &&
        selectedDevelopmentTransactionType === 'rent',
      refetchOnWindowFocus: false,
    },
  );

  const auctionOperatingInventoryQuery = trpc.developer.getAuctionOperatingInventory.useQuery(
    {
      developmentId: selectedDevelopmentId || 0,
    },
    {
      enabled:
        !!developerProfile &&
        !!selectedDevelopmentId &&
        selectedDevelopmentTransactionType === 'auction',
      refetchOnWindowFocus: false,
    },
  );

  const addOperatingNoteMutation = trpc.developer.addOperatingNote.useMutation({
    onSuccess: async () => {
      toast.success('Operating note added.');
      setOperatingNote('');
      await operatingEventsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Could not add operating note.');
    },
  });

  const createDistributionHandoffMutation = trpc.developer.createDistributionHandoff.useMutation({
    onSuccess: async data => {
      toast.success(data.resultLabel || 'Referral handoff review requested.');
      setHandoffDeal(null);
      setHandoffNote('');
      await Promise.all([
        operatingEventsQuery.refetch(),
        distributionDealsQuery.refetch(),
        distributionDashboardQuery.refetch(),
      ]);
    },
    onError: error => {
      toast.error(error.message || 'Could not request referral handoff review.');
    },
  });

  const transitionSaleUnitReservationMutation =
    trpc.developer.transitionSaleUnitReservation.useMutation({
      onSuccess: async (_data, variables) => {
        toast.success(variables.transition === 'reserve' ? 'Unit reserved.' : 'Reservation released.');
        await Promise.all([
          saleOperatingInventoryQuery.refetch(),
          operatingEventsQuery.refetch(),
          utils.developer.getDevelopments.invalidate(),
          utils.developer.getFunnelKPIs.invalidate(),
        ]);
      },
      onError: async error => {
        toast.error(error.message || 'Could not update sales inventory.');
        await Promise.all([
          saleOperatingInventoryQuery.refetch(),
          operatingEventsQuery.refetch(),
          utils.developer.getDevelopments.invalidate(),
        ]);
      },
    });

  const markSaleUnitTypeSoldMutation = trpc.developer.markSaleUnitTypeSold.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.source === 'available_direct'
          ? 'Available Sale unit marked sold.'
          : 'Sale unit marked sold.',
      );
      setDirectOutcomeIntent(null);
      await Promise.all([
        saleOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: async error => {
      toast.error(error.message || 'Could not mark Sale unit sold.');
      await Promise.all([
        saleOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
      ]);
    },
  });

  const transitionRentalUnitHoldMutation = trpc.developer.transitionRentalUnitHold.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(variables.transition === 'hold' ? 'Rental unit held.' : 'Rental hold released.');
      await Promise.all([
        rentalOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: async error => {
      toast.error(error.message || 'Could not update rental inventory.');
      await Promise.all([
        rentalOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
      ]);
    },
  });

  const markRentalUnitTypeLetMutation = trpc.developer.markRentalUnitTypeLet.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.source === 'available_direct'
          ? 'Available rental unit marked let.'
          : 'Rental unit marked let.',
      );
      setDirectOutcomeIntent(null);
      await Promise.all([
        rentalOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: async error => {
      toast.error(error.message || 'Could not mark Rental unit let.');
      await Promise.all([
        rentalOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
      ]);
    },
  });

  const transitionAuctionRegistrationMutation =
    trpc.developer.transitionAuctionRegistration.useMutation({
      onSuccess: async (_data, variables) => {
        toast.success(
          variables.transition === 'open_registration'
            ? 'Auction registration opened.'
            : 'Auction registration closed.',
        );
        await Promise.all([
          auctionOperatingInventoryQuery.refetch(),
          operatingEventsQuery.refetch(),
          utils.developer.getDevelopments.invalidate(),
          utils.developer.getFunnelKPIs.invalidate(),
        ]);
      },
      onError: async error => {
        toast.error(error.message || 'Could not update Auction registration.');
        await Promise.all([
          auctionOperatingInventoryQuery.refetch(),
          operatingEventsQuery.refetch(),
          utils.developer.getDevelopments.invalidate(),
        ]);
      },
    });

  const activateAuctionLotMutation = trpc.developer.activateAuctionLot.useMutation({
    onSuccess: async () => {
      toast.success('Auction lot activated.');
      await Promise.all([
        auctionOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: async error => {
      toast.error(error.message || 'Could not activate Auction lot.');
      await Promise.all([
        auctionOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
      ]);
    },
  });

  const recordAuctionLotOutcomeMutation = trpc.developer.recordAuctionLotOutcome.useMutation({
    onSuccess: async (_data, variables) => {
      const labels: Record<string, string> = {
        sold: 'Auction lot marked sold.',
        passed_in: 'Auction lot marked passed in.',
        withdrawn: 'Auction lot withdrawn.',
      };
      toast.success(labels[variables.outcome] || 'Auction outcome recorded.');
      await Promise.all([
        auctionOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
        utils.developer.getFunnelKPIs.invalidate(),
      ]);
    },
    onError: async error => {
      toast.error(error.message || 'Could not record Auction outcome.');
      await Promise.all([
        auctionOperatingInventoryQuery.refetch(),
        operatingEventsQuery.refetch(),
        utils.developer.getDevelopments.invalidate(),
      ]);
    },
  });

  const isNewDeveloper = !developments || developments.length === 0;
  const profileStatus = (developerProfile as any)?.status as string | undefined;
  const profileRejectionReason = (developerProfile as any)?.rejectionReason as string | undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rangeFromUrl = params.get('range');
    const developmentFromUrl = params.get('developmentId');

    const nextRange: Range =
      rangeFromUrl === '7d' || rangeFromUrl === '30d' || rangeFromUrl === '90d'
        ? rangeFromUrl
        : '30d';
    const nextDevelopment =
      developmentFromUrl && developmentFromUrl.trim().length > 0 ? developmentFromUrl : 'all';

    if (range !== nextRange) setRange(nextRange);
    if (developmentFilter !== nextDevelopment) setDevelopmentFilter(nextDevelopment);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentRange = params.get('range') || '30d';
    const currentDevelopment = params.get('developmentId') || 'all';

    if (currentRange === range && currentDevelopment === developmentFilter) return;

    params.set('range', range);
    params.set('developmentId', developmentFilter || 'all');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}?${nextSearch}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [range, developmentFilter, location]);

  const goToLeads = (params: {
    view?: 'pipeline' | 'attention';
    stage?: string;
    sla?: 'warning' | 'breach';
    source?: string;
    leadId?: string;
  }) => {
    const search = new URLSearchParams();
    search.set('range', range);
    if (params.view) search.set('view', params.view);
    if (params.stage) search.set('stage', params.stage);
    if (params.sla) search.set('sla', params.sla);
    if (params.source) search.set('source', params.source);
    if (params.leadId) search.set('leadId', params.leadId);
    if (selectedDevelopmentId) search.set('developmentId', String(selectedDevelopmentId));
    setLocation(`/developer/leads?${search.toString()}`);
  };

  const kpis: any = funnelKpisQuery.data || {};
  const stageCounts: any = kpis.stageCounts || {};
  const conversion: any = kpis.conversion || {};
  const velocity: any = kpis.velocity || {};
  const bySource: Record<string, number> = kpis.bySource || {};
  const attention: any = funnelAttentionQuery.data || { items: [], breachCount: 0, warningCount: 0 };
  const distributionSettings: any = distributionSettingsQuery.data || null;
  const distributionSummary = useMemo(() => {
    if (!selectedDevelopmentId) return null;
    const rows = (distributionDashboardQuery.data as any)?.developments || [];
    return rows.find((row: any) => Number(row.developmentId) === selectedDevelopmentId) || null;
  }, [distributionDashboardQuery.data, selectedDevelopmentId]);
  const distributionPanelVisible =
    !!selectedDevelopmentId && distributionSettings?.distributionEnabled === true;
  const distributionDeals = distributionDealsQuery.data || [];
  const operatingReadiness = buildOverviewOperatingReadiness({
    development: selectedDevelopment,
    stageCounts,
    attention,
    distributionSettings,
    distributionSummary,
  });
  const operatingEvents = operatingEventsQuery.data?.items || [];
  const saleOperatingInventory = saleOperatingInventoryQuery.data?.items || [];
  const rentalOperatingInventory = rentalOperatingInventoryQuery.data?.items || [];
  const auctionOperatingInventory = auctionOperatingInventoryQuery.data?.items || [];
  const pricingInventoryLoaded =
    selectedDevelopmentTransactionType === 'rent'
      ? !rentalOperatingInventoryQuery.isLoading
      : selectedDevelopmentTransactionType === 'auction'
        ? !auctionOperatingInventoryQuery.isLoading
        : !saleOperatingInventoryQuery.isLoading;
  const pricingHealth = buildOverviewPricingHealth({
    development: pricingInventoryLoaded ? selectedDevelopment : null,
    inventoryItems:
      selectedDevelopmentTransactionType === 'rent'
        ? rentalOperatingInventory
        : selectedDevelopmentTransactionType === 'auction'
          ? auctionOperatingInventory
          : saleOperatingInventory,
  });

  const snapshotTiles = [
    { label: 'New', value: stageCounts.new || 0, stage: 'new' },
    { label: 'Contacted', value: stageCounts.contacted || 0, stage: 'contacted' },
    { label: 'Qualified', value: stageCounts.qualified || 0, stage: 'qualified' },
    { label: 'Viewings Scheduled', value: stageCounts.viewing_scheduled || 0, stage: 'viewing' },
    { label: 'Offers', value: stageCounts.offer_made || 0, stage: 'offer' },
    { label: 'Closed Won', value: stageCounts.closed_won || 0, stage: 'won' },
    {
      label: 'Closed Lost',
      value:
        (stageCounts.closed_lost || 0) + (stageCounts.spam || 0) + (stageCounts.duplicate || 0),
      stage: 'lost',
    },
  ];

  const sourceRows = useMemo(() => {
    return Object.entries(bySource)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [bySource]);

  const contactRate =
    Number(stageCounts.new || 0) > 0
      ? ((Number(stageCounts.contacted || 0) / Number(stageCounts.new || 1)) * 100).toFixed(1)
      : '0.0';
  const qualificationRate =
    Number(stageCounts.contacted || 0) > 0
      ? ((Number(stageCounts.qualified || 0) / Number(stageCounts.contacted || 1)) * 100).toFixed(1)
      : '0.0';
  const closeFromQualifiedRate =
    Number(stageCounts.qualified || 0) > 0
      ? ((Number(stageCounts.closed_won || 0) / Number(stageCounts.qualified || 1)) * 100).toFixed(1)
      : '0.0';

  const topLeakage = useMemo(() => {
    const pairs = [
      { from: 'new', fromLabel: 'New', to: 'contacted', toLabel: 'Contacted' },
      { from: 'contacted', fromLabel: 'Contacted', to: 'qualified', toLabel: 'Qualified' },
      {
        from: 'qualified',
        fromLabel: 'Qualified',
        to: 'viewing_scheduled',
        toLabel: 'Viewing Scheduled',
      },
      {
        from: 'viewing_scheduled',
        fromLabel: 'Viewing Scheduled',
        to: 'offer_made',
        toLabel: 'Offer Made',
      },
      { from: 'offer_made', fromLabel: 'Offer Made', to: 'closed_won', toLabel: 'Closed Won' },
    ];

    let best: { label: string; dropPct: number } = { label: 'n/a', dropPct: 0 };

    for (const pair of pairs) {
      const fromVal = Number(stageCounts[pair.from] || 0);
      const toVal = Number(stageCounts[pair.to] || 0);
      if (fromVal <= 0) continue;
      const dropPct = ((fromVal - Math.min(fromVal, toVal)) / fromVal) * 100;
      if (dropPct > best.dropPct) {
        best = {
          label: `${pair.fromLabel} -> ${pair.toLabel}`,
          dropPct,
        };
      }
    }

    return best;
  }, [stageCounts]);

  if (onboardingLoading || profileLoading || developmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (profileError || developmentsError) {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Unable to load control tower</h3>
          <p className="text-slate-600 text-sm">
            {profileError?.message || developmentsError?.message || 'Unknown dashboard error'}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!developerProfile && !isSuperAdmin) {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-blue-600" />
          <h3 className="text-lg font-semibold">Complete your developer profile</h3>
          <p className="text-sm text-slate-600">
            Set up your company profile first, then return here to launch developments and manage
            your workspace.
          </p>
          <Button onClick={() => (window.location.href = '/developer/setup')}>Go to Setup</Button>
        </CardContent>
      </Card>
    );
  }

  if (profileStatus === 'pending') {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Profile under review</h3>
          <p className="text-slate-600 text-sm">
            Your company profile has been submitted and is currently being verified by the admin
            team. You can review your details now while approval is in progress.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => (window.location.href = '/developer/setup')}>
              Review Profile
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profileStatus === 'rejected') {
    return (
      <Card className="card">
        <CardContent className="py-12 text-center space-y-3">
          <h3 className="text-lg font-semibold">Profile rejected</h3>
          <p className="text-slate-600 text-sm">
            {profileRejectionReason || 'Please update and resubmit.'}
          </p>
          <Button onClick={() => (window.location.href = '/developer/setup')}>Update Profile</Button>
        </CardContent>
      </Card>
    );
  }

  if (isNewDeveloper) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Building2 className="w-12 h-12 text-blue-600" />
        <h2 className="text-3xl font-bold text-slate-900">Launch your first development funnel</h2>
        <p className="text-slate-600 text-center max-w-xl">
          Build your first project, start capturing leads, and this control tower will track your funnel health.
        </p>
        <Button onClick={() => (window.location.href = '/developer/create-development')}>
          Create Development
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="typ-h2">Developer Control Tower</h2>
            <p className="text-muted-foreground text-sm">
              {isSuperAdmin ? 'Emulation mode' : 'Live'} funnel operations and revenue signals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={value => setRange(value as Range)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
              </SelectContent>
            </Select>

            <Select value={developmentFilter} onValueChange={setDevelopmentFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All developments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All developments</SelectItem>
                {developments.map((dev: any) => (
                  <SelectItem key={dev.id} value={String(dev.id)}>
                    {dev.name || `Development #${dev.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDevelopmentId && (
        <Card className="card">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Referral Distribution</p>
              <p className="text-xs text-muted-foreground">
                Distribution is opt-in per development. Keep it private by default and enable only
                when ready.
              </p>
              <Badge variant={distributionSettings?.distributionEnabled ? 'default' : 'outline'}>
                {distributionSettings?.distributionEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Only eligible referral partners can see this development.
              </p>
              <p className="text-xs text-muted-foreground">
                Referral partners can only claim leads from referral-origin channels.
              </p>
            </div>
            <Button
              variant={distributionSettings?.distributionEnabled ? 'outline' : 'default'}
              disabled={setDistributionEnabledMutation.isPending}
              onClick={() =>
                setDistributionEnabledMutation.mutate({
                  developmentId: selectedDevelopmentId,
                  enabled: !distributionSettings?.distributionEnabled,
                })
              }
            >
              {distributionSettings?.distributionEnabled ? 'Disable Distribution' : 'Enable Distribution'}
            </Button>
            <Button variant="outline" onClick={() => setIsReferralAccessOpen(true)}>
              Manage Referral Access
            </Button>
          </CardContent>
        </Card>
      )}

      {operatingReadiness && (
        <Card className="card border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Operating Readiness
            </CardTitle>
            <CardDescription>
              {operatingReadiness.engineLabel} snapshot for {operatingReadiness.developmentName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <button
                className="text-left"
                onClick={() => goToLeads({ view: 'attention' })}
                type="button"
              >
                <div className="h-full rounded-md border border-slate-200 p-3 transition-colors hover:border-amber-300">
                  <p className="text-xs text-muted-foreground">{operatingReadiness.riskLabel}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatNumber(operatingReadiness.riskCount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(operatingReadiness.breachCount)} breach,{' '}
                    {formatNumber(operatingReadiness.warningCount)} warning
                  </p>
                </div>
              </button>

              <button
                className="text-left"
                onClick={() => goToLeads({ view: 'pipeline', stage: 'qualified' })}
                type="button"
              >
                <div className="h-full rounded-md border border-slate-200 p-3 transition-colors hover:border-blue-300">
                  <p className="text-xs text-muted-foreground">{operatingReadiness.readyLabel}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatNumber(operatingReadiness.readyCount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(operatingReadiness.newLeadCount)} new in this range
                  </p>
                </div>
              </button>

              <button
                className="text-left"
                onClick={() => goToLeads({ view: 'pipeline', stage: 'won' })}
                type="button"
              >
                <div className="h-full rounded-md border border-slate-200 p-3 transition-colors hover:border-emerald-300">
                  <p className="text-xs text-muted-foreground">
                    {operatingReadiness.outcomeLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {formatNumber(operatingReadiness.outcomeCount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Closed outcomes tracked through the current funnel
                  </p>
                </div>
              </button>

              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-xs text-muted-foreground">
                  {operatingReadiness.distributionLabel}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {operatingReadiness.distributionState}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatNumber(operatingReadiness.eligiblePartnerCount)} eligible partner(s),{' '}
                  {formatNumber(operatingReadiness.referralDealCount)} referral deal(s)
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">{operatingReadiness.distributionHelp}</p>
              <Button variant="outline" onClick={() => goToLeads({ view: 'attention' })}>
                {operatingReadiness.queueLabel}
              </Button>
            </div>

            {pricingHealth && (
              <div
                className="rounded-md border border-slate-200 p-3"
                data-testid="dle-pricing-health"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium">{pricingHealth.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{pricingHealth.help}</p>
                  </div>
                  <Badge
                    variant={pricingHealth.state === 'aligned' ? 'secondary' : 'outline'}
                    className={
                      pricingHealth.state === 'aligned'
                        ? 'w-fit bg-emerald-50 text-emerald-700'
                        : 'w-fit border-amber-200 bg-amber-50 text-amber-700'
                    }
                  >
                    {pricingHealth.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">{pricingHealth.publicLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pricingHealth.publicValue}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">{pricingHealth.inventoryLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {pricingHealth.inventoryValue}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedDevelopmentTransactionType === 'sale' && (
              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Sales Inventory</p>
                    <p className="text-xs text-muted-foreground">
                      Aggregate available:{' '}
                      {formatNumber(
                        Number(saleOperatingInventoryQuery.data?.aggregateAvailableUnits || 0),
                      )}
                    </p>
                  </div>
                  {saleOperatingInventoryQuery.isFetching && (
                    <Badge variant="outline">Refreshing</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {!saleOperatingInventoryQuery.isLoading && saleOperatingInventory.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No active Sale unit inventory found.
                    </p>
                  )}

                  {saleOperatingInventory.map((unit: any) => {
                    const availableUnits = Number(unit.availableUnits || 0);
                    const reservedUnits = Number(unit.reservedUnits || 0);
                    const soldUnits = Number(unit.soldUnits || 0);
                    const mutationPending =
                      transitionSaleUnitReservationMutation.isPending ||
                      markSaleUnitTypeSoldMutation.isPending;
                    return (
                      <div
                        className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                        data-testid={`auction-lot-${unit.id}`}
                        key={unit.id}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(availableUnits)} available,{' '}
                            {formatNumber(reservedUnits)} reserved,{' '}
                            {formatNumber(soldUnits)} sold
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={availableUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              transitionSaleUnitReservationMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                transition: 'reserve',
                              })
                            }
                            size="sm"
                            type="button"
                          >
                            Reserve
                          </Button>
                          <Button
                            disabled={reservedUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              transitionSaleUnitReservationMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                transition: 'release',
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Release
                          </Button>
                          <Button
                            disabled={reservedUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              markSaleUnitTypeSoldMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                source: 'reserved',
                              })
                            }
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Mark Sold
                          </Button>
                          <Button
                            disabled={availableUnits <= 0 || mutationPending}
                            onClick={() => setDirectOutcomeIntent({ engine: 'sale', unit })}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Direct Sold
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDevelopmentTransactionType === 'rent' && (
              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Rental Inventory</p>
                    <p className="text-xs text-muted-foreground">
                      Rentals available:{' '}
                      {formatNumber(
                        Number(rentalOperatingInventoryQuery.data?.aggregateAvailableUnits || 0),
                      )}
                    </p>
                  </div>
                  {rentalOperatingInventoryQuery.isFetching && (
                    <Badge variant="outline">Refreshing</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {!rentalOperatingInventoryQuery.isLoading &&
                    rentalOperatingInventory.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No active Rental unit inventory found.
                      </p>
                    )}

                  {rentalOperatingInventory.map((unit: any) => {
                    const availableUnits = Number(unit.availableUnits || 0);
                    const heldUnits = Number(unit.heldUnits || 0);
                    const letUnits = Number(unit.letUnits || 0);
                    const rentFrom = Number(unit.monthlyRentFrom || 0);
                    const rentTo = Number(unit.monthlyRentTo || 0);
                    const rentLabel =
                      rentTo > rentFrom
                        ? `${formatZARCompact(rentFrom)} - ${formatZARCompact(rentTo)} / month`
                        : `${formatZARCompact(rentFrom)} / month`;
                    const leaseContext = [
                      rentLabel,
                      unit.depositRequired
                        ? `${formatZARCompact(Number(unit.depositRequired))} deposit`
                        : null,
                      unit.leaseTerm || null,
                      unit.isFurnished ? 'Furnished' : 'Unfurnished',
                    ]
                      .filter(Boolean)
                      .join(' | ');
                    const mutationPending =
                      transitionRentalUnitHoldMutation.isPending ||
                      markRentalUnitTypeLetMutation.isPending;
                    return (
                      <div
                        className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                        key={unit.id}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(availableUnits)} rentals available,{' '}
                            {formatNumber(heldUnits)} held,{' '}
                            {formatNumber(letUnits)} let
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{leaseContext}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={availableUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              transitionRentalUnitHoldMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                transition: 'hold',
                              })
                            }
                            size="sm"
                            type="button"
                          >
                            Hold
                          </Button>
                          <Button
                            disabled={heldUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              transitionRentalUnitHoldMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                transition: 'release',
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Release
                          </Button>
                          <Button
                            disabled={heldUnits <= 0 || mutationPending}
                            onClick={() =>
                              selectedDevelopmentId &&
                              markRentalUnitTypeLetMutation.mutate({
                                developmentId: selectedDevelopmentId,
                                unitTypeId: unit.id,
                                source: 'held',
                              })
                            }
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            Mark Let
                          </Button>
                          <Button
                            disabled={availableUnits <= 0 || mutationPending}
                            onClick={() => setDirectOutcomeIntent({ engine: 'rent', unit })}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Direct Let
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDevelopmentTransactionType === 'auction' && (
              <div className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Auction Lots</p>
                    <p className="text-xs text-muted-foreground">
                      Registration lifecycle is managed per lot. Bidder counts are tracked
                      separately from inventory.
                    </p>
                  </div>
                  {auctionOperatingInventoryQuery.isFetching && (
                    <Badge variant="outline">Refreshing</Badge>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {!auctionOperatingInventoryQuery.isLoading &&
                    auctionOperatingInventory.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No active Auction lot inventory found.
                      </p>
                    )}

                  {auctionOperatingInventory.map((unit: any) => {
                    const auctionStatus = String(unit.auctionStatus || 'scheduled');
                    const mutationPending =
                      transitionAuctionRegistrationMutation.isPending ||
                      activateAuctionLotMutation.isPending ||
                      recordAuctionLotOutcomeMutation.isPending;
                    const canWithdraw = !['sold', 'passed_in', 'withdrawn'].includes(auctionStatus);
                    return (
                      <div
                        className="flex flex-col gap-3 rounded-md border border-slate-200 p-3 md:flex-row md:items-center md:justify-between"
                        key={unit.id}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                            <Badge variant="outline">
                              {getOverviewAuctionLifecycleLabel(auctionStatus)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Starting bid {formatZARCompact(Number(unit.startingBid || 0))}
                            {unit.reservePrice
                              ? ` | Reserve tracked at ${formatZARCompact(Number(unit.reservePrice))}`
                              : ' | Reserve not set'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatOverviewAuctionWindow(
                              unit.auctionStartDate,
                              unit.auctionEndDate,
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {auctionStatus === 'scheduled' && (
                            <Button
                              disabled={mutationPending}
                              onClick={() =>
                                selectedDevelopmentId &&
                                transitionAuctionRegistrationMutation.mutate({
                                  developmentId: selectedDevelopmentId,
                                  unitTypeId: unit.id,
                                  transition: 'open_registration',
                                })
                              }
                              size="sm"
                              type="button"
                            >
                              Open Registration
                            </Button>
                          )}
                          {auctionStatus === 'registration_open' && (
                            <>
                              <Button
                                disabled={mutationPending}
                                onClick={() =>
                                  selectedDevelopmentId &&
                                  activateAuctionLotMutation.mutate({
                                    developmentId: selectedDevelopmentId,
                                    unitTypeId: unit.id,
                                  })
                                }
                                size="sm"
                                type="button"
                              >
                                Activate Auction
                              </Button>
                              <Button
                                disabled={mutationPending}
                                onClick={() =>
                                  selectedDevelopmentId &&
                                  transitionAuctionRegistrationMutation.mutate({
                                    developmentId: selectedDevelopmentId,
                                    unitTypeId: unit.id,
                                    transition: 'close_registration',
                                  })
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Close Registration
                              </Button>
                            </>
                          )}
                          {auctionStatus === 'active' && (
                            <>
                              <Button
                                aria-label={`Mark ${unit.name} sold`}
                                disabled={mutationPending}
                                onClick={() =>
                                  selectedDevelopmentId &&
                                  recordAuctionLotOutcomeMutation.mutate({
                                    developmentId: selectedDevelopmentId,
                                    unitTypeId: unit.id,
                                    outcome: 'sold',
                                  })
                                }
                                size="sm"
                                type="button"
                              >
                                Mark Sold
                              </Button>
                              <Button
                                aria-label={`Mark ${unit.name} passed in`}
                                disabled={mutationPending}
                                onClick={() =>
                                  selectedDevelopmentId &&
                                  recordAuctionLotOutcomeMutation.mutate({
                                    developmentId: selectedDevelopmentId,
                                    unitTypeId: unit.id,
                                    outcome: 'passed_in',
                                  })
                                }
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Mark Passed In
                              </Button>
                            </>
                          )}
                          {canWithdraw && (
                            <Button
                              aria-label={`Withdraw ${unit.name}`}
                              disabled={mutationPending}
                              onClick={() =>
                                selectedDevelopmentId &&
                                recordAuctionLotOutcomeMutation.mutate({
                                  developmentId: selectedDevelopmentId,
                                  unitTypeId: unit.id,
                                  outcome: 'withdrawn',
                                })
                              }
                              size="sm"
                              type="button"
                              variant="secondary"
                            >
                              Withdraw
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Operating History</p>
                  <Textarea
                    className="min-h-20 resize-none"
                    maxLength={1000}
                    placeholder="Add an internal operating note"
                    value={operatingNote}
                    onChange={event => setOperatingNote(event.target.value)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Notes are audit events and do not change inventory or public packaging.
                    </p>
                    <Button
                      disabled={
                        operatingNote.trim().length < 3 || addOperatingNoteMutation.isPending
                      }
                      onClick={() =>
                        selectedDevelopmentId &&
                        addOperatingNoteMutation.mutate({
                          developmentId: selectedDevelopmentId,
                          note: operatingNote,
                        })
                      }
                      size="sm"
                      type="button"
                    >
                      {addOperatingNoteMutation.isPending ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  {operatingEventsQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading operating history...</p>
                  )}

                  {!operatingEventsQuery.isLoading && operatingEvents.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No operating events recorded for this development yet.
                    </p>
                  )}

                  {operatingEvents.map((event: any) => {
                    const note = getOverviewOperatingEventNote(event);
                    return (
                      <div
                        className="rounded-md border border-slate-200 bg-white p-2 text-sm"
                        key={event.id}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">
                            {getOverviewOperatingEventLabel(event.eventType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatOperatingEventTime(event.eventAt || event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-slate-700">
                          {note || 'Operating event recorded.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!directOutcomeIntent}
        onOpenChange={open => {
          if (!open) setDirectOutcomeIntent(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {directOutcomeIntent?.engine === 'rent'
                ? 'Confirm Direct Rental Let'
                : 'Confirm Direct Sale'}
            </DialogTitle>
            <DialogDescription>
              This moves one available unit straight to{' '}
              {directOutcomeIntent?.engine === 'rent' ? 'let' : 'sold'} and reduces public
              availability for this unit type.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-slate-200 p-3 text-sm">
            <p className="font-medium text-slate-900">
              {directOutcomeIntent?.unit?.name || 'Selected unit type'}
            </p>
            <p className="mt-1 text-muted-foreground">
              Current available:{' '}
              {formatNumber(Number(directOutcomeIntent?.unit?.availableUnits || 0))}
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setDirectOutcomeIntent(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !selectedDevelopmentId ||
                !directOutcomeIntent?.unit?.id ||
                markSaleUnitTypeSoldMutation.isPending ||
                markRentalUnitTypeLetMutation.isPending
              }
              onClick={() => {
                if (!selectedDevelopmentId || !directOutcomeIntent?.unit?.id) return;
                if (directOutcomeIntent.engine === 'rent') {
                  markRentalUnitTypeLetMutation.mutate({
                    developmentId: selectedDevelopmentId,
                    unitTypeId: directOutcomeIntent.unit.id,
                    source: 'available_direct',
                  });
                  return;
                }
                markSaleUnitTypeSoldMutation.mutate({
                  developmentId: selectedDevelopmentId,
                  unitTypeId: directOutcomeIntent.unit.id,
                  source: 'available_direct',
                });
              }}
              type="button"
            >
              {directOutcomeIntent?.engine === 'rent' ? 'Confirm Direct Let' : 'Confirm Direct Sold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!handoffDeal}
        onOpenChange={open => {
          if (!open) {
            setHandoffDeal(null);
            setHandoffNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Referral Handoff Review</DialogTitle>
            <DialogDescription>
              Send the distribution manager a review note for this referral deal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-medium">
                {handoffDeal?.buyerName || `Referral deal #${handoffDeal?.id || ''}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {formatDistributionStage(handoffDeal?.currentStage)}
                </Badge>
                <Badge variant="secondary">
                  {formatDistributionCommissionStatus(handoffDeal?.commissionStatus)}
                </Badge>
              </div>
            </div>

            <Textarea
              className="min-h-28 resize-none"
              data-testid="dle-distribution-handoff-note"
              maxLength={2000}
              onChange={event => setHandoffNote(event.target.value)}
              placeholder="Add the buyer, unit, document, or outcome context the manager should review"
              value={handoffNote}
            />
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setHandoffDeal(null);
                setHandoffNote('');
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              data-testid="dle-distribution-handoff-submit"
              disabled={
                !selectedDevelopmentId ||
                !handoffDeal?.id ||
                handoffNote.trim().length < 3 ||
                createDistributionHandoffMutation.isPending
              }
              onClick={() => {
                if (!selectedDevelopmentId || !handoffDeal?.id) return;
                createDistributionHandoffMutation.mutate({
                  developmentId: selectedDevelopmentId,
                  distributionDealId: Number(handoffDeal.id),
                  action: 'request_review',
                  note: handoffNote,
                });
              }}
              type="button"
            >
              {createDistributionHandoffMutation.isPending ? 'Requesting...' : 'Request Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReferralAccessOpen} onOpenChange={setIsReferralAccessOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage Referral Access</DialogTitle>
            <DialogDescription>
              Configure who can refer this development and review the referral commission setup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-md p-3 space-y-3">
              <p className="text-sm font-medium">Status</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Distribution</p>
                  <p className="font-medium">
                    {distributionSettings?.distributionEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Eligible Partners</p>
                  <p className="font-medium">{formatNumber(distributionSettings?.eligiblePartnerCount || 0)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Visibility is enforced server-side: only eligible referral partners can access this
                development.
              </p>
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Eligibility Controls</p>
              <p className="text-xs text-muted-foreground">
                Access model: <span className="font-medium text-foreground">{distributionSettings?.accessModel || 'unknown'}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Tier policy: <span className="font-medium text-foreground">{distributionSettings?.tierAccessPolicy || 'restricted'}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const).map(tier => (
                  <div key={tier} className="border rounded-md p-2">
                    <p className="text-muted-foreground">{tier.replace('_', ' ').toUpperCase()}</p>
                    <p className="font-medium">
                      {formatNumber(distributionSettings?.eligiblePartnersByTier?.[tier] || 0)} partner(s)
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Allowed tiers: {(distributionSettings?.allowedTiers || []).join(', ') || 'none'}
              </p>
            </div>

            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium">Commission</p>
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Model: <span className="font-medium text-foreground">{distributionSettings?.commissionModel || 'flat_percentage'}</span>
                </p>
                <p className="text-muted-foreground">
                  Default percent: <span className="font-medium text-foreground">{distributionSettings?.defaultCommissionPercent ?? 0}%</span>
                </p>
                <p className="text-muted-foreground">
                  Default amount: <span className="font-medium text-foreground">{formatNumber(distributionSettings?.defaultCommissionAmount || 0)}</span>
                </p>
              </div>
            </div>

            <div className="border rounded-md p-3 space-y-1">
              <p className="text-sm font-medium">Visibility</p>
              <p className="text-xs text-muted-foreground">
                This development is visible only to eligible referral partners when distribution is enabled.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralAccessOpen(false)}>
              Close
            </Button>
            <Button disabled>Request Changes (Coming Soon)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
        {snapshotTiles.map(tile => (
          <button
            key={tile.label}
            className="text-left"
            onClick={() => goToLeads({ view: 'pipeline', stage: tile.stage })}
          >
            <Card className="card h-full hover:border-blue-300 transition-colors">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-2xl font-semibold">{formatNumber(tile.value)}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Attention Required
            </CardTitle>
            <CardDescription>Prioritize SLA risk before pipeline work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button className="text-left" onClick={() => goToLeads({ view: 'attention', sla: 'breach' })}>
                <div className="border rounded-md p-3 hover:border-rose-300 transition-colors">
                  <p className="text-xs text-muted-foreground">Breaches</p>
                  <p className="text-xl font-semibold text-rose-600">{formatNumber(attention.breachCount)}</p>
                </div>
              </button>
              <button className="text-left" onClick={() => goToLeads({ view: 'attention', sla: 'warning' })}>
                <div className="border rounded-md p-3 hover:border-amber-300 transition-colors">
                  <p className="text-xs text-muted-foreground">Warnings</p>
                  <p className="text-xl font-semibold text-amber-600">{formatNumber(attention.warningCount)}</p>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              {(attention.items || []).slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="border rounded-md p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{lead.contact?.name || 'Unnamed lead'}</p>
                    <Badge variant="outline">{lead.stage}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.attentionReason || 'Needs follow-up'}
                  </p>
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => goToLeads({ view: 'attention', leadId: String(lead.id) })}
                    >
                      Open
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!attention.items || attention.items.length === 0) && (
                <p className="text-sm text-muted-foreground">No warning/breach leads in this range.</p>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => goToLeads({ view: 'attention' })}>
              Work Queue
            </Button>
          </CardContent>
        </Card>

        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4 text-blue-600" />
              Conversion and Leakage
            </CardTitle>
            <CardDescription>Find where the funnel is leaking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact rate</span>
                <span className="font-medium">{contactRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qualification rate</span>
                <span className="font-medium">{qualificationRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Close rate (from qualified)</span>
                <span className="font-medium">{closeFromQualifiedRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall close rate</span>
                <span className="font-medium">{conversion.overallConversionRate ?? 0}%</span>
              </div>
            </div>

            <div className="border rounded-md p-3 bg-slate-50">
              <p className="text-xs text-muted-foreground">Top drop-off stage</p>
              <p className="font-medium text-sm">{topLeakage.label}</p>
              <p className="text-xs text-rose-600">-{topLeakage.dropPct.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="w-4 h-4 text-indigo-600" />
              Velocity
            </CardTitle>
            <CardDescription>Lead response and movement speed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />
                Avg time to first contact
              </span>
              <span className="font-medium">{formatMinutes(velocity.avgTimeToFirstContactMins)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg age of open leads</span>
              <span className="font-medium">{formatHours(velocity.avgOpenLeadAgeHours)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Avg age in qualified (proxy)</span>
              <span className="font-medium">{formatHours(velocity.avgQualifiedLeadAgeHoursProxy)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Source Performance
          </CardTitle>
          <CardDescription>Top channels driving leads in the selected range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sourceRows.map(row => (
            <button
              key={row.channel}
              className="w-full text-left border rounded-md p-3 hover:border-emerald-300 transition-colors"
              onClick={() => goToLeads({ view: 'pipeline', source: row.channel })}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{row.channel}</span>
                <Badge variant="outline">{formatNumber(row.count)}</Badge>
              </div>
            </button>
          ))}
          {sourceRows.length === 0 && (
            <p className="text-sm text-muted-foreground">No source data available for this range.</p>
          )}
        </CardContent>
      </Card>

      {selectedDevelopmentId && (
        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-cyan-600" />
              Distribution Impact
            </CardTitle>
            <CardDescription>
              Referral distribution metrics for the selected development.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!distributionPanelVisible && (
              <p className="text-sm text-muted-foreground">
                Distribution is disabled for this development. Enable it to unlock referral KPIs.
              </p>
            )}

            {distributionPanelVisible && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Referral Deals</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.totalDeals || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Closed Deals</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.closedDeals || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Conversion</p>
                    <p className="text-xl font-semibold">
                      {Number(distributionSummary?.conversionRate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Commission Pending</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.commissionPendingAmount || 0))}
                    </p>
                  </div>
                  <div className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">Commission Paid</p>
                    <p className="text-xl font-semibold">
                      {formatNumber(Number(distributionSummary?.commissionPaidAmount || 0))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => goToLeads({ view: 'pipeline', source: 'distribution' })}
                  >
                    Open Referral Leads
                  </Button>
                </div>

                <div className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Referral Handoff Queue</p>
                      <p className="text-xs text-muted-foreground">
                        Request manager review without changing deal stage or commission status.
                      </p>
                    </div>
                    <Badge variant="outline">{formatNumber(distributionDeals.length)}</Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {distributionDealsQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">Loading referral deals...</p>
                    )}

                    {!distributionDealsQuery.isLoading && distributionDeals.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No referral deals are linked to this development yet.
                      </p>
                    )}

                    {distributionDeals.map((deal: any) => {
                      const latestHandoff = deal.latestDleHandoff;
                      return (
                        <div
                          className="rounded-md border border-slate-200 bg-white p-3"
                          key={deal.id}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {deal.buyerName || `Referral deal #${deal.id}`}
                                  </p>
                                  <Badge variant="outline">
                                    {formatDistributionStage(deal.currentStage)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {formatDistributionCommissionStatus(deal.commissionStatus)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {deal.agentDisplayName || 'Referral partner'}; manager{' '}
                                  {deal.managerDisplayName || 'unassigned'}
                                </p>
                              </div>

                              {latestHandoff && (
                                <div
                                  className="rounded-md border border-cyan-100 bg-cyan-50 p-2"
                                  data-testid={`dle-distribution-handoff-readback-${deal.id}`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">
                                      {formatDistributionHandoffStatus(latestHandoff.status)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatOperatingEventTime(latestHandoff.eventAt)}
                                    </span>
                                  </div>
                                  {latestHandoff.note && (
                                    <p className="mt-1 text-xs text-slate-700">
                                      {latestHandoff.note}
                                    </p>
                                  )}
                                  {latestHandoff.acknowledgedAt && (
                                    <div
                                      className="mt-2 flex flex-wrap items-center gap-2 text-xs text-emerald-700"
                                      data-testid={`dle-distribution-handoff-acknowledged-${deal.id}`}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span className="font-medium">Manager acknowledged</span>
                                      <span className="text-muted-foreground">
                                        {formatOperatingEventTime(latestHandoff.acknowledgedAt)}
                                      </span>
                                      {latestHandoff.acknowledgementNote && (
                                        <span className="basis-full text-slate-700">
                                          {latestHandoff.acknowledgementNote}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              data-testid={`dle-distribution-handoff-open-${deal.id}`}
                              onClick={() => {
                                setHandoffDeal(deal);
                                setHandoffNote('');
                              }}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Request Review
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
