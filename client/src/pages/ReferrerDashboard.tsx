import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Banknote,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileStack,
  Home,
  LayoutGrid,
  Loader2,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  Search,
} from 'lucide-react';
import { calculateAffordablePrice, calculateMonthlyRepayment } from '@/lib/bond-calculator';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

const PRIME_RATE = 11.75;
const BOND_TERM_YEARS = 20;
type Mode = 'cockpit' | 'deals' | 'developments' | 'calendar' | 'documents';
type DealFilter = 'all' | 'needs_action' | 'at_risk' | 'awaiting_docs' | 'verified';

type UnitTypeSummary = {
  name: string;
  isActive: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  unitSize: number | null;
  yardSize: number | null;
  priceFrom: number | null;
  priceTo: number | null;
};

type DevelopmentDocument = {
  id: string;
  name: string;
  url: string;
  category: 'brochure' | 'floor_plan' | 'video';
};

type CalendarReminder = {
  id: string;
  dealId: number | null;
  date: Date;
  label: string;
  sublabel: string;
  severity: 'high' | 'medium' | 'low' | 'info';
};

type CockpitStageKey =
  | 'submitted_head_office'
  | 'submitted_banks'
  | 'bank_approved'
  | 'attorney_signing'
  | 'commission_paid';

type ActivityTone = 'success' | 'warning' | 'danger' | 'info';

type ActivityFeedItem = {
  id: string;
  dealId: number | null;
  eventAt: string;
  title: string;
  subtitle: string;
  tone: ActivityTone;
  source: 'live' | 'seed';
};

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function computeCommissionEstimateFromDevelopment(dev: any): number | null {
  const track = (dev?.referrerCommission || {}) as {
    type?: 'flat' | 'percentage';
    value?: number | null;
    estimatedAmount?: number | null;
  };
  const estimatedAmount = Number(track.estimatedAmount || 0);
  if (estimatedAmount > 0) return estimatedAmount;

  const trackType = String(track.type || '').trim().toLowerCase();
  const trackValue = Number(track.value || 0);
  const priceAnchor = Number(dev?.priceFrom || dev?.priceTo || 0);
  if (trackType === 'flat') {
    return trackValue > 0 ? trackValue : null;
  }
  if (trackType === 'percentage') {
    return trackValue > 0 && priceAnchor > 0 ? (trackValue / 100) * priceAnchor : null;
  }

  const fixedCommission = Number(dev?.defaultCommissionAmount || 0);
  const percent = Number(dev?.defaultCommissionPercent || 0);
  if (fixedCommission > 0) return fixedCommission;
  if (percent > 0 && priceAnchor > 0) return (percent / 100) * priceAnchor;
  return null;
}

function formatReferralCommissionSummary(dev: any) {
  const track = (dev?.referrerCommission || {}) as {
    type?: 'flat' | 'percentage';
    value?: number | null;
  };
  const trackType = String(track.type || '').trim().toLowerCase();
  const trackValue = Number(track.value || 0);
  if (trackType === 'flat' && trackValue > 0) {
    return `${formatMoney(trackValue)} per successful signing`;
  }
  if (trackType === 'percentage' && trackValue > 0) {
    return `${trackValue}% of unit sale price`;
  }

  const fallbackFixed = Number(dev?.defaultCommissionAmount || 0);
  const fallbackPercent = Number(dev?.defaultCommissionPercent || 0);
  if (fallbackFixed > 0) return `${formatMoney(fallbackFixed)} per successful signing`;
  if (fallbackPercent > 0) return `${fallbackPercent}% of unit sale price`;
  return 'Not configured';
}

function formatDate(value: unknown) {
  const t = Date.parse(String(value || ''));
  if (!Number.isFinite(t)) return 'Unknown';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(t);
}

function formatTimeAgo(value: unknown) {
  const time = Date.parse(String(value || ''));
  if (!Number.isFinite(time)) return 'Unknown';
  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatRemaining(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const slots: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) slots.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) slots.push(new Date(year, month, day));
  while (slots.length % 7 !== 0) slots.push(null);
  return slots;
}

function activitySummary(row: any) {
  const toStage = String(row.toStage || '').trim();
  if (toStage) return `${row.buyerName} moved to ${labelStage(toStage)}`;
  if (row.notes) return String(row.notes);
  return `${row.buyerName} ${String(row.eventType || 'updated')}`;
}

function severityDotClass(severity: CalendarReminder['severity']) {
  if (severity === 'high') return 'bg-rose-500';
  if (severity === 'medium') return 'bg-amber-500';
  if (severity === 'info') return 'bg-sky-500';
  return 'bg-emerald-500';
}

function activityToneDotClass(tone: ActivityTone) {
  if (tone === 'success') return 'bg-emerald-500';
  if (tone === 'warning') return 'bg-amber-500';
  if (tone === 'danger') return 'bg-rose-500';
  return 'bg-sky-500';
}

function toIsoDateString(value: unknown) {
  const t = Date.parse(String(value || ''));
  if (!Number.isFinite(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

function activityDayLabel(value: string) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return 'Recent';
  const date = new Date(t);
  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);
  const key = toDateKey(date);
  if (key === todayKey) return 'Today';
  if (key === yesterdayKey) return 'Yesterday';
  return new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short' }).format(date);
}

function parseAreas(raw: string) {
  return raw
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function parseTagList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(v => String(v)).filter(Boolean);
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(v => String(v)).filter(Boolean);
  } catch {
    return trimmed
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }
  return [];
}

function parseMediaField(raw: unknown): unknown[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return [trimmed];
    return trimmed
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }
  return [];
}

