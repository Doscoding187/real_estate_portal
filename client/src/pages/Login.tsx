import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, useReducedMotion } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  HardHat,
  Home,
  Loader2,
  User,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { APP_TITLE } from '@/const';
import { apiFetch, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    role: z
      .enum(['visitor', 'agent', 'agency_admin', 'property_developer', 'service_provider'])
      .default('visitor'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(data => data.role !== 'agent' || Boolean(data.phoneNumber?.trim()), {
    message: 'Phone number is required for agent registration',
    path: ['phoneNumber'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type RoleKey = RegisterFormData['role'];
type PendingAction = 'login' | 'register' | null;

type RoleCard = {
  id: string;
  role?: RoleKey;
  label: string;
  description: string;
  intro: string;
  tag: string;
  cta: string;
  available: boolean;
  wide?: boolean;
  Icon: LucideIcon;
  iconWrap: string;
  tagClass: string;
  buttonClass: string;
  badgeClass: string;
  focusRing: string;
  glow: string;
};

const roles: RoleCard[] = [
  {
    id: 'visitor',
    role: 'visitor',
    label: 'Buyer / User',
    description: 'Browse, save properties, and send enquiries without a heavy setup flow.',
    intro: 'Quick setup with no business verification. Start browsing properties right away.',
    tag: 'Free account',
    cta: 'Create free account',
    available: true,
    Icon: User,
    iconWrap: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    tagClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    buttonClass: 'from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-300',
    focusRing: 'focus-visible:ring-indigo-500/40',
    glow: 'from-indigo-500/18 via-indigo-500/5 to-transparent',
  },
  {
    id: 'agent',
    role: 'agent',
    label: 'Real Estate Agent',
    description:
      'Create your account, then continue into agent profile onboarding after verification.',
    intro:
      'Set up your public agent account first. Your profile details are completed after email verification.',
    tag: 'Agent OS access',
    cta: 'Set up Agent OS',
    available: true,
    Icon: Briefcase,
    iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    tagClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    buttonClass: 'from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/12 dark:text-sky-300',
    focusRing: 'focus-visible:ring-sky-500/40',
    glow: 'from-sky-500/18 via-sky-500/5 to-transparent',
  },
  {
    id: 'agency_admin',
    role: 'agency_admin',
    label: 'Agency',
    description: 'Create the owner account, then continue into agency and office setup.',
    intro:
      'Create the owner account first. Company registration and office setup happen after verification.',
    tag: 'Business setup',
    cta: 'Continue to agency setup',
    available: true,
    Icon: Building2,
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    tagClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    buttonClass: 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300',
    focusRing: 'focus-visible:ring-emerald-500/40',
    glow: 'from-emerald-500/18 via-emerald-500/5 to-transparent',
  },
  {
    id: 'property_developer',
    role: 'property_developer',
    label: 'Developer',
    description:
      'Register your owner account, then continue into company and development onboarding.',
    intro:
      'Register your development account first. Project and unit setup continue in the onboarding flow.',
    tag: 'Company onboarding',
    cta: 'Continue to company onboarding',
    available: true,
    Icon: HardHat,
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    tagClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    buttonClass: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/12 dark:text-amber-300',
    focusRing: 'focus-visible:ring-amber-500/40',
    glow: 'from-amber-500/18 via-amber-500/5 to-transparent',
  },
  {
    id: 'service_provider',
    role: 'service_provider',
    label: 'Service Provider',
    description:
      'Join the partner network for inspections, conveyancing, repairs, media, moving, and related services.',
    intro:
      'Create your partner account first. You will complete your directory profile, service coverage, and explore setup after verification.',
    tag: 'Partner network',
    cta: 'Create partner account',
    available: true,
    wide: true,
    Icon: Wrench,
    iconWrap: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    tagClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    buttonClass: 'from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/12 dark:text-rose-300',
    focusRing: 'focus-visible:ring-rose-500/40',
    glow: 'from-rose-500/18 via-rose-500/5 to-transparent',
  },
];

const registerDefaults: RegisterFormData = {
  name: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  role: 'visitor',
};

const inputBase =
  'h-11 rounded-xl border-slate-200/80 bg-slate-50/90 text-sm text-slate-950 placeholder:text-slate-400 shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:placeholder:text-slate-500';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-500 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const prefersReducedMotion = useReducedMotion();
  const nextParam = searchParams.get('next');
  const safeNextPath =
    typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null;

  const [selectedRole, setSelectedRole] = useState<RoleCard | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerDefaults,
  });

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now log in.');
      setSignInOpen(true);
    }
  }, [searchParams]);

  const closeRegister = () => {
    setSelectedRole(null);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
  };

  const openRole = (role: RoleCard) => {
    if (!role.available || !role.role) {
      toast('This account type is not available yet.');
      return;
    }

    registerForm.reset({ ...registerForm.getValues(), role: role.role });
    setSelectedRole(role);
  };

  const onLogin = async (data: LoginFormData) => {
    setPendingAction('login');
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      setShowResendVerification(false);
      toast.success('Welcome back!');

      const role = result.user?.role;
      let redirectPath = safeNextPath || '/user/dashboard';

      if (!safeNextPath) {
        if (role === 'super_admin') redirectPath = '/admin/overview';
        else if (role === 'property_developer') redirectPath = '/developer/dashboard';
        else if (role === 'agency_admin') redirectPath = '/agency/dashboard';
        else if (role === 'service_provider') redirectPath = '/service/dashboard';
        else if (result.user?.hasManagerIdentity) redirectPath = '/distribution/manager';
        else if (result.user?.hasReferrerIdentity) redirectPath = '/distribution/partner/overview';
        else if (role === 'agent') redirectPath = '/agent/select-package';
      }

      await new Promise(resolve => setTimeout(resolve, 250));
      window.location.href = redirectPath;
    } catch (error) {
      if (error instanceof ApiError) {
        const message = error.body?.error || `Login failed (${error.status})`;
        const isUnverified =
          typeof message === 'string' && message.toLowerCase().includes('verify your email');
        setShowResendVerification(isUnverified);
        toast.error(message);
      } else {
        toast.error(error instanceof Error ? error.message : 'Login failed');
      }
      setPendingAction(null);
    }
  };

  const onResendVerification = async () => {
    const email = loginForm.getValues('email');
    if (!email) {
      toast.error('Enter your email address first.');
      return;
    }

    try {
      const result = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      toast.success(
        result?.message || 'If your account is unverified, a new verification email has been sent.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.body?.error || `Could not resend (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Could not resend verification email');
      }
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setPendingAction('register');
    try {
      const result = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          agentProfile:
            data.role === 'agent'
              ? {
                  displayName: data.name.trim(),
                  phoneNumber: String(data.phoneNumber || '').trim(),
                }
              : undefined,
        }),
      });

      toast.success(
        result.message ||
          'Account created successfully! Please check your email to verify your account.',
      );
      registerForm.reset(registerDefaults);
      closeRegister();
      setSignInOpen(true);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.body?.error || `Registration failed (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Registration failed');
      }
    } finally {
      setPendingAction(null);
    }
  };

  const registerErrors = registerForm.formState.errors;
  const isLoggingIn = pendingAction === 'login';
  const isRegistering = pendingAction === 'register';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_34%),linear-gradient(180deg,_#08101f_0%,_#0c1426_44%,_#070d18_100%)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-6rem] h-72 w-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-indigo-500/12" />
        <div className="absolute right-[-5rem] top-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-violet-300/15 blur-3xl dark:bg-violet-500/10" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col items-center justify-center">
        <div className="mb-10 text-center sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {APP_TITLE}
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
            Choose your <span className="text-indigo-600 dark:text-indigo-400">role</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
            One platform for buyers, agents, agencies, developers, and service providers. Start with
            the path that fits you.
          </p>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map(role => (
            <motion.button
              key={role.id}
              type="button"
              onClick={() => openRole(role)}
              className={cn(
                'group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 p-6 text-left shadow-[0_16px_50px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-colors hover:border-slate-300/90 dark:border-white/10 dark:bg-[#141d2e]/90 dark:hover:border-white/20',
                role.wide && 'sm:col-span-2 xl:col-span-2',
              )}
              whileHover={prefersReducedMotion ? undefined : { y: -4 }}
              transition={
                prefersReducedMotion ? undefined : { type: 'spring', stiffness: 260, damping: 20 }
              }
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                  role.glow,
                )}
              />
              <div
                className={cn(
                  'relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl',
                  role.iconWrap,
                )}
              >
                <role.Icon className="h-5 w-5" />
              </div>
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                    {role.label}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {role.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
              </div>
              <span
                className={cn(
                  'relative mt-5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
                  role.tagClass,
                )}
              >
                {role.tag}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Sign in
            </button>
          </p>
          <button
            type="button"
            onClick={() => setLocation('/')}
            className="mt-4 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
          >
            Back to Home
          </button>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedRole)}
        onOpenChange={open => (!open ? closeRegister() : undefined)}
      >
        {selectedRole ? (
          <DialogContent
            showCloseButton={false}
            className="overflow-hidden border-slate-200/80 bg-white/95 p-0 shadow-2xl shadow-slate-300/30 backdrop-blur-2xl dark:border-white/10 dark:bg-[#141d2e]/95 dark:shadow-black/50 sm:max-w-[460px]"
          >
            <div className="relative px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
              <button
                type="button"
                onClick={closeRegister}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 transition-colors hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:text-slate-100"
                aria-label="Close registration dialog"
              >
                <X className="h-4 w-4" />
              </button>

              <div
                className={cn(
                  'mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                  selectedRole.badgeClass,
                )}
              >
                <selectedRole.Icon className="h-4 w-4" />
                {selectedRole.label}
              </div>

              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                  Create your account
                </DialogTitle>
                <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {selectedRole.intro}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-6">
                <Field
                  label={
                    selectedRole.role === 'agency_admin'
                      ? 'Owner name'
                      : selectedRole.role === 'property_developer'
                        ? 'Your name'
                        : selectedRole.role === 'service_provider'
                          ? 'Business name'
                          : 'Full name'
                  }
                  error={registerErrors.name?.message}
                >
                  <Input
                    {...registerForm.register('name')}
                    placeholder={
                      selectedRole.role === 'agency_admin'
                        ? 'Agency owner'
                        : selectedRole.role === 'property_developer'
                          ? 'Development lead'
                          : selectedRole.role === 'service_provider'
                            ? 'Your company or trading name'
                            : 'Jane Smith'
                    }
                    className={cn(inputBase, selectedRole.focusRing)}
                  />
                </Field>

                <Field
                  label={
                    selectedRole.role === 'agency_admin' ||
                    selectedRole.role === 'property_developer' ||
                    selectedRole.role === 'service_provider'
                      ? 'Work email'
                      : 'Email address'
                  }
                  error={registerErrors.email?.message}
                >
                  <Input
                    type="email"
                    {...registerForm.register('email')}
                    placeholder="you@example.com"
                    className={cn(inputBase, selectedRole.focusRing)}
                  />
                </Field>

                {selectedRole.role === 'agent' ? (
                  <Field label="Phone number" error={registerErrors.phoneNumber?.message}>
                    <Input
                      type="tel"
                      {...registerForm.register('phoneNumber')}
                      placeholder="+27 00 000 0000"
                      className={cn(inputBase, selectedRole.focusRing)}
                    />
                  </Field>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password" error={registerErrors.password?.message}>
                    <div className="relative">
                      <Input
                        type={showRegisterPassword ? 'text' : 'password'}
                        {...registerForm.register('password')}
                        placeholder="Min 8 characters"
                        className={cn(inputBase, 'pr-11', selectedRole.focusRing)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm" error={registerErrors.confirmPassword?.message}>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerForm.register('confirmPassword')}
                        placeholder="Repeat password"
                        className={cn(inputBase, 'pr-11', selectedRole.focusRing)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="border-t border-slate-200 dark:border-white/[0.08]" />

                <Button
                  type="submit"
                  disabled={isRegistering}
                  className={cn(
                    'h-12 w-full rounded-xl bg-gradient-to-r text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]',
                    selectedRole.buttonClass,
                  )}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      {selectedRole.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-slate-500 dark:text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      closeRegister();
                      setSignInOpen(true);
                    }}
                    className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Sheet open={signInOpen} onOpenChange={setSignInOpen}>
        <SheetContent
          side="right"
          className="w-full border-slate-200/80 bg-white/95 px-0 text-slate-950 backdrop-blur-2xl dark:border-white/10 dark:bg-[#141d2e]/95 dark:text-slate-50 sm:max-w-md"
        >
          <div className="flex h-full flex-col px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
            <SheetHeader className="px-0">
              <div className="mb-3 inline-flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  {APP_TITLE}
                </span>
              </div>
              <SheetTitle className="text-left text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                Welcome back
              </SheetTitle>
              <SheetDescription className="text-left text-sm leading-6 text-slate-600 dark:text-slate-400">
                Sign in to your account to continue.
                {safeNextPath ? ` You will be returned to ${safeNextPath}.` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-8 flex-1">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Email address
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className={cn(inputBase, 'focus-visible:ring-indigo-500/40')}
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
                        <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showLoginPassword ? 'text' : 'password'}
                              placeholder="Enter your password"
                              className={cn(inputBase, 'pr-11 focus-visible:ring-indigo-500/40')}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                              aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                            >
                              {showLoginPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-slate-300 data-[state=checked]:border-indigo-500 data-[state=checked]:bg-indigo-500 dark:border-white/20"
                            />
                          </FormControl>
                          <FormLabel className="cursor-pointer text-sm font-normal text-slate-600 dark:text-slate-400">
                            Remember me
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setSignInOpen(false);
                        setLocation('/forgot-password');
                      }}
                      className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.01] hover:from-indigo-600 hover:to-violet-700 active:scale-[0.99]"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {showResendVerification ? (
                    <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                      <p>Your account needs email verification before login.</p>
                      <Button
                        type="button"
                        variant="link"
                        onClick={onResendVerification}
                        className="mt-2 h-auto p-0 font-semibold text-amber-800 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200"
                      >
                        Resend verification email
                      </Button>
                    </div>
                  ) : null}
                </form>
              </Form>
            </div>

            <div className="mt-8 border-t border-slate-200 pt-5 dark:border-white/[0.08]">
              <p className="text-center text-sm text-slate-600 dark:text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setSignInOpen(false)}
                  className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Choose your role
                </button>
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
