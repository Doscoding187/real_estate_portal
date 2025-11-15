import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function BillingPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current plan and billing cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No subscription found.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Campaign Billing</CardTitle>
          <CardDescription>History of marketing spend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No campaign charges.</div>
        </CardContent>
      </Card>
    </div>
  );
}
