import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function SupportCenter() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Help Articles</CardTitle>
          <CardDescription>Search common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Search help..." />
          <div className="text-sm text-muted-foreground">No results yet.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submit a Ticket</CardTitle>
          <CardDescription>Our team will get back to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Subject" />
          <Textarea placeholder="Describe your issue" />
          <Button>Send</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Live support widget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chat widget placeholder.</div>
        </CardContent>
      </Card>
    </div>
  );
}
