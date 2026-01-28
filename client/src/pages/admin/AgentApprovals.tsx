import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, Phone, FileText, Award, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type AgentStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export default function AgentApprovals() {
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus>('pending');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Query pending agents
  const {
    data: agents,
    isLoading,
    refetch,
  } = trpc.admin.getPendingAgents.useQuery({ status: selectedStatus }, { enabled: true });

  // Approve mutation
  const approveMutation = trpc.admin.approveAgent.useMutation({
    onSuccess: () => {
      toast.success('Agent approved successfully!');
      refetch();
    },
    onError: error => {
      toast.error('Failed to approve agent: ' + error.message);
    },
  });

  // Reject mutation
  const rejectMutation = trpc.admin.rejectAgent.useMutation({
    onSuccess: () => {
      toast.success('Agent rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedAgentId(null);
      refetch();
    },
    onError: error => {
      toast.error('Failed to reject agent: ' + error.message);
    },
  });

  const handleApprove = (agentId: number) => {
    approveMutation.mutate({ agentId });
  };

  const handleRejectClick = (agentId: number) => {
    setSelectedAgentId(agentId);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedAgentId) return;
    rejectMutation.mutate({
      agentId: selectedAgentId,
      reason: rejectionReason || 'No reason provided',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
      suspended: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Agent Approvals</h1>
        <p className="text-slate-600 mt-1">Review and manage agent registration applications</p>
      </div>

      <Tabs value={selectedStatus} onValueChange={v => setSelectedStatus(v as AgentStatus)}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid gap-4">
              {agents.map((agent: any) => (
                <Card key={agent.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {agent.displayName?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{agent.displayName}</CardTitle>
                          <CardDescription>{agent.email}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(agent.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-700">
                          {agent.phone || agent.phoneNumber || 'No phone'}
                        </span>
                      </div>
                      {agent.licenseNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-700">License: {agent.licenseNumber}</span>
                        </div>
                      )}
                    </div>

                    {agent.bio && (
                      <div className="flex gap-2 text-sm">
                        <FileText className="h-4 w-4 text-slate-500 mt-0.5" />
                        <p className="text-slate-700">{agent.bio}</p>
                      </div>
                    )}

                    {agent.specializations && (
                      <div className="flex flex-wrap gap-2">
                        {agent.specializations.split(',').map((spec: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {spec.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {agent.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {agent.rejectionReason}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-slate-500">
                      Applied: {new Date(agent.createdAt).toLocaleDateString()}
                      {agent.approvedAt &&
                        ` • Approved: ${new Date(agent.approvedAt).toLocaleDateString()}`}
                    </div>

                    {agent.status === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          onClick={() => handleApprove(agent.id)}
                          disabled={approveMutation.isLoading}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectClick(agent.id)}
                          disabled={rejectMutation.isLoading}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-center">No {selectedStatus} agents found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this agent application. This will be visible to
              the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Incomplete information, Invalid license number..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isLoading}
            >
              {rejectMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Application'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