function resolveMediaUrl(item: unknown): string | null {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed ? trimmed : null;
  }
  if (!item || typeof item !== 'object') return null;
  const raw = item as Record<string, unknown>;
  const keyOrder = ['url', 'fileUrl', 'src', 'href', 'link', 'path'];
  for (const key of keyOrder) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function resolveMediaName(item: unknown, fallback: string) {
  if (!item || typeof item !== 'object') return fallback;
  const raw = item as Record<string, unknown>;
  const keyOrder = ['name', 'title', 'label', 'fileName'];
  for (const key of keyOrder) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function buildDevelopmentDocumentBank(development: any | null): DevelopmentDocument[] {
  if (!development) return [];
  const rows: DevelopmentDocument[] = [];
  const seen = new Set<string>();

  const collect = (
    category: DevelopmentDocument['category'],
    source: unknown,
    fallbackName: string,
  ) => {
    for (const entry of parseMediaField(source)) {
      const url = resolveMediaUrl(entry);
      if (!url) continue;
      const normalized = url.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      rows.push({
        id: `${category}:${rows.length + 1}`,
        name: resolveMediaName(entry, fallbackName),
        url: normalized,
        category,
      });
    }
  };

  collect('brochure', development.brochures, 'Development Brochure');
  collect('floor_plan', development.floorPlans, 'Floor Plan');
  collect('video', development.videos, 'Development Video');

  return rows;
}

function labelStage(stage: string) {
  return stage
    .split('_')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function stageClass(stage: string) {
  if (stage === 'viewing_scheduled') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (stage === 'viewing_validated') return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  if (stage === 'application_submitted') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (stage === 'approved_in_principle') return 'border-violet-200 bg-violet-50 text-violet-700';
  if (stage === 'contract_signed') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (stage === 'commission_paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (stage === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

const COCKPIT_STAGE_ORDER: CockpitStageKey[] = [
  'submitted_head_office',
  'submitted_banks',
  'bank_approved',
  'attorney_signing',
  'commission_paid',
];

const COCKPIT_STAGE_META: Record<CockpitStageKey, { label: string; dot: string; tint: string }> = {
  submitted_head_office: {
    label: 'Submitted to Head Office',
    dot: 'bg-slate-500',
    tint: 'bg-slate-50',
  },
  submitted_banks: {
    label: 'Submitted to Banks',
    dot: 'bg-sky-500',
    tint: 'bg-sky-50/40',
  },
  bank_approved: {
    label: 'Bank Approved',
    dot: 'bg-emerald-500',
    tint: 'bg-emerald-50/40',
  },
  attorney_signing: {
    label: 'Attorney Signing',
    dot: 'bg-indigo-500',
    tint: 'bg-indigo-50/40',
  },
  commission_paid: {
    label: 'Commission Paid',
    dot: 'bg-emerald-600',
    tint: 'bg-emerald-50/60',
  },
};

function mapDealStageToCockpit(stage: string): CockpitStageKey | null {
  const key = String(stage || '').trim();
  if (!key) return null;
  if (key === 'submitted_to_head_office' || key === 'submitted_head_office') return 'submitted_head_office';
  if (key === 'submitted_to_banks') return 'submitted_banks';
  if (key === 'bank_approved') return 'bank_approved';
  if (key === 'attorney_signing') return 'attorney_signing';
  if (key === 'commission_paid') return 'commission_paid';
  if (key === 'application_submitted') return 'submitted_head_office';
  if (key === 'contract_signed') return 'submitted_banks';
  if (key === 'bond_approved') return 'bank_approved';
  if (key === 'commission_pending') return 'attorney_signing';
  return null;
}

function isPipelineDeal(stage: string) {
  return mapDealStageToCockpit(stage) !== null;
}

function workflowStepStatusClass(status: string) {
  if (status === 'complete') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'in_progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status === 'blocked') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function bankOutcomeClass(status: string) {
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'declined') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'withdrawn') return 'border-slate-300 bg-slate-100 text-slate-600';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function isClosed(stage: string) {
  return stage === 'cancelled' || stage === 'commission_paid';
}

function nextAction(deal: any) {
  const stage = String(deal.currentStage || '');
  if (isClosed(stage)) return 'Closed';
  if (!deal.documentsComplete) return 'Request documents';
  const canonical = mapDealStageToCockpit(stage);
  if (canonical === 'submitted_head_office') return 'Confirm bank submission';
  if (canonical === 'submitted_banks') return 'Track bank outcomes';
  if (canonical === 'bank_approved') return 'Confirm attorney scheduling';
  if (canonical === 'attorney_signing') return 'Track payout readiness';
  if (canonical === 'commission_paid') return 'Commission complete';
  if (stage === 'viewing_scheduled') return 'Confirm viewing attendance';
  if (stage === 'viewing_validated') return 'Check manager update';
  if (stage === 'application_submitted') return 'Track approval feedback';
  if (stage === 'approved_in_principle') return 'Prepare contract signing';
  if (stage === 'contract_signed') return 'Track commission readiness';
  return 'Follow up';
}

function isCommissionSnapshotLocked(stage: string) {
  const canonical = mapDealStageToCockpit(stage);
  return (
    canonical === 'submitted_head_office' ||
    canonical === 'submitted_banks' ||
    canonical === 'bank_approved' ||
    canonical === 'attorney_signing' ||
    canonical === 'commission_paid'
  );
}

function confidenceLabel(score: number) {
  if (score >= 85) return 'High confidence';
  if (score >= 60) return 'Medium confidence';
  return 'Low confidence';
}

function quickMatchBucketLabel(bucket: unknown) {
  const normalized = String(bucket || '').trim().toLowerCase();
  if (normalized === 'preferred_area') return 'Preferred';
  if (normalized === 'nearby_area') return 'Nearby';
  return 'Other';
}

function quickMatchBucketClass(bucket: unknown) {
  const normalized = String(bucket || '').trim().toLowerCase();
  if (normalized === 'preferred_area') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'nearby_area') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function labelBankStrategy(strategy: unknown) {
  const value = String(strategy || '').trim().toLowerCase();
  if (value === 'multi_simultaneous') return 'Multi-bank simultaneous';
  if (value === 'sequential') return 'Sequential bank routing';
  if (value === 'single') return 'Single bank routing';
  return 'Program defined';
}

function titleize(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function contextualGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ReferrerDashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [location, setLocation] = useLocation();

  const [mode, setMode] = useState<Mode>('cockpit');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [partneredOnly, setPartneredOnly] = useState(false);
  const [dealSearch, setDealSearch] = useState('');
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [dealFilter, setDealFilter] = useState<DealFilter>('all');

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickStep, setQuickStep] = useState(1);
  const [quickOrigin, setQuickOrigin] = useState<'developments' | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [preferredAreasText, setPreferredAreasText] = useState('');
  const [grossIncome, setGrossIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyDebt, setMonthlyDebt] = useState(0);
  const [depositPercent, setDepositPercent] = useState(10);
  const [quickTargetDevelopmentId, setQuickTargetDevelopmentId] = useState<number | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    const queryIndex = String(location || '').indexOf('?');
    if (queryIndex < 0) return;
    const params = new URLSearchParams(String(location || '').slice(queryIndex + 1));

    const dealId = Number(params.get('dealId') || 0);
    if (dealId > 0) {
      setSelectedDealId(dealId);
      setMode('deals');
      setLocation('/referrer/dashboard', { replace: true });
      return;
    }

    if (params.get('quick') !== '1') return;
    const developmentId = Number(params.get('developmentId') || 0);
    const from = String(params.get('from') || '').trim().toLowerCase();
    setQuickOrigin(from === 'developments' ? 'developments' : null);
    if (developmentId > 0) {
      setSelectedDevelopmentId(developmentId);
      setQuickTargetDevelopmentId(developmentId);
    }
    setQuickOpen(true);
    setQuickStep(1);
    setMode('developments');
    setLocation('/referrer/dashboard', { replace: true });
  }, [location, setLocation]);
  const accessQuery = trpc.distribution.referrer.myAccess.useQuery({
    includePaused: true,
    includeRevoked: false,
  });
  const pipelineQuery = trpc.distribution.referrer.myPipeline.useQuery({ limit: 200 });
  const viewingsQuery = trpc.distribution.referrer.myViewings.useQuery({ includePast: false, limit: 100 });
  const commissionQuery = trpc.distribution.referrer.myCommissionEntries.useQuery({ limit: 200 });
  const recentActivityQuery = trpc.distribution.referrer.recentActivity.useQuery(
    { limit: 20 },
    { retry: false },
  );
  const qualificationHistoryQuery = trpc.distribution.qualification.listMine.useQuery(
    { limit: 20 },
    { retry: false },
  );
  const previewQuickMutation = trpc.distribution.qualification.previewQuick.useMutation({
    onError: error => toast.error(error.message || 'Unable to run quick qualification preview.'),
  });
  const dealTimelineQuery = trpc.distribution.referrer.dealTimeline.useQuery(
    { dealId: Number(selectedDealId) },
    { enabled: Boolean(selectedDealId) },
  );

  const submitDealMutation = trpc.distribution.referrer.submitDeal.useMutation({
    onSuccess: (data: any) => {
      const createdDealId = Number(data?.dealId || 0);
      toast.success(
        'Referral submitted to deal pipeline',
        createdDealId > 0
          ? {
              action: {
                label: 'View deal',
                onClick: () => setLocation(`/referrer/dashboard?dealId=${createdDealId}`),
              },
            }
          : undefined,
      );
      pipelineQuery.refetch();
      viewingsQuery.refetch();
      setQuickOpen(false);
      setQuickStep(1);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setPreferredAreasText('');
      setGrossIncome(0);
      setMonthlyExpenses(0);
      setMonthlyDebt(0);
      setDepositPercent(10);
      previewQuickMutation.reset();
      const origin = quickOrigin;
      setQuickOrigin(null);
      if (origin === 'developments') {
        setLocation('/referrer/developments');
      } else {
        setMode('deals');
      }
    },
    onError: err => toast.error(err.message),
  });

  const groupedDevelopments = useMemo(() => {
    const rows = accessQuery.data || [];
    const map = new Map<number, any>();
    for (const row of rows as any[]) {
      const id = Number(row.developmentId);
      const existing = map.get(id);
      if (!existing) {
        map.set(id, { ...row, unitTypes: [...(row.unitTypes || [])] as UnitTypeSummary[] });
        continue;
      }
      const merged = [...existing.unitTypes, ...(row.unitTypes || [])];
      const unique = new Map<string, UnitTypeSummary>();
      for (const unit of merged) {
        unique.set(`${unit.name}|${unit.priceFrom ?? 'na'}|${unit.priceTo ?? 'na'}`, unit);
      }
      existing.unitTypes = Array.from(unique.values());
      if (row.accessStatus === 'active') existing.accessStatus = 'active';
      map.set(id, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.developmentName || '').localeCompare(String(b.developmentName || '')),
    );
  }, [accessQuery.data]);

  const filteredDevelopments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupedDevelopments.filter(dev => {
      if (selectedProvince !== 'all' && String(dev.province || '').toLowerCase() !== selectedProvince) {
        return false;
      }
      if (selectedCity !== 'all' && String(dev.city || '').toLowerCase() !== selectedCity) {
        return false;
      }
      if (partneredOnly && !Boolean(dev.isReferralEnabled)) {
        return false;
      }
      if (!q) return true;
      const hay = `${dev.developmentName || ''} ${dev.city || ''} ${dev.province || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groupedDevelopments, partneredOnly, search, selectedCity, selectedProvince]);

  const provinceOptions = useMemo(() => {
    return Array.from(
      new Set(
        groupedDevelopments
          .map(dev => String(dev.province || '').trim())
          .filter(Boolean)
          .map(value => value.toLowerCase()),
      ),
    ).sort();
  }, [groupedDevelopments]);

  const cityOptions = useMemo(() => {
    const source =
      selectedProvince === 'all'
        ? groupedDevelopments
        : groupedDevelopments.filter(
            dev => String(dev.province || '').toLowerCase() === String(selectedProvince).toLowerCase(),
          );
    return Array.from(
      new Set(
        source
          .map(dev => String(dev.city || '').trim())
          .filter(Boolean)
          .map(value => value.toLowerCase()),
      ),
    ).sort();
  }, [groupedDevelopments, selectedProvince]);

  useEffect(() => {
    if (selectedCity === 'all') return;
    if (!cityOptions.includes(selectedCity)) {
      setSelectedCity('all');
    }
  }, [cityOptions, selectedCity]);

  useEffect(() => {
    if (!filteredDevelopments.length) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!selectedDevelopmentId) {
      setSelectedDevelopmentId(Number(filteredDevelopments[0].developmentId));
      return;
    }
    if (!filteredDevelopments.some(d => Number(d.developmentId) === Number(selectedDevelopmentId))) {
      setSelectedDevelopmentId(Number(filteredDevelopments[0].developmentId));
    }
  }, [filteredDevelopments, selectedDevelopmentId]);

  const selectedDevelopment = filteredDevelopments.find(
    d => Number(d.developmentId) === Number(selectedDevelopmentId),
  );
  const selectedDevelopmentDocuments = useMemo(
    () => buildDevelopmentDocumentBank(selectedDevelopment || null),
    [selectedDevelopment],
  );

  const developmentById = useMemo(() => {
    const map = new Map<number, any>();
    for (const dev of groupedDevelopments) map.set(Number(dev.developmentId), dev);
    return map;
  }, [groupedDevelopments]);

  const deals = pipelineQuery.data?.deals || [];

  const viewingsByDeal = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const row of (viewingsQuery.data || []) as any[]) {
      const id = Number(row.dealId || 0);
      const current = map.get(id) || [];
      current.push(row);
      map.set(id, current);
    }
    for (const [id, rows] of map.entries()) {
      rows.sort((a, b) => Date.parse(String(a.scheduledStartAt)) - Date.parse(String(b.scheduledStartAt)));
      map.set(id, rows);
    }
    return map;
  }, [viewingsQuery.data]);

  const dealsEnhanced = useMemo(() => {
    return (deals as any[]).map(deal => {
      const stage = String(deal.currentStage || '');
      const closed = isClosed(stage);
      const viewing = (viewingsByDeal.get(Number(deal.id)) || [])[0] || null;
      const stale = Date.now() - Date.parse(String(deal.updatedAt || '')) > 7 * 24 * 60 * 60 * 1000;
      const nearDeadline = viewing
        ? (() => {
            const delta = Date.parse(String(viewing.scheduledStartAt || '')) - Date.now();
            return delta > 0 && delta <= 48 * 60 * 60 * 1000;
          })()
        : false;
      const dev = developmentById.get(Number(deal.developmentId));
      const pipelineCommissionEstimate = Number((deal as any).commissionEstimate || 0);
      const commissionEstimate =
        pipelineCommissionEstimate > 0
          ? pipelineCommissionEstimate
          : computeCommissionEstimateFromDevelopment(dev);
      return {
        ...deal,
        closed,
        cockpitStage: mapDealStageToCockpit(stage),
        isPipelineDeal: isPipelineDeal(stage),
        nextAction: nextAction(deal),
        atRisk: !closed && (stale || nearDeadline),
        commissionEstimate,
        viewing,
      };
    });
  }, [deals, developmentById, viewingsByDeal]);
  const liveDeals = useMemo(() => dealsEnhanced.filter(deal => deal.isPipelineDeal), [dealsEnhanced]);
  const prospectDeals = useMemo(() => dealsEnhanced.filter(deal => !deal.isPipelineDeal), [dealsEnhanced]);

  const filteredDeals = useMemo(() => {
    return liveDeals.filter(deal => {
      if (dealSearch.trim()) {
        const hay = `${deal.buyerName} ${deal.developmentName}`.toLowerCase();
        if (!hay.includes(dealSearch.trim().toLowerCase())) return false;
      }
      if (stageFilter !== 'all' && String(deal.currentStage) !== stageFilter) return false;
      if (dealFilter === 'needs_action') return !deal.closed;
      if (dealFilter === 'at_risk') return deal.atRisk;
      if (dealFilter === 'awaiting_docs') return !deal.documentsComplete && !deal.closed;
      if (dealFilter === 'verified') return deal.documentsComplete && !deal.closed;
      return true;
    });
  }, [liveDeals, dealSearch, stageFilter, dealFilter]);

  useEffect(() => {
    if (!filteredDeals.length) {
      setSelectedDealId(null);
      return;
    }
    if (!selectedDealId) {
      setSelectedDealId(Number(filteredDeals[0].id));
      return;
    }
    if (!filteredDeals.some(d => Number(d.id) === Number(selectedDealId))) {
      setSelectedDealId(Number(filteredDeals[0].id));
    }
  }, [filteredDeals, selectedDealId]);

  const selectedDeal = filteredDeals.find(d => Number(d.id) === Number(selectedDealId)) || null;
  const selectedDealWorkflow = (dealTimelineQuery.data as any)?.workflow || null;

  const preferredAreas = useMemo(() => parseAreas(preferredAreasText), [preferredAreasText]);
  const disposableIncome = Math.max(0, grossIncome - monthlyExpenses - monthlyDebt);
  const repaymentBudget = Math.max(0, Math.min(grossIncome * 0.3, disposableIncome * 0.6));
  const maxAffordablePrice =
    repaymentBudget > 0
      ? calculateAffordablePrice(
          repaymentBudget,
          Math.max(0, Math.min(100, depositPercent)),
          PRIME_RATE,
          BOND_TERM_YEARS,
        )
      : 0;

  const confidenceScore = useMemo(() => {
    let score = 30;
    if (clientName.trim().length > 1) score += 15;
    if (preferredAreas.length > 0) score += 15;
    if (grossIncome > 0) score += 20;
    if (monthlyExpenses > 0) score += 5;
    if (monthlyDebt > 0) score += 5;
    if (depositPercent > 0) score += 5;
    if (clientEmail.trim() || clientPhone.trim()) score += 5;
    return Math.max(0, Math.min(100, score));
  }, [
    clientName,
    preferredAreas.length,
    grossIncome,
    monthlyExpenses,
    monthlyDebt,
    depositPercent,
    clientEmail,
    clientPhone,
  ]);
  const quickPreviewQualification = (previewQuickMutation.data as any)?.qualification || null;
  const quickAffordabilityFloor = Number(
    quickPreviewQualification?.affordabilityMin ?? maxAffordablePrice * 0.8,
  );
  const quickAffordabilityCeiling = Number(
    quickPreviewQualification?.affordabilityMax ?? maxAffordablePrice,
  );
  const quickConfidenceScore = Number(quickPreviewQualification?.confidenceScore ?? confidenceScore);

  const quickMatches = useMemo(() => {
    const previewMatches = (previewQuickMutation.data as any)?.matches;
    if (previewMatches) {
      const rows = [
        ...((previewMatches.preferred || []) as any[]),
        ...((previewMatches.nearby || []) as any[]),
        ...((previewMatches.other || []) as any[]),
      ];
      return rows
        .map((match: any) => {
          const development = developmentById.get(Number(match.developmentId)) || null;
          const baseUnit = Array.isArray(match.qualifyingUnitTypes)
            ? match.qualifyingUnitTypes[0] || null
            : null;
          const entryPrice = Number(
            match.estimatedEntryPrice ||
              baseUnit?.priceFrom ||
              baseUnit?.priceTo ||
              development?.priceFrom ||
              development?.priceTo ||
              0,
          );
          if (!entryPrice) return null;
          const affordabilityMax = Number(
            (previewQuickMutation.data as any)?.qualification?.affordabilityMax || maxAffordablePrice || 0,
          );
          return {
            developmentId: Number(match.developmentId),
            developmentName: String(match.developmentName || development?.developmentName || 'Development'),
            city: development?.city || null,
            province: development?.province || null,
            programId: Number(match.programId || development?.programId || 0),
            entryPrice,
            buffer: Math.max(0, affordabilityMax - entryPrice),
            baseUnit,
            score: Number(match.rankScore || 0),
            matchBucket: String(match.matchBucket || ''),
            matchReasons: Array.isArray(match.matchReasons)
              ? match.matchReasons.map((reason: unknown) => String(reason || '')).filter(Boolean)
              : [],
          };
        })
        .filter(Boolean)
        .slice(0, 6) as any[];
    }

    if (maxAffordablePrice <= 0) return [];
    return groupedDevelopments
      .map(dev => {
        const units = (dev.unitTypes || []) as UnitTypeSummary[];
        const qualifying = units.filter(unit => {
          const price = unit.priceFrom ?? unit.priceTo ?? null;
          return typeof price === 'number' && price <= maxAffordablePrice;
        });
        const baseUnit =
          qualifying.sort(
            (a, b) => Number(a.priceFrom || a.priceTo || 0) - Number(b.priceFrom || b.priceTo || 0),
          )[0] || null;
        const entryPrice = Number(baseUnit?.priceFrom || baseUnit?.priceTo || dev.priceFrom || dev.priceTo || 0);
        if (!entryPrice) return null;
        const tokens = [dev.city, dev.province, dev.suburb].map((v: any) => String(v || '').toLowerCase());
        const areaMatch = preferredAreas.some(area =>
          tokens.some((t: string) => t.includes(area.toLowerCase())),
        );
        const buffer = Math.max(0, maxAffordablePrice - entryPrice);
        const score =
          (areaMatch ? 50 : 0) +
          Math.min(40, Math.floor((maxAffordablePrice / entryPrice) * 20)) +
          Math.min(10, Math.floor(buffer / 120000));
        return {
          developmentId: Number(dev.developmentId),
          developmentName: String(dev.developmentName || 'Development'),
          city: dev.city,
          province: dev.province,
          programId: Number(dev.programId || 0),
          entryPrice,
          buffer,
          baseUnit,
          score,
          matchBucket: areaMatch ? 'preferred_area' : 'other_area',
          matchReasons: [],
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3) as any[];
  }, [
    developmentById,
    groupedDevelopments,
    maxAffordablePrice,
    preferredAreas,
    previewQuickMutation.data,
  ]);

  useEffect(() => {
    if (
      quickTargetDevelopmentId &&
      groupedDevelopments.some(
        dev => Number(dev.developmentId) === Number(quickTargetDevelopmentId),
      )
    ) {
      return;
    }
    if (quickMatches.length > 0) {
      setQuickTargetDevelopmentId(Number(quickMatches[0].developmentId));
      return;
    }
    setQuickTargetDevelopmentId(null);
  }, [groupedDevelopments, quickMatches, quickTargetDevelopmentId]);

  const quickSelectedMatch =
    quickMatches.find(m => Number(m.developmentId) === Number(quickTargetDevelopmentId)) || null;
  const quickContextDevelopment = quickTargetDevelopmentId
    ? developmentById.get(Number(quickTargetDevelopmentId)) || null
    : null;
  const quickContextQualification = useMemo(() => {
    if (!quickContextDevelopment) return null;
    const units = (quickContextDevelopment.unitTypes || []) as UnitTypeSummary[];
    const qualifyingUnits = units.filter(unit => {
      const price = unit.priceFrom ?? unit.priceTo ?? null;
      return typeof price === 'number' && price > 0 && price <= quickAffordabilityCeiling;
    });
    const entryPrice = Number(
      quickContextDevelopment.priceFrom ||
        quickContextDevelopment.priceTo ||
        qualifyingUnits[0]?.priceFrom ||
        qualifyingUnits[0]?.priceTo ||
        0,
    );
    return {
      qualifies: qualifyingUnits.length > 0,
      qualifyingUnits,
      entryPrice,
      buffer: Math.max(0, quickAffordabilityCeiling - entryPrice),
    };
  }, [quickAffordabilityCeiling, quickContextDevelopment]);
  const quickTargetProgramId = Number(
    quickContextDevelopment?.programId ?? quickSelectedMatch?.programId ?? 0,
  );
  const canPreview = clientName.trim().length >= 2 && preferredAreas.length > 0 && grossIncome > 0;
  const canSubmitQuick = canPreview && quickTargetProgramId > 0 && !submitDealMutation.isPending;

  const loading =
    accessQuery.isLoading || pipelineQuery.isLoading || viewingsQuery.isLoading || commissionQuery.isLoading;
  const error = accessQuery.error || pipelineQuery.error || viewingsQuery.error || commissionQuery.error;

  const needsActionCount = liveDeals.filter(d => !d.closed && d.nextAction !== 'Closed').length;
  const activeDevelopmentCount = groupedDevelopments.filter(
    dev => String(dev.accessStatus || '').toLowerCase() === 'active',
  ).length;
  const greetingLabel = contextualGreeting();
  const firstName =
    String(user?.firstName || '').trim() ||
    String(user?.name || '')
      .trim()
      .split(/\s+/)[0] ||
    'there';
  const programDocumentGroups = useMemo(() => {
    const grouped = new Map<
      string,
      { workflowName: string; workflowType: string; requiredDocs: number; developments: string[] }
    >();
    for (const dev of groupedDevelopments) {
      const workflowName = String(dev.workflowSummary?.workflowName || 'Referral Workflow');
      const workflowType = labelBankStrategy(dev.workflowSummary?.bankStrategy);
      const requiredDocs = Number(dev.workflowSummary?.requiredDocumentCount || 0);
      const current = grouped.get(workflowName) || {
        workflowName,
        workflowType,
        requiredDocs,
        developments: [],
      };
      current.requiredDocs = Math.max(current.requiredDocs, requiredDocs);
      if (!current.developments.includes(String(dev.developmentName || 'Development'))) {
        current.developments.push(String(dev.developmentName || 'Development'));
      }
      grouped.set(workflowName, current);
    }
    return Array.from(grouped.values()).sort((a, b) => a.workflowName.localeCompare(b.workflowName));
  }, [groupedDevelopments]);
  const operationalReminders = useMemo(() => {
    const now = Date.now();
    const rows: CalendarReminder[] = [];
    const seen = new Set<string>();

    for (const deal of liveDeals) {
      if (deal.closed) continue;
      const dealId = Number(deal.id);
      const stage = String(deal.currentStage || '');
      const updatedAt = Date.parse(String(deal.updatedAt || ''));
      const docsDueAt = Number.isFinite(updatedAt) ? new Date(updatedAt + 3 * 24 * 60 * 60 * 1000) : null;

      if (!deal.documentsComplete && docsDueAt) {
        const key = `docs:${dealId}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({
            id: key,
            dealId,
            date: docsDueAt,
            label: `Docs ${docsDueAt.getTime() < now ? 'overdue' : 'due'} - ${deal.buyerName}`,
            sublabel: deal.developmentName,
            severity: docsDueAt.getTime() < now ? 'high' : 'medium',
          });
        }
      }

      if (
        stage === 'application_submitted' ||
        stage === 'approved_in_principle' ||
        stage === 'submitted_to_banks' ||
        stage === 'contract_signed'
      ) {
        const turnaroundHours = Number(deal.workflowSummary?.turnaroundHours || 48);
        const bankDue = Number.isFinite(updatedAt)
          ? new Date(updatedAt + turnaroundHours * 60 * 60 * 1000)
          : null;
        if (bankDue) {
          const key = `bank:${dealId}`;
          if (!seen.has(key)) {
            seen.add(key);
            rows.push({
              id: key,
              dealId,
              date: bankDue,
              label: `Awaiting bank response - ${deal.buyerName}`,
              sublabel: deal.developmentName,
              severity: bankDue.getTime() < now ? 'high' : 'info',
            });
          }
        }
      }
    }

    for (const viewing of (viewingsQuery.data || []) as any[]) {
      const startAt = Date.parse(String(viewing.scheduledStartAt || ''));
      if (!Number.isFinite(startAt)) continue;
      const date = new Date(startAt);
      rows.push({
        id: `viewing:${viewing.id}`,
        dealId: Number(viewing.dealId || 0) || null,
        date,
        label: `Viewing ${date.getTime() < now ? 'completed' : 'scheduled'} - ${viewing.buyerName}`,
        sublabel: String(viewing.developmentName || 'Development'),
        severity: date.getTime() < now ? 'low' : date.getTime() - now <= 36 * 60 * 60 * 1000 ? 'medium' : 'low',
      });
    }

    return rows
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 18);
  }, [liveDeals, viewingsQuery.data]);

  const reminderList = operationalReminders.slice(0, 6);
  const remindersByDate = useMemo(() => {
    const map = new Map<string, CalendarReminder[]>();
    for (const reminder of operationalReminders) {
      const key = toDateKey(reminder.date);
      const current = map.get(key) || [];
      current.push(reminder);
      map.set(key, current);
    }
    return map;
  }, [operationalReminders]);

  const monthGrid = useMemo(() => buildMonthGrid(calendarCursor), [calendarCursor]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(calendarCursor),
    [calendarCursor],
  );
  const selectedDateReminders = remindersByDate.get(selectedCalendarDateKey) || [];

  const recentQualifications = useMemo(() => {
    const source = ((qualificationHistoryQuery.data || []) as any[]).slice(0, 5);
    if (source.length > 0) {
      return source.map(row => {
        const status = String(row.status || '');
        const confidence = Number(row.latestConfidenceScore || 0);
        const statusTone =
          status === 'verified' || status === 'submitted'
            ? 'success'
            : status === 'awaiting_documents' || status === 'under_review'
              ? 'warning'
              : 'info';
        return {
          id: Number(row.id),
          clientName: String(row.clientName || 'Client'),
          affordability: String(row.affordabilityLabel || 'Pending estimate'),
          confidence: Math.max(0, Math.min(100, confidence || 48)),
          statusLabel: String(row.statusLabel || 'Quick'),
          statusTone,
          hasDeal: Boolean(row.lastSubmittedDealId),
        };
      });
    }

    return prospectDeals
      .slice()
      .sort((a, b) => Date.parse(String(b.updatedAt || '')) - Date.parse(String(a.updatedAt || '')))
      .slice(0, 5)
      .map(deal => ({
        id: Number(deal.id),
        clientName: String(deal.buyerName || 'Client'),
        affordability: formatMoney(Number(deal.commissionEstimate || 0)),
        confidence: deal.documentsComplete ? 88 : 62,
        statusLabel: deal.documentsComplete ? 'Verified' : 'Quick',
        statusTone: deal.documentsComplete ? 'success' : 'info',
        hasDeal: true,
      }));
  }, [prospectDeals, qualificationHistoryQuery.data]);

  const seededActivity = useMemo<ActivityFeedItem[]>(() => {
    const now = Date.now();
    const fromDeals = liveDeals
      .slice()
      .sort((a, b) => Date.parse(String(b.updatedAt || '')) - Date.parse(String(a.updatedAt || '')))
      .slice(0, 6)
      .map((deal, index) => {
        const stage = mapDealStageToCockpit(String(deal.currentStage || ''));
        const stageLabel = stage ? COCKPIT_STAGE_META[stage].label : 'Deal updated';
        return {
          id: `seed-deal-${deal.id}`,
          dealId: Number(deal.id),
          eventAt: toIsoDateString(
            Date.parse(String(deal.updatedAt || '')) > 0
              ? deal.updatedAt
              : new Date(now - index * 11 * 60000).toISOString(),
          ),
          title: stageLabel,
          subtitle: `${deal.buyerName} - ${deal.developmentName}`,
          tone: (deal.atRisk ? 'warning' : deal.documentsComplete ? 'success' : 'info') as ActivityTone,
          source: 'seed' as const,
        };
      });
    if (fromDeals.length > 0) return fromDeals;
    return [
      {
        id: 'seed-1',
        dealId: null,
        eventAt: new Date(now - 4 * 60000).toISOString(),
        title: 'Deal created',
        subtitle: 'Lerato Mokoena - Horizon Ridge',
        tone: 'info',
        source: 'seed',
      },
      {
        id: 'seed-2',
        dealId: null,
        eventAt: new Date(now - 18 * 60000).toISOString(),
        title: 'Documents requested',
        subtitle: 'Sipho Nkosi - Cosmo City Ext 10',
        tone: 'warning',
        source: 'seed',
      },
      {
        id: 'seed-3',
        dealId: null,
        eventAt: new Date(now - 37 * 60000).toISOString(),
        title: 'Viewing completed',
        subtitle: 'Amogelang M. - Royal Cradle Estate',
        tone: 'success',
        source: 'seed',
      },
    ];
  }, [liveDeals]);

  const liveActivityRows = useMemo<ActivityFeedItem[]>(() => {
    return ((recentActivityQuery.data || []) as any[]).slice(0, 10).map(event => {
      const stage = mapDealStageToCockpit(String(event.toStage || ''));
      let title = activitySummary(event);
      if (stage) title = COCKPIT_STAGE_META[stage].label;
      if (String(event.toStage || '') === 'cancelled') title = 'Deal cancelled';
      const tone: ActivityTone =
        String(event.toStage || '') === 'cancelled'
          ? 'danger'
          : stage === 'bank_approved' || stage === 'commission_paid'
            ? 'success'
            : stage === 'attorney_signing'
              ? 'warning'
              : 'info';
      return {
        id: `live-${event.id}`,
        dealId: Number(event.dealId || 0) || null,
        eventAt: toIsoDateString(event.eventAt),
        title,
        subtitle: `${event.buyerName} - ${event.developmentName}`,
        tone,
        source: 'live' as const,
      };
    });
  }, [recentActivityQuery.data]);

  const activityFeedRows = liveActivityRows.length > 0 ? liveActivityRows : seededActivity;
  const visibleReminders =
    selectedDateReminders.length > 0 ? selectedDateReminders.slice(0, 6) : reminderList;
  const activityForSelectedDate = useMemo(() => {
    return activityFeedRows.filter(row => toDateKey(new Date(row.eventAt)) === selectedCalendarDateKey);
  }, [activityFeedRows, selectedCalendarDateKey]);
  const visibleActivityRows = activityForSelectedDate.length > 0 ? activityForSelectedDate : activityFeedRows;
  const groupedActivityRows = useMemo(() => {
    const grouped = new Map<string, ActivityFeedItem[]>();
    for (const row of visibleActivityRows) {
      const bucket = activityDayLabel(row.eventAt);
      const current = grouped.get(bucket) || [];
      current.push(row);
      grouped.set(bucket, current);
    }
    return Array.from(grouped.entries()).map(([label, rows]) => ({ label, rows }));
  }, [visibleActivityRows]);
  const overdueReminderCount = useMemo(
    () => operationalReminders.filter(reminder => reminder.severity === 'high').length,
    [operationalReminders],
  );
  const cockpitPipelineColumns = useMemo(() => {
    return COCKPIT_STAGE_ORDER.map(stage => {
      const dealsInStage = liveDeals.filter(deal => String(deal.cockpitStage || '') === stage && !deal.closed);
      return {
        stage,
        ...COCKPIT_STAGE_META[stage],
        count: dealsInStage.length,
        deals: dealsInStage.slice(0, 3),
      };
    });
  }, [liveDeals]);
  const liveStageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const deal of liveDeals) {
      const stage = String(deal.currentStage || '').trim();
      if (!stage) continue;
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return counts;
  }, [liveDeals]);
  const liveStageOrder = useMemo(() => {
    const order = (pipelineQuery.data?.stageOrder || []) as string[];
    const known = new Set<string>();
    const rows: string[] = [];
    for (const stage of order) {
      if (!liveStageCounts[stage]) continue;
      known.add(stage);
      rows.push(stage);
    }
    for (const stage of Object.keys(liveStageCounts)) {
      if (known.has(stage)) continue;
      rows.push(stage);
    }
    return rows;
  }, [liveStageCounts, pipelineQuery.data?.stageOrder]);

  const kpis = [
    {
      label: 'Active Deals',
      value: liveDeals.filter(d => !d.closed).length,
      click: () => {
        setMode('deals');
        setDealFilter('all');
      },
    },
    {
      label: 'Needs Action',
      value: needsActionCount,
      click: () => {
        setMode('deals');
        setDealFilter('needs_action');
      },
    },
    {
      label: 'Awaiting Docs',
      value: liveDeals.filter(d => !d.documentsComplete && !d.closed).length,
      click: () => {
        setMode('deals');
        setDealFilter('awaiting_docs');
      },
    },
    {
      label: 'At Risk',
      value: liveDeals.filter(d => d.atRisk).length,
      click: () => {
        setMode('deals');
        setDealFilter('at_risk');
      },
    },
    {
      label: 'Commission Forecast',
      value: formatMoney(
        (commissionQuery.data || [])
          .filter((row: any) => row.entryStatus === 'pending' || row.entryStatus === 'approved')
          .reduce((sum: number, row: any) => sum + Number(row.commissionAmount || 0), 0),
      ),
      click: () => setMode('deals'),
    },
    {
      label: 'Active Developments',
      value: activeDevelopmentCount,
      click: () => setMode('developments'),
    },
  ];

  const sidebarItems: Array<{ mode: Mode; label: string; icon: ReactNode }> = [
    { mode: 'cockpit', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
    { mode: 'developments', label: 'Developments', icon: <Building2 className="h-4 w-4" /> },
    { mode: 'deals', label: 'Deals', icon: <Rows3 className="h-4 w-4" /> },
    { mode: 'calendar', label: 'Calendar', icon: <CalendarClock className="h-4 w-4" /> },
    { mode: 'documents', label: 'Documents', icon: <FileStack className="h-4 w-4" /> },
  ];

  const openQuick = (areas?: string, developmentId?: number) => {
    setQuickOpen(true);
    setQuickStep(1);
    previewQuickMutation.reset();
    if (areas) setPreferredAreasText(areas);
    if (developmentId) setQuickTargetDevelopmentId(developmentId);
  };

  const previewFromQuick = async () => {
    if (!canPreview) {
      toast.error('Add client name, preferred area, and income first.');
      return;
    }
    const payload = {
      mode: 'quick_qual' as const,
      client: {
        name: clientName.trim(),
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        preferredAreas,
      },
      financial: {
        grossMonthlyIncome: grossIncome,
        monthlyDebts: monthlyDebt > 0 ? monthlyDebt : null,
        monthlyExpenses: monthlyExpenses > 0 ? monthlyExpenses : null,
        dependents: null,
        depositAmount: null,
        employmentType: null,
        docsUploaded: null,
      },
    };
    const result = await previewQuickMutation.mutateAsync(payload);
    const firstMatch =
      (result.matches?.preferred || [])[0] ||
      (result.matches?.nearby || [])[0] ||
      (result.matches?.other || [])[0] ||
      null;
    if (firstMatch?.developmentId) {
      setQuickTargetDevelopmentId(Number(firstMatch.developmentId));
    }
    setQuickStep(3);
  };

  const openDocumentUrl = (url: string, label: string) => {
    const target = String(url || '').trim();
    if (!target) {
      toast.error(`${label} is missing a valid file URL.`);
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const submitFromQuick = () => {
    if (quickTargetProgramId <= 0) {
      toast.error('Select a matched development with an active program.');
      return;
    }
    submitDealMutation.mutate({
      programId: quickTargetProgramId,
      buyerName: clientName.trim(),
      buyerEmail: clientEmail.trim() || null,
      buyerPhone: clientPhone.trim() || null,
      notes: `Quick Qual affordability: ${formatMoney(quickAffordabilityCeiling)} | Target: ${quickContextDevelopment?.developmentName || quickSelectedMatch?.developmentName || 'Unspecified development'}`,
      referralContext: {
        prospect: {
          grossMonthlyIncome: grossIncome || null,
          grossMonthlyIncomeRange: null,
          notes: `Areas: ${preferredAreas.join(', ') || 'N/A'} | Expenses: ${formatMoney(
            monthlyExpenses,
          )} | Debt: ${formatMoney(monthlyDebt)}`,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      <ListingNavbar />
      <div className="mx-auto max-w-[1560px] px-4 pb-8 pt-24 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <aside
            className={`h-fit rounded-[20px] border border-slate-200 bg-white p-4 text-slate-900 shadow-sm transition-all duration-200 ${
              sidebarCollapsed ? 'w-[84px]' : 'w-[260px]'
            } lg:sticky lg:top-24`}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className={sidebarCollapsed ? 'hidden' : 'block'}>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Referrer</p>
                <p className="text-sm font-semibold text-slate-900">Deal Operations</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarCollapsed(prev => !prev)}
                className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-1">
              {sidebarItems.map(item => {
                const active = mode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => setMode(item.mode)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title={item.label}
                  >
                    <span>{item.icon}</span>
                    <span className={sidebarCollapsed ? 'hidden' : 'block'}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <Separator className="my-3" />
              <button
                onClick={() => setLocation('/referrer/developments')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title="Live Developments"
              >
                <span>
                  <Building2 className="h-4 w-4" />
                </span>
                <span className={sidebarCollapsed ? 'hidden' : 'block'}>Live Developments</span>
              </button>
              {!sidebarCollapsed ? (
                <p className="mt-1 px-3 text-[11px] text-slate-500">
                  Sales pack + submission requirements, in one place.
                </p>
              ) : null}
            </div>
            {!sidebarCollapsed ? (
              <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-xs text-emerald-700">Needs attention</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{needsActionCount}</p>
                <p className="text-xs text-slate-600">Open deals requiring action</p>
              </div>
            ) : null}
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="px-1">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {greetingLabel}, {firstName}.
                  </p>
                  <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">
                    {needsActionCount} deals need your attention.
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Qualify, match, submit, and track referrals from one command surface.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setLocation('/referrer/developments')}>
                  Live Developments
                </Button>
              </div>
            </div>

            <Tabs value={mode} onValueChange={value => setMode(value as Mode)} className="space-y-4">

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl bg-white py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : error ? (
            <Card>
              <CardHeader>
                <CardTitle>Unable to load referrer cockpit</CardTitle>
                <CardDescription>{error.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <TabsContent value="cockpit" className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                    {kpis.map(kpi => (
                      <button
                        key={kpi.label}
                        onClick={kpi.click}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{kpi.label}</p>
                        <p className="mt-1 text-2xl font-semibold leading-none text-slate-900">{kpi.value}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[0.95fr_1.22fr_0.78fr]">
                  <Card>
                    <CardHeader className="pb-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <CalendarClock className="h-4 w-4" /> Calendar and Reminders
                        </CardTitle>
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700">
                          {overdueReminderCount} overdue
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        Time-sensitive operational queue with date markers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() =>
                                setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                              }
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() =>
                                setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                              }
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-slate-500">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {monthGrid.map((date, idx) => {
                            if (!date) return <div key={`blank-${idx}`} className="h-8 rounded-md bg-transparent" />;
                            const key = toDateKey(date);
                            const dayReminders = remindersByDate.get(key) || [];
                            const selected = key === selectedCalendarDateKey;
                            return (
                              <button
                                key={key}
                                onClick={() => setSelectedCalendarDateKey(key)}
                                className={`h-8 rounded-md border px-1 py-0.5 text-left transition ${
                                  selected
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <p className="text-[11px] font-medium leading-none">{date.getDate()}</p>
                                <div className="mt-0.5 flex gap-0.5">
                                  {dayReminders.slice(0, 3).map(reminder => (
                                    <span
                                      key={reminder.id}
                                      className={`h-1.5 w-1.5 rounded-full ${severityDotClass(reminder.severity)}`}
                                    />
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Overdue
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Awaiting
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Scheduled
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-sky-500" />
                          Bank response
                        </span>
                      </div>

                      <div className="space-y-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                        {visibleReminders.map(reminder => (
                          <button
                            key={reminder.id}
                            onClick={() => {
                              if (!reminder.dealId) return;
                              setSelectedDealId(reminder.dealId);
                              setMode('deals');
                            }}
                            className="flex w-full items-start gap-2 px-2 py-1.5 text-left transition hover:bg-slate-50"
                          >
                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${severityDotClass(reminder.severity)}`} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-900">{reminder.label}</p>
                              <p className="truncate text-[11px] text-slate-500">{reminder.sublabel}</p>
                            </div>
                          </button>
                        ))}
                        {!visibleReminders.length ? (
                          <p className="px-2 py-2 text-xs text-slate-500">No reminders in this window.</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1.5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Activity Stream</CardTitle>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                          Live
                        </span>
                      </div>
                      <CardDescription className="text-xs">
                        Last 10 operational events. Date selection on calendar filters this feed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                        {recentActivityQuery.isLoading ? (
                          <p className="text-xs text-slate-500">Loading activity...</p>
                        ) : groupedActivityRows.length === 0 ? (
                          <p className="text-xs text-slate-500">No activity yet.</p>
                        ) : (
                          groupedActivityRows.map(group => (
                            <div key={group.label}>
                              <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {group.label}
                              </p>
                              <div className="space-y-1">
                                {group.rows.map(event => (
                                  <button
                                    key={event.id}
                                    onClick={() => {
                                      if (!event.dealId) return;
                                      setSelectedDealId(Number(event.dealId));
                                      setMode('deals');
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-slate-300 hover:shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-900">
                                        <span
                                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${activityToneDotClass(event.tone)}`}
                                        />
                                        <span className="truncate">{event.title}</span>
                                      </p>
                                      <span className="whitespace-nowrap text-[10px] text-slate-500">
                                        {formatTimeAgo(event.eventAt)}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                      {event.subtitle}
                                      {event.source === 'seed' ? ' - sample signal' : ''}
                                    </p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-1.5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Quick Qual</CardTitle>
                        <Button size="sm" className="h-7" onClick={() => openQuick()}>
                          + New
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        Qualification launcher and latest prospect assessments.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {canPreview ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-[11px] text-slate-500">Current preview</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatMoney(quickAffordabilityFloor)} - {formatMoney(quickAffordabilityCeiling)}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Progress value={quickConfidenceScore} className="h-1.5" />
                            <span className="text-[11px] text-slate-600">{quickConfidenceScore}%</span>
                          </div>
                        </div>
                      ) : null}
                      <div className="max-h-[200px] space-y-1.5 overflow-y-auto pr-1">
                        {recentQualifications.map(item => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition hover:border-slate-300"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-medium text-slate-900">{item.clientName}</p>
                              <Badge
                                variant="outline"
                                className={
                                  item.statusTone === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : item.statusTone === 'warning'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-sky-200 bg-sky-50 text-sky-700'
                                }
                              >
                                {item.statusLabel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">{item.affordability}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Progress value={item.confidence} className="h-1.5" />
                              <span className="text-[10px] text-slate-500">{item.confidence}%</span>
                            </div>
                            {!item.hasDeal ? (
                              <button
                                onClick={() => {
                                  setClientName(item.clientName);
                                  openQuick();
                                }}
                                className="mt-1 text-[10px] font-medium text-slate-600 transition hover:text-slate-900"
                              >
                                Create deal
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {recentQualifications.length === 0 ? (
                          <p className="text-xs text-slate-500">No qualifications yet.</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle>Deal Pipeline</CardTitle>
                      <CardDescription>Live submitted deals only: head office to commission payout.</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {liveDeals.filter(d => !d.closed).length} active deals
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex min-w-max gap-2.5 pr-1">
                        {cockpitPipelineColumns.map(column => (
                          <div
                            key={column.stage}
                            className={`w-[184px] rounded-xl border border-slate-200 p-1.5 ${column.tint}`}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                              <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                                {column.label}
                              </p>
                              <span className="rounded-full border border-slate-200 bg-white px-1.5 text-[11px] text-slate-600">
                                {column.count}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {column.deals.map(deal => (
                                <button
                                  key={deal.id}
                                  onClick={() => {
                                    setSelectedDealId(Number(deal.id));
                                    setMode('deals');
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-slate-300 hover:shadow-sm"
                                >
                                  <p className="text-xs font-semibold text-slate-900">{deal.buyerName}</p>
                                  <p className="truncate text-[11px] text-slate-500">{deal.developmentName}</p>
                                </button>
                              ))}
                              {column.deals.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400">
                                  No deals
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals" className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                  <Card className="h-fit">
                    <CardHeader className="space-y-3">
                      <CardTitle>Deals Pipeline</CardTitle>
                      <Input
                        value={dealSearch}
                        onChange={e => setDealSearch(e.target.value)}
                        placeholder="Search client or development"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                          value={stageFilter}
                          onChange={e => setStageFilter(e.target.value)}
                        >
                          <option value="all">All stages</option>
                          {liveStageOrder.map((stage: string) => (
                            <option key={stage} value={stage}>
                              {labelStage(stage)}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                          value={dealFilter}
                          onChange={e => setDealFilter(e.target.value as DealFilter)}
                        >
                          <option value="all">All actions</option>
                          <option value="needs_action">Needs action</option>
                          <option value="at_risk">At risk</option>
                          <option value="awaiting_docs">Awaiting docs</option>
                          <option value="verified">Verified</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(liveStageCounts).map(([stage, count]) => (
                          <Badge key={stage} variant="outline" className={stageClass(stage)}>
                            {labelStage(stage)}: {count}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {filteredDeals.map(deal => {
                        const selected = Number(deal.id) === Number(selectedDealId);
                        return (
                          <button
                            key={deal.id}
                            onClick={() => setSelectedDealId(Number(deal.id))}
                            className={`w-full rounded-xl border p-3 text-left ${
                              selected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <p className="text-sm font-semibold">{deal.buyerName}</p>
                            <p className={`text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                              {deal.developmentName}
                            </p>
                            <p className={`mt-1 text-xs ${selected ? 'text-slate-200' : 'text-slate-600'}`}>
                              Next: {deal.nextAction}
                            </p>
                          </button>
                        );
                      })}
                      {filteredDeals.length === 0 ? (
                        <p className="text-sm text-slate-500">No deals match current filters.</p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    {!selectedDeal ? (
                      <CardHeader>
                        <CardTitle>Select a deal</CardTitle>
                        <CardDescription>Pick a deal from the left panel.</CardDescription>
                      </CardHeader>
                    ) : (
                      <>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-2xl">{selectedDeal.buyerName}</CardTitle>
                              <CardDescription>
                                {selectedDeal.developmentName} | Last activity {formatDate(selectedDeal.updatedAt)}
                              </CardDescription>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                                  Program:{' '}
                                  {selectedDealWorkflow?.summary?.workflowName ||
                                    selectedDeal.workflowSummary?.workflowName ||
                                    'Referral Workflow'}
                                </Badge>
                                <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                                  {labelBankStrategy(
                                    selectedDealWorkflow?.summary?.bankStrategy ||
                                      selectedDeal.workflowSummary?.bankStrategy,
                                  )}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant="outline" className={stageClass(String(selectedDeal.currentStage))}>
                              {labelStage(String(selectedDeal.currentStage))}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-[11px] text-slate-500">Next action</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedDeal.nextAction}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-[11px] text-slate-500">Submitted</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedDeal.submittedAt)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <p className="text-[11px] text-slate-500">Qualification</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {selectedDeal.documentsComplete ? 'Verified' : 'Awaiting Docs'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] text-slate-500">Referral commission</p>
                                <Badge
                                  variant="outline"
                                  className={
                                    isCommissionSnapshotLocked(String(selectedDeal.currentStage || ''))
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-amber-200 bg-amber-50 text-amber-700'
                                  }
                                >
                                  {isCommissionSnapshotLocked(String(selectedDeal.currentStage || ''))
                                    ? 'Locked'
                                    : 'Estimated'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {selectedDeal.commissionEstimate ? formatMoney(selectedDeal.commissionEstimate) : 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const devId = Number((selectedDeal as any)?.developmentId || 0);
                                const programId = Number((selectedDeal as any)?.programId || 0);
                                if (devId > 0) {
                                  setLocation(`/referrer/developments?developmentId=${devId}`);
                                  return;
                                }
                                if (programId > 0) {
                                  setLocation(`/referrer/developments?programId=${programId}`);
                                  return;
                                }
                                toast.error('This deal is not linked to a development yet.');
                              }}
                            >
                              Open in Live Developments
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Qualification PDF generation queued.')}
                            >
                              Generate Qualification PDF
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const docsComplete = Boolean(selectedDealWorkflow?.documentsComplete);
                                if (!docsComplete) {
                                  toast.error('Missing required docs. Complete checklist before submission pack.');
                                  return;
                                }
                                toast.info('Bank submission pack generation queued.');
                              }}
                            >
                              Generate Bank Submission Pack
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Required docs checklist download prepared.')}
                            >
                              Download Docs Checklist
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Secure upload link sent to client.')}
                            >
                              Send Secure Upload Link
                            </Button>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">Program Milestones</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 text-sm">
                                {(selectedDealWorkflow?.milestones || []).map((step: any) => (
                                  <div
                                    key={step.stepKey}
                                    className="rounded-xl border border-slate-200 bg-white p-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-slate-900">{step.stepLabel}</p>
                                      <Badge
                                        variant="outline"
                                        className={workflowStepStatusClass(String(step.status || 'pending'))}
                                      >
                                        {labelStage(String(step.status || 'pending'))}
                                      </Badge>
                                    </div>
                                    {step.detail ? (
                                      <p className="mt-1 text-xs text-slate-600">{step.detail}</p>
                                    ) : null}
                                    {step.completedAt ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Completed {formatDate(step.completedAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                                {!(selectedDealWorkflow?.milestones || []).length ? (
                                  <>
                                    <Milestone
                                      icon={
                                        <ClipboardList className="mt-0.5 h-4 w-4 text-slate-500" />
                                      }
                                      label="Submitted"
                                      value={formatDate(selectedDeal.submittedAt)}
                                    />
                                    <Milestone
                                      icon={
                                        <CalendarClock className="mt-0.5 h-4 w-4 text-blue-600" />
                                      }
                                      label="Viewing"
                                      value={
                                        selectedDeal.viewing
                                          ? formatDate(selectedDeal.viewing.scheduledStartAt)
                                          : 'Not scheduled'
                                      }
                                    />
                                  </>
                                ) : null}
                              </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">Required Documents</CardTitle>
                                <CardDescription>
                                  {selectedDealWorkflow?.uploadedRequiredDocumentCount ?? 0}/
                                  {(selectedDealWorkflow?.requiredDocuments || []).filter(
                                    (doc: any) => Boolean(doc.isRequired),
                                  ).length}{' '}
                                  required docs uploaded
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {(selectedDealWorkflow?.requiredDocuments || []).map((doc: any) => (
                                  <div key={doc.documentKey} className="rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-slate-900">{doc.documentLabel}</p>
                                      <Badge
                                        variant="outline"
                                        className={
                                          doc.uploaded
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : doc.isRequired
                                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                                              : 'border-slate-200 bg-slate-50 text-slate-700'
                                        }
                                      >
                                        {doc.uploaded ? 'Uploaded' : doc.isRequired ? 'Missing' : 'Optional'}
                                      </Badge>
                                    </div>
                                    {doc.appliesWhen ? (
                                      <p className="mt-1 text-xs text-slate-500">{doc.appliesWhen}</p>
                                    ) : null}
                                    {doc.receivedAt ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Received {formatDate(doc.receivedAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                                {!(selectedDealWorkflow?.requiredDocuments || []).length ? (
                                  <p className="text-sm text-slate-500">No program docs defined yet.</p>
                                ) : null}
                              </CardContent>
                            </Card>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">Bank Submission Panel</CardTitle>
                                <CardDescription>
                                  {selectedDealWorkflow?.summary?.turnaroundHours || 48}h turnaround expectation
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {selectedDealWorkflow?.bankSummary?.countdown ? (
                                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                    {selectedDealWorkflow.bankSummary.countdown.overdue
                                      ? 'Turnaround overdue'
                                      : `Countdown: ${formatRemaining(
                                          Number(selectedDealWorkflow.bankSummary.countdown.remainingMs || 0),
                                        )} remaining`}
                                  </div>
                                ) : null}
                                {(selectedDealWorkflow?.bankOutcomes || []).map((bank: any) => (
                                  <div
                                    key={bank.bankCode}
                                    className="rounded-lg border border-slate-200 bg-white p-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-slate-900">{bank.bankName}</p>
                                      <Badge
                                        variant="outline"
                                        className={bankOutcomeClass(String(bank.status || 'pending'))}
                                      >
                                        {labelStage(String(bank.status || 'pending'))}
                                      </Badge>
                                    </div>
                                    {bank.submittedAt ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Submitted {formatDate(bank.submittedAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                                {!(selectedDealWorkflow?.bankOutcomes || []).length ? (
                                  <p className="text-sm text-slate-500">
                                    No bank outcomes captured for this workflow yet.
                                  </p>
                                ) : null}
                              </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-slate-50/50 shadow-none">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">Timeline</CardTitle>
                                <CardDescription>
                                  {dealTimelineQuery.isLoading
                                    ? 'Loading timeline'
                                    : `Deal #${selectedDeal.id}`}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {(dealTimelineQuery.data?.events || []).slice(0, 10).map((event: any) => (
                                  <div key={event.id} className="relative pl-6">
                                    <span className="absolute left-2 top-1 h-2 w-2 rounded-full bg-slate-500" />
                                    <span className="absolute left-[11px] top-4 h-[calc(100%-8px)] w-px bg-slate-200" />
                                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                                      <p className="text-sm font-medium text-slate-900">
                                        {event.eventType} | {event.fromStage || 'start'} to {event.toStage || 'n/a'}
                                      </p>
                                      <p className="text-xs text-slate-500">{formatDate(event.eventAt)}</p>
                                      {event.notes ? (
                                        <p className="mt-1 text-xs text-slate-600">{event.notes}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="developments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>National Developments Workspace</CardTitle>
                    <CardDescription>
                      Filter by province and city, then open brochure-grade development details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <select
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedProvince}
                        onChange={e => setSelectedProvince(e.target.value)}
                      >
                        <option value="all">All provinces</option>
                        {provinceOptions.map(province => (
                          <option key={province} value={province}>
                            {titleize(province)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedCity}
                        onChange={e => setSelectedCity(e.target.value)}
                      >
                        <option value="all">All cities</option>
                        {cityOptions.map(city => (
                          <option key={city} value={city}>
                            {titleize(city)}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search development name"
                          className="pl-9"
                        />
                      </div>
                      <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={partneredOnly}
                          onChange={e => setPartneredOnly(e.target.checked)}
                        />
                        Partnered only
                      </label>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
                  <Card className="h-fit">
                    <CardHeader className="space-y-1">
                      <CardTitle>Our Developments</CardTitle>
                      <CardDescription>
                        {filteredDevelopments.length} development
                        {filteredDevelopments.length === 1 ? '' : 's'} in current filter scope.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {filteredDevelopments.length === 0 ? (
                        <p className="text-sm text-slate-500">No developments match current filters.</p>
                      ) : (
                        <div className="grid gap-3">
                          {filteredDevelopments.map(dev => {
                            const selected = Number(dev.developmentId) === Number(selectedDevelopmentId);
                            const heroUrl = String(dev.imageUrl || '').trim();
                            return (
                              <button
                                key={dev.developmentId}
                                onClick={() => setSelectedDevelopmentId(Number(dev.developmentId))}
                                className={`overflow-hidden rounded-xl border text-left transition ${
                                  selected
                                    ? 'border-slate-900 shadow-md'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="relative h-24 w-full">
                                  {heroUrl ? (
                                    <img
                                      src={heroUrl}
                                      alt={String(dev.developmentName || 'Development')}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600" />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 to-transparent" />
                                  <div className="absolute bottom-2 left-3 right-3">
                                    <p className="text-sm font-semibold text-white">{dev.developmentName}</p>
                                    <p className="text-xs text-slate-200">
                                      {dev.city}, {dev.province}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3">
                                  <span className="text-xs text-slate-600">
                                    {formatMoney(dev.priceFrom)} - {formatMoney(dev.priceTo)}
                                  </span>
                                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                    {(dev.unitTypes || []).length} units
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {!selectedDevelopment ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>No development selected</CardTitle>
                      </CardHeader>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-2xl">{selectedDevelopment.developmentName}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {selectedDevelopment.suburb ? `${selectedDevelopment.suburb}, ` : ''}
                              {selectedDevelopment.city}, {selectedDevelopment.province}
                            </CardDescription>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                                Program:{' '}
                                {selectedDevelopment.workflowSummary?.workflowName || 'Referral Workflow'}
                              </Badge>
                              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                                {labelBankStrategy(selectedDevelopment.workflowSummary?.bankStrategy)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                const brochure =
                                  selectedDevelopmentDocuments.find(doc => doc.category === 'brochure') ||
                                  selectedDevelopmentDocuments[0];
                                if (!brochure) {
                                  toast.error('No brochure or document URL available for this development yet.');
                                  return;
                                }
                                openDocumentUrl(brochure.url, brochure.name);
                              }}
                            >
                              Download Brochure
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                if (!selectedDevelopmentDocuments.length) {
                                  toast.error('No development documents are currently available to export.');
                                  return;
                                }
                                const payload = selectedDevelopmentDocuments
                                  .map(doc => `${doc.name}: ${doc.url}`)
                                  .join('\n');
                                try {
                                  await navigator.clipboard.writeText(payload);
                                  toast.success('Development document pack copied to clipboard.');
                                } catch {
                                  toast.info('Unable to copy automatically. Open the Document Bank tab to download.');
                                }
                              }}
                            >
                              Export Development Pack
                            </Button>
                            <Button
                              onClick={() =>
                                openQuick(
                                  [selectedDevelopment.city, selectedDevelopment.province]
                                    .filter(Boolean)
                                    .join(', '),
                                  Number(selectedDevelopment.developmentId),
                                )
                              }
                            >
                              Qualify Client For This Development
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="overview" className="space-y-4">
                          <TabsList className="h-auto flex-wrap gap-2">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="units">Unit Types</TabsTrigger>
                            <TabsTrigger value="deals">Leads and Deals</TabsTrigger>
                            <TabsTrigger value="docs">Document Bank</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <InfoTile label="Price range" value={`${formatMoney(selectedDevelopment.priceFrom)} - ${formatMoney(selectedDevelopment.priceTo)}`} />
                              <InfoTile
                                label="Referral commission"
                                value={formatReferralCommissionSummary(selectedDevelopment)}
                              />
                              <InfoTile label="Workflow type" value={labelBankStrategy(selectedDevelopment.workflowSummary?.bankStrategy)} />
                              <InfoTile label="Required docs" value={String(selectedDevelopment.workflowSummary?.requiredDocumentCount || 0)} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <InfoTile label="Referral status" value={selectedDevelopment.isReferralEnabled ? 'Enabled' : 'Disabled'} />
                              <InfoTile label="Unit types" value={String((selectedDevelopment.unitTypes || []).length)} />
                            </div>
                            {selectedDevelopment.description ? <p className="text-sm text-slate-600">{selectedDevelopment.description}</p> : null}
                            {parseTagList(selectedDevelopment.amenities).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {parseTagList(selectedDevelopment.amenities).slice(0, 12).map((tag, idx) => (
                                  <Badge key={`${tag}-${idx}`} variant="secondary">{tag}</Badge>
                                ))}
                              </div>
                            ) : null}
                          </TabsContent>

                          <TabsContent value="units">
                            {selectedDevelopment.unitTypes?.length ? (
                              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {selectedDevelopment.unitTypes.map((unit: UnitTypeSummary, idx: number) => {
                                  const basePrice = unit.priceFrom ?? unit.priceTo ?? null;
                                  const repayment = basePrice && basePrice > 0 ? calculateMonthlyRepayment(basePrice, PRIME_RATE, BOND_TERM_YEARS) : null;
                                  const income = repayment !== null ? Math.ceil(repayment / 0.3) : null;
                                  return (
                                    <div key={`${unit.name}-${idx}`} className="overflow-hidden rounded-xl border border-slate-200">
                                      <div className="h-24 bg-slate-100">
                                        {selectedDevelopment.imageUrl ? (
                                          <img
                                            src={String(selectedDevelopment.imageUrl)}
                                            alt={unit.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : null}
                                      </div>
                                      <div className="space-y-2 p-4">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-slate-900">{unit.name}</p>
                                        <Badge
                                          variant="outline"
                                          className={
                                            unit.isActive
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : 'border-rose-200 bg-rose-50 text-rose-700'
                                          }
                                        >
                                          {unit.isActive ? 'Available' : 'Sold Out'}
                                        </Badge>
                                      </div>
                                      <p className="mt-1 text-sm text-slate-500">{[unit.bedrooms ? `${unit.bedrooms} bed` : null, unit.bathrooms ? `${unit.bathrooms} bath` : null, unit.unitSize ? `${unit.unitSize}m2` : null].filter(Boolean).join(' | ') || 'Unit details'}</p>
                                      <Separator className="my-3" />
                                      <div className="space-y-2 text-sm">
                                        <p className="flex items-center gap-2"><Home className="h-4 w-4 text-slate-500" />{formatMoney(unit.priceFrom)} - {formatMoney(unit.priceTo)}</p>
                                        <p className="flex items-center gap-2"><Banknote className="h-4 w-4 text-slate-500" />Est. repayment: {formatMoney(repayment)}</p>
                                        <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-500" />Qualifying income: {formatMoney(income)}</p>
                                      </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : <p className="text-sm text-slate-500">No unit types are currently available for this development.</p>}
                          </TabsContent>

                          <TabsContent value="deals">
                            <div className="space-y-2">
                              {dealsEnhanced.filter(deal => Number(deal.developmentId) === Number(selectedDevelopment.developmentId)).map(deal => (
                                <button key={deal.id} onClick={() => { setSelectedDealId(Number(deal.id)); setMode('deals'); }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left">
                                  <p className="text-sm font-semibold text-slate-900">{deal.buyerName}</p>
                                  <p className="text-xs text-slate-500">Stage: {labelStage(String(deal.currentStage))} | Next: {deal.nextAction}</p>
                                </button>
                              ))}
                              {dealsEnhanced.filter(deal => Number(deal.developmentId) === Number(selectedDevelopment.developmentId)).length === 0 ? (
                                <p className="text-sm text-slate-500">No deals linked to this development.</p>
                              ) : null}
                            </div>
                          </TabsContent>

                          <TabsContent value="docs">
                            <div className="space-y-2">
                              {selectedDevelopmentDocuments.map(doc => (
                                <div
                                  key={doc.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                    <p className="text-xs text-slate-500">
                                      {doc.category === 'brochure'
                                        ? 'Brochure'
                                        : doc.category === 'floor_plan'
                                          ? 'Floor Plan'
                                          : 'Video'}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openDocumentUrl(doc.url, doc.name)}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openDocumentUrl(doc.url, doc.name)}
                                    >
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {!selectedDevelopmentDocuments.length ? (
                                <p className="text-sm text-slate-500">
                                  No development documents are published yet.
                                </p>
                              ) : null}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="calendar" className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Viewings</CardTitle>
                      <CardDescription>Next operational appointments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(viewingsQuery.data || []).map((viewing: any) => (
                        <div key={viewing.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{viewing.buyerName}</p>
                          <p className="text-xs text-slate-500">{viewing.developmentName} | {formatDate(viewing.scheduledStartAt)}</p>
                        </div>
                      ))}
                      {(viewingsQuery.data || []).length === 0 ? <p className="text-sm text-slate-500">No viewings are currently scheduled.</p> : null}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Deadlines and Risk Queue</CardTitle>
                      <CardDescription>Prioritized active deals needing attention.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {dealsEnhanced.filter(deal => !deal.closed).sort((a, b) => Number(b.atRisk) - Number(a.atRisk)).map(deal => (
                        <button key={deal.id} onClick={() => { setSelectedDealId(Number(deal.id)); setMode('deals'); }} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{deal.buyerName}</p>
                            {deal.atRisk ? <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">At risk</Badge> : <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">In progress</Badge>}
                          </div>
                          <p className="text-xs text-slate-500">{deal.developmentName}</p>
                          <p className="mt-1 text-xs text-slate-600">Next: {deal.nextAction}</p>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Program Documents</CardTitle>
                      <CardDescription>
                        Workflow-linked documents grouped by developer program.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {programDocumentGroups.map(group => (
                        <div key={group.workflowName} className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{group.workflowName}</p>
                          <p className="text-xs text-slate-500">
                            {group.workflowType} | {group.requiredDocs} required docs
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {group.developments.slice(0, 2).join(', ')}
                            {group.developments.length > 2 ? ` +${group.developments.length - 2} more` : ''}
                          </p>
                        </div>
                      ))}
                      {programDocumentGroups.length === 0 ? (
                        <p className="text-sm text-slate-500">No program document groups available yet.</p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Development Documents</CardTitle>
                      <CardDescription>Open a development and access its document bank.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {filteredDevelopments.slice(0, 8).map(dev => {
                        const docs = buildDevelopmentDocumentBank(dev);
                        const firstDoc = docs[0] || null;
                        return (
                          <div
                            key={dev.developmentId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{dev.developmentName}</p>
                              <p className="text-xs text-slate-500">
                                {dev.city}, {dev.province}
                              </p>
                              <p className="text-xs text-slate-500">
                                {docs.length} document{docs.length === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDevelopmentId(Number(dev.developmentId));
                                  setMode('developments');
                                }}
                              >
                                Open
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!firstDoc}
                                onClick={() => {
                                  if (!firstDoc) return;
                                  openDocumentUrl(firstDoc.url, firstDoc.name);
                                }}
                              >
                                View Doc
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>General Forms</CardTitle>
                      <CardDescription>Reusable forms for qualification and submissions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        'Client Consent Form',
                        'POPIA Consent Form',
                        'NCA Form',
                        'Document Checklist',
                        'Submission Cover Sheet',
                      ].map(formName => (
                        <div
                          key={formName}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-medium text-slate-900">{formName}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.info(`${formName} download started.`)}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
          </section>
        </div>
      </div>

      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent
          side="right"
          className="top-24 bottom-4 h-auto w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border border-slate-200 shadow-2xl sm:right-4 sm:max-w-3xl"
        >
          <SheetHeader>
            <SheetTitle>New Client Quick Qualification</SheetTitle>
            <SheetDescription>Step {quickStep} of 3</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuickOpen(false);
                  setLocation('/referrer/developments');
                }}
              >
                Back to Live Developments
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickOpen(false)}>
                Close
              </Button>
            </div>

            {quickStep === 1 ? (
              <div className="space-y-3">
                <Input placeholder="Client full name" value={clientName} onChange={e => setClientName(e.target.value)} />
                <Input placeholder="Client email (optional)" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                <Input placeholder="Client phone (optional)" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                <Input placeholder="Preferred areas (comma-separated)" value={preferredAreasText} onChange={e => setPreferredAreasText(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setQuickOpen(false)}>Cancel</Button>
                  <Button onClick={() => setQuickStep(2)}>Next: Income</Button>
                </div>
              </div>
            ) : null}

            {quickStep === 2 ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="number" min={0} placeholder="Gross monthly income" value={grossIncome || ''} onChange={e => setGrossIncome(Number(e.target.value || 0))} />
                  <Input type="number" min={0} placeholder="Monthly expenses" value={monthlyExpenses || ''} onChange={e => setMonthlyExpenses(Number(e.target.value || 0))} />
                  <Input type="number" min={0} placeholder="Monthly debt repayments" value={monthlyDebt || ''} onChange={e => setMonthlyDebt(Number(e.target.value || 0))} />
                  <Input type="number" min={0} max={100} placeholder="Deposit %" value={depositPercent || ''} onChange={e => setDepositPercent(Number(e.target.value || 0))} />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setQuickStep(1)}>Back</Button>
                  <Button onClick={previewFromQuick} disabled={previewQuickMutation.isPending}>
                    {previewQuickMutation.isPending ? 'Running preview...' : 'Preview Results'}
                  </Button>
                </div>
              </div>
            ) : null}

            {quickStep === 3 ? (
              <div className="space-y-4">
                {canPreview ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">Estimated affordability range</p>
                      <p className="text-3xl font-semibold text-slate-900">{formatMoney(quickAffordabilityFloor)} - {formatMoney(quickAffordabilityCeiling)}</p>
                      <div className="mt-3 flex items-center gap-3"><Progress value={quickConfidenceScore} /><span className="text-xs text-slate-600">{quickConfidenceScore}% confidence</span></div>
                      <p className="mt-2 text-xs text-slate-600">{confidenceLabel(quickConfidenceScore)}</p>
                    </div>

                    <div className="space-y-2">
                      {quickContextDevelopment ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Development context
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {quickContextDevelopment.developmentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {quickContextDevelopment.city}, {quickContextDevelopment.province} | Price{' '}
                            {formatMoney(quickContextDevelopment.priceFrom)} -{' '}
                            {formatMoney(quickContextDevelopment.priceTo)}
                          </p>
                          {quickContextQualification ? (
                            <p className="mt-1 text-xs text-slate-700">
                              {quickContextQualification.qualifies
                                ? `Client qualifies for ${quickContextQualification.qualifyingUnits.length} unit type(s) in this development.`
                                : 'Client does not currently qualify for listed unit prices in this development.'}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="text-sm font-semibold text-slate-900">Top matched developments</p>
                      {quickMatches.map(match => {
                        const selected = Number(match.developmentId) === Number(quickTargetDevelopmentId);
                        return (
                          <button key={match.developmentId} onClick={() => setQuickTargetDevelopmentId(Number(match.developmentId))} className={`w-full rounded-xl border p-3 text-left ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">{match.developmentName}</p>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  selected
                                    ? 'border-white/20 bg-white/10 text-white'
                                    : quickMatchBucketClass(match.matchBucket)
                                }`}
                              >
                                {quickMatchBucketLabel(match.matchBucket)}
                              </span>
                            </div>
                            <p className={`text-xs ${selected ? 'text-slate-200' : 'text-slate-500'}`}>{match.city}, {match.province} | Entry from {formatMoney(match.entryPrice)}</p>
                            <p className={`mt-1 text-xs ${selected ? 'text-slate-200' : 'text-slate-600'}`}>{match.baseUnit ? `Client qualifies for ${match.baseUnit.bedrooms || '?'}-bed with ${formatMoney(match.buffer)} buffer.` : `Affordability buffer: ${formatMoney(match.buffer)}`}</p>
                            {Array.isArray(match.matchReasons) && match.matchReasons.length > 0 ? (
                              <p className={`mt-1 text-[11px] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                                {match.matchReasons[0]}
                              </p>
                            ) : null}
                          </button>
                        );
                      })}
                      {previewQuickMutation.isPending ? (
                        <p className="text-sm text-slate-500">Running qualification preview...</p>
                      ) : null}
                      {quickMatches.length === 0 && !previewQuickMutation.isPending ? <p className="text-sm text-slate-500">No direct matches found yet.</p> : null}
                    </div>
                  </>
                ) : <p className="text-sm text-slate-500">Complete required fields to generate a result.</p>}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setQuickStep(2)}>Back</Button>
                  <Button onClick={submitFromQuick} disabled={!canSubmitQuick}>{submitDealMutation.isPending ? 'Creating Deal...' : 'Create Deal'}</Button>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Milestone({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-sm font-medium text-slate-900">{value}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-[11px]"
        onClick={() => toast.info(`Calendar sync requested for ${label}.`)}
      >
        Add to calendar
      </Button>
    </div>
  );
}
