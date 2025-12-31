import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { LogoUploadZone } from '@/components/wizard/LogoUploadZone';
import { 
  Building2, 
  Phone, 
  Briefcase, 
  CheckCircle2 
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  // Identity (Tab 1)
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  brandTier: z.enum(['national', 'regional', 'boutique']),
  identityType: z.enum(['developer', 'marketing_agency', 'hybrid']).default('developer'),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  
  // Company Info (Tab 1)
  description: z.string().optional(),
  category: z.string().optional(),
  establishedYear: z.string().optional(), // Form input as string, convert to number
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  
  // Contact Info (Tab 2)
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  
  // Portfolio (Tab 3)
  completedProjects: z.string().optional(), // Input as string
  currentProjects: z.string().optional(),
  upcomingProjects: z.string().optional(), 
  specializations: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

const SPECIALIZATION_OPTIONS = [
  'Residential', 'Commercial', 'Mixed-Use', 'Luxury', 
  'Affordable Housing', 'Sustainable', 'Renovation', 'Industrial'
];

interface CreateBrandProfileDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: (newBrandId: number) => void;
}

export function CreateBrandProfileDialog({
  open,
  setOpen,
  onSuccess,
}: CreateBrandProfileDialogProps) {
  const { setSelectedBrandId } = useDeveloperContext();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('identity');
  
  // Upload State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: '',
      brandTier: 'regional',
      identityType: 'developer',
      logoUrl: '',
      description: '',
      category: '',
      establishedYear: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      province: '',
      completedProjects: '0',
      currentProjects: '0',
      upcomingProjects: '0',
      specializations: [],
    },
  });

  // Load draft from localStorage on mount
  React.useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('brandProfileDraft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Only restore if it looks valid
        if (parsed && typeof parsed === 'object') {
          // Reset form with merged values
          form.reset({
            ...form.getValues(), // Current defaults
            ...parsed,           // Saved values
          });
          toast.info('Restored saved draft');
        }
      }
    } catch (e) {
      console.error('Failed to load draft', e);
    }
  }, []);

  // Save changes to localStorage
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem('brandProfileDraft', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const createMutation = trpc.superAdminPublisher.createBrandProfile.useMutation({
    onSuccess: (data) => {
      toast.success('Developer brand profile created successfully');
      utils.superAdminPublisher.listBrandProfiles.invalidate();
      
      // Clear draft on success
      localStorage.removeItem('brandProfileDraft');
      
      // Auto-select the new brand
      setSelectedBrandId(data.id);
      
      form.reset();
      setOpen(false);
      setActiveTab('identity'); // Reset tab
      
      if (onSuccess) onSuccess(data.id);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create brand profile');
    },
  });

  const presignMutation = trpc.upload.presign.useMutation();

  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      setUploadProgress(10);

      // 1. Get presigned URL
      const { url, publicUrl } = await presignMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      setUploadProgress(40);

      // 2. Upload to S3
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to storage');
      }

      setUploadProgress(100);

      // 3. Set URL in form
      form.setValue('logoUrl', publicUrl, { shouldValidate: true });
      toast.success('Logo uploaded successfully');

    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      setUploadProgress(0);
    }
  };

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      brandName: values.brandName,
      brandTier: values.brandTier,
      identityType: values.identityType,
      logoUrl: values.logoUrl || undefined,
      
      description: values.description || undefined,
      category: values.category || undefined,
      establishedYear: values.establishedYear ? parseInt(values.establishedYear) : undefined,
      website: values.website || undefined,
      
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      province: values.province || undefined,
      
      completedProjects: parseInt(values.completedProjects || '0'),
      currentProjects: parseInt(values.currentProjects || '0'),
      upcomingProjects: parseInt(values.upcomingProjects || '0'),
      specializations: values.specializations,
      
      // Derive operating provinces from location if not explicitly set
      operatingProvinces: values.province ? [values.province] : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Create Developer Brand
          </DialogTitle>
          <DialogDescription>
            Create a new platform-owned developer profile for publishing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="identity" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Identity
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Contact
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Portfolio
                </TabsTrigger>
              </TabsList>


              {/* === TAB 1: IDENTITY === */}
              <TabsContent value="identity" className="space-y-4 pt-4">
                
                <FormField
                  control={form.control}
                  name="identityType"
                  render={({ field }) => (
                    <FormItem className="space-y-3 p-4 border border-blue-100 rounded-lg bg-blue-50/30">
                      <FormLabel className="text-base font-semibold text-blue-900">Publishing As</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border border-blue-200 bg-white p-3 hover:bg-blue-50 cursor-pointer transition-colors shadow-sm [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-blue-50">
                            <FormControl>
                              <RadioGroupItem value="developer" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold text-blue-900 cursor-pointer">
                                Property Developer
                              </FormLabel>
                              <FormDescription className="text-xs text-slate-500">
                                Creating and listing my own developments
                              </FormDescription>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border border-blue-200 bg-white p-3 hover:bg-blue-50 cursor-pointer transition-colors shadow-sm [&:has([data-state=checked])]:border-blue-500 [&:has([data-state=checked])]:bg-blue-50">
                            <FormControl>
                              <RadioGroupItem value="marketing_agency" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-semibold text-blue-900 cursor-pointer">
                                Marketing Agency
                              </FormLabel>
                              <FormDescription className="text-xs text-slate-500">
                                Listing on behalf of other developers
                              </FormDescription>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brandName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Waterfall Estate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brandTier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="national">National (High)</SelectItem>
                            <SelectItem value="regional">Regional (Medium)</SelectItem>
                            <SelectItem value="boutique">Boutique (Specialized)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="mixed_use">Mixed-Use</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="establishedYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Established Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="YYYY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the developer..." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl>
                        <LogoUploadZone
                          value={field.value}
                          onChange={handleLogoUpload}
                          uploading={isUploadingLogo}
                          uploadProgress={uploadProgress}
                          error={form.formState.errors.logoUrl?.message}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* === TAB 2: CONTACT === */}
              <TabsContent value="contact" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@brand.com" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+27..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Street Address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Cape Town" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                         <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select province" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Western Cape">Western Cape</SelectItem>
                            <SelectItem value="Gauteng">Gauteng</SelectItem>
                            <SelectItem value="KwaZulu-Natal">KwaZulu-Natal</SelectItem>
                            <SelectItem value="Eastern Cape">Eastern Cape</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* === TAB 3: PORTFOLIO === */}
              <TabsContent value="portfolio" className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="completedProjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Completed</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentProjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upcomingProjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upcoming</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormLabel>Specializations</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALIZATION_OPTIONS.map((spec) => (
                      <FormField
                        key={spec}
                        control={form.control}
                        name="specializations"
                        render={({ field }) => {
                          return (
                            <div className="flex flex-row items-center space-x-2 space-y-0">
                              <Checkbox
                                checked={field.value?.includes(spec)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, spec])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== spec
                                        )
                                      );
                                }}
                              />
                              <label className="text-sm font-normal cursor-pointer">
                                {spec}
                              </label>
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Brand Profile'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
