import React from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const CampaignDetailsPage: React.FC = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = params.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/marketing')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaign Details</h1>
          <p className="text-slate-500">Campaign ID: {id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <p>Detailed analytics and insights coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignDetailsPage;
