import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Building2, Phone, Briefcase, FileText } from "lucide-react";
import { useLocation } from "wouter";

type FormValues = {
  name: string;
  specializations: string[]; // Array of selected specializations
  establishedYear?: number;
  description?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city: string;
  province: string;
  totalProjects?: number;
  logo?: string;
  acceptTerms: boolean;
};

const STEPS = [
  { id: 1, title: "Company Info", icon: Building2 },
  { id: 2, title: "Contact Details", icon: Phone },
  { id: 3, title: "Portfolio", icon: Briefcase },
  { id: 4, title: "Review", icon: FileText },
];

export default function DeveloperSetupWizard() {
  const [step, setStep] = useState(1);
  const [location, setLocation] = useLocation();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      specializations: [],
      totalProjects: 0,
      acceptTerms: false
    }
  });

  const createProfile = trpc.developer.createProfile.useMutation();
  const updateProfile = trpc.developer.updateProfile.useMutation();
  const getProfile = trpc.developer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false
  });
  const { data: user } = trpc.auth.me.useQuery();

  // Load existing draft or pre-fill email
  useEffect(() => {
    if (getProfile.data) {
      const data = getProfile.data;
      reset({
        name: data.name,
        specializations: typeof data.specializations === 'string' 
          ? JSON.parse(data.specializations) 
          : (data.specializations || []),
        establishedYear: data.establishedYear || undefined,
        description: data.description || "",
        email: data.email || user?.email || "",
        phone: data.phone || "",
        website: data.website || "",
        address: data.address || "",
        city: data.city || "",
        province: data.province || "",
        totalProjects: data.totalProjects || 0,
        logo: data.logo || "",
        acceptTerms: false
      });
      
      // If already pending or approved, redirect to dashboard or status page
      if (data.status === 'pending') {
        toast.success("Your application is already pending review.");
        // setLocation("/dashboard"); // Uncomment when dashboard is ready
      }
    } else if (user?.email) {
      setValue("email", user.email);
    }
  }, [getProfile.data, user, reset, setValue]);

  const onNext = async () => {
    if (step < 4) {
      setStep(prev => prev + 1);
      // Auto-save draft logic could go here if we had a draft status
      // For now we just move to next step
    }
  };

  const onBack = () => setStep(prev => Math.max(1, prev - 1));

  const onSubmit = async (data: FormValues) => {
    try {
      if (!data.acceptTerms) {
        toast.error("Please accept the terms and conditions");
        return;
      }

      await createProfile.mutateAsync({
        name: data.name,
        specializations: data.specializations,
        establishedYear: data.establishedYear ? Number(data.establishedYear) : null,
        description: data.description || null,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        city: data.city,
        province: data.province,
        totalProjects: data.totalProjects ? Number(data.totalProjects) : 0,
        logo: data.logo || null,
      });
      
      toast.success("Profile submitted for review successfully!");
      setLocation("/admin/dashboard"); // Redirect to admin dashboard
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to submit profile");
    }
  };

  const formValues = watch();

  if (getProfile.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Developer Registration</h1>
          <p className="mt-2 text-slate-600">Join our platform as a verified property developer</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isCompleted = s.id < step;
              
              return (
                <div key={s.id} className="flex flex-col items-center bg-slate-50 px-2">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? "border-primary bg-primary text-white" : 
                      isCompleted ? "border-green-500 bg-green-500 text-white" : 
                      "border-slate-300 bg-white text-slate-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${isActive ? "text-primary" : "text-slate-500"}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>{STEPS[step - 1].title}</CardTitle>
            <CardDescription>Please fill in the details below</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form id="developer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Company Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input 
                      id="name" 
                      {...register("name", { required: "Company name is required" })} 
                      placeholder="e.g. Apex Developments"
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label>Development Specializations *</Label>
                    <p className="text-sm text-slate-500">
                      Select all types of developments your company specializes in
                    </p>
                    <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                      {[
                        { value: 'residential', label: 'Residential', description: 'Houses, apartments, estates' },
                        { value: 'commercial', label: 'Commercial', description: 'Offices, retail, business parks' },
                        { value: 'mixed_use', label: 'Mixed Use', description: 'Combined residential & commercial' },
                        { value: 'industrial', label: 'Industrial', description: 'Warehouses, factories, logistics' }
                      ].map((spec) => (
                        <div key={spec.value} className="flex items-start space-x-3">
                          <Checkbox
                            id={spec.value}
                            checked={formValues.specializations?.includes(spec.value)}
                            onCheckedChange={(checked) => {
                              const current = formValues.specializations || [];
                              if (checked) {
                                setValue('specializations', [...current, spec.value]);
                              } else {
                                setValue('specializations', current.filter(s => s !== spec.value));
                              }
                            }}
                          />
                          <div className="grid gap-1 flex-1">
                            <Label htmlFor={spec.value} className="font-medium cursor-pointer">
                              {spec.label}
                            </Label>
                            <p className="text-xs text-slate-500">{spec.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formValues.specializations?.length === 0 && (
                      <p className="text-sm text-red-500">Please select at least one specialization</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="establishedYear">Established Year</Label>
                    <Input 
                      id="establishedYear" 
                      type="number"
                      {...register("establishedYear")} 
                      placeholder="e.g. 2010"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea 
                      id="description" 
                      {...register("description")} 
                      placeholder="Tell us about your company..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contact Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input 
                        id="email" 
                        type="email"
                        {...register("email", { required: "Email is required" })} 
                        placeholder="contact@company.com"
                      />
                      {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        {...register("phone")} 
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input 
                      id="website" 
                      {...register("website")} 
                      placeholder="https://www.example.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Physical Address</Label>
                    <Input 
                      id="address" 
                      {...register("address")} 
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City *</Label>
                      <Input 
                        id="city" 
                        {...register("city", { required: "City is required" })} 
                        placeholder="Cape Town"
                      />
                      {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="province">Province *</Label>
                      <Select 
                        onValueChange={(val) => setValue("province", val)} 
                        defaultValue={formValues.province}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Gauteng">Gauteng</SelectItem>
                          <SelectItem value="Western Cape">Western Cape</SelectItem>
                          <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                          <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                          <SelectItem value="Free State">Free State</SelectItem>
                          <SelectItem value="Limpopo">Limpopo</SelectItem>
                          <SelectItem value="Mpumalanga">Mpumalanga</SelectItem>
                          <SelectItem value="North West">North West</SelectItem>
                          <SelectItem value="Northern Cape">Northern Cape</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.province && <p className="text-sm text-red-500">{errors.province.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Portfolio */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="totalProjects">Total Projects Completed</Label>
                    <Input 
                      id="totalProjects" 
                      type="number"
                      {...register("totalProjects")} 
                      placeholder="0"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Company Logo</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900">Click to upload logo</p>
                        <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or GIF (max. 2MB)</p>
                        {/* File input would go here - simplified for now */}
                        <Input type="file" className="hidden" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Company</p>
                        <p className="text-sm font-medium text-slate-900">{formValues.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Specializations</p>
                        <p className="text-sm font-medium text-slate-900">
                          {formValues.specializations?.map(s => s.replace('_', ' ')).join(', ') || 'None selected'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Email</p>
                        <p className="text-sm font-medium text-slate-900">{formValues.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Location</p>
                        <p className="text-sm font-medium text-slate-900">{formValues.city}, {formValues.province}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={formValues.acceptTerms}
                      onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label 
                        htmlFor="terms" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Accept terms and conditions
                      </Label>
                      <p className="text-sm text-slate-500">
                        By submitting this application, you agree to our Developer Terms of Service and Privacy Policy.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-6">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={step === 1}
            >
              Back
            </Button>
            
            {step < 4 ? (
              <Button onClick={onNext}>
                Next Step
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit(onSubmit)} 
                disabled={createProfile.isLoading || !formValues.acceptTerms}
              >
                {createProfile.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
