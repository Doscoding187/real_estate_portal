import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Home,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  User,
  ArrowRight,
  Briefcase,
  HardHat,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api';

type RegistrationRole = 'visitor' | 'agent' | 'agency_admin' | 'property_developer';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/,
        'Password must contain at least one special character',
      ),
    confirmPassword: z.string(),
    role: z.enum(['visitor', 'agent', 'agency_admin', 'property_developer']).default('visitor'),
    agentDisplayName: z.string().optional(),
    agentPhone: z.string().optional(),
    agentBio: z.string().optional(),
    agentLicense: z.string().optional(),
    agentSpecializations: z.array(z.string()).optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(
    data => {
      if (data.role === 'agent') {
        return (
          data.agentDisplayName &&
          data.agentDisplayName.length >= 2 &&
          data.agentPhone &&
          data.agentPhone.length >= 10
        );
      }
      return true;
    },
    {
      message: 'Display name and phone number are required for agent registration',
      path: ['agentDisplayName'],
    },
  );

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

type RoleCard = {
  role: RegistrationRole;
  title: string;
  shortTitle: string;
  description: string;
  helper: string;
  icon: typeof User;
  accentClass: string;
  borderClass: string;
  bullets: string[];
};

const roleCards: RoleCard[] = [
  {
    role: 'visitor',
    title: 'Buyer / User',
    shortTitle: 'Buyer / User',
    description: 'Start browsing, saving properties, and sending enquiries.',
    helper: 'Good for buyers, renters, and regular platform users.',
    icon: User,
    accentClass: 'from-slate-600 to-slate-800',
    borderClass: 'border-slate-200 hover:border-slate-300',
    bullets: [
      'Create your account and verify your email',
      'Save properties and send enquiries',
      'Upgrade into agent or business roles later',
    ],
  },
  {
    role: 'agent',
    title: 'Real Estate Agent',
    shortTitle: 'Agent',
    description: 'Set up your agent identity and continue into your Agent OS workspace.',
    helper: 'Best for independent agents and agents joining an agency later.',
    icon: Briefcase,
    accentClass: 'from-blue-600 to-indigo-700',
    borderClass: 'border-blue-200 hover:border-blue-300',
    bullets: [
      'Create your account and verify your email',
      'Add your public agent display details now',
      'Complete your full agent setup after verification',
    ],
  },
  {
    role: 'agency_admin',
    title: 'Agency',
    shortTitle: 'Agency',
    description: 'Create the agency owner account, then complete your agency setup flow.',
    helper: 'Company and office details are completed in the agency setup wizard.',
    icon: Building2,
    accentClass: 'from-emerald-600 to-green-700',
    borderClass: 'border-emerald-200 hover:border-emerald-300',
    bullets: [
      'Create the account owner credentials',
      'Verify email and continue to agency onboarding',
      'Add team, office, and company details in setup',
    ],
  },
  {
    role: 'property_developer',
    title: 'Developer',
    shortTitle: 'Developer',
    description: 'Create the developer account first, then continue into company onboarding.',
    helper: 'Company registration, office, and project details belong in developer setup.',
    icon: HardHat,
    accentClass: 'from-cyan-600 to-sky-700',
    borderClass: 'border-cyan-200 hover:border-cyan-300',
    bullets: [
      'Create the account owner credentials',
      'Verify email and continue to developer onboarding',
      'Add company, projects, and brand details in setup',
    ],
  },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerDialogRole, setRegisterDialogRole] = useState<RegistrationRole | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now log in.');
    }
  }, [search]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'visitor',
      agentDisplayName: '',
      agentPhone: '',
      agentBio: '',
      agentLicense: '',
      agentSpecializations: [],
    },
  });

  const selectedRole = registerForm.watch('role');
  const activeRoleCard = useMemo(
    () => roleCards.find(card => card.role === registerDialogRole) ?? null,
    [registerDialogRole],
  );

  const openRegistrationDialog = (role: RegistrationRole) => {
    registerForm.setValue('role', role, { shouldDirty: true, shouldValidate: false });
    if (role !== 'agent') {
      registerForm.setValue('agentDisplayName', '');
      registerForm.setValue('agentPhone', '');
      registerForm.setValue('agentBio', '');
      registerForm.setValue('agentLicense', '');
      registerForm.setValue('agentSpecializations', []);
    }
    setRegisterDialogRole(role);
  };

  const closeRegistrationDialog = () => {
    setRegisterDialogRole(null);
    registerForm.clearErrors();
  };

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('Welcome back!');

      const normalizeRole = (value?: string | null) => {
        if (value === 'user') return 'visitor';
        if (value === 'admin') return 'super_admin';
        return value;
      };

      const role = normalizeRole(result.user?.role);
      let redirectPath = '/user/dashboard';

      if (role === 'super_admin') redirectPath = '/admin/overview';
      else if (role === 'property_developer') redirectPath = '/developer/dashboard';
      else if (role === 'agency_admin') redirectPath = '/agency/dashboard';
      else if (result.user?.hasReferrerIdentity) redirectPath = '/referrer/dashboard';
      else if (role === 'agent') redirectPath = '/agent/dashboard';

      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = redirectPath;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.body?.code === 'EMAIL_UNVERIFIED' && data.email) {
          setPendingVerificationEmail(data.email.trim().toLowerCase());
        }
        toast.error(error.body?.error || `Login failed (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Login failed');
      }
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!pendingVerificationEmail) return;

    setIsResendingVerification(true);
    try {
      const result = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail }),
      });

      toast.success(
        result.message ||
          'If this account exists and is unverified, a verification email has been sent.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.body?.error || `Resend failed (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Resend failed');
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const payload: {
        name: string;
        email: string;
        password: string;
        role: RegistrationRole;
        agentProfile?: {
          displayName: string;
          phoneNumber: string;
          bio?: string;
          licenseNumber?: string;
          specializations?: string[];
        };
      } = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as RegistrationRole,
      };

      if (data.role === 'agent') {
        payload.agentProfile = {
          displayName: data.agentDisplayName!,
          phoneNumber: data.agentPhone!,
          bio: data.agentBio,
          licenseNumber: data.agentLicense,
          specializations: data.agentSpecializations,
        };
      }

      const result = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (data.email) {
        setPendingVerificationEmail(data.email.trim().toLowerCase());
      }
      toast.success(
        result.message ||
          'Account created successfully! Please check your email to verify your account.',
      );
      closeRegistrationDialog();
      setActiveTab('login');
      registerForm.reset();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.body?.error || `Registration failed (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] animate-pulse rounded-full bg-blue-400/20 blur-[100px]" />
        <div className="absolute top-[20%] -right-[10%] h-[60%] w-[60%] animate-pulse rounded-full bg-purple-400/20 blur-[100px] delay-700" />
        <div className="absolute -bottom-[20%] left-[20%] h-[50%] w-[50%] animate-pulse rounded-full bg-teal-400/20 blur-[100px] delay-1000" />
      </div>

      <div className="relative z-10 grid w-full max-w-[1100px] items-center gap-8 lg:grid-cols-2">
        <div className="hidden flex-col gap-6 p-8 text-slate-800 dark:text-slate-200 lg:flex">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30">
              <Home className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Property Listify</h1>
          </div>

          <div className="max-w-md space-y-4">
            <h2 className="text-3xl font-bold leading-tight">
              Property Listing <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Simplified
              </span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Join buyers, agents, agencies, and developers on one operating platform. Start with
              the role that matches your workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {roleCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.role}
                  className="rounded-2xl border border-white/20 bg-white/50 p-4 backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50"
                >
                  <Icon className="mb-3 h-8 w-8 text-blue-600" />
                  <div className="text-lg font-semibold">{card.shortTitle}</div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/50 bg-white/70 p-8 text-slate-900 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-black/50">
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Property Listify</h1>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={value => {
                setActiveTab(value);
                if (value !== 'register') closeRegistrationDialog();
              }}
              className="w-full"
            >
              <TabsList className="mb-8 grid w-full grid-cols-2 rounded-xl bg-slate-100/50 p-1 dark:bg-slate-800/50">
                <TabsTrigger
                  value="login"
                  className="rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="border-slate-200 bg-white/50 transition-all focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showLoginPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                className="border-slate-200 bg-white/50 pr-10 transition-all focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/50"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-slate-600"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                            >
                              {showLoginPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between pt-2">
                      <FormField
                        control={loginForm.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="cursor-pointer font-normal text-slate-600 dark:text-slate-400">
                              Remember me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                        onClick={() => setLocation('/forgot-password')}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    {pendingVerificationEmail && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="font-medium">Email verification required</div>
                        <p className="mt-1">
                          {pendingVerificationEmail} is not verified yet. Check inbox and spam, or
                          resend the verification email.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                          onClick={resendVerification}
                          disabled={isResendingVerification}
                        >
                          {isResendingVerification ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Resending...
                            </>
                          ) : (
                            'Resend Verification Email'
                          )}
                        </Button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:from-blue-700 hover:to-purple-700 active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        <>
                          Login <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="mt-0 focus-visible:outline-none">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Start by choosing your role
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Registration should start with identity, not credentials. Pick the role you
                      need, then we open the right account form for that path.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {roleCards.map(card => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.role}
                          type="button"
                          onClick={() => openRegistrationDialog(card.role)}
                          className={`rounded-2xl border bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/50 ${card.borderClass}`}
                        >
                          <div
                            className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.accentClass}`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                {card.title}
                              </h3>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {card.description}
                            </p>
                            <p className="pt-1 text-xs text-slate-500 dark:text-slate-500">
                              {card.helper}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Buyers can create a simple account immediately. Agents enter a few extra public
                    profile details here. Agencies and developers finish their business setup after
                    email verification.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation('/')}
                className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(registerDialogRole)}
        onOpenChange={open => !open && closeRegistrationDialog()}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {activeRoleCard && (
            <>
              <DialogHeader>
                {(() => {
                  const ActiveRoleIcon = activeRoleCard.icon;
                  return (
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700">
                      <ActiveRoleIcon className="h-6 w-6 text-white" />
                    </div>
                  );
                })()}
                <DialogTitle>
                  Create your {activeRoleCard.shortTitle.toLowerCase()} account
                </DialogTitle>
                <DialogDescription>
                  {activeRoleCard.description} {activeRoleCard.helper}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showRegisterPassword ? 'text' : 'password'}
                                  placeholder="Create password"
                                  className="pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-slate-600"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              >
                                {showRegisterPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="Repeat password"
                                  className="pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent hover:text-slate-600"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {selectedRole === 'agent' && (
                      <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                        <div>
                          <div className="text-sm font-medium text-blue-900">
                            Agent profile details
                          </div>
                          <p className="text-xs text-blue-700">
                            Display name and phone number are required for agent registration.
                            License number is optional.
                          </p>
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="agentDisplayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Smith Properties" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="agentPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+27 82 123 4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="agentLicense"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Number (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="FFC1234567" {...field} />
                              </FormControl>
                              <FormDescription>
                                Optional for now. You can complete this later.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] hover:from-blue-700 hover:to-purple-700 active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    What happens next
                  </div>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    {activeRoleCard.bullets.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {selectedRole !== 'agent' && (
                    <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      Company registration details, office details, and supporting business
                      documents should be collected in the next setup step, not mixed into basic
                      account creation.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
