import { useMemo, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type InventoryAction =
  | { kind: 'transition'; item: any; nextStatus: string }
  | { kind: 'mode'; item: any }
  | { kind: 'price'; item: any }
  | { kind: 'details'; item: any }
  | { kind: 'legal_hold'; item: any }
  | { kind: 'lease_return'; item: any };

type InventoryStatus =
  | 'planned'
  | 'available'
  | 'reserved'
  | 'under_offer'
  | 'under_contract'
  | 'sold'
  | 'leased'
  | 'withdrawn'
  | 'legal_hold'
  | 'reconciliation_required';

type PhaseView = 'active' | 'history' | 'all';
type PhaseLifecycleAction = { kind: 'archive' | 'reopen'; phase: any } | null;

const PHASE_ARCHIVE_BLOCKER_STATUSES = [
  'available',
  'reserved',
  'under_offer',
  'under_contract',
  'leased',
  'legal_hold',
  'reconciliation_required',
];

type ParsedInventoryRow = {
  phaseId: number;
  unitTypeId: string;
  internalIdentifier: string;
  publicIdentifier: string | null;
  allocationNotes: string | null;
  transactionType: 'for_sale' | 'for_rent';
  status: InventoryStatus;
  salePrice: string | null;
  rentPrice: string | null;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  row.push(value.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  if (quoted) throw new Error('The CSV has an unfinished quoted value.');
  return rows;
}

function parseInventoryCsv(text: string): ParsedInventoryRow[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow || !dataRows.length) throw new Error('Choose a CSV with a header and at least one inventory row.');
  const headers = headerRow.map(value => value.toLowerCase().replace(/[\s-]+/g, '_'));
  const index = (name: string) => headers.indexOf(name);
  const required = ['phase_id', 'unit_type_id', 'internal_identifier', 'transaction_type'];
  const missing = required.filter(name => index(name) < 0);
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}.`);

  return dataRows.map((cells, rowIndex) => {
    const read = (name: string) => {
      const position = index(name);
      return position < 0 ? '' : String(cells[position] || '').trim();
    };
    const phaseId = Number(read('phase_id'));
    const transactionRaw = read('transaction_type').toLowerCase();
    const transactionType = ['for_rent', 'rent', 'rental'].includes(transactionRaw)
      ? 'for_rent'
      : ['for_sale', 'sale'].includes(transactionRaw)
        ? 'for_sale'
        : null;
    const statusValue = read('status') || 'planned';
    const inventoryStatuses: InventoryStatus[] = [
      'planned',
      'available',
      'reserved',
      'under_offer',
      'under_contract',
      'sold',
      'leased',
      'withdrawn',
      'legal_hold',
      'reconciliation_required',
    ];
    if (!inventoryStatuses.includes(statusValue as InventoryStatus)) {
      throw new Error(`Row ${rowIndex + 2} has an unsupported inventory status.`);
    }
    const status = statusValue as InventoryStatus;
    if (!Number.isSafeInteger(phaseId) || phaseId <= 0) {
      throw new Error(`Row ${rowIndex + 2} needs a numeric phase_id.`);
    }
    if (!transactionType) {
      throw new Error(`Row ${rowIndex + 2} transaction_type must be for_sale or for_rent.`);
    }
    const unitTypeId = read('unit_type_id');
    const internalIdentifier = read('internal_identifier');
    if (!unitTypeId || !internalIdentifier) {
      throw new Error(`Row ${rowIndex + 2} needs unit_type_id and internal_identifier.`);
    }
    return {
      phaseId,
      unitTypeId,
      internalIdentifier,
      publicIdentifier: read('public_identifier') || null,
      allocationNotes: read('allocation_notes') || null,
      transactionType,
      status,
      salePrice: read('sale_price') || null,
      rentPrice: read('rent_price') || null,
    };
  });
}

function downloadInventoryTemplate() {
  const template = 'phase_id,unit_type_id,internal_identifier,public_identifier,allocation_notes,transaction_type,status,sale_price,rent_price';
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([template], { type: 'text/csv;charset=utf-8' }));
  link.download = 'property-listify-inventory-template.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function statusTone(status: string) {
  if (status === 'available') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'planned') return 'border-slate-200 bg-slate-50 text-slate-700';
  if (status === 'reserved' || status === 'under_offer') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'under_contract' || status === 'legal_hold') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTypePriceRange(fromValue: unknown, toValue: unknown, rent = false) {
  const from = Number(fromValue);
  const to = Number(toValue);
  if (!Number.isFinite(from) || from <= 0) return 'Price not set';
  const suffix = rent ? ' / month' : '';
  if (!Number.isFinite(to) || to <= 0) return `From ${formatCurrency(from)}${suffix}`;
  if (to === from) return `${formatCurrency(from)}${suffix}`;
  if (to < from) return `From ${formatCurrency(from)}${suffix}`;
  return `${formatCurrency(from)} – ${formatCurrency(to)}${suffix}`;
}

function describeUnitType(type: any) {
  const details = [
    type.label,
    type.configDescription,
    type.structuralType,
    type.floors,
    `${type.bedrooms} bed / ${type.bathrooms} bath`,
    type.unitSize ? `${type.unitSize} m² internal` : null,
    type.yardSize ? `${type.yardSize} m² yard` : null,
  ].map(value => String(value || '').trim()).filter(Boolean);
  const summarizeFeatures = (value: unknown) => {
    const result: string[] = [];
    const visit = (entry: unknown, path: string[] = []) => {
      if (entry === null || entry === undefined || entry === false || entry === '') return;
      if (typeof entry === 'string' && /^(?:\{|\[)/.test(entry.trim())) {
        try {
          visit(JSON.parse(entry), path);
          return;
        } catch {
          // Preserve malformed legacy text as a readable fact below.
        }
      }
      if (Array.isArray(entry)) {
        entry.forEach(item => visit(item, path));
        return;
      }
      if (typeof entry === 'object') {
        Object.entries(entry as Record<string, unknown>).forEach(([key, child]) => visit(child, [...path, key]));
        return;
      }
      const label = path.join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
      if (entry === true) result.push(label);
      else if (label) result.push(`${label}: ${String(entry)}`);
      else result.push(String(entry));
    };
    visit(value);
    return result.slice(0, 6).join(', ');
  };
  const baseFeatures = summarizeFeatures(type.baseFeatures);
  const baseFinishes = summarizeFeatures(type.baseFinishes);
  if (baseFeatures) details.push(`Standard features: ${baseFeatures}`);
  if (baseFinishes) details.push(`Finishes: ${baseFinishes}`);
  const extras = Array.isArray(type.extras)
    ? type.extras.map((extra: any) => {
        const label = String(extra?.label || extra?.name || '').trim();
        const price = Number(extra?.price);
        if (!label) return '';
        return Number.isFinite(price) && price > 0 ? `${label} (+${formatCurrency(price)})` : label;
      }).filter(Boolean)
    : [];
  if (extras.length) details.push(`Optional extras: ${extras.join(', ')}`);
  return details.join(' · ');
}

function formatAllocationPrice(item: any, unitType: any) {
  const rent = item.transactionType === 'for_rent';
  const rawOverride = rent ? item.rentPrice : item.salePrice;
  const override = rawOverride === null || rawOverride === undefined || rawOverride === ''
    ? null
    : Number(rawOverride);
  const suffix = rent ? ' / month' : '';
  if (override !== null && Number.isFinite(override) && override > 0) {
    return `${formatCurrency(override)}${suffix} · allocation price`;
  }
  const from = rent ? unitType?.monthlyRentFrom : unitType?.basePriceFrom;
  const to = rent ? unitType?.monthlyRentTo : unitType?.basePriceTo;
  const range = formatTypePriceRange(from, to, rent);
  return range === 'Price not set' ? range : `${range} · type pricing`;
}

function hasAllocationMarketPrice(item: any, unitType: any) {
  const rent = item.transactionType === 'for_rent';
  const override = Number(rent ? item.rentPrice : item.salePrice);
  if (Number.isFinite(override) && override > 0) return true;
  const from = Number(rent ? unitType?.monthlyRentFrom : unitType?.basePriceFrom);
  const to = Number(rent ? unitType?.monthlyRentTo : unitType?.basePriceTo);
  if (!Number.isFinite(from) || from <= 0) return false;
  if (Number.isFinite(to) && to < 0) return false;
  return !Number.isFinite(to) || to === 0 || to >= from;
}

function getNextStatuses(item: any) {
  if (item.status === 'available') return ['planned', 'reserved', 'under_offer', 'legal_hold', 'withdrawn'];
  if (item.status === 'reserved') return ['available', 'under_offer', 'under_contract', 'legal_hold'];
  if (item.status === 'under_offer') return ['available', 'reserved', 'under_contract', 'legal_hold'];
  if (item.status === 'under_contract') return [item.transactionType === 'for_rent' ? 'leased' : 'sold', 'legal_hold'];
  return [];
}

function transitionActionLabel(item: any, nextStatus: string) {
  if (nextStatus === 'legal_hold' && item.status === 'under_contract') return 'Flag contract issue';
  if (nextStatus === 'legal_hold') return 'Place on hold';
  if (nextStatus === 'available' && ['reserved', 'under_offer'].includes(item.status)) return 'Return to market';
  return statusLabel(nextStatus);
}

function describeAuditChange(entry: any) {
  const before = (entry.beforeData || {}) as Record<string, unknown>;
  const after = (entry.afterData || {}) as Record<string, unknown>;
  const metadata = (entry.metadata || {}) as Record<string, unknown>;
  const sourceSystem = String(metadata.sourceSystem || metadata.clearanceSourceSystem || '').trim();
  const sourceReference = String(
    metadata.sourceReference || metadata.leaseEndReference || metadata.clearanceReference || '',
  ).trim();
  const reason = String(metadata.reason || '').trim();
  const sourceContext = [
    sourceSystem ? `Source: ${sourceSystem}` : '',
    sourceReference ? `Record: ${sourceReference}` : '',
  ].filter(Boolean).join(' · ');
  if (entry.action === 'developer.phase.archived') {
    return `Phase archived${reason ? ` · ${reason}` : ''}`;
  }
  if (entry.action === 'developer.phase.reopened') {
    return `Phase reopened${reason ? ` · ${reason}` : ''}`;
  }
  const money = (value: unknown, suffix = '') => {
    const amount = value === null || value === undefined || value === '' ? null : Number(value);
    return amount !== null && Number.isFinite(amount) && amount > 0
      ? `${formatCurrency(amount)}${suffix}`
      : 'No exact override';
  };

  if (entry.action === 'developer.inventory.price_changed') {
    return `Sale: ${money(before.salePrice)} → ${money(after.salePrice)} · Rent: ${money(before.rentPrice, ' / month')} → ${money(after.rentPrice, ' / month')}`;
  }
  if (entry.action === 'developer.inventory.allocation_details_changed') {
    return `Details: ${String(before.allocationNotes || 'None')} → ${String(after.allocationNotes || 'None')}`;
  }
  if (entry.action === 'developer.inventory.unit_type_price_range_changed') {
    const range = (from: unknown, to: unknown, suffix = '') => {
      const low = from == null || from === '' ? null : Number(from);
      const high = to == null || to === '' ? null : Number(to);
      if (low === null || !Number.isFinite(low) || low <= 0) return `Not set${suffix}`;
      const normalizedHigh = high !== null && Number.isFinite(high) && high > 0 ? high : low;
      return low === normalizedHigh
        ? `${formatCurrency(low)}${suffix}`
        : `${formatCurrency(low)}–${formatCurrency(normalizedHigh)}${suffix}`;
    };
    return `Type ${String(metadata.unitTypeName || metadata.unitTypeId || '')} · Sale ${range(before.saleFrom, before.saleTo)} → ${range(after.saleFrom, after.saleTo)} · Rent ${range(before.rentFrom, before.rentTo, ' / month')} → ${range(after.rentFrom, after.rentTo, ' / month')}`;
  }
  if (entry.action === 'developer.inventory.item_reconciled') {
    const details = after.allocationNotes ? ` · ${String(after.allocationNotes)}` : '';
    return `Initial register: ${statusLabel(String(after.status || 'planned'))} · ${String(after.transactionType || 'mode not set')} · Sale ${money(after.salePrice)} · Rent ${money(after.rentPrice, ' / month')}${details}`;
  }
  if (entry.action === 'developer.inventory.transaction_mode_changed') {
    return [
      `${statusLabel(String(before.transactionType || 'unknown'))} → ${statusLabel(String(after.transactionType || 'unknown'))}`,
      `Sale ${money(before.salePrice)} → ${money(after.salePrice)}`,
      `Rent ${money(before.rentPrice, ' / month')} → ${money(after.rentPrice, ' / month')}`,
      sourceContext,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (before.status !== undefined || after.status !== undefined) {
    return [`${statusLabel(String(before.status || 'unknown'))} → ${statusLabel(String(after.status || 'unknown'))}`, sourceContext]
      .filter(Boolean)
      .join(' · ');
  }
  if (before.inventoryMode !== undefined || after.inventoryMode !== undefined) {
    return `${statusLabel(String(before.inventoryMode || 'unknown'))} → ${statusLabel(String(after.inventoryMode || 'unknown'))}`;
  }
  return 'Recorded';
}

export default function InventoryWorkspace() {
  const [, params] = useRoute('/developer/developments/:developmentId/inventory');
  const developmentId = Number(params?.developmentId);
  const validId = Number.isSafeInteger(developmentId) && developmentId > 0;
  const [historyItem, setHistoryItem] = useState<any | null>(null);
  const query = trpc.developer.getInventoryWorkspace.useQuery(
    { developmentId },
    { enabled: validId, retry: false, refetchOnWindowFocus: false },
  );
  const itemHistoryQuery = trpc.developer.getInventoryItemHistory.useQuery(
    { developmentId, itemId: Number(historyItem?.id || 0) },
    { enabled: validId && historyItem !== null, retry: false, refetchOnWindowFocus: false },
  );
  const utils = trpc.useUtils();
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [phaseName, setPhaseName] = useState('');
  const [phaseNumber, setPhaseNumber] = useState('');
  const [phaseDescription, setPhaseDescription] = useState('');
  const [phasePreparationReason, setPhasePreparationReason] = useState('');
  const [csvRows, setCsvRows] = useState<ParsedInventoryRow[]>([]);
  const [importReason, setImportReason] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [phaseView, setPhaseView] = useState<PhaseView>('active');
  const [phaseReasons, setPhaseReasons] = useState<Record<number, string>>({});
  const [phaseLifecycleAction, setPhaseLifecycleAction] = useState<PhaseLifecycleAction>(null);
  const [phaseLifecycleReason, setPhaseLifecycleReason] = useState('');
  const [action, setAction] = useState<InventoryAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionSourceSystem, setActionSourceSystem] = useState('');
  const [actionSourceReference, setActionSourceReference] = useState('');
  const [actionPrice, setActionPrice] = useState('');
  const [actionAllocationNotes, setActionAllocationNotes] = useState('');
  const [actionTransactionType, setActionTransactionType] = useState<'for_sale' | 'for_rent'>('for_sale');
  const [legalReturnTo, setLegalReturnTo] = useState<'available' | 'planned' | 'withdrawn' | ''>('');
  const [leaseEndConfirmed, setLeaseEndConfirmed] = useState(false);

  const refresh = async () => {
    await utils.developer.getInventoryWorkspace.invalidate({ developmentId });
  };
  const phasePreparationMutation = trpc.developer.prepareDevelopmentPhase.useMutation({
    onSuccess: async phase => {
      toast.success(`Phase ${phase.phaseNumber}: ${phase.name} prepared.`);
      setPhaseDialogOpen(false);
      setPhaseName('');
      setPhaseDescription('');
      setPhasePreparationReason('');
      await refresh();
    },
    onError: error => toast.error(error.message || 'Could not prepare this phase.'),
  });
  const openPhasePreparation = () => {
    const nextNumber = Math.max(0, ...(query.data?.phases || []).map(phase => Number(phase.phaseNumber))) + 1;
    setPhaseNumber(String(nextNumber));
    setPhaseName('');
    setPhaseDescription('');
    setPhasePreparationReason('');
    setPhaseDialogOpen(true);
  };
  const submitPhasePreparation = () => {
    const normalizedName = phaseName.trim();
    const normalizedReason = phasePreparationReason.trim();
    const parsedNumber = Number(phaseNumber);
    if (!Number.isSafeInteger(parsedNumber) || parsedNumber <= 0) {
      toast.error('Enter a valid phase number.');
      return;
    }
    if (normalizedName.length < 2) {
      toast.error('Enter a phase or extension name.');
      return;
    }
    if (normalizedReason.length < 10) {
      toast.error('Explain why this phase is being prepared.');
      return;
    }
    phasePreparationMutation.mutate({
      developmentId,
      phaseNumber: parsedNumber,
      name: normalizedName,
      description: phaseDescription.trim() || null,
      reason: normalizedReason,
    });
  };
  const loadInventoryCsv = async (file?: File) => {
    if (!file) return;
    try {
      setCsvRows(parseInventoryCsv(await file.text()));
      toast.success('CSV loaded. Review the row count and reconciliation details before saving.');
    } catch (error) {
      setCsvRows([]);
      toast.error(error instanceof Error ? error.message : 'Could not read this CSV.');
    }
  };
  const mutationOptions = {
    onSuccess: async (_result: unknown, input: { developmentId: number }) => {
      toast.success('Inventory updated.');
      setAction(null);
      setSelectedIds(new Set());
      await utils.developer.getInventoryWorkspace.invalidate({ developmentId: input.developmentId });
      await utils.developer.getDevelopmentHome.invalidate({ developmentId: input.developmentId, range: '30d' });
    },
    onError: (error: { message?: string }) => toast.error(error.message || 'Could not update inventory.'),
  };

  const importMutation = trpc.developer.prepareItemizedInventory.useMutation({
    onSuccess: async () => {
      toast.success(`${csvRows.length} inventory rows reconciled.`);
      setCsvRows([]);
      setImportReason('');
      setSourceSystem('');
      await refresh();
      await utils.developer.getDevelopmentHome.invalidate({ developmentId, range: '30d' });
    },
    onError: error => toast.error(error.message || 'Could not reconcile inventory.'),
  });
  const addInventoryMutation = trpc.developer.addPlannedInventoryItems.useMutation({
    onSuccess: async result => {
      toast.success(`${result.addedCount} planned allocations added.`);
      setCsvRows([]);
      setImportReason('');
      setSourceSystem('');
      setSelectedIds(new Set());
      await refresh();
      await utils.developer.getDevelopmentHome.invalidate({ developmentId, range: '30d' });
    },
    onError: error => toast.error(error.message || 'Could not add these allocations.'),
  });
  const phaseMutation = trpc.developer.releaseDevelopmentPhase.useMutation({
    ...mutationOptions,
    onSuccess: async (_result, input) => {
      toast.success('Phase released. Inventory remains hidden until a batch is released.');
      setPhaseReasons(current => ({ ...current, [input.phaseId]: '' }));
      await refresh();
    },
  });
  const archivePhaseMutation = trpc.developer.archiveDevelopmentPhase.useMutation({
    onSuccess: async () => {
      toast.success('Phase archived. Inventory was preserved and is hidden from market views.');
      setPhaseLifecycleAction(null);
      setPhaseLifecycleReason('');
      setSelectedIds(new Set());
      await refresh();
      await utils.developer.getDevelopmentHome.invalidate({ developmentId, range: '30d' });
    },
    onError: error => toast.error(error.message || 'Could not archive this phase.'),
  });
  const reopenPhaseMutation = trpc.developer.reopenDevelopmentPhase.useMutation({
    onSuccess: async () => {
      toast.success('Phase reopened. No inventory was released to market.');
      setPhaseLifecycleAction(null);
      setPhaseLifecycleReason('');
      setSelectedIds(new Set());
      await refresh();
      await utils.developer.getDevelopmentHome.invalidate({ developmentId, range: '30d' });
    },
    onError: error => toast.error(error.message || 'Could not reopen this phase.'),
  });
  const batchMutation = trpc.developer.releaseInventoryBatch.useMutation({
    ...mutationOptions,
    onSuccess: async (result, input) => {
      toast.success(`${result.releasedCount} homes are now available to market.`);
      setPhaseReasons(current => ({ ...current, [input.phaseId]: '' }));
      setSelectedIds(new Set());
      await refresh();
      await utils.developer.getDevelopmentHome.invalidate({ developmentId, range: '30d' });
    },
  });
  const transitionMutation = trpc.developer.transitionInventoryItemStatus.useMutation(mutationOptions);
  const modeMutation = trpc.developer.changeInventoryTransactionMode.useMutation(mutationOptions);
  const priceMutation = trpc.developer.updateInventoryItemPrice.useMutation(mutationOptions);
  const detailsMutation = trpc.developer.updateInventoryItemDetails.useMutation(mutationOptions);
  const legalMutation = trpc.developer.resolveInventoryLegalHold.useMutation(mutationOptions);
  const leaseMutation = trpc.developer.returnLeasedInventoryToMarket.useMutation(mutationOptions);

  const unitTypesById = useMemo(
    () => new Map<string, any>((query.data?.unitTypes || []).map(type => [String(type.id), type])),
    [query.data?.unitTypes],
  );

  if (!validId) return <p className="rounded-xl border bg-white p-8 text-center">Development not found.</p>;
  if (query.isLoading) return <div className="rounded-xl border bg-white p-8 text-center text-slate-600">Loading inventory…</div>;
  if (query.error?.data?.code === 'NOT_FOUND') return <div className="rounded-xl border bg-white p-8 text-center">Development not found.</div>;
  if (query.error || !query.data) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <p className="mb-4 text-slate-700">Inventory could not be loaded.</p>
        <Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    );
  }

  const { development, phases, items, audit } = query.data;
  const phaseNames = new Map(phases.map(phase => [Number(phase.id), `Phase ${phase.phaseNumber}: ${phase.name}`]));
  const visiblePhases = phases.filter(phase => {
    const archived = Boolean(phase.archivedAt);
    if (phaseView === 'history') return archived || phase.status === 'sold_out' || phase.status === 'completed';
    if (phaseView === 'active') return !archived && (phase.status === 'planning' || phase.status === 'pre_launch' || phase.status === 'selling');
    return true;
  });

  const submitPhaseLifecycleAction = () => {
    if (!phaseLifecycleAction) return;
    if (phaseLifecycleReason.trim().length < 10) {
      toast.error('Enter a reason with at least 10 characters.');
      return;
    }
    const input = {
      developmentId,
      phaseId: Number(phaseLifecycleAction.phase.id),
      reason: phaseLifecycleReason.trim(),
    };
    if (phaseLifecycleAction.kind === 'archive') archivePhaseMutation.mutate(input);
    else reopenPhaseMutation.mutate(input);
  };

  const openAction = (nextAction: InventoryAction) => {
    setAction(nextAction);
    setActionReason('');
    setActionSourceSystem('');
    setActionSourceReference('');
    setActionAllocationNotes(nextAction.item.allocationNotes || '');
    const changesMarketMode = nextAction.kind === 'mode' || nextAction.kind === 'lease_return';
    let transactionType = nextAction.item.transactionType;
    if (changesMarketMode) {
      transactionType = transactionType === 'for_sale' ? 'for_rent' : 'for_sale';
    }
    const price = transactionType === 'for_rent' ? nextAction.item.rentPrice : nextAction.item.salePrice;
    setActionPrice(price == null ? '' : String(price));
    setActionTransactionType(transactionType);
    setLegalReturnTo('');
    setLeaseEndConfirmed(false);
  };

  const submitAction = () => {
    if (!action) return;
    if (actionReason.trim().length < 10) {
      toast.error('Enter a reason with at least 10 characters.');
      return;
    }
    const base = {
      developmentId,
      itemId: Number(action.item.id),
      expectedVersionId: Number(action.item.versionId),
      reason: actionReason.trim(),
    };
    if (action.kind === 'transition') {
      if (!actionSourceSystem.trim()) {
        toast.error('Choose the CRM or operating record used for this change.');
        return;
      }
      const sourceReferenceRequired =
        ['reserved', 'under_offer', 'under_contract', 'sold', 'leased', 'legal_hold'].includes(action.nextStatus) ||
        (action.nextStatus === 'available' && ['reserved', 'under_offer'].includes(action.item.status));
      if (sourceReferenceRequired && !actionSourceReference.trim()) {
        toast.error('Add the matching reservation, offer, cancellation, contract, or clearance reference.');
        return;
      }
      transitionMutation.mutate({
        ...base,
        expectedStatus: action.item.status,
        nextStatus: action.nextStatus as any,
        sourceSystem: actionSourceSystem.trim(),
        sourceReference: actionSourceReference.trim() || null,
      });
    } else if (action.kind === 'mode') {
      const price = actionPrice.trim() === '' ? null : Number(actionPrice);
      if (price !== null && (!Number.isFinite(price) || price <= 0 || Math.abs(price * 100 - Math.round(price * 100)) > 0.0000001)) {
        toast.error('Enter a target price greater than zero with no more than two decimals, or leave it blank to use the unit type range.');
        return;
      }
      modeMutation.mutate({ ...base, transactionType: actionTransactionType, price });
    } else if (action.kind === 'price') {
      const price = actionPrice.trim() === '' ? null : Number(actionPrice);
      if (price !== null && (!Number.isFinite(price) || price <= 0)) {
        toast.error('Enter a price greater than zero or leave it blank to use the unit type range.');
        return;
      }
      priceMutation.mutate({ ...base, transactionType: action.item.transactionType, price });
    } else if (action.kind === 'details') {
      detailsMutation.mutate({
        ...base,
        allocationNotes: actionAllocationNotes.trim() || null,
      });
    } else if (action.kind === 'legal_hold') {
      if (!legalReturnTo) {
        toast.error('Choose whether the cleared home should return to market, stay planned, or remain withdrawn.');
        return;
      }
      if (!actionSourceSystem.trim() || !actionSourceReference.trim()) {
        toast.error('Choose the system and add the cancellation or clearance reference.');
        return;
      }
      legalMutation.mutate({
        ...base,
        returnTo: legalReturnTo,
        clearanceSourceSystem: actionSourceSystem.trim(),
        clearanceReference: actionSourceReference.trim(),
      });
    } else {
      if (!leaseEndConfirmed) {
        toast.error('Confirm that the lease has ended and return is authorized.');
        return;
      }
      if (!actionSourceSystem.trim() || !actionSourceReference.trim()) {
        toast.error('Add the operating system and lease close-out or termination reference.');
        return;
      }
      const price = actionPrice.trim() === '' ? null : Number(actionPrice);
      if (price !== null && (!Number.isFinite(price) || price <= 0 || Math.abs(price * 100 - Math.round(price * 100)) > 0.0000001)) {
        toast.error('Enter a target price greater than zero with no more than two decimals, or leave it blank to use the unit type range.');
        return;
      }
      leaseMutation.mutate({
        ...base,
        transactionType: actionTransactionType,
        price,
        leaseEndConfirmed: true,
        sourceSystem: actionSourceSystem.trim(),
        leaseEndReference: actionSourceReference.trim(),
      });
    }
  };

  const isActionPending =
    transitionMutation.isPending || modeMutation.isPending || priceMutation.isPending || detailsMutation.isPending || legalMutation.isPending || leaseMutation.isPending;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/developer/developments/${developmentId}`} className="inline-flex items-center text-sm text-slate-600 hover:text-slate-950">
            <ArrowLeft className="mr-1 h-4 w-4" />Development home
          </Link>
          <p className="mt-3 text-sm font-medium text-slate-500">Developer workspace · Inventory</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">{development.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Prepare the home register, release a phase, then choose the specific homes the team can market. Record an exact price when a home differs from its type range. Reserved, contracted and sold homes stay protected from repricing or silent status changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border border-slate-200 bg-slate-50 text-slate-700">{development.inventoryMode === 'itemized' ? 'Unit register active' : 'Aggregate inventory'}</Badge>
          <Button variant="outline" onClick={openPhasePreparation}>Prepare a phase</Button>
          <Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
      </header>

      {development.inventoryMode !== 'itemized' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><FileSpreadsheet className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-semibold">Prepare the inventory register</h2>
                <p className="text-sm text-slate-600">Import one row per saleable home or allocation. This creates the operational inventory record; it does not replace your CRM.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-950">
              Use the phase and unit type IDs shown below. Existing total, available and reserved counts must reconcile. Mark homes as planned when they should remain hidden until a later batch; every row needs an explicit state, and the unclassified remainder is never assumed to be sold.
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Phase IDs</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {phases.map(phase => <li key={phase.id}><span className="font-mono">{phase.id}</span> · Phase {phase.phaseNumber}: {phase.name} <span className="text-slate-400">({phase.status})</span></li>)}
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Unit type IDs and current totals</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {query.data.unitTypes.map(type => <li key={type.id}><span className="font-mono">{type.id}</span> · {type.name}<span className="block pl-2 text-xs text-slate-500">{describeUnitType(type)} · sale {formatTypePriceRange(type.basePriceFrom, type.basePriceTo)} · rent {formatTypePriceRange(type.monthlyRentFrom, type.monthlyRentTo, true)}</span><span className="block pl-2 text-xs">Total {type.totalUnits}, available {type.availableUnits}, reserved {type.reservedUnits}</span></li>)}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">CSV register</h3>
              <p className="text-sm text-slate-600">Columns: phase_id, unit_type_id, internal_identifier, public_identifier, allocation_notes, transaction_type, status, sale_price, rent_price. Use unit types for distinct plans, sizes, or standard feature packages. The unit type’s from–to range is the default advertised price; a sale_price or rent_price sets an exact asking price for that allocation. Public ranges recalculate from currently available allocations. Keep allocation_notes for private operational context such as position or included upgrades. If a difference needs to appear in public or partner materials, represent it with an accurately described unit type. This MVP does not record buyer-selected options or final negotiated prices.</p>
              </div>
              <Button type="button" variant="outline" onClick={downloadInventoryTemplate}><Download className="mr-2 h-4 w-4" />Download CSV template</Button>
            </div>
            <input
              aria-label="Inventory CSV file"
              type="file"
              accept=".csv,text/csv"
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={event => { void loadInventoryCsv(event.target.files?.[0]); }}
            />
            {csvRows.length ? <p className="text-sm font-medium text-slate-700">{csvRows.length.toLocaleString()} rows ready to reconcile.</p> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">Current source system
                <input value={sourceSystem} onChange={event => setSourceSystem(event.target.value)} placeholder="e.g. Bitrix24, spreadsheet, custom system" className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
              </label>
              <label className="space-y-1 text-sm font-medium">Reason for reconciliation
                <textarea value={importReason} onChange={event => setImportReason(event.target.value)} minLength={10} maxLength={500} rows={2} placeholder="Explain where this register came from and why it is being reconciled." className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
              </label>
            </div>
            <Button
              disabled={!csvRows.length || sourceSystem.trim().length < 1 || importReason.trim().length < 10 || importMutation.isPending}
              onClick={() => importMutation.mutate({ developmentId, sourceSystem: sourceSystem.trim(), reason: importReason.trim(), items: csvRows })}
            >
              {importMutation.isPending ? 'Reconciling…' : 'Reconcile inventory register'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Add planned allocations</h2>
                <p className="mt-1 text-sm text-slate-600">Add homes for a newly prepared phase or additional planned stock. New rows stay hidden until you release them in a selling phase.</p>
              </div>
              <Button type="button" variant="outline" onClick={downloadInventoryTemplate}><Download className="mr-2 h-4 w-4" />Download CSV template</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                aria-label="New inventory CSV file"
                type="file"
                accept=".csv,text/csv"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={event => { void loadInventoryCsv(event.target.files?.[0]); }}
              />
              {csvRows.length ? <p className="text-sm font-medium text-slate-700">{csvRows.length.toLocaleString()} rows ready to add.</p> : null}
              {csvRows.some(row => row.status !== 'planned') ? <p className="text-sm text-amber-800">New allocations must start as planned. Use the release controls after they are added.</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">Current source system
                  <input value={sourceSystem} onChange={event => setSourceSystem(event.target.value)} placeholder="e.g. Bitrix24, spreadsheet, custom system" className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
                </label>
                <label className="space-y-1 text-sm font-medium">Reason for adding these allocations
                  <textarea value={importReason} onChange={event => setImportReason(event.target.value)} minLength={10} maxLength={500} rows={2} placeholder="Explain where the new stock came from and why it is being added." className="w-full rounded-md border border-input bg-background px-3 py-2 font-normal" />
                </label>
              </div>
              <Button
                disabled={!csvRows.length || csvRows.some(row => row.status !== 'planned') || sourceSystem.trim().length < 1 || importReason.trim().length < 10 || addInventoryMutation.isPending}
                onClick={() => addInventoryMutation.mutate({ developmentId, sourceSystem: sourceSystem.trim(), reason: importReason.trim(), items: csvRows })}
              >
                {addInventoryMutation.isPending ? 'Adding allocations…' : 'Add planned allocations'}
              </Button>
            </CardContent>
          </Card>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">
            {[
              ['Total allocations', items.length],
              ['Marketable now', items.filter(item => item.status === 'available' && phases.find(phase => phase.id === item.phaseId)?.status === 'selling').length],
              ['Planned', items.filter(item => item.status === 'planned').length],
              ['Protected or committed', items.filter(item => ['reserved', 'under_offer', 'under_contract', 'sold', 'leased', 'legal_hold'].includes(item.status)).length],
            ].map(([label, count]) => (
              <Card key={String(label)}><CardContent className="p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{Number(count).toLocaleString()}</p></CardContent></Card>
            ))}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Phase inventory</h2>
              <p className="text-sm text-slate-600">Current phases stay in view; sold-out, completed, and archived phases remain available in history.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter inventory phases">
              {([
                ['active', 'Current phases'],
                ['history', 'History'],
                ['all', 'All phases'],
              ] as Array<[PhaseView, string]>).map(([view, label]) => (
                <Button key={view} type="button" size="sm" variant={phaseView === view ? 'default' : 'outline'} aria-pressed={phaseView === view} onClick={() => setPhaseView(view)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {visiblePhases.map(phase => {
              const phaseItems = items.filter(item => Number(item.phaseId) === Number(phase.id));
              const archived = Boolean(phase.archivedAt);
              const archiveBlockers = phaseItems.filter(item => PHASE_ARCHIVE_BLOCKER_STATUSES.includes(item.status));
              const archiveBlockerCounts = new Map<string, number>();
              for (const item of archiveBlockers) archiveBlockerCounts.set(item.status, (archiveBlockerCounts.get(item.status) || 0) + 1);
              const canUseItemizedArchive = development.inventoryMode === 'itemized';
              const plannedItems = phaseItems.filter(item => item.status === 'planned');
              const selectedForPhase = plannedItems.filter(item => selectedIds.has(Number(item.id)));
              const selectedWithoutPrice = selectedForPhase.filter(item =>
                !hasAllocationMarketPrice(item, unitTypesById.get(String(item.unitTypeId))),
              );
              const reason = phaseReasons[phase.id] || '';
              return (
                <Card key={phase.id}>
                  <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">Phase {phase.phaseNumber}: {phase.name}</h2>
                        <Badge className={phase.status === 'selling' ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'border border-slate-200 bg-slate-50 text-slate-700'}>{statusLabel(phase.status)}</Badge>
                        {archived ? <Badge className="border border-slate-300 bg-slate-100 text-slate-700">Archived</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{phaseItems.length} allocations · {phaseItems.filter(item => item.status === 'available').length} available · {plannedItems.length} planned{archived && phase.archivedAt ? ` · archived ${new Date(phase.archivedAt).toLocaleDateString()}` : ''}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!archived && (phase.status === 'planning' || phase.status === 'pre_launch') ? (
                        <Button disabled={reason.trim().length < 10 || phaseMutation.isPending || !plannedItems.length} onClick={() => phaseMutation.mutate({ developmentId, phaseId: Number(phase.id), expectedStatus: phase.status as 'planning' | 'pre_launch', reason: reason.trim() })}>
                          Release phase
                        </Button>
                      ) : null}
                      {archived ? (
                        <Button variant="outline" disabled={!canUseItemizedArchive || archiveBlockers.length > 0} onClick={() => { setPhaseLifecycleAction({ kind: 'reopen', phase }); setPhaseLifecycleReason(''); }}>
                          Reopen phase
                        </Button>
                      ) : (
                        <Button variant="outline" disabled={!canUseItemizedArchive || archiveBlockers.length > 0} onClick={() => { setPhaseLifecycleAction({ kind: 'archive', phase }); setPhaseLifecycleReason(''); }}>
                          Archive phase
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {archived ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">Archived phases are hidden from public and partner availability. Inventory records and history are preserved. Reopening does not release stock.</p> : null}
                    {!canUseItemizedArchive ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Safe phase archival is available after this development is reconciled to itemized inventory, because aggregate stock cannot be attributed to a specific phase.</p> : null}
                    {archiveBlockers.length > 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{archived ? 'Reopening' : 'Archiving'} is blocked until this phase has no available or committed stock: {[...archiveBlockerCounts].map(([status, count]) => `${count} ${status.replace(/_/g, ' ')}`).join(', ')}.</p> : null}
                    {!archived && (phase.status === 'planning' || phase.status === 'pre_launch' || (phase.status === 'selling' && plannedItems.length > 0)) ? (
                      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto] md:items-end">
                        <label className="space-y-1 text-sm font-medium">Reason for this release
                          <input value={reason} onChange={event => setPhaseReasons(current => ({ ...current, [phase.id]: event.target.value }))} minLength={10} maxLength={500} placeholder="For example: approved first weekly release" className="w-full rounded-md border border-input bg-white px-3 py-2 font-normal" />
                        </label>
                        {phase.status === 'selling' && !archived ? (
                          <div className="space-y-1">
                            <Button disabled={!selectedForPhase.length || selectedForPhase.length > 200 || selectedWithoutPrice.length > 0 || reason.trim().length < 10 || batchMutation.isPending} onClick={() => batchMutation.mutate({ developmentId, phaseId: Number(phase.id), reason: reason.trim(), items: selectedForPhase.map(item => ({ id: Number(item.id), expectedVersionId: Number(item.versionId) })) })}>
                              Release {selectedForPhase.length || ''} selected home{selectedForPhase.length === 1 ? '' : 's'}
                            </Button>
                            {selectedWithoutPrice.length > 0 ? <p className="text-xs text-amber-800">Set a valid sale or rental price for each selected home before release.</p> : null}
                            {selectedForPhase.length >= 200 ? <p className="text-xs text-slate-500">A release batch can include up to 200 homes.</p> : null}
                          </div>
                        ) : <p className="text-xs text-slate-500 md:max-w-48">Phase release activates the phase. You will choose the marketable homes after that.{plannedItems.length ? '' : ' Add at least one planned allocation first.'}</p>}
                      </div>
                    ) : null}
                    {phaseItems.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">No inventory rows are assigned to this phase.</p> : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[1020px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Release</th><th className="px-3 py-2">Home</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Market</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Updated</th><th className="px-3 py-2">Actions</th></tr></thead>
                          <tbody className="divide-y">
                            {phaseItems.map(item => {
                              const type = unitTypesById.get(String(item.unitTypeId));
                              const hasMarketPrice = hasAllocationMarketPrice(item, type);
                              return (
                                <tr key={item.id}>
                                  <td className="px-3 py-3">{!archived && phase.status === 'selling' && item.status === 'planned' ? <input aria-label={`Select ${item.internalIdentifier} for batch release${hasMarketPrice ? '' : ' (set a valid price first)'}`} type="checkbox" checked={selectedIds.has(Number(item.id))} disabled={!selectedIds.has(Number(item.id)) && (!hasMarketPrice || selectedForPhase.length >= 200)} onChange={event => setSelectedIds(current => { const next = new Set(current); if (event.target.checked) next.add(Number(item.id)); else next.delete(Number(item.id)); return next; })} /> : <span className="text-slate-300">—</span>}</td>
                                  <td className="px-3 py-3 font-medium">{item.internalIdentifier}{item.publicIdentifier && item.publicIdentifier !== item.internalIdentifier ? <span className="block text-xs text-slate-500">Public: {item.publicIdentifier}</span> : null}{item.allocationNotes ? <span className="block max-w-72 whitespace-normal text-xs font-normal text-slate-600">{item.allocationNotes}</span> : null}</td>
                                  <td className="px-3 py-3">{unitTypesById.get(String(item.unitTypeId))?.name || 'Unit type'}</td>
                                  <td className="px-3 py-3">{item.transactionType === 'for_rent' ? 'For rent' : 'For sale'}</td>
                                  <td className="px-3 py-3 whitespace-nowrap">{formatAllocationPrice(item, unitTypesById.get(String(item.unitTypeId)))}</td>
                                  <td className="px-3 py-3"><Badge className={`border ${statusTone(item.status)}`}>{statusLabel(item.status)}</Badge></td>
                                  <td className="px-3 py-3 text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</td>
                                  <td className="px-3 py-3"><div className="flex flex-wrap gap-1">
                                    <Button size="sm" variant="outline" onClick={() => setHistoryItem(item)}>History</Button>
                                    {!archived ? <>
                                      {getNextStatuses(item).map(nextStatus => <Button key={nextStatus} size="sm" variant="outline" onClick={() => openAction({ kind: 'transition', item, nextStatus })}>{transitionActionLabel(item, nextStatus)}</Button>)}
                                      {(item.status === 'planned' || item.status === 'available') ? <Button size="sm" variant="outline" onClick={() => openAction({ kind: 'mode', item })}>Change to {item.transactionType === 'for_sale' ? 'rent' : 'sale'}</Button> : null}
                                      {(item.status === 'planned' || item.status === 'available') ? <Button size="sm" variant="outline" onClick={() => openAction({ kind: 'price', item })}>Edit price</Button> : null}
                                      {(item.status === 'planned' || item.status === 'available') ? <Button size="sm" variant="outline" onClick={() => openAction({ kind: 'details', item })}>Edit details</Button> : null}
                                      {item.status === 'legal_hold' ? <Button size="sm" variant="outline" onClick={() => openAction({ kind: 'legal_hold', item })}>Review hold</Button> : null}
                                      {item.status === 'leased' ? <Button size="sm" variant="outline" onClick={() => openAction({ kind: 'lease_return', item })}>Return to market</Button> : null}
                                    </> : null}
                                  </div></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {visiblePhases.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-slate-600">No phases in this view. Choose another phase filter to see the rest of the development history.</CardContent></Card>
            ) : null}
          </div>

          <Card>
            <CardHeader><h2 className="text-lg font-semibold">Recent inventory history</h2><p className="text-sm text-slate-600">Release, status and sale/rent changes recorded for this development.</p></CardHeader>
            <CardContent>
              {audit.length ? <ol className="divide-y">{audit.map(entry => {
                const metadata = entry.metadata as Record<string, unknown> | null;
                const actorName = [entry.actorFirstName, entry.actorLastName].filter(Boolean).join(' ') || entry.actorName || `User ${entry.actorUserId}`;
                const itemName = items.find(item => Number(item.id) === Number(entry.targetId))?.internalIdentifier;
                const targetLabel = entry.targetType === 'development_phase'
                  ? phaseNames.get(Number(entry.targetId)) || `Phase ${entry.targetId}`
                  : entry.targetType === 'development'
                    ? development.name
                    : itemName || `Home ${entry.targetId}`;
                return <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-medium text-slate-900">{targetLabel} · {String(entry.action).replace(/\./g, ' ').replace(/_/g, ' ')}</p><p className="text-sm text-slate-600">{String((metadata as any)?.reason || 'No reason recorded')} · {actorName}</p><p className="break-words text-xs text-slate-500">{describeAuditChange(entry)}</p></div><time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time></li>;
              })}</ol> : <p className="rounded-lg border border-dashed p-5 text-sm text-slate-600">Inventory actions will appear here with the actor, reason and before/after state.</p>}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Prepare a development phase</DialogTitle>
            <DialogDescription>
              This creates a hidden planning phase. Add its inventory register, then release the phase and selected homes when they are approved for market.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="block space-y-1 text-sm font-medium">Phase or extension name
                <input value={phaseName} onChange={event => setPhaseName(event.target.value)} maxLength={255} placeholder="Watervalspruit Extension 57" className="w-full rounded-md border border-input px-3 py-2 font-normal" />
              </label>
              <label className="block space-y-1 text-sm font-medium">Phase number
                <input type="number" min={1} max={100000} step={1} value={phaseNumber} onChange={event => setPhaseNumber(event.target.value)} className="w-full rounded-md border border-input px-3 py-2 font-normal" />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium">Description <span className="font-normal text-slate-500">(optional)</span>
              <textarea value={phaseDescription} onChange={event => setPhaseDescription(event.target.value)} maxLength={2000} rows={3} placeholder="Internal preparation notes for this phase" className="w-full rounded-md border border-input px-3 py-2 font-normal" />
            </label>
            <label className="block space-y-1 text-sm font-medium">Reason for preparing this phase
              <textarea value={phasePreparationReason} onChange={event => setPhasePreparationReason(event.target.value)} minLength={10} maxLength={500} rows={2} placeholder="For example: approved for the next sales release" className="w-full rounded-md border border-input px-3 py-2 font-normal" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseDialogOpen(false)}>Cancel</Button>
            <Button disabled={phasePreparationMutation.isPending} onClick={submitPhasePreparation}>
              {phasePreparationMutation.isPending ? 'Preparing…' : 'Create planning phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={phaseLifecycleAction !== null}
        onOpenChange={open => {
          if (!open) {
            setPhaseLifecycleAction(null);
            setPhaseLifecycleReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{phaseLifecycleAction?.kind === 'archive' ? 'Archive this phase?' : 'Reopen this phase?'}</DialogTitle>
            <DialogDescription>
              {phaseLifecycleAction ? `Phase ${phaseLifecycleAction.phase.phaseNumber}: ${phaseLifecycleAction.phase.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {phaseLifecycleAction?.kind === 'archive'
                ? 'Archiving hides this phase from public and partner availability while preserving its lifecycle status, inventory, and history. Available stock and open commitments must be resolved first.'
                : 'Reopening removes the archive marker and preserves the phase’s current sales status. Sold-out or completed phases stay in history. Inventory states are preserved; planned stock stays hidden until the authorized phase and batch release steps are complete.'}
            </p>
            <label className="block space-y-1 text-sm font-medium">Reason for this decision
              <textarea value={phaseLifecycleReason} onChange={event => setPhaseLifecycleReason(event.target.value)} minLength={10} maxLength={500} rows={3} placeholder="Explain why this phase is being archived or reopened" className="w-full rounded-md border border-input px-3 py-2 font-normal" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPhaseLifecycleAction(null); setPhaseLifecycleReason(''); }}>Cancel</Button>
            <Button
              disabled={phaseLifecycleReason.trim().length < 10 || archivePhaseMutation.isPending || reopenPhaseMutation.isPending}
              onClick={submitPhaseLifecycleAction}
            >
              {archivePhaseMutation.isPending || reopenPhaseMutation.isPending
                ? 'Saving…'
                : phaseLifecycleAction?.kind === 'archive'
                  ? 'Archive phase'
                  : 'Reopen phase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {action ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAction(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-action-title" className="my-8 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-amber-50 p-2 text-amber-800"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <h2 id="inventory-action-title" className="text-lg font-semibold">
                  {action.kind === 'transition'
                    ? `${action.item.internalIdentifier}: ${transitionActionLabel(action.item, action.nextStatus)}`
                    : action.kind === 'mode'
                      ? 'Change market mode'
                      : action.kind === 'price'
                        ? `Update ${action.item.transactionType === 'for_rent' ? 'rental' : 'sale'} price`
                        : action.kind === 'details'
                          ? `Update ${action.item.internalIdentifier} details`
                          : action.kind === 'legal_hold'
                            ? 'Review hold and choose an outcome'
                            : 'Return leased home to market'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {action.kind === 'legal_hold'
                    ? 'Only update marketability after the developer’s CRM, deal register, or legal system confirms the hold is cleared. This does not cancel a deal or determine its legal effect.'
                    : action.kind === 'transition' && action.nextStatus === 'legal_hold'
                      ? 'This removes the home from market while the issue is reviewed. It does not cancel the contract or release the home for sale.'
                      : action.kind === 'mode'
                        ? 'Only planned or currently available homes can switch between sale and rent. Reserved, contracted, leased, and sold homes stay protected. The sale and rental asking prices remain separate.'
                        : action.kind === 'lease_return'
                          ? 'Choose whether this home returns to rental or sale marketing after the lease has ended. The lease close-out reference and asking price are recorded with the return.'
                          : action.kind === 'transition'
                            ? 'This status change is recorded with a reference to the developer’s operating system.'
                            : 'This change and your reason are recorded in the inventory history.'}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {action.kind === 'transition' ? <>
                <label className="block space-y-1 text-sm font-medium">Source system<input value={actionSourceSystem} onChange={event => setActionSourceSystem(event.target.value)} placeholder="e.g. Bitrix24, CRM, tenancy register" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <label className="block space-y-1 text-sm font-medium">Source record reference {(['reserved', 'under_offer', 'under_contract', 'sold', 'leased', 'legal_hold'].includes(action.nextStatus) || (action.nextStatus === 'available' && ['reserved', 'under_offer'].includes(action.item.status))) ? '(required)' : '(optional)'}<input value={actionSourceReference} onChange={event => setActionSourceReference(event.target.value)} maxLength={160} placeholder="Reservation, offer, cancellation, contract or clearance reference" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                {action.nextStatus === 'legal_hold' ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Use this when the external system shows a failed or disputed deal. The home stays unavailable here until an authorized manager records the clearance and chooses whether to return it to market, keep it planned, or withdraw it.</p> : null}
              </> : null}
              {action.kind === 'price' ? <>
                <label className="block space-y-1 text-sm font-medium">{action.item.transactionType === 'for_rent' ? 'Monthly rental price' : 'Sale price'}<input inputMode="decimal" value={actionPrice} onChange={event => setActionPrice(event.target.value)} placeholder="Leave blank to use unit type pricing" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <p className="text-xs text-slate-600">The unit type’s “from–to” range remains the default advertised price. Add a price here when this home has a different asking price because of its size, position, or included features. Sale and rental asking prices are stored separately. For available inventory, the change updates public and partner “from–to” ranges; it does not record a negotiated deal price.</p>
              </> : null}
              {action.kind === 'details' ? <>
                <label className="block space-y-1 text-sm font-medium">Private allocation notes
                  <textarea value={actionAllocationNotes} onChange={event => setActionAllocationNotes(event.target.value)} maxLength={1000} rows={3} placeholder="For internal context, e.g. ground-floor position with larger patio" className="w-full rounded-md border border-input px-3 py-2 font-normal" />
                </label>
                <p className="text-xs text-slate-600">These notes are visible only to authorized developer workspace users. If size, plan, or included features change what buyers or partners need to see, describe that as a distinct unit type. Set the allocation’s asking price separately when it differs.</p>
              </> : null}
              {action.kind === 'mode' || action.kind === 'lease_return' ? <>
                {action.kind === 'lease_return' ? <label className="block space-y-1 text-sm font-medium">Next market mode<select value={actionTransactionType} onChange={event => {
                  const nextType = event.target.value as 'for_sale' | 'for_rent';
                  setActionTransactionType(nextType);
                  const nextPrice = nextType === 'for_rent' ? action.item.rentPrice : action.item.salePrice;
                  setActionPrice(nextPrice == null ? '' : String(nextPrice));
                }} className="w-full rounded-md border border-input bg-white px-3 py-2 font-normal"><option value="for_sale">For sale</option><option value="for_rent">For rent</option></select></label> : <p className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">This changes the home from {action.item.transactionType === 'for_rent' ? 'rental' : 'sale'} to {actionTransactionType === 'for_rent' ? 'rental' : 'sale'} marketing.</p>}
                <label className="block space-y-1 text-sm font-medium">{actionTransactionType === 'for_rent' ? 'Monthly rent asking price' : 'Sale asking price'}<input inputMode="decimal" value={actionPrice} onChange={event => setActionPrice(event.target.value)} placeholder="Leave blank to use the unit type range" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <p className="text-xs text-slate-600">A marketable home needs a valid asking price for its new mode. The other mode’s price is retained. When a unit type has no price range for this mode, enter the allocation price here.</p>
              </> : null}
              {action.kind === 'legal_hold' ? <>
                <label className="block space-y-1 text-sm font-medium">After clearance, set market status to<select value={legalReturnTo} onChange={event => setLegalReturnTo(event.target.value as typeof legalReturnTo)} className="w-full rounded-md border border-input bg-white px-3 py-2 font-normal"><option value="" disabled>Select an outcome</option><option value="available">Available now (visible through active channels)</option><option value="planned">Planned (hidden until a new batch release)</option><option value="withdrawn">Withdrawn (kept off market)</option></select></label>
                <label className="block space-y-1 text-sm font-medium">Clearance source system<input value={actionSourceSystem} onChange={event => setActionSourceSystem(event.target.value)} maxLength={100} placeholder="e.g. Bitrix24, deal register, conveyancer system" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <label className="block space-y-1 text-sm font-medium">Cancellation or clearance record reference<input value={actionSourceReference} onChange={event => setActionSourceReference(event.target.value)} maxLength={160} placeholder="Reference confirming the deal or hold is closed" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <p className="text-xs text-slate-600">Choose Available only after cancellation or clearance is confirmed in that system. Planned keeps the home hidden and requires a separate batch release before it can be marketed again.</p>
              </> : null}
              {action.kind === 'lease_return' ? <>
                <label className="block space-y-1 text-sm font-medium">Lease system<input value={actionSourceSystem} onChange={event => setActionSourceSystem(event.target.value)} maxLength={100} placeholder="e.g. tenancy register, CRM, property manager system" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <label className="block space-y-1 text-sm font-medium">Lease close-out or termination reference<input value={actionSourceReference} onChange={event => setActionSourceReference(event.target.value)} maxLength={160} placeholder="Reference confirming the lease end" className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
                <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={leaseEndConfirmed} onChange={event => setLeaseEndConfirmed(event.target.checked)} className="mt-1" /><span>I confirm the lease has ended and the home is authorized to return to market.</span></label>
              </> : null}
              <label className="block space-y-1 text-sm font-medium">Reason<textarea value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={10} maxLength={500} rows={3} placeholder="Explain the operational decision. This is saved in the inventory history." className="w-full rounded-md border border-input px-3 py-2 font-normal" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button disabled={isActionPending || (action.kind === 'legal_hold' && (!legalReturnTo || !actionSourceSystem.trim() || !actionSourceReference.trim() || actionReason.trim().length < 10))} onClick={submitAction}>{isActionPending ? 'Saving…' : 'Record change'}</Button></div>
          </section>
        </div>
      ) : null}

      {historyItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setHistoryItem(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="inventory-history-title" className="my-8 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="inventory-history-title" className="text-lg font-semibold">{historyItem.internalIdentifier} history</h2><p className="mt-1 text-sm text-slate-600">Changes to this home, its phase, and the development register.</p></div>
              <Button variant="outline" onClick={() => setHistoryItem(null)}>Close</Button>
            </div>
            {itemHistoryQuery.isLoading ? <p className="py-6 text-sm text-slate-600">Loading history…</p> : itemHistoryQuery.error ? <p className="py-6 text-sm text-rose-700">History could not be loaded. Try again.</p> : itemHistoryQuery.data?.length ? (
              <ol className="mt-4 divide-y">
                {itemHistoryQuery.data.map(entry => {
                  const metadata = entry.metadata as Record<string, unknown> | null;
                  const actorName = [entry.actorFirstName, entry.actorLastName].filter(Boolean).join(' ') || entry.actorName || `User ${entry.actorUserId}`;
                  const targetLabel = entry.targetType === 'development_phase'
                    ? phaseNames.get(Number(entry.targetId)) || `Phase ${entry.targetId}`
                    : entry.targetType === 'development'
                      ? development.name
                      : historyItem.internalIdentifier;
                  return <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-medium text-slate-900">{targetLabel} · {String(entry.action).replace(/\./g, ' ').replace(/_/g, ' ')}</p><p className="text-sm text-slate-600">{String(metadata?.reason || 'No reason recorded')} · {actorName}</p><p className="break-words text-xs text-slate-500">{describeAuditChange(entry)}</p></div><time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time></li>;
                })}
              </ol>
            ) : <p className="mt-4 rounded-lg border border-dashed p-5 text-sm text-slate-600">No recorded history for this home yet.</p>}
          </section>
        </div>
      ) : null}
    </div>
  );
}
