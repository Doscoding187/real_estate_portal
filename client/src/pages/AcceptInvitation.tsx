import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Building2, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  const token = searchParams.get('token');
  const [isAccepting, setIsAccepting] = useState(false);

  const {
    data: invitation,
    isLoading,
    error,
  } = trpc.invitation.getByToken.useQuery(
    { token: token || '' },
    { enabled: !!token, retry: false },
  );

  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: () => {
      toast.success('Invitation accepted! Welcome to the agency!');

      // Small delay to ensure database transaction completes
      setTimeout(() => {
        // Hard redirect to appropriate dashboard based on role
        const redirectPath =
          invitation?.role === 'agency_admin' ? '/agency/dashboard' : '/agent/dashboard';

        // Use hard redirect to ensure auth state is updated
        window.location.href = redirectPath;
      }, 500);
    },
    onError: error => {
      toast.error(error.message || 'Failed to accept invitation');
      setIsAccepting(false);
    },
  });

  const handleAccept = () => {
    if (!token) {
      toast.error('Invalid invitation link');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in or register first');
      setLocation(`/login?redirect=/accept-invitation?token=${token}`);
      return;
    }

    setIsAccepting(true);
    acceptMutation.mutate({ token });
  };

  // If no token, show error
  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation Link</h2>
              <p className="text-muted-foreground">
                This invitation link is invalid or incomplete.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Not Available</h2>
              <p className="text-muted-foreground mb-4">
                {error?.message || 'This invitation could not be found.'}
              </p>
              <Button onClick={() => setLocation('/')}>Go to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state - show invitation details
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">You've Been Invited!</CardTitle>
            <CardDescription>You have been invited to join an agency</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Invited Email:</span>
                <span className="font-semibold">{invitation.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Role:</span>
                <Badge>{invitation.role}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Agency ID:</span>
                <span className="font-semibold">{invitation.agencyId}</span>
              </div>
            </div>

            {/* Authentication Check */}
            {!isAuthenticated ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  You need to log in or register to accept this invitation.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setLocation(`/login?redirect=/accept-invitation?token=${token}`)}
                    variant="default"
                  >
                    Log In / Register
                  </Button>
                </div>
              </div>
            ) : user?.email !== invitation.email ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  This invitation is for <strong>{invitation.email}</strong>, but you're logged in
                  as <strong>{user?.email}</strong>. Please log in with the correct account.
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleAccept} disabled={isAccepting} className="flex-1">
                  {isAccepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setLocation('/')} disabled={isAccepting}>
                  Decline
                </Button>
              </div>
            )}

            {/* Expiry Warning */}
            <p className="text-xs text-center text-muted-foreground">
              This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()} at{' '}
              {new Date(invitation.expiresAt).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
