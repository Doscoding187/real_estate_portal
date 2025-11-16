import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function MessagesCenter() {
  return (
    <div className="space-y-6">
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Messages</CardTitle>
          <CardDescription>Lead inquiries and internal messages</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            <Input className="input" placeholder="Search conversations" />
            <div className="border-light rounded-16 p-3 space-y-2 h-72 overflow-auto">
              {[1,2,3].map((i) => (
                <div key={i} className="p-2 rounded-12 hover:bg-muted cursor-pointer transition">
                  <div className="font-medium">Conversation #{i}</div>
                  <div className="text-xs text-muted-foreground">Last message preview…</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="border-light rounded-16 p-3 h-60 overflow-auto">
              <div className="text-sm text-muted-foreground">Select a conversation to view messages.</div>
            </div>
            <div className="space-y-2">
              <Textarea className="input" placeholder="Type your message..." rows={3} />
              <div className="flex items-center justify-end">
                <Button className="btn btn-primary">Send</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Notifications</CardTitle>
          <CardDescription>System and activity updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1,2,3].map((i) => (
            <div key={i} className="border-light rounded-12 p-3 text-sm">
              Notification item #{i}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
