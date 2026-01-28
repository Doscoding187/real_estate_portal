import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Shield, Mail, Trash2, Building2, UserCircle2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AddPartnerDialog } from './AddPartnerDialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PartnershipManagerProps {
  developmentId: number;
}

export function PartnershipManager({ developmentId }: PartnershipManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const utils = trpc.useContext();

  // Queries
  const { data: partnerships, isLoading } = trpc.developer.getDevelopmentPartnerships.useQuery({
    developmentId,
  });

  // Mutations
  const removeMutation = trpc.developer.removePartnership.useMutation({
    onSuccess: () => {
      toast.success('Partner removed');
      utils.developer.getDevelopmentPartnerships.invalidate({ developmentId });
    },
    onError: err => toast.error(err.message),
  });

  const updateMutation = trpc.developer.updatePartnership.useMutation({
    onSuccess: () => {
      utils.developer.getDevelopmentPartnerships.invalidate({ developmentId });
      toast.success('Settings updated');
    },
    onError: err => toast.error(err.message),
  });

  const handleRemove = (brandProfileId: number) => {
    if (confirm('Are you sure you want to remove this partner?')) {
      removeMutation.mutate({ developmentId, brandProfileId });
    }
  };

  const handleToggleLeads = (brandProfileId: number, currentStatus: boolean) => {
    updateMutation.mutate({
      developmentId,
      brandProfileId,
      updates: { receivesLeads: !currentStatus },
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">Development Partners</CardTitle>
            <CardDescription>
              Manage stakeholders and lead distribution for this development.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {partnerships?.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-slate-500 bg-slate-50">
                <p>No partners added yet.</p>
                <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                  Add your first partner
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {partnerships?.map((partner: any) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 border border-slate-100">
                        <AvatarImage src={partner.brandProfile.logo} />
                        <AvatarFallback>
                          <Building2 className="h-5 w-5 text-slate-400" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-slate-900">
                            {partner.brandProfile.brandName}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 font-normal capitalize bg-slate-100 text-slate-600"
                          >
                            {partner.partnershipType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {partner.receivesLeads ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                              <Mail className="h-3 w-3" />
                              Receives Leads
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-slate-400 font-medium px-1.5 py-0.5">
                              No Lead Access
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleToggleLeads(
                              partner.brandProfileId,
                              Boolean(partner.receivesLeads),
                            )
                          }
                        >
                          {partner.receivesLeads ? 'Disable Leads' : 'Enable Leads'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleRemove(partner.brandProfileId)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Partner
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddPartnerDialog
        developmentId={developmentId}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => utils.developer.getDevelopmentPartnerships.invalidate({ developmentId })}
      />
    </>
  );
}
