import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Home,
  Users,
  Filter,
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Commission {
  id: number;
  agentId: number;
  propertyId: number | null;
  leadId: number | null;
  amount: number;
  percentage: number | null;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  transactionType: 'sale' | 'rent' | 'referral' | 'other';
  description: string | null;
  payoutDate: string | null;
  paymentReference: string | null;
  createdAt: string;
  property?: {
    id: number;
    title: string;
  } | null;
  client?: {
    name: string;
  } | null;
}

interface CommissionSummary {
  totalEarned: number;
  pending: number;
  paid: number;
  approved: number;
}

interface CommissionTrackerProps {
  className?: string;
}

export function CommissionTracker({ className }: CommissionTrackerProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const utils = trpc.useUtils();

  // Fetch commissions
  const { data: commissions, isLoading } = trpc.agent.getMyCommissions.useQuery({
    status: statusFilter || undefined,
  });

  // Export CSV mutation
  const exportCSVMutation = trpc.agent.exportCommissionsCSV.useMutation({
    onSuccess: data => {
      const blob = new Blob([data.content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Commission report exported successfully');
    },
    onError: error => {
      toast.error(error.message || 'Failed to export commission report');
    },
  });

  // Calculate summary statistics
  const calculateSummary = (commissions: Commission[]): CommissionSummary => {
    return commissions.reduce(
      (summary, commission) => {
        const amount = commission.amount || 0;
        switch (commission.status) {
          case 'pending':
            summary.pending += amount;
            break;
          case 'paid':
            summary.paid += amount;
            summary.totalEarned += amount;
            break;
          case 'approved':
            summary.approved += amount;
            break;
        }
        return summary;
      },
      {
        totalEarned: 0,
        pending: 0,
        paid: 0,
        approved: 0,
      },
    );
  };

  const filteredCommissions =
    commissions?.filter(commission => {
      if (
        searchQuery &&
        !commission.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !commission.client?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    }) || [];

  const summary = calculateSummary(commissions || []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleExport = () => {
    exportCSVMutation.mutate({
      status: statusFilter || undefined,
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Commission Tracker</h2>
        </div>
        <Button onClick={handleExport} disabled={exportCSVMutation.isPending}>
          <Download className="h-4 w-4 mr-2" />
          {exportCSVMutation.isPending ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">
                  R{' '}
                  {(summary.totalEarned / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  R{' '}
                  {(summary.pending / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  R{' '}
                  {(summary.approved / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">
                  R{' '}
                  {(summary.paid / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search properties or clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Showing {filteredCommissions.length} of {commissions?.length || 0} commissions
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Commission Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading commissions...</div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No commissions found</div>
          ) : (
            <div className="space-y-4">
              {filteredCommissions.map(commission => (
                <CommissionCard key={commission.id} commission={commission} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CommissionCardProps {
  commission: Commission;
}

function CommissionCard({ commission }: CommissionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-primary">
                R{' '}
                {(commission.amount / 100).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              <Badge className={`${getStatusColor(commission.status)} flex items-center gap-1`}>
                {getStatusIcon(commission.status)}
                {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
              </Badge>

              <Badge variant="outline">{commission.transactionType}</Badge>

              {commission.percentage && (
                <Badge variant="secondary">{(commission.percentage / 100).toFixed(2)}%</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                {commission.property && (
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>{commission.property.title}</span>
                  </div>
                )}

                {commission.client && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{commission.client.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-muted-foreground">
                <div>Created: {new Date(commission.createdAt).toLocaleDateString()}</div>

                {commission.payoutDate && (
                  <div>Payout: {new Date(commission.payoutDate).toLocaleDateString()}</div>
                )}

                {commission.paymentReference && <div>Ref: {commission.paymentReference}</div>}
              </div>
            </div>

            {commission.description && (
              <div className="mt-3 text-sm">
                <strong>Notes:</strong> {commission.description}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
