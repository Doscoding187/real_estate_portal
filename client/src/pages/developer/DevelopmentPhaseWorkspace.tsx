import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus, Send } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-ZA');
}

function phaseStatusLabel(status: string) {
  switch (status) {
    case 'selling':
      return 'Released';
    case 'pre_launch':
      return 'Pre-launch';
    case 'sold_out':
      return 'Sold out';
    case 'completed':
      return 'Completed';
    default:
      return 'Planned';
  }
}

function PhaseWorkspaceLoading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading phase inventory">
      <span className="sr-only">Loading phase inventory</span>
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
      <div className="h-52 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

export default function DevelopmentPhaseWorkspace() {
  const [, params] = useRoute('/developer/developments/:developmentId/phases');
  const [, setLocation] = useLocation();
  const developmentId = Number(params?.developmentId);
  const hasValidDevelopmentId = Number.isSafeInteger(developmentId) && developmentId > 0;
  const workspaceQuery = trpc.developer.getPhaseReleaseWorkspace.useQuery(
    { developmentId },
    { enabled: hasValidDevelopmentId, retry: false, refetchOnWindowFocus: false },
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [phaseName, setPhaseName] = useState('');
  const [phaseNumber, setPhaseNumber] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [selectedUnitTypeIds, setSelectedUnitTypeIds] = useState<string[]>([]);
  const [releasingPhaseId, setReleasingPhaseId] = useState<number | null>(null);

  const nextPhaseNumber = useMemo(() => {
    const phaseNumbers = workspaceQuery.data?.phases.map(phase => Number(phase.phaseNumber)) ?? [];
    return Math.max(0, ...phaseNumbers) + 1;
  }, [workspaceQuery.data?.phases]);

  const preparePhaseMutation = trpc.developer.prepareDevelopmentPhase.useMutation({
    onSuccess: async () => {
      toast.success('Planned phase prepared. Its inventory is hidden until release.');
      setIsPreparing(false);
      setPhaseName('');
      setPhaseNumber('');
      setPhaseDescription('');
      setLaunchDate('');
      setCompletionDate('');
      setSelectedUnitTypeIds([]);
      await workspaceQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Could not prepare the phase.'),
  });

  const releasePhaseMutation = trpc.developer.releaseDevelopmentPhase.useMutation({
    onSuccess: async result => {
      toast.success(`Phase ${result.phaseId} released. The action was recorded.`);
      setReleasingPhaseId(null);
      await workspaceQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Could not release the phase.'),
  });

  if (!hasValidDevelopmentId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Development not found</h1>
          <p className="mt-2 text-sm text-slate-600">Choose a development to manage its phases.</p>
          <Button className="mt-5" onClick={() => setLocation('/developer/developments')}>
            Back to developments
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (workspaceQuery.isLoading) return <PhaseWorkspaceLoading />;
  if (workspaceQuery.error?.data?.code === 'NOT_FOUND') {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Development not found</h1>
          <p className="text-sm text-slate-600">This development is unavailable in your workspace.</p>
          <Link href="/developer/developments">Back to developments</Link>
        </CardContent>
      </Card>
    );
  }
  if (workspaceQuery.error || !workspaceQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Unable to load phase inventory</h1>
          <p className="text-sm text-slate-600">No phase or inventory data was changed.</p>
          <Button onClick={() => workspaceQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const workspace = workspaceQuery.data;
  const phaseToRelease = workspace.phases.find(phase => phase.id === releasingPhaseId) ?? null;
  const eligibleUnitTypes = workspace.unassignedUnitTypes.filter(unit => unit.eligibleForPhase);
  const availableToAssign = new Set(eligibleUnitTypes.map(unit => unit.id));
  const canSubmitPreparation =
    phaseName.trim().length > 0 &&
    Number.isSafeInteger(Number(phaseNumber)) &&
    Number(phaseNumber) > 0 &&
    selectedUnitTypeIds.length > 0 &&
    selectedUnitTypeIds.every(id => availableToAssign.has(id));

  const toggleUnitType = (unitTypeId: string) => {
    setSelectedUnitTypeIds(current =>
      current.includes(unitTypeId)
        ? current.filter(id => id !== unitTypeId)
        : [...current, unitTypeId],
    );
  };

  const submitPreparation = () => {
    if (!canSubmitPreparation) return;
    preparePhaseMutation.mutate({
      developmentId,
      name: phaseName.trim(),
      phaseNumber: Number(phaseNumber),
      description: phaseDescription.trim() || null,
      launchDate: launchDate || null,
      completionDate: completionDate || null,
      unitTypeIds: selectedUnitTypeIds,
    });
  };

  return (
    <div className="mx-auto flex min-w-0 max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/developer/developments/${developmentId}`}
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {workspace.development.name}
          </Link>
          <p className="mt-3 text-sm font-medium text-slate-600">Phase inventory</p>
          <h1 className="text-3xl font-bold text-slate-950">Prepare and release phases</h1>
        </div>
        <Button
          onClick={() => {
            setPhaseNumber(String(nextPhaseNumber));
            setIsPreparing(true);
          }}
          disabled={eligibleUnitTypes.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Prepare phase
        </Button>
      </header>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{workspace.development.name}</CardTitle>
            <CardDescription className="mt-1">
              Released phases are filtered into public and partner inventory only while this parent
              development remains publicly eligible.
            </CardDescription>
          </div>
          <Badge
            className={
              workspace.development.parentPublicEligible
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }
          >
            {workspace.development.parentPublicEligible ? 'Publicly eligible' : 'Private or not ready'}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">Available across public inventory</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {workspace.marketableInventory.availableUnits}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Includes development-level inventory and released phases only.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Phase assignment rule</p>
            <p className="mt-1 text-sm text-slate-600">
              Assign whole unit types. Inventory counts stay unchanged, and planned phase inventory
              stays hidden from buyers and partners until release.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="phases-heading">
        <div>
          <h2 id="phases-heading" className="text-xl font-semibold text-slate-950">
            Phases
          </h2>
          <p className="text-sm text-slate-600">
            Counts come from assigned unit types. Unclassified remainder is not reported as sold.
          </p>
        </div>
        {workspace.phases.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-medium text-slate-900">No phases prepared</p>
              <p className="mt-1 text-sm text-slate-600">
                Assign whole, fully available unit types to create the first planned phase.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workspace.phases.map(phase => (
              <Card key={phase.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>
                        Phase {phase.phaseNumber}: {phase.name}
                      </CardTitle>
                      <Badge
                        className={
                          phase.status === 'selling'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-slate-100 text-slate-700'
                        }
                      >
                        {phaseStatusLabel(phase.status)}
                      </Badge>
                    </div>
                    {phase.description ? (
                      <CardDescription className="mt-1">{phase.description}</CardDescription>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {phase.launchDate ? `Launch ${formatDate(phase.launchDate)}` : 'Launch date not set'}
                      {phase.completionDate ? ` · Completion ${formatDate(phase.completionDate)}` : ''}
                    </p>
                  </div>
                  {phase.isReleaseable ? (
                    <Button onClick={() => setReleasingPhaseId(phase.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Release phase
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Unit types</p>
                      <p className="text-lg font-semibold">{phase.inventory.unitTypeCount}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Total units</p>
                      <p className="text-lg font-semibold">{phase.inventory.totalUnits}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Reserved units</p>
                      <p className="text-lg font-semibold">{phase.inventory.reservedUnits}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {phase.status === 'selling' && workspace.development.parentPublicEligible
                          ? 'Available to market'
                          : 'Available, not yet marketed'}
                      </p>
                      <p className="text-lg font-semibold">
                        {phase.status === 'selling' && workspace.development.parentPublicEligible
                          ? phase.marketAvailableUnits
                          : phase.inventory.availableUnits}
                      </p>
                    </div>
                  </div>

                  {phase.unitTypes.length > 0 ? (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {phase.unitTypes.map(unit => (
                        <li key={unit.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                          <span className="font-medium text-slate-900">{unit.name}</span>
                          <span className="text-slate-600">
                            {unit.availableUnits} available · {unit.reservedUnits} reserved ·{' '}
                            {unit.unclassifiedRemainderUnits} unclassified
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      No active unit types are assigned to this phase yet.
                    </p>
                  )}

                  {phase.status === 'selling' ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        {phase.releasedBy
                          ? `Released by ${phase.releasedBy}${phase.releasedAt ? ` on ${formatDate(phase.releasedAt)}` : ''}.`
                          : 'Released through the phase release workflow.'}
                      </span>
                      {!workspace.development.parentPublicEligible ? (
                        <span className="text-amber-800">
                          The parent development is currently private, so this phase is not in market.
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {phase.releaseBlockers.length > 0 ? (
                    <ul className="space-y-1 text-sm text-amber-800" aria-label="Release requirements">
                      {phase.releaseBlockers.map(blocker => (
                        <li key={blocker}>• {blocker}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="unassigned-inventory-heading">
        <div>
          <h2 id="unassigned-inventory-heading" className="text-xl font-semibold text-slate-950">
            Development-level inventory
          </h2>
          <p className="text-sm text-slate-600">
            Unassigned types keep the development’s existing publication behavior. Select fully
            available types when preparing a planned phase.
          </p>
        </div>
        {workspace.unassignedUnitTypes.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-600">
              All unit types are assigned to a phase.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {workspace.unassignedUnitTypes.map(unit => (
                <div key={unit.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{unit.name}</p>
                    <p className="text-slate-600">
                      {unit.availableUnits} available · {unit.reservedUnits} reserved ·{' '}
                      {unit.unclassifiedRemainderUnits} unclassified
                    </p>
                  </div>
                  {unit.eligibleForPhase ? (
                    <Badge className="border-blue-200 bg-blue-50 text-blue-800">
                      {unit.availableUnits} can be assigned
                    </Badge>
                  ) : (
                    <span className="max-w-md text-xs text-amber-800">
                      {unit.assignmentBlockReason}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog open={isPreparing} onOpenChange={setIsPreparing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prepare a planned phase</DialogTitle>
            <DialogDescription>
              This assigns whole unit types to a private planned phase. Their counts will not change,
              and they will stay out of public and partner inventory until you release the phase.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Phase name
                <Input value={phaseName} maxLength={255} onChange={event => setPhaseName(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Phase number
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={phaseNumber}
                  onChange={event => setPhaseNumber(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Launch date
                <Input type="date" value={launchDate} onChange={event => setLaunchDate(event.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Completion date
                <Input
                  type="date"
                  value={completionDate}
                  onChange={event => setCompletionDate(event.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Description
              <Textarea
                value={phaseDescription}
                maxLength={2000}
                onChange={event => setPhaseDescription(event.target.value)}
                rows={3}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-900">Inventory to assign</legend>
              {eligibleUnitTypes.length === 0 ? (
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  There is no fully available unassigned inventory to place in a planned phase.
                </p>
              ) : (
                eligibleUnitTypes.map(unit => (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={selectedUnitTypeIds.includes(unit.id)}
                      onChange={() => toggleUnitType(unit.id)}
                    />
                    <span>
                      <span className="block font-medium text-slate-900">{unit.name}</span>
                      <span className="block text-slate-600">
                        {unit.availableUnits} available of {unit.totalUnits}; all units move together.
                      </span>
                    </span>
                  </label>
                ))
              )}
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreparing(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitPreparation}
              disabled={!canSubmitPreparation || preparePhaseMutation.isPending}
            >
              {preparePhaseMutation.isPending ? 'Preparing…' : 'Save planned phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={releasingPhaseId !== null}
        onOpenChange={open => {
          if (!open) setReleasingPhaseId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release this phase?</DialogTitle>
            <DialogDescription>
              {phaseToRelease
                ? `Phase ${phaseToRelease.phaseNumber}: ${phaseToRelease.name} and its currently available inventory will become visible to public buyers and distribution partners.`
                : 'This phase and its available inventory will become visible to public buyers and distribution partners.'}
              {' '}No inventory quantities will change. Your account and the released inventory snapshot will be recorded.
            </DialogDescription>
          </DialogHeader>
          {phaseToRelease ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                {phaseToRelease.inventory.availableUnits} available across{' '}
                {phaseToRelease.inventory.unitTypeCount} unit types
              </p>
              <p className="mt-1 text-slate-600">
                {phaseToRelease.inventory.reservedUnits} reserved ·{' '}
                {phaseToRelease.inventory.unclassifiedRemainderUnits} unclassified
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleasingPhaseId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!phaseToRelease) return;
                releasePhaseMutation.mutate({ developmentId, phaseId: phaseToRelease.id });
              }}
              disabled={!phaseToRelease?.isReleaseable || releasePhaseMutation.isPending}
            >
              {releasePhaseMutation.isPending ? 'Releasing…' : 'Release phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
