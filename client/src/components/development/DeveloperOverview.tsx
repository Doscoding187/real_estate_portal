import { Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DeveloperOverviewProps {
  developerName: string;
  developerLogo?: string | null;
}

export function DeveloperOverview({ developerName, developerLogo }: DeveloperOverviewProps) {
  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-900">Developer Overview</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Developer Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 h-full flex flex-col justify-between">
            <div>
                {/* Header Area */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden border-2 border-slate-200 shrink-0 flex items-center justify-center">
                    {developerLogo ? (
                        <img src={developerLogo} alt={developerName} className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="w-8 h-8 text-white" />
                    )}
                    </div>
                    <div>
                    <h4 className="text-lg font-bold text-slate-900">{developerName}</h4>
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full px-3 py-0.5 text-xs font-medium mt-1">
                        VERIFIED DEVELOPER
                    </Badge>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="text-2xl font-bold text-orange-500">20+</div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Years Experience</p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="text-2xl font-bold text-orange-500">15</div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Developments</p>
                    </div>
                </div>
            </div>

          {/* View Profile Button */}
          <Button variant="outline" className="w-full justify-between h-12 rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900 group">
            <span className="font-medium text-slate-700">View Developer Profile</span>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Button>
        </div>

        {/* Right Column: Contact Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <Input 
                placeholder="Name" 
                className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
              />
            </div>
            <div className="space-y-1">
              <Input 
                type="email" 
                placeholder="Email" 
                className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
              />
            </div>
            <div className="space-y-1">
              <Input 
                type="tel" 
                placeholder="Phone Number" 
                className="bg-slate-50 border-slate-200 focus:border-orange-500 focus:ring-orange-500/20 h-11" 
              />
            </div>
          </div>
          
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-12 rounded-lg mt-6 shadow-sm">
            Contact Developer
          </Button>
        </div>
      </div>
    </div>
  );
}
