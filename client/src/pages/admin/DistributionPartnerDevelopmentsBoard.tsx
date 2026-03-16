import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

type BoardRow = {
  development: {
    id: number;
    name: string;
    suburb: string | null;
    city: string | null;
    province: string | null;
    updatedAt: string | null;
  };
  provider: {
    brandProfileId: number;
    brandName: string;
    providerType: 'platform_managed' | 'developer_managed';
  } | null;
  program: {
    id: number;
    isActive: boolean;
    isReferralEnabled: boolean;
    tierAccessPolicy: string | null;
    commissionModel?: string | null;
    defaultCommissionPercent?: number | string | null;
    defaultCommissionAmount?: number | null;
    primaryManagerUserId?: number | null;
  };
  setup: {
    setupState: 'not_in_program' | 'added_draft_setup' | 'config_required' | 'submit_ready_live';
    setupLabel: string;
    readyToGoLive: boolean;
    progressPercent: number;
    salesPackDocumentCount: number;
    submissionChecklistRequiredCount: number;
    items: Array<{ key: string; label: string; done: boolean; actor: string }>;
    missing: string[];
  };
};

type SetupFocusKey =
  | 'added'
  | 'commission'
  | 'tier_policy'
  | 'primary_manager'
  | 'sales_pack'
  | 'submission_checklist'
  | 'make_live'
  | null;

function laneForRow(row: BoardRow) {
  if (row.setup.setupState === 'submit_ready_live') return 'live';
  if (row.setup.setupState === 'added_draft_setup') return 'draft';
  return 'config';
}

function nextFocusForRow(row: BoardRow): SetupFocusKey {
  if (row.setup.setupState === 'submit_ready_live') return null;
  const missing = (row.setup.missing || []) as string[];
  if (missing.includes('added')) return 'added';
  if (missing.includes('commission')) return 'commission';
  if (missing.includes('tier_policy')) return 'tier_policy';
  if (missing.includes('primary_manager')) return 'primary_manager';
  if (missing.includes('sales_pack')) return 'sales_pack';
  if (missing.includes('submission_checklist')) return 'submission_checklist';
  if (row.setup.readyToGoLive) return 'make_live';
  return null;
}

function compactMissing(row: BoardRow) {
  return (row.setup.items || [])
    .filter(item => !item.done)
    .map(item => item.label)
    .slice(0, 3);
}

