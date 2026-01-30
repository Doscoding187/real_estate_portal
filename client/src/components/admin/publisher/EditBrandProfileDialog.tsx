import React, { useState, useEffect } from 'react';
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
import { LogoUploadZone } from '@/components/wizard/LogoUploadZone';
import { Building2, Phone, Briefcase } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  brandProfileId: z.number(),
  // Identity
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  brandTier: z.enum(['national', 'regional', 'boutique']),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),

  // Company Info
  description: z.string().optional(),
  category: z.string().optional(),
  establishedYear: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),

  // Contact Info
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),

  // Portfolio
  specializations: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

const SPECIALIZATION_OPTIONS = [
  'Residential',
  'Commercial',
  'Mixed-Use',
  'Luxury',
  'Affordable Housing',
  'Sustainable',
  'Renovation',
  'Industrial',
];

interface EditBrandProfileDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  brandData: any; // Full brand object
  onSuccess?: () => void;
}

export function EditBrandProfileDialog({
  open,
  setOpen,
  brandData,
  onSuccess,
}: EditBrandProfileDialogProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('identity');

  // Upload State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandProfileId: brandData?.id,
      brandName: brandData?.brandName || '',
      brandTier: brandData?.brandTier || 'regional',
      logoUrl: brandData?.logoUrl || '',
      description: brandData?.about || '',
      category: brandData?.propertyFocus?.[0] || '', // Simple map back
      establishedYear: brandData?.foundedYear?.toString() || '',
      website: brandData?.websiteUrl || '',
      email: brandData?.publicContactEmail || '',
      phone: '', // Need to extract from wherever it is stored if not in simple field, likely generic
      address: '', // Split logic from headOfficeLocation is hard, leave blank for now or populate if simple
      city: '',
      province: '',
      specializations: brandData?.propertyFocus || [],
    },
  });

  // Reset form when brandData changes
  useEffect(() => {
    if (brandData) {
      // Try to parse headOfficeLocation for simple city/province if format matches "Address, City, Province"
      // or "City, Province"
      let city = '';
      let province = '';
      let address = '';

      if (brandData.headOfficeLocation) {
        const parts = brandData.headOfficeLocation.split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          province = parts[parts.length - 1];
          city = parts[parts.length - 2];
          if (parts.length > 2) {
            address = parts.slice(0, parts.length - 2).join(', ');
          }
        } else {
          address = brandData.headOfficeLocation;
        }
      }

      form.reset({
        brandProfileId: brandData.id,
        brandName: brandData.brandName || '',
        brandTier: brandData.brandTier || 'regional',
        logoUrl: brandData.logoUrl || '',
        description: brandData.about || '',
        category: brandData.propertyFocus?.[0] || '',
        establishedYear: brandData.foundedYear?.toString() || '',
        website: brandData.websiteUrl || '',
        email: brandData.publicContactEmail || '',
        phone: '', // Not strictly in schema yet
        address: address, // Extracted
        city: city, // Extracted
        province: province, // Extracted
        specializations: brandData.propertyFocus || [],
      });
    }
  }, [brandData, form]);

  const updateMutation = trpc.superAdminPublisher.updateBrandProfile.useMutation({
    onSuccess: () => {
      toast.success('Brand profile updated successfully');
      utils.superAdminPublisher.listBrandProfiles.invalidate();
      setOpen(false);
      if (onSuccess) onSuccess();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const presignMutation = trpc.upload.presign.useMutation();

  const handleLogoUpload = (file: File | null) => {
    if (!file) return;
    void (async () => {
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
    })();
  };

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      brandProfileId: values.brandProfileId,
      brandName: values.brandName,
      brandTier: values.brandTier,
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
      specializations: values.specializations,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Edit Brand Profile
          </DialogTitle>
          <DialogDescription>
            Update details for platform-owned developer profile.
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <div className="space-y-3">
                  <FormLabel>Specializations</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {SPECIALIZATION_OPTIONS.map(spec => (
                      <FormField
                        key={spec}
                        control={form.control}
                        name="specializations"
                        render={({ field }) => {
                          return (
                            <div className="flex flex-row items-center space-x-2 space-y-0">
                              <Checkbox
                                checked={field.value?.includes(spec)}
                                onCheckedChange={checked => {
                                  return checked
                                    ? field.onChange([...field.value, spec])
                                    : field.onChange(field.value?.filter(value => value !== spec));
                                }}
                              />
                              <label className="text-sm font-normal cursor-pointer">{spec}</label>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
