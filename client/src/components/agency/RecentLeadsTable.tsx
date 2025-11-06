import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, Phone, MessageSquare, Calendar, ArrowRight } from 'lucide-react';

interface RecentLeadsTableProps {
  leads: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    message?: string;
    leadType: string;
    status: string;
    createdAt: string;
    propertyId?: number;
  }>;
  isLoading?: boolean;
  onViewAll?: () => void;
}

export function RecentLeadsTable({ leads, isLoading, onViewAll }: RecentLeadsTableProps) {
  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Recent Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Recent Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent leads</p>
            <p className="text-sm">New leads will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getLeadTypeIcon = (type: string) => {
    switch (type) {
      case 'inquiry':
        return <MessageSquare className="h-4 w-4" />;
      case 'viewing_request':
        return <Calendar className="h-4 w-4" />;
      case 'offer':
        return <Mail className="h-4 w-4" />;
      case 'callback':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'default';
      case 'contacted':
        return 'secondary';
      case 'qualified':
        return 'outline';
      case 'converted':
        return 'default';
      case 'closed':
      case 'lost':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatLeadType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Recent Leads
        </CardTitle>
        {onViewAll && (
          <Button variant="outline" size="sm" onClick={onViewAll}>
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.slice(0, 5).map((lead: any) => (
            <div key={lead.id} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="flex-shrink-0 mt-1">{getLeadTypeIcon(lead.leadType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{lead.name}</h4>
                  <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">
                    {lead.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {formatLeadType(lead.leadType)}
                  {lead.propertyId && ` • Property #${lead.propertyId}`}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{lead.email}</span>
                  {lead.phone && <span>{lead.phone}</span>}
                  <span>{formatDate(lead.createdAt)}</span>
                </div>
                {lead.message && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{lead.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