export function PartnerDevelopmentsBoard() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingOpenDevelopmentId, setPendingOpenDevelopmentId] = useState<number | null>(null);
  const [activeRow, setActiveRow] = useState<BoardRow | null>(null);
  const [setupFocusKey, setSetupFocusKey] = useState<SetupFocusKey>(null);

  const boardQuery = trpc.distribution.admin.listSetupBoard.useQuery(
    { search: search.trim() || undefined, limit: 200, includeUnpublished: false },
    { retry: false },
  );

  const helpRequestsQuery = trpc.distribution.admin.listAdminHelpRequests.useQuery(
    { limit: 50, includeResolved: false },
    { retry: false },
  );

  const rows = (boardQuery.data || []) as unknown as BoardRow[];

  const lanes = useMemo(() => {
    const draft: BoardRow[] = [];
    const config: BoardRow[] = [];
    const live: BoardRow[] = [];

    for (const row of rows) {
      const lane = laneForRow(row);
      if (lane === 'draft') draft.push(row);
      else if (lane === 'live') live.push(row);
      else config.push(row);
    }

    return { draft, config, live };
  }, [rows]);

  const openSetup = (row: BoardRow, focusKey?: SetupFocusKey) => {
    setActiveRow(row);
    setSetupFocusKey(typeof focusKey === 'undefined' ? nextFocusForRow(row) : focusKey);
    setSetupOpen(true);
  };

  const requestOpenSetupByDevelopmentId = (developmentId: number) => {
    if (!developmentId) return;
    // Clear search so the row is more likely to be in the board query results.
    if (search.trim()) setSearch('');
    setPendingOpenDevelopmentId(developmentId);
    boardQuery.refetch();
  };

  useEffect(() => {
    if (!pendingOpenDevelopmentId) return;
    // When the board rows update, try to satisfy any pending "open this development" request.
    // This keeps the Help Requests sheet simple and avoids deep-link routing for now.
    const row = rows.find(r => Number(r.development.id) === Number(pendingOpenDevelopmentId));
    if (!row) return;
    setHelpOpen(false);
    setPendingOpenDevelopmentId(null);
    openSetup(row);
  }, [pendingOpenDevelopmentId, rows]);

  useEffect(() => {
    if (!pendingOpenDevelopmentId) return;
    const handle = setTimeout(() => {
      setPendingOpenDevelopmentId(null);
      toast.error('Could not open setup for this request. Clear filters and try again.');
    }, 3000);
    return () => clearTimeout(handle);
  }, [pendingOpenDevelopmentId]);

  useEffect(() => {
    if (!setupOpen || !activeRow) return;
    // Keep the open sheet in sync with the latest board snapshot after mutations/refetches.
    const updated = rows.find(r => Number(r.development.id) === Number(activeRow.development.id));
    if (updated && updated !== activeRow) setActiveRow(updated);
  }, [setupOpen, activeRow, rows]);

  const closeSetup = () => {
    setSetupOpen(false);
    setActiveRow(null);
    setSetupFocusKey(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Partner Developments</CardTitle>
              <CardDescription>
                Add developments fast, finish setup with a checklist, then make them live.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setHelpOpen(true)}>
                Help requests
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[11px] text-white">
                  {(helpRequestsQuery.data || []).length}
                </span>
              </Button>
              <Button onClick={() => setAddOpen(true)}>Add to Network</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search development, city, province"
            className="max-w-md"
          />
          <Badge variant="outline">Draft: {lanes.draft.length}</Badge>
          <Badge variant="outline">Config: {lanes.config.length}</Badge>
          <Badge variant="outline">Live: {lanes.live.length}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Lane
          title="Draft Setup"
          hint="Added but not yet configured"
          rows={lanes.draft}
          onOpen={openSetup}
        />
        <Lane
          title="Config Required"
          hint="Needs action before going live"
          rows={lanes.config}
          onOpen={openSetup}
        />
        <Lane title="Live" hint="Visible to eligible referrers" rows={lanes.live} onOpen={openSetup} />
      </div>

      <SetupSheet
        open={setupOpen}
        row={activeRow}
        focusKey={setupFocusKey}
        onClose={closeSetup}
        onRefresh={() => boardQuery.refetch()}
      />
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => boardQuery.refetch()} />
      <HelpRequestsSheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpenSetup={requestOpenSetupByDevelopmentId}
        onChanged={() => utils.distribution.admin.listAdminHelpRequests.invalidate()}
      />
    </div>
  );
}

