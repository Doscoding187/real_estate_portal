import React, { useState } from 'react';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mail, Phone, User, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const EXPORT_PAGE_SIZE = 200;

function leadMatchesSearch(lead: any, searchTerm: string): boolean {
  const query = searchTerm.trim().toLowerCase();
  if (!query) return true;
  return [lead.name, lead.email, lead.phone, lead.development?.name, lead.unitName, lead.message]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(query));
}

function csvCell(value: unknown): string {
  let content = value === null || value === undefined ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(content)) content = `'${content}`;
  return `"${content.replace(/"/g, '""')}"`;
}

function publisherLeadsCsv(rows: any[]): string {
  const columns: Array<[string, (lead: any) => unknown]> = [
    ['Captured at', lead => lead.createdAt],
    ['Name', lead => lead.name],
    ['Email', lead => lead.email],
    ['Phone', lead => lead.phone],
    ['Development', lead => lead.development?.name],
    ['Unit type', lead => lead.unitName],
    ['Price from (ZAR)', lead => lead.unitPriceFrom],
    ['Bedrooms', lead => lead.unitBedrooms],
    ['Bathrooms', lead => lead.unitBathrooms],
    ['Enquiry type', lead => lead.leadType],
    ['Message', lead => lead.message],
    ['Source', lead => lead.leadSource || lead.source],
    ['Consent captured at', lead => lead.consentCapturedAt],
    ['Consent version', lead => lead.consentVersion],
    ['Consent source', lead => lead.consentSource],
  ];

  return [
    columns.map(([label]) => csvCell(label)).join(','),
    ...rows.map(lead => columns.map(([, value]) => csvCell(value(lead))).join(',')),
  ].join('\r\n');
}

const PublisherLeads: React.FC = () => {
  const { selectedBrandId } = useDeveloperContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const utils = trpc.useUtils();

  const { data: leads, isLoading } = trpc.superAdminPublisher.getPublisherLeads.useQuery(
    { cataloguePublisherId: selectedBrandId!, limit: 100 },
    { enabled: !!selectedBrandId },
  );

  const filteredLeads = leads?.filter(lead => leadMatchesSearch(lead, searchTerm)) || [];

  const handleExport = async () => {
    if (!selectedBrandId || isExporting) return;
    setIsExporting(true);
    try {
      const allLeads: any[] = [];
      let offset = 0;
      let page: any[];
      do {
        page = await utils.superAdminPublisher.getPublisherLeads.fetch({
          cataloguePublisherId: selectedBrandId,
          limit: EXPORT_PAGE_SIZE,
          offset,
        });
        allLeads.push(...page);
        offset += page.length;
      } while (page.length === EXPORT_PAGE_SIZE);

      const matchingLeads = allLeads.filter(lead => leadMatchesSearch(lead, searchTerm));
      const consentedLeads = matchingLeads.filter(lead => Boolean(lead.consentCapturedAt));
      const skippedWithoutConsent = matchingLeads.length - consentedLeads.length;
      if (!consentedLeads.length) {
        toast.info('No enquiries with captured consent match this search.');
        return;
      }

      const blob = new Blob([`\uFEFF${publisherLeadsCsv(consentedLeads)}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `publisher-${selectedBrandId}-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

      toast.success(
        `Exported ${consentedLeads.length} consented enquiries${skippedWithoutConsent ? `; skipped ${skippedWithoutConsent} without captured consent` : ''}.`,
      );
    } catch {
      toast.error('Unable to prepare the enquiry spreadsheet. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Curated enquiries</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={!selectedBrandId || isLoading || isExporting || !leads?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Preparing…' : 'Export CSV'}
          </Button>
          <Badge variant="outline" className="text-xs">
            Read Only View
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md font-medium">
              Property Listify-custodied enquiries
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            CSV export includes contact details only for enquiries with a recorded consent
            timestamp.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading leads...
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {format(new Date(lead.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {lead.name}
                        </span>
                        <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {lead.developmentId ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="secondary" className="font-normal">
                              {lead.development?.name || 'Development enquiry'}
                            </Badge>
                            {lead.unitName ? (
                              <span className="text-xs font-medium text-slate-600">
                                Unit: {lead.unitName}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="outline" className="font-normal">
                            Property Inquiry
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          lead.brandLeadStatus === 'captured'
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
                            : lead.deliveryStatus === 'attention_required'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      >
                        {lead.deliveryStatus === 'attention_required'
                          ? 'Needs platform action'
                          : lead.brandLeadStatus || 'Captured'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {lead.leadSource || 'Direct'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No curated enquiries found for this publisher yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublisherLeads;
