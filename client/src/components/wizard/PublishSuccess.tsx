
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

export const PublishSuccess: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[500px]">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Development Submitted Successfully!
      </h2>
      
      <p className="text-lg text-gray-600 max-w-md mb-8">
        Your development has been submitted for review. It will be reviewed by our team within 24 hours.
        You can check the status in your dashboard.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => setLocation('/developer/dashboard')}
          className="bg-primary hover:bg-primary/90"
        >
          Go to Dashboard
        </Button>
        <Button 
          variant="outline"
          onClick={() => setLocation('/developer/developments')}
        >
          View My Developments <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