function Lane(props: {
  title: string;
  hint: string;
  rows: BoardRow[];
  onOpen: (row: BoardRow, focusKey?: SetupFocusKey) => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{props.title}</CardTitle>
            <CardDescription>{props.hint}</CardDescription>
          </div>
          <Badge variant="secondary">{props.rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          props.rows.map(row => (
            <DevCard
              key={row.development.id}
              row={row}
              onOpen={focusKey => props.onOpen(row, focusKey)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DevCard(props: { row: BoardRow; onOpen: (focusKey?: SetupFocusKey) => void }) {
  const row = props.row;
  const missing = compactMissing(row);
  const statusVariant =
    row.setup.setupState === 'submit_ready_live'
      ? 'default'
      : row.setup.readyToGoLive
        ? 'secondary'
        : 'outline';
  const nextFocus = nextFocusForRow(row);
  const nextLabel =
    nextFocus === 'commission'
      ? 'Commission'
      : nextFocus === 'tier_policy'
        ? 'Access policy'
        : nextFocus === 'primary_manager'
          ? 'Primary manager'
          : nextFocus === 'sales_pack'
            ? 'Sales pack'
            : nextFocus === 'submission_checklist'
              ? 'Submission checklist'
              : nextFocus === 'added'
                ? 'Fix scaffolding'
                : nextFocus === 'make_live'
                  ? 'Make live'
                  : null;

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
      onClick={() => props.onOpen(nextFocus)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{row.development.name}</p>
          <p className="truncate text-xs text-slate-500">
            {row.provider
              ? `${row.provider.brandName} | ${
                  row.provider.providerType === 'developer_managed' ? 'Developer-managed' : 'Platform-managed'
                }`
              : 'No provider'}
          </p>
        </div>
        <Badge variant={statusVariant as any} className="shrink-0">
          {row.setup.setupLabel}
        </Badge>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Setup progress</span>
          <span>{row.setup.progressPercent}%</span>
        </div>
        <Progress value={row.setup.progressPercent} />
      </div>

      {missing.length > 0 && (
        <div className="mt-3 text-xs text-slate-600">
          <span className="font-medium">Missing:</span> {missing.join(', ')}
        </div>
      )}

      {nextLabel && (
        <div className="mt-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Next:</span> {nextLabel}
        </div>
      )}
    </button>
  );
}

function SetupSheet(props: {
  open: boolean;
  row: BoardRow | null;
  focusKey: SetupFocusKey;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const row = props.row;
  const programId = row?.program.id || 0;
  const developmentId = row?.development.id || 0;
  const focusClass = (key: SetupFocusKey) =>
    props.focusKey === key ? 'ring-2 ring-sky-200 border-sky-300' : '';

  const addedRef = useRef<HTMLDivElement | null>(null);
  const commissionRef = useRef<HTMLDivElement | null>(null);
  const tierPolicyRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<HTMLDivElement | null>(null);
  const salesPackRef = useRef<HTMLDivElement | null>(null);
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!props.open || !props.focusKey) return;
    const handle = window.setTimeout(() => {
      const target =
        props.focusKey === 'added'
          ? addedRef.current
          : props.focusKey === 'commission'
            ? commissionRef.current
            : props.focusKey === 'tier_policy'
              ? tierPolicyRef.current
              : props.focusKey === 'primary_manager'
                ? managerRef.current
                : props.focusKey === 'sales_pack'
                  ? salesPackRef.current
                  : props.focusKey === 'submission_checklist'
                    ? checklistRef.current
                    : props.focusKey === 'make_live'
                      ? actionsRef.current
                      : null;
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [props.open, props.focusKey, row?.development.id]);

  const developmentDocsQuery = trpc.distribution.admin.getDevelopmentDocuments.useQuery(
    { developmentId },
    { enabled: props.open && developmentId > 0, retry: false },
  );

  const checklistQuery = trpc.distribution.admin.listSubmissionChecklist.useQuery(
    { programId },
    { enabled: props.open && programId > 0, retry: false },
  );

  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [docCategory, setDocCategory] = useState<'brochures' | 'floorPlans' | 'videos'>('brochures');
  const [docUrl, setDocUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [commissionType, setCommissionType] = useState<'flat' | 'percentage'>('flat');
  const [commissionValue, setCommissionValue] = useState('');
  const [managerUserId, setManagerUserId] = useState<number | null>(null);
  const [tierAccessPolicy, setTierAccessPolicy] = useState<'open' | 'restricted' | 'invite_only'>('restricted');

  useEffect(() => {
    if (!props.open || !row) return;
    const next = row.program.tierAccessPolicy;
    if (next === 'open' || next === 'restricted' || next === 'invite_only') {
      setTierAccessPolicy(next);
    } else {
      setTierAccessPolicy('restricted');
    }
  }, [props.open, row?.program.tierAccessPolicy]);

  useEffect(() => {
    if (!props.open || !row) return;
    // Prefill from current program defaults to avoid retyping or accidental overwrites.
    const percent = Number((row.program as any).defaultCommissionPercent || 0);
    const amount = Number((row.program as any).defaultCommissionAmount || 0);
    const model = String((row.program as any).commissionModel || '');

    if (Number.isFinite(percent) && percent > 0 && (model.includes('percentage') || !model)) {
      setCommissionType('percentage');
      setCommissionValue(String(percent));
      return;
    }

    if (Number.isFinite(amount) && amount > 0 && model.includes('amount')) {
      setCommissionType('flat');
      setCommissionValue(String(amount));
      return;
    }

    // Fallbacks for legacy/mixed models.
    if (Number.isFinite(percent) && percent > 0) {
      setCommissionType('percentage');
      setCommissionValue(String(percent));
      return;
    }
    if (Number.isFinite(amount) && amount > 0) {
      setCommissionType('flat');
      setCommissionValue(String(amount));
      return;
    }

    setCommissionType('flat');
    setCommissionValue('');
  }, [props.open, row?.development.id]);

  useEffect(() => {
    if (!props.open || !row) return;
    const currentPrimary = (row.program.primaryManagerUserId ?? null) as number | null;
    setManagerUserId(currentPrimary);
  }, [props.open, row?.development.id, row?.program.primaryManagerUserId]);

  const setDevelopmentDocumentsMutation = trpc.distribution.admin.setDevelopmentDocuments.useMutation({
    onSuccess: () => {
      toast.success('Sales pack updated');
      setDocUrl('');
      setDocName('');
      developmentDocsQuery.refetch();
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to update sales pack'),
  });

  const upsertChecklistMutation = trpc.distribution.admin.upsertSubmissionChecklistItem.useMutation({
    onSuccess: () => {
      toast.success('Checklist updated');
      setNewChecklistLabel('');
      checklistQuery.refetch();
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to update checklist'),
  });

  const deleteChecklistMutation = trpc.distribution.admin.deleteSubmissionChecklistItem.useMutation({
    onSuccess: () => {
      toast.success('Checklist item removed');
      checklistQuery.refetch();
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to delete checklist item'),
  });

  const makeLiveMutation = trpc.distribution.admin.makeDevelopmentLive.useMutation({
    onSuccess: () => {
      toast.success('Development is live');
      props.onRefresh();
      props.onClose();
    },
    onError: err => toast.error(err.message || 'Unable to make live'),
  });

  const managerCandidatesQuery = trpc.distribution.admin.listManagerCandidates.useQuery(
    { limit: 200 },
    { enabled: props.open, retry: false },
  );

  const assignManagerMutation = trpc.distribution.admin.assignManagerToDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Manager assigned');
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to assign manager'),
  });

  const setCommissionMutation = trpc.distribution.admin.setCommission.useMutation({
    onSuccess: () => {
      toast.success('Commission saved');
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to save commission'),
  });

  const takeOfflineMutation = trpc.distribution.admin.takeDevelopmentOffline.useMutation({
    onSuccess: () => {
      toast.success('Development taken offline');
      props.onRefresh();
      props.onClose();
    },
    onError: err => toast.error(err.message || 'Unable to take offline'),
  });

  const ensureScaffoldingMutation = trpc.distribution.admin.ensureDistributionScaffolding.useMutation({
    onSuccess: () => {
      toast.success('Scaffolding backfilled');
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to backfill scaffolding'),
  });

  const setTierAccessPolicyMutation = trpc.distribution.admin.setTierAccessPolicy.useMutation({
    onSuccess: () => {
      toast.success('Access policy saved');
      props.onRefresh();
    },
    onError: err => toast.error(err.message || 'Unable to save access policy'),
  });

  const appendSalesPackDoc = () => {
    const url = docUrl.trim();
    if (!url) {
      toast.error('Add a document URL.');
      return;
    }

    const current = developmentDocsQuery.data || ({} as any);
    const nextList = [...((current as any)[docCategory] || [])].map((item: any) => ({
      url: String(item?.url || item || '').trim(),
      name: item?.name ? String(item.name) : null,
    }));
    nextList.push({ url, name: docName.trim() || null });

    setDevelopmentDocumentsMutation.mutate({
      developmentId,
      [docCategory]: nextList,
    } as any);
  };

  return (
    <Sheet open={props.open} onOpenChange={open => (!open ? props.onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{row?.development.name || 'Development'}</SheetTitle>
          <SheetDescription>
            Status: <span className="font-medium">{row?.setup.setupLabel || 'Unknown'}</span>
          </SheetDescription>
        </SheetHeader>

        {!row ? (
          <div className="py-6 text-sm text-muted-foreground">No development selected.</div>
        ) : (
          <div className="space-y-4 py-4">
            {(row.setup.missing || []).includes('added') && (
              <div
                ref={addedRef}
                className={`rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 ${focusClass('added')}`}
              >
                <p className="text-sm font-medium text-amber-900">Fix setup scaffolding</p>
                <p className="text-xs text-amber-800">
                  This development has a program row but is missing canonical access rows (partnership/access).
                </p>
                <Button
                  variant="outline"
                  disabled={ensureScaffoldingMutation.isPending}
                  onClick={() => ensureScaffoldingMutation.mutate({ developmentId })}
                >
                  Backfill access rows
                </Button>
              </div>
            )}

            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Setup Progress</span>
                <span className="text-muted-foreground">{row.setup.progressPercent}%</span>
              </div>
              <Progress value={row.setup.progressPercent} />
              <div className="mt-3 space-y-1 text-sm">
                {(row.setup.items || []).map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className={item.done ? 'text-slate-900' : 'text-slate-700'}>{item.label}</span>
                    <Badge variant={item.done ? 'default' : 'outline'}>{item.done ? 'Done' : 'Missing'}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={commissionRef}
              className={`rounded-lg border p-3 space-y-3 ${focusClass('commission')}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Commission</p>
                <Badge variant="outline">Program #{row.program.id}</Badge>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={commissionType}
                  onChange={e => setCommissionType(e.target.value as any)}
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </select>
                <Input
                  value={commissionValue}
                  onChange={e => setCommissionValue(e.target.value)}
                  placeholder={commissionType === 'percentage' ? 'e.g. 3.5' : 'e.g. 25000'}
                  className="max-w-xs"
                />
                <Button
                  disabled={
                    !commissionValue.trim() ||
                    setCommissionMutation.isPending ||
                    !Number.isFinite(Number(commissionValue)) ||
                    Number(commissionValue) <= 0
                  }
                  onClick={() =>
                    setCommissionMutation.mutate({
                      developmentId,
                      commissionType,
                      commissionValue: Number(commissionValue),
                    })
                  }
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this lightweight in v1. You can refine later.
              </p>
            </div>

            <div
              ref={tierPolicyRef}
              className={`rounded-lg border p-3 space-y-3 ${focusClass('tier_policy')}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Access Policy</p>
                <Badge variant="outline">Required</Badge>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-auto"
                  value={tierAccessPolicy}
                  onChange={e => setTierAccessPolicy(e.target.value as any)}
                >
                  <option value="restricted">Restricted</option>
                  <option value="open">Open</option>
                  <option value="invite_only">Invite only</option>
                </select>
                <Button
                  variant="outline"
                  disabled={setTierAccessPolicyMutation.isPending}
                  onClick={() =>
                    setTierAccessPolicyMutation.mutate({
                      developmentId,
                      tierAccessPolicy,
                    })
                  }
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Controls which referrers can see this development once it is live (access rules still apply).
              </p>
            </div>

            <div
              ref={managerRef}
              className={`rounded-lg border p-3 space-y-3 ${focusClass('primary_manager')}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Primary Manager</p>
                <Badge variant="outline">Required</Badge>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={managerUserId ? String(managerUserId) : ''}
                  onChange={e => setManagerUserId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select manager</option>
                  {(managerCandidatesQuery.data || []).map((m: any) => (
                    <option key={m.userId} value={String(m.userId)}>
                      {m.displayName} ({m.email})
                    </option>
                  ))}
                </select>
                <Button
                  disabled={
                    !managerUserId ||
                    assignManagerMutation.isPending ||
                    (managerUserId && Number(managerUserId) === Number(row.program.primaryManagerUserId || 0))
                  }
                  onClick={() =>
                    assignManagerMutation.mutate({
                      programId,
                      managerUserId: Number(managerUserId),
                      isPrimary: true,
                      isActive: true,
                      workloadCapacity: 0,
                    })
                  }
                >
                  {managerUserId && Number(managerUserId) === Number(row.program.primaryManagerUserId || 0)
                    ? 'Assigned'
                    : 'Assign'}
                </Button>
              </div>
            </div>

            <div
              ref={salesPackRef}
              className={`rounded-lg border p-3 space-y-3 ${focusClass('sales_pack')}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Sales Pack</p>
                <Badge variant="outline">Docs: {row.setup.salesPackDocumentCount}</Badge>
              </div>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                    value={docCategory}
                    onChange={e => setDocCategory(e.target.value as any)}
                  >
                    <option value="brochures">Brochure</option>
                    <option value="floorPlans">Floor plan</option>
                    <option value="videos">Video</option>
                  </select>
                  <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Optional name" />
                </div>
                <div className="flex gap-2">
                  <Input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://..." />
                  <Button
                    disabled={!docUrl.trim() || setDevelopmentDocumentsMutation.isPending}
                    onClick={appendSalesPackDoc}
                  >
                    Upload
                  </Button>
                </div>
                <div className="space-y-1">
                  {developmentDocsQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading sales pack...</p>
                  )}
                  {!developmentDocsQuery.isLoading && (
                    <p className="text-xs text-muted-foreground">
                      Minimum to go live: at least 1 brochure, floor plan, or video.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              ref={checklistRef}
              className={`rounded-lg border p-3 space-y-3 ${focusClass('submission_checklist')}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Submission Requirements</p>
                <Badge variant="outline">
                  Required: {row.setup.submissionChecklistRequiredCount}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newChecklistLabel}
                    onChange={e => setNewChecklistLabel(e.target.value)}
                    placeholder="Add required document (e.g. ID Document)"
                  />
                  <Button
                    disabled={!newChecklistLabel.trim() || upsertChecklistMutation.isPending}
                    onClick={() =>
                      upsertChecklistMutation.mutate({
                        programId,
                        documentLabel: newChecklistLabel.trim(),
                        isRequired: true,
                        displayOrder: 0,
                      })
                    }
                  >
                    Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {(checklistQuery.data?.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                      <span>{item.documentLabel}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteChecklistMutation.isPending}
                        onClick={() => deleteChecklistMutation.mutate({ id: Number(item.id) })}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {checklistQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Loading checklist...</p>
                  )}
                </div>
              </div>
            </div>

            <div ref={actionsRef} className={`flex flex-wrap gap-2 ${focusClass('make_live')}`}>
              {row.setup.setupState === 'submit_ready_live' ? (
                <Button
                  variant="outline"
                  disabled={takeOfflineMutation.isPending}
                  onClick={() => takeOfflineMutation.mutate({ developmentId })}
                >
                  Take Offline
                </Button>
              ) : (
                <Button
                  disabled={!row.setup.readyToGoLive || makeLiveMutation.isPending}
                  onClick={() => makeLiveMutation.mutate({ developmentId })}
                >
                  Make Live
                </Button>
              )}
              <Button variant="outline" onClick={props.onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function HelpRequestsSheet(props: {
  open: boolean;
  onClose: () => void;
  onOpenSetup: (developmentId: number) => void;
  onChanged: () => void;
}) {
  const helpRequestsQuery = trpc.distribution.admin.listAdminHelpRequests.useQuery(
    { limit: 100, includeResolved: true },
    { enabled: props.open, retry: false },
  );

  const resolveMutation = trpc.distribution.admin.resolveAdminHelpRequest.useMutation({
    onSuccess: () => {
      toast.success('Marked as resolved');
      helpRequestsQuery.refetch();
      props.onChanged();
    },
    onError: err => toast.error(err.message || 'Unable to resolve'),
  });

  return (
    <Sheet open={props.open} onOpenChange={open => (!open ? props.onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Admin Help Requests</SheetTitle>
          <SheetDescription>Requests created by developers when they hit admin-only blockers.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 py-4">
          {helpRequestsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading help requests...</p>
          )}

          {!helpRequestsQuery.isLoading && (helpRequestsQuery.data || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No requests right now.</p>
          )}

          {(helpRequestsQuery.data || []).map((row: any) => (
            <div key={row.id} className="rounded-lg border bg-white p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {row.developmentName || (row.targetId ? `Development #${row.targetId}` : 'Development')}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    From: {row.actorName || 'Developer'} {row.actorEmail ? `(${row.actorEmail})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {row.resolvedAt ? (
                    <Badge variant="secondary">Resolved</Badge>
                  ) : (
                    <Badge variant="outline">Open</Badge>
                  )}
                  <Badge variant="outline">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Recent'}
                  </Badge>
                </div>
              </div>
              {row.missingKeys?.length ? (
                <p className="text-xs text-slate-600">
                  Missing: <span className="font-medium">{row.missingKeys.join(', ')}</span>
                </p>
              ) : null}
              {row.message ? <p className="text-sm text-slate-800">{row.message}</p> : null}
              {row.targetId ? (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => props.onOpenSetup(Number(row.targetId))}>
                      Open setup
                    </Button>
                    {!row.resolvedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate({ requestId: Number(row.id) })}
                      >
                        Mark resolved
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AddModal(props: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [devSearch, setDevSearch] = useState('');
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [commissionType, setCommissionType] = useState<'flat' | 'percentage'>('flat');
  const [commissionValue, setCommissionValue] = useState('');
  const [managerUserId, setManagerUserId] = useState<number | null>(null);

  const catalogQuery = trpc.distribution.admin.listDevelopmentCatalog.useQuery(
    {
      search: devSearch.trim() || undefined,
      includeUnpublished: false,
      onlyBrandProfileLinked: true,
      limit: 50,
    },
    { enabled: props.open, retry: false },
  );

  const managerCandidatesQuery = trpc.distribution.admin.listManagerCandidates.useQuery(
    { limit: 200 },
    { enabled: props.open, retry: false },
  );

  const addMutation = trpc.distribution.admin.addDevelopmentToDistribution.useMutation({
    onSuccess: () => {
      toast.success('Added to network');
      props.onCreated();
      props.onClose();
      setSelectedDevelopmentId(null);
      setCommissionValue('');
      setManagerUserId(null);
    },
    onError: err => toast.error(err.message || 'Unable to add development'),
  });

  const candidates = (catalogQuery.data || []).filter((row: any) => !row.programId);
  const commissionNumber = Number(commissionValue || 0);

  const canSubmit =
    !!selectedDevelopmentId && Number.isFinite(commissionNumber) && commissionNumber > 0 && !addMutation.isPending;

  if (!props.open) return null;

  return (
    <Sheet open={props.open} onOpenChange={open => (!open ? props.onClose() : null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Add to Distribution Network</SheetTitle>
          <SheetDescription>Under 60 seconds: pick development, set commission, optional manager.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Development</p>
            <Input
              value={devSearch}
              onChange={e => setDevSearch(e.target.value)}
              placeholder="Search developments..."
            />
            <div className="max-h-56 overflow-auto rounded border bg-white">
              {candidates.map((row: any) => (
                <button
                  key={row.developmentId}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    Number(selectedDevelopmentId) === Number(row.developmentId) ? 'bg-slate-100' : ''
                  }`}
                  onClick={() => setSelectedDevelopmentId(Number(row.developmentId))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.developmentName}</span>
                    <Badge variant="outline">{row.city || row.province || 'Location'}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Provider: {row.brandProfileName || 'Brand-linked'}
                  </div>
                </button>
              ))}
              {catalogQuery.isLoading && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
              )}
              {!catalogQuery.isLoading && candidates.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No addable developments found (must be brand-linked and not already in the network).
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Default Commission</p>
            <div className="flex gap-2">
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={commissionType}
                onChange={e => setCommissionType(e.target.value as any)}
              >
                <option value="flat">Flat</option>
                <option value="percentage">Percentage</option>
              </select>
              <Input
                value={commissionValue}
                onChange={e => setCommissionValue(e.target.value)}
                placeholder={commissionType === 'percentage' ? 'e.g. 3.5' : 'e.g. 25000'}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is the referrer commission baseline. You can refine it later.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Primary Manager (Optional)</p>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={managerUserId ? String(managerUserId) : ''}
              onChange={e => setManagerUserId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No manager yet</option>
              {(managerCandidatesQuery.data || []).map((m: any) => (
                <option key={m.userId} value={String(m.userId)}>
                  {m.displayName} ({m.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              disabled={!canSubmit}
              onClick={() =>
                addMutation.mutate({
                  developmentId: Number(selectedDevelopmentId),
                  commission: {
                    type: commissionType,
                    value: Number(commissionValue || 0),
                    basis: commissionType === 'percentage' ? 'sale_price' : null,
                  },
                  tierAccessPolicy: 'restricted',
                  primaryManagerUserId: managerUserId || undefined,
                })
              }
            >
              Add
            </Button>
            <Button variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
