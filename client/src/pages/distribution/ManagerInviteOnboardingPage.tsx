import { useEffect, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseDistributionManagerInviteParams } from '../../../../shared/distributionManagerInvite';
import {
  getManagerInviteStateCopy,
  resolveManagerInvitePresentationState,
} from './managerInviteOnboarding';

const onboardingSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required'),
    phone: z.string().trim().min(7, 'Contact number is required'),
    currentRole: z.string().trim().optional(),
    profileImageUrl: z.string().trim().url('Use a valid image URL').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/\d/, 'Must include a number')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?/]/, 'Must include a special character'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function ManagerInviteOnboardingPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const inviteParams = useMemo(() => parseDistributionManagerInviteParams(search), [search]);
  const registrationId = inviteParams.registrationId || 0;
  const email = inviteParams.email;

  const inviteQuery = trpc.distribution.getManagerInvite.useQuery(
    { registrationId, email },
    {
      enabled: inviteParams.isComplete,
      retry: false,
    },
  );

  const presentationState = resolveManagerInvitePresentationState({
    hasInviteParams: inviteParams.isComplete,
    isLoading: inviteQuery.isLoading,
    errorMessage: inviteQuery.error?.message,
    status: inviteQuery.data?.status,
    canComplete: inviteQuery.data?.canComplete,
  });
  const stateCopy = getManagerInviteStateCopy(presentationState, inviteQuery.data?.status);
  const inviteData = inviteQuery.data;

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: inviteQuery.data?.fullName || '',
      phone: inviteQuery.data?.phone || '',
      currentRole: inviteQuery.data?.currentRole || '',
      profileImageUrl: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!inviteQuery.data) return;
    form.reset({
      fullName: inviteQuery.data.fullName || '',
      phone: inviteQuery.data.phone || '',
      currentRole: inviteQuery.data.currentRole || '',
      profileImageUrl: '',
      password: '',
      confirmPassword: '',
    });
  }, [inviteQuery.data, form]);

  const completeMutation = trpc.distribution.completeManagerInviteRegistration.useMutation({
    onSuccess: () => {
      toast.success('Registration complete. You can now log in to your manager dashboard.');
      setLocation(
        `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/distribution/manager')}`,
      );
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: OnboardingFormData) => {
    if (!inviteParams.isComplete || !registrationId || !email) {
      toast.error('Invite link is invalid.');
      return;
    }
    completeMutation.mutate({
      registrationId,
      email,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      currentRole: values.currentRole?.trim() || undefined,
      profileImageUrl: values.profileImageUrl?.trim() || undefined,
      password: values.password,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-24 pb-10">
        <Card>
          <CardHeader>
            <CardTitle>{stateCopy.title}</CardTitle>
            <CardDescription>{stateCopy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inviteParams.recovered ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                We recovered your invite details from a malformed link and loaded the current onboarding
                invite.
              </div>
            ) : null}
            {presentationState === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invite...
              </div>
            ) : presentationState === 'invalid' ? (
              <div className="space-y-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{stateCopy.description}</p>
                {inviteQuery.error?.message ? (
                  <p className="text-xs text-red-600">{inviteQuery.error.message}</p>
                ) : null}
                <Button variant="outline" onClick={() => setLocation('/login')}>
                  Go to Login
                </Button>
              </div>
            ) : presentationState === 'accepted' ? (
              <div className="space-y-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p>{stateCopy.description}</p>
                <Button
                  onClick={() =>
                    setLocation(
                      `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/distribution/manager')}`,
                    )
                  }
                >
                  Continue to Login
                </Button>
              </div>
            ) : inviteData ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="rounded border bg-white p-3 text-sm">
                    <p>
                      <strong>Email:</strong> {inviteData.email}
                    </p>
                    {inviteData.company ? (
                      <p>
                        <strong>Company:</strong> {inviteData.company}
                      </p>
                    ) : null}
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Manager full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+27..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Role (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Sales manager, Ops manager..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Provide a direct image URL for your manager profile.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={completeMutation.isPending}>
                    {completeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting invite...
                      </>
                    ) : (
                      'Accept Invite and Continue'
                    )}
                  </Button>
                </form>
              </Form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
