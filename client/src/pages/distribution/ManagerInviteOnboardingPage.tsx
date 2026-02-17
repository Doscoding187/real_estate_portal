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
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const registrationId = Number(queryParams.get('registrationId') || 0);
  const email = (queryParams.get('email') || '').trim().toLowerCase();

  const inviteQuery = trpc.distribution.getManagerInvite.useQuery(
    { registrationId, email },
    {
      enabled: Boolean(registrationId && email),
      retry: false,
    },
  );

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
      setLocation(`/login?email=${encodeURIComponent(email)}`);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: OnboardingFormData) => {
    if (!registrationId || !email) {
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
            <CardTitle>Manager Invite Registration</CardTitle>
            <CardDescription>
              Complete your profile and credentials to activate manager dashboard access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!registrationId || !email ? (
              <p className="text-sm text-red-600">Invite link is incomplete.</p>
            ) : inviteQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invite...
              </div>
            ) : inviteQuery.error ? (
              <p className="text-sm text-red-600">{inviteQuery.error.message}</p>
            ) : !inviteQuery.data?.canComplete ? (
              <p className="text-sm text-slate-700">
                This invite is already {inviteQuery.data?.status || 'processed'}.
              </p>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="rounded border bg-white p-3 text-sm">
                    <p>
                      <strong>Email:</strong> {inviteQuery.data.email}
                    </p>
                    {inviteQuery.data.company ? (
                      <p>
                        <strong>Company:</strong> {inviteQuery.data.company}
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
                        Completing...
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
