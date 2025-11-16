import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocumentsMedia() {
  return (
    <div className="space-y-4">
      <h2 className="typ-h2">Documents & Media</h2>
      <Card className="card">
        <CardHeader>
          <CardTitle className="typ-h3">Folders</CardTitle>
          <CardDescription>Organize price lists, brochures, floor plans, videos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Price Lists', 'Brochures', 'Floor Plans', 'Videos'].map(name => (
              <div key={name} className="border-light rounded-16 p-3">
                <div className="font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">0 files</div>
                <div className="mt-2">
                  <Badge variant="outline">Private</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
