import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import DevelopmentWizard from '@/components/developer/DevelopmentWizard';

export default function DevelopmentsList() {
  const [showWizard, setShowWizard] = React.useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="typ-h2">Developments</h2>
        <Button className="btn btn-primary" onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Development
        </Button>
      </div>

      {showWizard && (
        <div className="space-y-4">
          <DevelopmentWizard onClose={() => setShowWizard(false)} />
        </div>
      )}

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">All Developments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <input className="input flex-1" placeholder="Search developments" />
            <Button className="btn btn-secondary">Filter</Button>
          </div>
          <Table className="table-soft table-soft--comfortable">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Units Available</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>
                  <Badge variant="outline">Coming Soon</Badge>
                </TableCell>
                <TableCell>0</TableCell>
                <TableCell>0</TableCell>
                <TableCell>
                  <Badge variant="secondary">Private</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="flex items-center justify-end mt-3 text-sm text-muted-foreground">
            Pagination placeholder
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
