import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Search, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LinkSubscriberDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  brandProfile: {
    id: number;
    brandName: string;
    isSubscriber?: number | boolean;
    linkedDeveloperAccountId?: number | null;
  };
  onSuccess?: () => void;
}

export function LinkSubscriberDialog({ 
  open, 
  setOpen, 
  brandProfile,
  onSuccess 
}: LinkSubscriberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDev, setSelectedDev] = useState<{ id: number; name: string; email: string } | null>(null);

  // Search query
  const { data: searchResults, isLoading: isSearching } = trpc.developer.searchDevelopers.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2, keepPreviousData: true }
  );

  // Link mutation
  const linkMutation = trpc.brandProfile.adminConvertToSubscriber.useMutation({
    onSuccess: () => {
      toast.success('Brand profile linked to subscriber successfully');
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to link brand profile');
    },
  });

  const handleLink = () => {
    if (!selectedDev) return;
    
    if (confirm(`Are you sure you want to link "${brandProfile.brandName}" to subscriber "${selectedDev.name}"? This updates ownership of associated developments.`)) {
      linkMutation.mutate({
        brandProfileId: brandProfile.id,
        developerAccountId: selectedDev.id,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link to Subscriber Account</DialogTitle>
          <DialogDescription>
            Connect <strong>{brandProfile.brandName}</strong> to a registered developer account. 
            This will transfer ownership and enable the dashboard for this brand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search Subscriber</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {isSearching && <p className="text-xs text-slate-500 animate-pulse">Searching...</p>}
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-2 bg-slate-50">
            {searchResults && searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((dev: any) => (
                  <div 
                    key={dev.id}
                    onClick={() => setSelectedDev(dev)}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                      selectedDev?.id === dev.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-white border border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">{dev.name}</p>
                            <p className="text-xs text-slate-500">{dev.email}</p>
                        </div>
                    </div>
                    {selectedDev?.id === dev.id && (
                        <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>No developers found</p>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                    <Search className="h-8 w-8 mb-2 opacity-20" />
                    <p>Type to search...</p>
                </div>
            )}
          </ScrollArea>

          {selectedDev && (
             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-800">
                   <strong>Confirmation:</strong> Developments under <em>{brandProfile.brandName}</em> will be re-assigned to <strong>{selectedDev.name}</strong>.
                   The brand profile will be marked as 'Subscriber Owned'.
                </div>
             </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedDev || linkMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
