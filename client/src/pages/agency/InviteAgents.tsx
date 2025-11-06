import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail, Calendar, X, RefreshCw, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function InviteAgents() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'agent' | 'agency_admin'>('agent');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: invitations, isLoading, refetch } = trpc.invitation.list.useQuery();

  const createMutation = trpc.invitation.create.useMutation({
    onSuccess: data => {
      toast.success('Invitation sent successfully!');
      setEmail('');
      setRole('agent');
      setIsDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const cancelMutation = trpc.invitation.cancel.useMutation({
    onSuccess: () => {
      toast.success('Invitation cancelled');
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });

  const resendMutation = trpc.invitation.resend.useMutation({
    onSuccess: () => {
      toast.success('Invitation resent with new link');
      refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to resend invitation');
    },
  });

  // Redirect if not authenticated or not agency admin
  if (!isAuthenticated || (user?.role !== 'agency_admin' && user?.role !== 'super_admin')) {
    setLocation('/login');
    return null;
  }

  const handleSendInvitation = () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    createMutation.mutate({ email, role });
  };

  const handleCancel = (id: number) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      cancelMutation.mutate({ invitationId: id });
    }
  };

  const handleResend = (id: number) => {
    resendMutation.mutate({ invitationId: id });
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'accepted':
        return 'secondary';
      case 'expired':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'agency_admin' ? 'default' : 'secondary';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Invite Agents</h1>
              <p className="text-muted-foreground">
                Send invitations to agents to join your agency
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Agent</DialogTitle>
                <DialogDescription>
                  Send an invitation email to a new agent to join your agency
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="agent@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role
                  </label>
                  <Select value={role} onValueChange={v => setRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="agency_admin">Agency Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendInvitation} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        {invitations && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invitations.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {invitations.filter(i => i.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Accepted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {invitations.filter(i => i.status === 'accepted').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {invitations.filter(i => i.status === 'expired').length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invitations List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading invitations...
            </CardContent>
          </Card>
        ) : !invitations?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invitations sent yet.</p>
              <p className="text-sm mt-2">Click "Send Invitation" to invite your first agent.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invitations.map(invitation => (
              <Card key={invitation.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{invitation.email}</span>
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(invitation.status)}>
                          {invitation.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Sent: {new Date(invitation.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      {invitation.status === 'pending' && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInvitationLink(invitation.token)}
                          >
                            {copiedToken === invitation.token ? (
                              <>
                                <Check className="mr-2 h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-3 w-3" />
                                Copy Invitation Link
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {invitation.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(invitation.id)}
                          disabled={resendMutation.isPending}
                        >
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Resend
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(invitation.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="mr-2 h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
