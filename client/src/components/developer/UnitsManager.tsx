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

export default function UnitsManager() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Units</h2>
        <div className="flex gap-2">
          <Button variant="outline">Bulk Upload CSV</Button>
          <Button variant="outline">Add Unit Type</Button>
          <Button variant="outline">Edit Pricing</Button>
          <Button variant="outline">Update Availability</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Units Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
