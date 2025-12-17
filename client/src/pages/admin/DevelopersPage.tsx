import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, Search, Building2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedDeveloper, setSelectedDeveloper] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = trpc.useContext();
  const { data: pendingDevelopers, isLoading: isLoadingPending } = trpc.developer.adminListPendingDevelopers.useQuery();
  const { data: allDevelopers, isLoading: isLoadingAll } = trpc.developer.adminListAllDevelopers.useQuery();

  const approveMutation = trpc.developer.adminApproveDeveloper.useMutation({
    onSuccess: () => {
      toast.success("Developer approved successfully");
      utils.developer.adminListPendingDevelopers.invalidate();
      utils.developer.adminListAllDevelopers.invalidate();
      setSelectedDeveloper(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve developer");
    }
  });

  const rejectMutation = trpc.developer.adminRejectDeveloper.useMutation({
    onSuccess: () => {
      toast.success("Developer rejected");
      utils.developer.adminListPendingDevelopers.invalidate();
      utils.developer.adminListAllDevelopers.invalidate();
      setIsRejectDialogOpen(false);
      setSelectedDeveloper(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reject developer");
    }
  });

  const setTrustedMutation = trpc.developer.adminSetTrusted.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.developer.adminListPendingDevelopers.invalidate();
      utils.developer.adminListAllDevelopers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update trust status");
    }
  });

  const handleApprove = (id: number) => {
    if (confirm("Are you sure you want to approve this developer?")) {
      approveMutation.mutate({ id });
    }
  };

  const handleReject = () => {
    if (!selectedDeveloper) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({ 
      id: selectedDeveloper.id, 
      reason: rejectionReason 
    });
  };

  const DeveloperCard = ({ developer, showActions = false }: { developer: any, showActions?: boolean }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              {developer.logo ? (
                <img src={developer.logo} alt={developer.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">{developer.name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <Badge variant="outline" className="capitalize">{developer.category.replace('_', ' ')}</Badge>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {developer.city}, {developer.province}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Registered {new Date(developer.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-600 mt-3 line-clamp-2">{developer.description || "No description provided."}</p>
              
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="text-slate-500">Email:</span> {developer.email}</div>
                <div><span className="text-slate-500">Phone:</span> {developer.phone || "N/A"}</div>
                <div><span className="text-slate-500">Website:</span> {developer.website || "N/A"}</div>
                <div><span className="text-slate-500">Projects:</span> {developer.totalProjects}</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge className={
              developer.status === 'approved' ? 'bg-green-500' : 
              developer.status === 'rejected' ? 'bg-red-500' : 
              'bg-yellow-500'
            }>
              {developer.status.toUpperCase()}
            </Badge>
            
            {showActions && developer.status === 'pending' && (
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setSelectedDeveloper(developer);
                    setIsRejectDialogOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(developer.id)}
                  disabled={approveMutation.isLoading}
                >
                  {approveMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`trust-${developer.id}`} className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                    Trusted Developer
                                </Label>
                                <Switch
                                    id={`trust-${developer.id}`}
                                    checked={!!developer.isTrusted}
                                    onCheckedChange={(checked) => setTrustedMutation.mutate({ id: developer.id, isTrusted: checked })}
                                    disabled={setTrustedMutation.isLoading}
                                    className="scale-75 origin-right"
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="w-[200px] text-xs">Bypasses manual review and publishes immediately</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Developers</h1>
          <p className="text-slate-500">Manage property developer registrations and approvals</p>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingDevelopers && pendingDevelopers.length > 0 && (
              <Badge className="ml-2 bg-yellow-500 hover:bg-yellow-600 h-5 px-1.5 text-[10px]">
                {pendingDevelopers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Developers</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {isLoadingPending ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : pendingDevelopers?.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No pending applications</h3>
              <p className="text-slate-500">All developer registrations have been processed.</p>
            </div>
          ) : (
            pendingDevelopers?.map(dev => (
              <DeveloperCard key={dev.id} developer={dev} showActions={true} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search developers..." className="pl-9" />
            </div>
          </div>
          
          {isLoadingAll ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : allDevelopers?.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No developers found</h3>
            </div>
          ) : (
            allDevelopers?.map(dev => (
              <DeveloperCard key={dev.id} developer={dev} showActions={false} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedDeveloper?.name}'s application. This will be sent to the developer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="reason" className="mb-2 block">Rejection Reason</Label>
            <Textarea 
              id="reason" 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete documentation, invalid company details..."
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={rejectMutation.isLoading || !rejectionReason.trim()}
            >
              {rejectMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
