import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

const PAGE_SIZE = 50;

const actionLabel = (action: string) => {
  const text = action.replace(/[._]/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getActionBadgeVariant = (action: string) => {
  if (action.includes('approve') || action.includes('verify')) return 'default';
  if (action.includes('reject') || action.includes('delete')) return 'destructive';
  if (action.includes('update')) return 'secondary';
  return 'outline';
};

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  // Cursor stack: each entry is the oldest id of the previous page.
  const [cursors, setCursors] = useState<number[]>([]);
  const beforeId = cursors.length ? cursors[cursors.length - 1] : undefined;

  const { data, isLoading, isError, refetch } = trpc.admin.getAuditLogs.useQuery({
    limit: PAGE_SIZE,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    beforeId,
  });

  const { data: actionOptions } = trpc.admin.getAuditActionOptions.useQuery();
  const needle = searchTerm.trim().toLowerCase();
  const logs = (data?.logs ?? []).filter(
    log =>
      !needle ||
      log.action.toLowerCase().includes(needle) ||
      (log.actorName ?? '').toLowerCase().includes(needle) ||
      (log.targetType ?? '').toLowerCase().includes(needle),
  );

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System and security</h1>
        <p className="text-sm text-slate-600">
          The audit trail of admin actions, newest first.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
              <Input
                aria-label="Filter this page by action, admin or target"
                placeholder="Filter this page by action, admin or target..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={value => {
                setActionFilter(value);
                setCursors([]);
              }}
            >
              <SelectTrigger aria-label="Filter by action">
                <SelectValue placeholder="Filter by action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(actionOptions ?? []).map(value => (
                  <SelectItem key={value} value={value}>
                    {actionLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-2" data-testid="audit-loading">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : isError ? (
            <div role="alert" className="py-8 flex items-center justify-center gap-3 text-sm text-red-800">
              <span>Could not load the audit trail.</span>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : !logs.length ? (
            <div className="py-12 text-center text-muted-foreground">
              No audit entries match.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.actorName || `User #${log.userId}`}</TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action.replace(/[._]/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.targetType && log.targetId ? (
                        <span className="text-sm">
                          {log.targetType} #{log.targetId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(log.metadata)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data ? (
            <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
              <span className="text-sm text-muted-foreground">
                Showing {data.logs.length}
                {data.hasMore ? ' (older entries available)' : ''}
                {needle ? ` · ${logs.length} on this page match` : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cursors.length === 0}
                  onClick={() => setCursors(c => c.slice(0, -1))}
                >
                  Newer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => {
                    const oldest = data.logs[data.logs.length - 1]?.id;
                    if (oldest) setCursors(c => [...c, oldest]);
                  }}
                >
                  Older
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
