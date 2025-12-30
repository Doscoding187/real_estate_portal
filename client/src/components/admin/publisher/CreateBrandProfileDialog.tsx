import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useDeveloperContext } from '@/contexts/DeveloperContextProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { LogoUploadZone } from '@/components/wizard/LogoUploadZone';

const formSchema = z.object({
  brandName: z.string().min(2, 'Brand name must be at least 2 characters'),
  brandTier: z.enum(['national', 'regional', 'boutique']),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateBrandProfileDialogProps {
  onSuccess?: (id: number) => void;
}

export const CreateBrandProfileDialog: React.FC<CreateBrandProfileDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const { setSelectedBrandId } = useDeveloperContext();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: '',
      brandTier: 'regional',
      logoUrl: '',
    },
  });

  // Logo Upload State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const presignMutation = trpc.upload.presign.useMutation();

  const handleLogoUpload = async (file: File) => {
    try {
      setIsUploadingLogo(true);
      setUploadProgress(10); // Start progress

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
      
      // 3. Set the public URL in form
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

  const utils = trpc.useContext();
  const createMutation = trpc.superAdminPublisher.createBrandProfile.useMutation({
    onSuccess: (data) => {
      toast.success('Developer brand profile created successfully');
      utils.superAdminPublisher.listBrandProfiles.invalidate();
      
      // Auto-select the new brand
      setSelectedBrandId(data.id);
      
      form.reset();
      setOpen(false);
      
      if (onSuccess) onSuccess(data.id);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create brand profile');
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      brandName: values.brandName,
      brandTier: values.brandTier,
      logoUrl: values.logoUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start mt-2 border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Create New Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Developer Brand</DialogTitle>
          <DialogDescription>
            Create a new platform-owned developer profile to act as.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="brandName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Waterfall Properties" {...field} />
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
                        <SelectValue placeholder="Select a tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="national">National (High Volume)</SelectItem>
                      <SelectItem value="regional">Regional (Mid Volume)</SelectItem>
                      <SelectItem value="boutique">Boutique (Luxury/Small)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Logo</FormLabel>
                  <FormControl>
                    <LogoUploadZone
                      value={field.value}
                      onChange={(file) => {
                        if (file) handleLogoUpload(file);
                        else field.onChange(''); // Handle removal
                      }}
                      uploading={isUploadingLogo}
                      uploadProgress={uploadProgress}
                      error={field.formState.errors.logoUrl?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isLoading}>
                {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Brand
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
