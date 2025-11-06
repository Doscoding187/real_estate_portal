import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, ArrowLeft, Settings, Trash2, Mail, Calendar, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentManagement() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentToRemove, setAgentToRemove] = useState<any>(null);

  const { data: agents, isLoading, refetch } = trpc.agency.listAgents.useQuery();

  const updateRoleMutation = trpc.agency.updateAgentRole.useMutation({
    onSuccess: () => {
      toast.success('Agent role updated successfully');
      setSelectedAgent(null);
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update agent role');
    },
  });

  const removeAgentMutation = trpc.agency.removeAgent.useMutation({
    onSuccess: () => {
      toast.success('Agent removed from agency');
      setAgentToRemove(null);
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to remove agent');
    },
  });

  // Redirect if not authenticated or not agency admin
  if (!isAuthenticated || user?.role !== 'agency_admin') {
    setLocation('/login');
    return null;
  }

  const handleRoleChange = (userId: number, newRole: string) => {
    updateRoleMutation.mutate({
      userId,
      role: newRole as 'agent' | 'agency_admin',
    });
  };

  const handleRemoveAgent = (agent: any) => {
    setAgentToRemove(agent);
  };

  const confirmRemoveAgent = () => {
    if (agentToRemove) {
      removeAgentMutation.mutate({ userId: agentToRemove.id });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'agency_admin':
        return 'default';
      case 'agent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/agency/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Agent Management</h1>
              <p className="text-muted-foreground">Manage your agency team members</p>
            </div>
          </div>

          <Button onClick={() => setLocation('/agency/invite')}>
            <Mail className="mr-2 h-4 w-4" />
            Invite New Agent
          </Button>
        </div>

        {/* Stats */}
        {agents && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agents.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Agency Admins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {agents.filter((a: any) => a.role === 'agency_admin').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {agents.filter((a: any) => a.role === 'agent').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {agents.filter((a: any) => a.agentProfile).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading agents...</div>
            ) : !agents?.length ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents in your agency yet.</p>
                <p className="text-sm mt-2">Invite agents to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agents.map((agent: any) => (
                  <Card key={agent.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {agent.name || agent.firstName || agent.email}
                            </h3>
                            <Badge variant={getRoleBadgeVariant(agent.role)}>
                              {agent.role.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {agent.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {new Date(agent.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {agent.agentProfile && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Agent profile active • {agent.agentProfile.totalSales || 0} total
                              sales
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role Selector */}
                        <Select
                          value={agent.role}
                          onValueChange={newRole => handleRoleChange(agent.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="agency_admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Remove Button */}
                        {agent.id !== user?.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveAgent(agent)}
                            disabled={removeAgentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remove Agent Confirmation Dialog */}
        <AlertDialog open={!!agentToRemove} onOpenChange={() => setAgentToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Agent from Agency</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {agentToRemove?.name || agentToRemove?.email} from
                your agency? This action cannot be undone and the agent will lose access to agency
                resources.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemoveAgent}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Agent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
