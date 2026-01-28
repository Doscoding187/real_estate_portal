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
import { Search, Mail, Phone, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const PublisherLeads: React.FC = () => {
  const { selectedBrandId } = useDeveloperContext();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: leads, isLoading } = trpc.superAdminPublisher.getBrandLeads.useQuery(
    { brandProfileId: selectedBrandId!, limit: 100 },
    { enabled: !!selectedBrandId },
  );

  const filteredLeads =
    leads?.filter(
      lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Leads Dashboard</h3>
        <Badge variant="outline" className="text-xs">
          Read Only View
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-md font-medium">Inquiries & Leads</CardTitle>
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
                          <Badge variant="secondary" className="font-normal">
                            Development Inquiry
                          </Badge>
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
                            : lead.brandLeadStatus === 'claimed'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      >
                        {lead.brandLeadStatus}
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
                    No leads found for this brand yet.
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
