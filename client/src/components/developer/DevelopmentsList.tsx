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

export default function DevelopmentsList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="typ-h2">Developments</h2>
        <Button className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" /> Add Development
        </Button>
      </div>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">All Developments</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
