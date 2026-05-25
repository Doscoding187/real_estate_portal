import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';
import {
  LEAD_ROUTING_OUTCOMES,
  type BuyerLeadStatus,
  type LeadImportRow,
  type LeadRoutingOutcome,
  type LeadSource,
} from '@shared/leadRouting';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';

const SOURCE_LABELS: Record<LeadSource, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  organic: 'Organic',
  whatsapp: 'WhatsApp',
  linkedin_ads: 'LinkedIn Ads',
  direct: 'Direct',
  internal_explore: 'Internal Explore',
  manual: 'Manual',
};

const STATUS_LABELS: Partial<Record<BuyerLeadStatus, string>> = {
  new: 'New',
  qualified_light: 'Lightly qualified',
  needs_review: 'Needs review',
  contacted: 'Contacted',
  viewing_booked: 'Viewing booked',
  application_started: 'Application started',
  application_submitted: 'Application submitted',
  deal_created: 'Deal created',
  lost: 'Lost',
  duplicate: 'Duplicate',
};

const OUTCOME_LABELS: Record<LeadRoutingOutcome, string> = {
  route_to_distribution_program: 'Distribution program',
  route_to_internal_sales: 'Internal sales',
  route_to_developer_contact: 'Developer contact',
  route_to_general_review: 'General review',
  route_to_whatsapp_followup: 'WhatsApp follow-up',
  route_to_credit_readiness: 'Credit readiness',
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const statusTone = (status?: BuyerLeadStatus | null) => {
  if (status === 'duplicate' || status === 'needs_review')
    return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'deal_created' || status === 'viewing_booked')
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'lost') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-blue-200 bg-blue-50 text-blue-800';
};

const outcomeTone = (outcome?: LeadRoutingOutcome | null) => {
  if (outcome === 'route_to_credit_readiness')
    return 'border-purple-200 bg-purple-50 text-purple-800';
  if (outcome === 'route_to_whatsapp_followup')
    return 'border-green-200 bg-green-50 text-green-800';
  if (outcome === 'route_to_general_review') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const IMPORT_HEADER_ALIASES: Record<string, keyof LeadImportRow> = {
  lead_id: 'externalLeadId',
  external_lead_id: 'externalLeadId',
  meta_lead_id: 'externalLeadId',
  full_name: 'fullName',
  name: 'fullName',
  first_name: 'firstName',
  firstname: 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  phone: 'phone',
  phone_number: 'phone',
  mobile: 'phone',
  cell: 'phone',
  email: 'email',
  email_address: 'email',
  area: 'preferredArea',
  preferred_area: 'preferredArea',
  location: 'preferredArea',
  gross_monthly_income: 'grossMonthlyIncomeRange',
  monthly_income: 'grossMonthlyIncomeRange',
  income_range: 'grossMonthlyIncomeRange',
  buying_mode: 'buyingMode',
  buying_alone_or_joint: 'buyingMode',
  employment_type: 'employmentType',
  employment: 'employmentType',
  credit_report_status: 'creditReportStatus',
  credit_status: 'creditReportStatus',
  buying_timeline: 'buyingTimeline',
  timeline: 'buyingTimeline',
  preferred_contact_method: 'preferredContactMethod',
  contact_method: 'preferredContactMethod',
  contact_permission: 'contactPermission',
  marketing_consent: 'marketingConsent',
  notes: 'notes',
};

const SAMPLE_IMPORT_CSV =
  'full_name,phone,email,preferred_area,gross_monthly_income,employment_type,buying_mode,credit_report_status,preferred_contact_method,contact_permission,marketing_consent\n' +
  'Neo Mokoena,0821234567,neo@example.com,Johannesburg South,R25000-R35000,Permanently employed,Joint application,Not checked recently,WhatsApp,yes,no';

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseImportCsv(csv: string): { rows: LeadImportRow[]; error: string | null } {
  const lines = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { rows: [], error: 'Add a header row and at least one lead row.' };

  const headers = parseCsvLine(lines[0]).map(
    header => IMPORT_HEADER_ALIASES[normalizeHeader(header)],
  );
  const hasContactHeader = headers.includes('phone') || headers.includes('email');
  if (
    !headers.includes('fullName') &&
    (!headers.includes('firstName') || !headers.includes('lastName'))
  ) {
    return { rows: [], error: 'CSV needs full_name, or first_name and last_name columns.' };
  }
  if (!hasContactHeader) return { rows: [], error: 'CSV needs at least a phone or email column.' };

  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return headers.reduce<LeadImportRow>((row, key, index) => {
      if (!key) return row;
      const value = values[index]?.trim();
      if (value) (row as Record<string, unknown>)[key] = value;
      return row;
    }, {});
  });

  return { rows, error: rows.length ? null : 'No importable lead rows found.' };
}

