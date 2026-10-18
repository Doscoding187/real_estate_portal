import { useState } from 'react';
import { Pencil, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';

type PhasePlanForm = {
  id: number | null;
  expectedPlan: PhasePlanSnapshot | null;
  name: string;
  phaseNumber: string;
  description: string;
  specType: '' | 'affordable' | 'gap' | 'luxury' | 'custom';
  customSpecType: string;
  phaseHighlights: string;
};

type PhasePlanSnapshot = {
  name: string;
  phaseNumber: number;
  description: string | null;
  specType: 'affordable' | 'gap' | 'luxury' | 'custom' | null;
  customSpecType: string | null;
  phaseHighlights: string[];
};

type PhaseListView = 'current' | 'archive';

const emptyForm: PhasePlanForm = {
  id: null,
  expectedPlan: null,
  name: '',
  phaseNumber: '1',
  description: '',
  specType: '',
  customSpecType: '',
  phaseHighlights: '',
};

const specTypeLabels = {
  affordable: 'Affordable',
  gap: 'Gap market',
  luxury: 'Luxury',
  custom: 'Custom',
} as const;

function phaseStatusLabel(status: string): string {
  return (
    {
      planning: 'Planned',
      pre_launch: 'Pre-launch',
      selling: 'Selling',
      sold_out: 'Sold out',
      completed: 'Completed',
    }[status] ?? status
  );
}

export default function DevelopmentPhasePlanner({ developmentId }: { developmentId: number }) {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phaseListView, setPhaseListView] = useState<PhaseListView>('current');
  const [form, setForm] = useState<PhasePlanForm>(emptyForm);
  const phasesQuery = trpc.developer.getPhasePlans.useQuery(
    { developmentId },
    { retry: false, refetchOnWindowFocus: false },
  );

  const invalidatePlans = () => utils.developer.getPhasePlans.invalidate({ developmentId });
  const preparePhase = trpc.developer.preparePhase.useMutation({
    onSuccess: async () => {
      toast.success('Phase plan created.');
      setDialogOpen(false);
      setForm(emptyForm);
      setPhaseListView('current');
      await invalidatePlans();
    },
    onError: error => toast.error(error.message || 'Could not create the phase plan.'),
  });
  const updatePhase = trpc.developer.updatePlannedPhase.useMutation({
    onSuccess: async () => {
      toast.success('Phase plan updated.');
      setDialogOpen(false);
      setForm(emptyForm);
      await invalidatePlans();
    },
    onError: async error => {
      if (error.data?.code === 'PRECONDITION_FAILED') {
        setDialogOpen(false);
        setForm(emptyForm);
        await invalidatePlans();
        toast.error(
          'This phase plan changed. The latest version is loaded; open it again before editing.',
        );
        return;
      }
      toast.error(error.message || 'Could not update the phase plan.');
    },
  });

  const phases = phasesQuery.data?.phases ?? [];
  const canManage = phasesQuery.data?.canManage ?? false;
  const isSaving = preparePhase.isPending || updatePhase.isPending;
  const currentPhases = phases.filter(phase =>
    ['planning', 'pre_launch', 'selling'].includes(phase.status),
  );
  const archivedPhases = phases.filter(phase => ['sold_out', 'completed'].includes(phase.status));
  const visiblePhases = phaseListView === 'current' ? currentPhases : archivedPhases;

  const startNewPlan = () => {
    const nextPhaseNumber =
      phases.reduce((maximum, phase) => Math.max(maximum, phase.phaseNumber), 0) + 1;
    setForm({ ...emptyForm, phaseNumber: String(nextPhaseNumber) });
    setDialogOpen(true);
  };

  const startEditing = (phase: (typeof phases)[number]) => {
    const phaseHighlights = Array.isArray(phase.phaseHighlights)
      ? phase.phaseHighlights
          .map(String)
          .map(highlight => highlight.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const expectedPlan: PhasePlanSnapshot = {
      name: phase.name,
      phaseNumber: phase.phaseNumber,
      description: phase.description ?? null,
      specType: phase.specType ?? null,
      customSpecType: phase.customSpecType ?? null,
      phaseHighlights,
    };
    setForm({
      id: phase.id,
      expectedPlan,
      name: phase.name,
      phaseNumber: String(phase.phaseNumber),
      description: phase.description ?? '',
      specType: phase.specType ?? '',
      customSpecType: phase.customSpecType ?? '',
      phaseHighlights: phaseHighlights.join('\n'),
    });
    setDialogOpen(true);
  };

  const savePlan = () => {
    const name = form.name.trim();
    const phaseNumber = Number(form.phaseNumber);
    if (!name) {
      toast.error('Enter a name for this phase.');
      return;
    }
    if (!Number.isInteger(phaseNumber) || phaseNumber < 1 || phaseNumber > 10000) {
      toast.error('Enter a phase number between 1 and 10,000.');
      return;
    }

    const details = {
      name,
      phaseNumber,
      description: form.description.trim() || null,
      specType: form.specType || null,
      customSpecType: form.specType === 'custom' ? form.customSpecType.trim() || null : null,
      phaseHighlights: form.phaseHighlights
        .split('\n')
        .map(highlight => highlight.trim())
        .filter(Boolean),
    };
    if (form.specType === 'custom' && !details.customSpecType) {
      toast.error('Add a label for the custom phase specification.');
      return;
    }
    if (form.id === null) {
      preparePhase.mutate({ developmentId, ...details });
    } else {
      if (!form.expectedPlan) {
        toast.error('Refresh the phase plan before editing it.');
        return;
      }
      updatePhase.mutate({
        phaseId: form.id,
        expectedPlan: form.expectedPlan,
        ...details,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Phase plans</CardTitle>
          <CardDescription>
            Organize the development into phases before preparing their inventory.
          </CardDescription>
        </div>
        {canManage ? (
          <Button size="sm" onClick={startNewPlan}>
            <Plus className="mr-2 h-4 w-4" />
            Plan a phase
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Planning a phase does not publish homes or change inventory counts. Release controls
          remain separate from phase setup.
        </p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Phase view">
          <Button
            type="button"
            size="sm"
            variant={phaseListView === 'current' ? 'default' : 'outline'}
            aria-pressed={phaseListView === 'current'}
            onClick={() => setPhaseListView('current')}
          >
            Current phases ({currentPhases.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={phaseListView === 'archive' ? 'default' : 'outline'}
            aria-pressed={phaseListView === 'archive'}
            onClick={() => setPhaseListView('archive')}
          >
            Archive ({archivedPhases.length})
          </Button>
        </div>

        {phasesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-600" role="status">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading phase plans…
          </div>
        ) : phasesQuery.isError ? (
          <div className="space-y-3 rounded-md border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-900">Phase plans could not be loaded.</p>
            <Button size="sm" variant="outline" onClick={() => phasesQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : phases.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-medium text-slate-900">No phases planned yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Add a phase to organize this development’s future inventory and launch sequence.
            </p>
          </div>
        ) : visiblePhases.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center">
            <p className="font-medium text-slate-900">
              {phaseListView === 'current' ? 'No current phases' : 'No archived phases'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {phaseListView === 'current'
                ? 'Planned, pre-launch, and selling phases appear here.'
                : 'Sold-out and completed phases are kept here for reference.'}
            </p>
          </div>
        ) : (
          <ol
            className="space-y-3"
            aria-label={
              phaseListView === 'current'
                ? 'Current development phases'
                : 'Archived development phases'
            }
          >
            {visiblePhases.map(phase => (
              <li
                key={phase.id}
                className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-950">
                      Phase {phase.phaseNumber}: {phase.name}
                    </h3>
                    <Badge variant={phase.status === 'planning' ? 'outline' : 'secondary'}>
                      {phaseStatusLabel(phase.status)}
                    </Badge>
                  </div>
                  {phase.description ? (
                    <p className="whitespace-pre-wrap text-sm text-slate-600">
                      {phase.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">No phase description added.</p>
                  )}
                  {phase.specType ? (
                    <p className="text-sm text-slate-600">
                      Product positioning:{' '}
                      {phase.specType === 'custom'
                        ? phase.customSpecType || 'Custom'
                        : specTypeLabels[phase.specType]}
                    </p>
                  ) : null}
                  {Array.isArray(phase.phaseHighlights) && phase.phaseHighlights.length > 0 ? (
                    <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                      {phase.phaseHighlights.map((highlight, index) => (
                        <li key={`${phase.id}-highlight-${index}`}>{String(highlight)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {phase.status === 'planning' && canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(phase)}
                    aria-label={`Edit phase ${phase.phaseNumber}`}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit plan
                  </Button>
                ) : phase.status !== 'planning' ? (
                  <p className="max-w-xs text-xs text-slate-500">
                    Phase details are locked after planning so inventory changes stay controlled.
                  </p>
                ) : (
                  <p className="max-w-xs text-xs text-slate-500">
                    Phase plans can be changed by a development owner, admin, or sales manager.
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id === null ? 'Plan a phase' : 'Edit phase plan'}</DialogTitle>
            <DialogDescription>
              Add the context your team needs to prepare this phase. This does not assign stock,
              change inventory counts, or publish availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div className="space-y-2">
                <Label htmlFor="phase-plan-name">Phase name</Label>
                <Input
                  id="phase-plan-name"
                  autoFocus
                  maxLength={255}
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  placeholder="For example, North Extension"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phase-plan-number">Phase number</Label>
                <Input
                  id="phase-plan-number"
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={form.phaseNumber}
                  onChange={event =>
                    setForm(current => ({ ...current, phaseNumber: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-plan-description">What belongs in this phase?</Label>
              <Textarea
                id="phase-plan-description"
                maxLength={5000}
                rows={4}
                value={form.description}
                onChange={event =>
                  setForm(current => ({ ...current, description: event.target.value }))
                }
                placeholder="Add useful context for your team, such as an extension or block name."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phase-plan-spec-type">Product positioning</Label>
                <Select
                  value={form.specType || 'unset'}
                  onValueChange={value =>
                    setForm(current => ({
                      ...current,
                      specType: value === 'unset' ? '' : (value as PhasePlanForm['specType']),
                      customSpecType: value === 'custom' ? current.customSpecType : '',
                    }))
                  }
                >
                  <SelectTrigger id="phase-plan-spec-type">
                    <SelectValue placeholder="Select if known" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    <SelectItem value="affordable">Affordable</SelectItem>
                    <SelectItem value="gap">Gap market</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.specType === 'custom' ? (
                <div className="space-y-2">
                  <Label htmlFor="phase-plan-custom-spec">Custom positioning label</Label>
                  <Input
                    id="phase-plan-custom-spec"
                    maxLength={100}
                    value={form.customSpecType}
                    onChange={event =>
                      setForm(current => ({ ...current, customSpecType: event.target.value }))
                    }
                    placeholder="For example, student housing"
                  />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-plan-highlights">What is distinct about this phase?</Label>
              <Textarea
                id="phase-plan-highlights"
                maxLength={3000}
                rows={4}
                value={form.phaseHighlights}
                onChange={event =>
                  setForm(current => ({ ...current, phaseHighlights: event.target.value }))
                }
                placeholder={
                  'Add one detail per line, for example:\nNew stand sizes\nUpdated finishes'
                }
              />
              <p className="text-xs text-slate-500">
                Up to 12 short points. Inventory stays separate.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={savePlan} disabled={isSaving}>
              {isSaving ? 'Saving…' : form.id === null ? 'Save phase plan' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
