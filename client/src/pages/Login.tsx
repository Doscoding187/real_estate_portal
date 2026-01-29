import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  FormDescription,
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
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { APP_TITLE } from '@/const';
import { trpc } from '@/lib/trpc';
import { apiFetch, ApiError } from '@/lib/api';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
    // Agent profile fields (conditional)
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

export default function Login() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('register');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified successfully! You can now log in.');
    }
  }, [searchParams]);

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

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      toast.success('Welcome back!');

      // Role-based redirect
      const role = result.user?.role;
      console.log('[Login] API result:', result);
      console.log('[Login] User role:', role);

      let redirectPath = '/user/dashboard';

      if (role === 'super_admin') redirectPath = '/admin/overview';
      else if (role === 'property_developer') redirectPath = '/developer/dashboard';
      else if (role === 'agency_admin') redirectPath = '/agency/dashboard';
      else if (role === 'agent') redirectPath = '/agent/dashboard';

      console.log('[Login] Redirecting to:', redirectPath);

      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[Login] Executing redirect now...');
      window.location.href = redirectPath;
    } catch (error) {
      console.error('[Login] Error:', error);
      if (error instanceof ApiError) {
        toast.error(error.body?.error || `Login failed (${error.status})`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Login failed');
      }
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const payload: any = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      };

      // Add agent profile if role is agent
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

      toast.success(
        result.message ||
        'Account created successfully! Please check your email to verify your account.',
      );
      setActiveTab('login');
      registerForm.reset();
    } catch (error) {
      console.error('[Register] Error:', error);
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/20 blur-[100px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-400/20 blur-[100px] animate-pulse delay-700" />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-teal-400/20 blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Brand & Info */}
        <div className="hidden lg:flex flex-col gap-6 text-slate-800 dark:text-slate-200 p-8">
          <div className="inline-flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Home className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Property Listify</h1>
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-bold leading-tight">
              Property Listing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Simplified
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Join thousands of agents, developers, and buyers on the most modern real estate
              platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30">
              <User className="h-8 w-8 text-purple-600 mb-3" />
              <div className="font-semibold text-lg">For Buyers</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Discover properties with AI insights
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30">
              <Briefcase className="h-8 w-8 text-blue-600 mb-3" />
              <div className="font-semibold text-lg">For Agents</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage listings and leads efficiently
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30">
              <Building2 className="h-8 w-8 text-indigo-600 mb-3" />
              <div className="font-semibold text-lg">For Agencies</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Scale your team and business
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/30">
              <HardHat className="h-8 w-8 text-cyan-600 mb-3" />
              <div className="font-semibold text-lg">For Developers</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showcase new developments
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Card */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-slate-700/50 p-8 text-slate-900 dark:text-slate-100">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Property Listify</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
                <TabsTrigger
                  value="login"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
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
                              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                                placeholder="••••••••"
                                className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
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
                            <FormLabel className="font-normal text-slate-600 dark:text-slate-400 cursor-pointer">
                              Remember me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => setLocation('/forgot-password')}
                      >
                        Forgot password?
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Doe"
                              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              {...field}
                            />
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
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
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
                                  placeholder="••••••••"
                                  className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
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
                            <FormLabel>Confirm</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
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

                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>I am a...</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-2"
                            >
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="visitor"
                                    id="r-visitor"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <Label
                                  htmlFor="r-visitor"
                                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                                >
                                  <User className="mb-2 h-6 w-6" />
                                  <span className="text-xs font-medium">Buyer/User</span>
                                </Label>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="agent"
                                    id="r-agent"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <Label
                                  htmlFor="r-agent"
                                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                                >
                                  <Briefcase className="mb-2 h-6 w-6" />
                                  <span className="text-xs font-medium">Agent</span>
                                </Label>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="agency_admin"
                                    id="r-agency"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <Label
                                  htmlFor="r-agency"
                                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                                >
                                  <Building2 className="mb-2 h-6 w-6" />
                                  <span className="text-xs font-medium">Agency</span>
                                </Label>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem
                                    value="property_developer"
                                    id="r-developer"
                                    className="peer sr-only"
                                  />
                                </FormControl>
                                <Label
                                  htmlFor="r-developer"
                                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer"
                                >
                                  <HardHat className="mb-2 h-6 w-6" />
                                  <span className="text-xs font-medium">Developer</span>
                                </Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Agent Profile Fields - Show only when role is 'agent' */}
                    {selectedRole === 'agent' && (
                      <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Agent Profile Information
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="agentDisplayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John Smith"
                                  className="bg-white dark:bg-slate-800"
                                  {...field}
                                />
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
                                <Input
                                  type="tel"
                                  placeholder="+27 12 345 6789"
                                  className="bg-white dark:bg-slate-800"
                                  {...field}
                                />
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
                                <Input
                                  placeholder="FFC1234567"
                                  className="bg-white dark:bg-slate-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="agentBio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Brief description of your experience..."
                                  className="bg-white dark:bg-slate-800"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          Your agent profile will be reviewed by our team before activation.
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </Form>
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
    </div>
  );
}
