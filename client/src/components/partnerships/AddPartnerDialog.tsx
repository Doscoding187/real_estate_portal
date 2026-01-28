import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, Plus, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddPartnerDialogProps {
  developmentId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPartnerDialog({
  developmentId,
  isOpen,
  onClose,
  onSuccess,
}: AddPartnerDialogProps) {
  const [step, setStep] = useState<'search' | 'configure'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<any>(null);

  // Configuration State
  const [partnershipType, setPartnershipType] = useState<string>('marketing_agency');
  const [receivesLeads, setReceivesLeads] = useState(false);
  const [notes, setNotes] = useState('');

  // Queries
  const { data: searchResults, isLoading: isSearching } =
    trpc.brandProfile.searchBrandProfiles.useQuery(
      { query: searchQuery },
      { enabled: searchQuery.length > 2 },
    );

  // Mutation
  const addPartnerMutation = trpc.developer.addPartnership.useMutation({
    onSuccess: () => {
      toast.success('Partner added successfully');
      onSuccess();
      handleClose();
    },
    onError: err => {
      toast.error(err.message || 'Failed to add partner');
    },
  });

  const handleClose = () => {
    setStep('search');
    setSearchQuery('');
    setSelectedBrand(null);
    setPartnershipType('marketing_agency');
    setReceivesLeads(false);
    setNotes('');
    onClose();
  };

  const handleBrandSelect = (brand: any) => {
    setSelectedBrand(brand);
    setStep('configure');
  };

  const handleSubmit = () => {
    if (!selectedBrand) return;

    addPartnerMutation.mutate({
      developmentId,
      brandProfileId: selectedBrand.id,
      partnershipType: partnershipType as any,
      receivesLeads,
      notes,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Partner</DialogTitle>
          <DialogDescription>
            {step === 'search'
              ? 'Search for a brand profile to add as a partner.'
              : 'Configure partnership details and permissions.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by brand name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-2">
              {isSearching ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults?.length === 0 && searchQuery.length > 2 ? (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  No brands found.
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults?.map((brand: any) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-colors"
                      onClick={() => handleBrandSelect(brand)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-100">
                          <AvatarImage src={brand.logo} />
                          <AvatarFallback>
                            <Building2 className="h-5 w-5 text-slate-400" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-slate-900">{brand.brandName}</p>
                          <p className="text-xs text-slate-500 capitalize">
                            {brand.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Selected Brand Summary */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <Avatar className="h-10 w-10 border border-white shadow-sm">
                <AvatarImage src={selectedBrand.logo} />
                <AvatarFallback>
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{selectedBrand.brandName}</p>
                <Badge variant="outline" className="text-[10px] h-5">
                  {selectedBrand.type}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs"
                onClick={() => setStep('search')}
              >
                Change
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Partnership Role</Label>
                <Select value={partnershipType} onValueChange={setPartnershipType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing_agency">Marketing Agency</SelectItem>
                    <SelectItem value="co_developer">Co-Developer</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="sales_agency">Sales Agency</SelectItem>
                    <SelectItem value="architect">Architect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
                <div className="flex flex-col space-y-1">
                  <Label>Receive Leads?</Label>
                  <span className="text-xs text-muted-foreground">
                    If enabled, this partner will be eligible to receive enquiries.
                  </span>
                </div>
                <Switch checked={receivesLeads} onCheckedChange={setReceivesLeads} />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Optional notes about this partnership..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'search' ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('search')}
                disabled={addPartnerMutation.isPending}
              >
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={addPartnerMutation.isPending}>
                {addPartnerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Partner
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
