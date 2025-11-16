import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function SupportCenter() {
  return (
    <div className="space-y-4">
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Help Articles</CardTitle>
          <CardDescription>Search common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input className="input" placeholder="Search help..." />
          <div className="text-sm text-muted-foreground">No results yet.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="typ-h3">Submit a Ticket</CardTitle>
          <CardDescription>Our team will get back to you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input className="input" placeholder="Subject" />
          <Textarea className="input" placeholder="Describe your issue" />
          <Button className="btn btn-primary">Send</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="typ-h3">Chat</CardTitle>
          <CardDescription>Live support widget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chat widget placeholder.</div>
        </CardContent>
      </Card>
    </div>
  );
}