export default function LeadRoutingReviewPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [routingFilter, setRoutingFilter] = useState<LeadRoutingOutcome | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [importSource, setImportSource] = useState<LeadSource>('manual');
  const [importCsv, setImportCsv] = useState('');
  const [importContactPermission, setImportContactPermission] = useState(true);
  const [importMarketingConsent, setImportMarketingConsent] = useState(false);
  const [privacyPolicyVersion, setPrivacyPolicyVersion] = useState('2026-05-25');
  const [importResult, setImportResult] = useState<string | null>(null);

  const parsedImport = useMemo(() => parseImportCsv(importCsv), [importCsv]);
  const importMutation = trpc.leadRouting.importBuyerLeads.useMutation({
    onSuccess: result => {
      setImportResult(
        `Imported ${result.imported}, duplicates ${result.duplicates}, skipped ${result.skipped}, failed ${result.failed}.`,
      );
      listQuery.refetch();
    },
    onError: error => {
      setImportResult(error.message);
    },
  });

  const handleImportSubmit = () => {
    if (parsedImport.error || parsedImport.rows.length === 0) {
      setImportResult(parsedImport.error ?? 'No rows to import.');
      return;
    }

    importMutation.mutate({
      sourceType: importSource,
      privacyPolicyVersion: privacyPolicyVersion.trim() || null,
      defaultContactPermission: importContactPermission,
      defaultMarketingConsent: importMarketingConsent,
      attribution: {
        sourceType: importSource,
        utmSource: importSource,
        utmMedium: importSource === 'manual' ? 'manual_import' : 'lead_import',
      },
      rows: parsedImport.rows,
    });
  };

  const listQuery = trpc.leadRouting.listLeadReviewItems.useQuery({
    limit: 50,
    offset: 0,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    routingOutcome: routingFilter === 'all' ? undefined : routingFilter,
  });

  const detailQuery = trpc.leadRouting.getLeadReviewDetail.useQuery(
    { buyerLeadId: selectedLeadId ?? 0 },
    { enabled: selectedLeadId !== null },
  );

  const leads = listQuery.data?.items ?? [];
  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter(lead => {
      const text = [
        lead.fullName,
        lead.email,
        lead.phone,
        lead.normalizedEmail,
        lead.normalizedPhone,
        lead.campaignSlug,
        lead.locationLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });
  }, [leads, searchTerm]);

  const detail = detailQuery.data;
  const selectedLead =
    detail ?? filteredLeads.find(lead => lead.id === selectedLeadId) ?? filteredLeads[0];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Lead routing ops
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Development lead review</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review captured buyer leads, their attribution, duplicate signals, match context, and
              the latest routing decision before handoff.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Review queue" value={leads.length} helper="Latest captured leads" />
          <MetricCard
            label="Needs review"
            value={leads.filter(lead => lead.status === 'needs_review').length}
            helper="Requires manual triage"
          />
          <MetricCard
            label="Duplicate signals"
            value={leads.filter(lead => lead.duplicateOfLeadId).length}
            helper="Linked, not deleted"
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Import captured leads</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Paste CSV exports from Meta forms or manual capture. Imported leads enter the same
                  session, dedupe, consent, and qualification flow.
                </p>
              </div>
              <Button variant="outline" onClick={() => setImportCsv(SAMPLE_IMPORT_CSV)}>
                Use sample
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={importCsv}
              onChange={event => {
                setImportCsv(event.target.value);
                setImportResult(null);
              }}
              placeholder="full_name,phone,email,preferred_area,gross_monthly_income,employment_type,buying_mode"
              className="min-h-32 font-mono text-sm"
            />
            <div className="grid gap-3 lg:grid-cols-[180px_180px_1fr_auto]">
              <Select
                value={importSource}
                onValueChange={value => setImportSource(value as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Import source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="meta_ads">Meta Ads</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="linkedin_ads">LinkedIn Ads</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={privacyPolicyVersion}
                onChange={event => setPrivacyPolicyVersion(event.target.value)}
                placeholder="Privacy version"
              />
              <div className="flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={importContactPermission}
                    onCheckedChange={checked => setImportContactPermission(checked === true)}
                  />
                  Contact permission
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={importMarketingConsent}
                    onCheckedChange={checked => setImportMarketingConsent(checked === true)}
                  />
                  Marketing consent
                </label>
              </div>
              <Button
                onClick={handleImportSubmit}
                disabled={
                  importMutation.isPending ||
                  Boolean(parsedImport.error) ||
                  parsedImport.rows.length === 0
                }
              >
                <Upload className="mr-2 h-4 w-4" />
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            </div>
            <div className="text-sm text-slate-600">
              {parsedImport.error ? (
                <span className="text-amber-700">{parsedImport.error}</span>
              ) : importCsv.trim() ? (
                <span>{parsedImport.rows.length} row(s) ready to import.</span>
              ) : (
                <span>
                  Supported headers include full_name, phone, email, preferred_area, income,
                  employment, buying_mode, and consent columns.
                </span>
              )}
              {importResult ? (
                <span className="ml-2 font-medium text-slate-900">{importResult}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_260px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search name, phone, email, campaign, or area"
                  className="pl-9"
                />
              </div>
              <Select
                value={sourceFilter}
                onValueChange={value => setSourceFilter(value as LeadSource | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={routingFilter}
                onValueChange={value => setRoutingFilter(value as LeadRoutingOutcome | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Routing outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routing outcomes</SelectItem>
                  {LEAD_ROUTING_OUTCOMES.map(outcome => (
                    <SelectItem key={outcome} value={outcome}>
                      {OUTCOME_LABELS[outcome]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Captured leads</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Routing</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                          Loading captured leads...
                        </TableCell>
                      </TableRow>
                    ) : filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                          No leads match the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map(lead => (
                        <TableRow
                          key={lead.id}
                          className={selectedLeadId === lead.id ? 'bg-emerald-50/60' : undefined}
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedLeadId(lead.id)}
                              className="text-left"
                            >
                              <span className="block font-medium text-slate-950">
                                {lead.fullName || 'Unnamed lead'}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {lead.phone || lead.email || 'No contact captured'}
                              </span>
                              {lead.duplicateOfLeadId ? (
                                <span className="mt-1 inline-flex items-center text-xs text-amber-700">
                                  <AlertCircle className="mr-1 h-3 w-3" /> Linked duplicate #
                                  {lead.duplicateOfLeadId}
                                </span>
                              ) : null}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-800">
                              {SOURCE_LABELS[lead.source]}
                            </div>
                            <div className="text-xs text-slate-500">
                              {lead.campaignSlug || 'No campaign'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusTone(lead.status)}>
                              {STATUS_LABELS[lead.status] ?? lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {lead.latestRoutingOutcome ? (
                              <Badge
                                variant="outline"
                                className={outcomeTone(lead.latestRoutingOutcome)}
                              >
                                {OUTCOME_LABELS[lead.latestRoutingOutcome]}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-500">No decision yet</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {formatDate(lead.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedLead ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Select a lead to review.
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {selectedLead.fullName || 'Unnamed lead'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedLead.phone || 'No phone'} · {selectedLead.email || 'No email'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <DetailItem label="Source" value={SOURCE_LABELS[selectedLead.source]} />
                    <DetailItem
                      label="Campaign"
                      value={selectedLead.campaignSlug || 'No campaign'}
                    />
                    <DetailItem label="Area" value={selectedLead.locationLabel || 'Not captured'} />
                    <DetailItem
                      label="Preferred contact"
                      value={selectedLead.preferredContactMethod || 'Not captured'}
                    />
                    <DetailItem
                      label="Contact permission"
                      value={selectedLead.contactPermission ? 'Granted' : 'Not granted'}
                    />
                    <DetailItem
                      label="Marketing consent"
                      value={selectedLead.marketingConsent ? 'Granted' : 'Not granted'}
                    />
                  </div>

                  {detail?.qualification ? (
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="mb-3 flex items-center text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Qualification
                        profile
                      </h3>
                      <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <DetailItem
                          label="Buying mode"
                          value={detail.qualification.buyingMode || 'Not captured'}
                        />
                        <DetailItem
                          label="Employment"
                          value={detail.qualification.employmentType || 'Not captured'}
                        />
                        <DetailItem
                          label="Income range"
                          value={detail.qualification.grossMonthlyIncomeRange || 'Not captured'}
                        />
                        <DetailItem
                          label="Credit report"
                          value={detail.qualification.creditReportStatus || 'Not captured'}
                        />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 flex items-center text-sm font-semibold text-slate-900">
                      <Clock className="mr-2 h-4 w-4 text-blue-600" /> Routing decision
                    </h3>
                    {selectedLead.latestRoutingOutcome ? (
                      <div className="space-y-2 text-sm">
                        <Badge
                          variant="outline"
                          className={outcomeTone(selectedLead.latestRoutingOutcome)}
                        >
                          {OUTCOME_LABELS[selectedLead.latestRoutingOutcome]}
                        </Badge>
                        <p className="text-slate-600">
                          {selectedLead.latestRoutingReason || 'No routing reason captured.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No routing decision has been stored yet.
                      </p>
                    )}
                  </section>

                  {detail?.matches?.length ? (
                    <section className="rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-900">
                        Development matches
                      </h3>
                      <div className="space-y-3">
                        {detail.matches.slice(0, 5).map(match => (
                          <div key={match.id} className="rounded-md border border-slate-100 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-slate-900">
                                Development #{match.developmentId}
                              </span>
                              <Badge variant="outline">{match.matchLabel}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Score {match.matchScore} ·{' '}
                              {match.matchReason || 'No match reason captured'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <Button variant="outline" className="w-full" disabled>
                    <ExternalLink className="mr-2 h-4 w-4" /> Handoff action coming next
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{helper}</div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-800">{value}</div>
    </div>
  );
}
