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
        <h2 className="text-2xl font-bold">Developments</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Development
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Developments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
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
