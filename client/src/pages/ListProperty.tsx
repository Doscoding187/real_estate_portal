import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUploader, type ImageFile } from '@/components/ImageUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Image as ImageIcon,
  DollarSign,
  Check,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/Navbar';
import { cn } from '@/lib/utils';

// Form validation schema
const propertySchema = z.object({
  // Step 1: Basic Info
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  propertyType: z.enum([
    'apartment',
    'house',
    'villa',
    'plot',
    'commercial',
    'townhouse',
    'cluster_home',
    'farm',
    'shared_living',
  ]),
  listingType: z.enum(['sale', 'rent', 'rent_to_buy', 'auction', 'shared_living']),

  // Step 2: Location
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  zipCode: z.string().optional(),

  // Step 3: Details
  price: z.coerce.number().positive('Price must be positive'),
  bedrooms: z.coerce.number().int().positive().optional(),
  bathrooms: z.coerce.number().int().positive().optional(),
  area: z.coerce.number().positive('Area must be positive'),
  yearBuilt: z.coerce.number().int().positive().optional(),
  levies: z.coerce.number().int().optional(),
  ratesAndTaxes: z.coerce.number().int().optional(),

  // Step 4: Amenities
  amenities: z.array(z.string()).optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  virtualTourUrl: z.string().url().optional().or(z.literal('')),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Home },
  { id: 2, name: 'Location', icon: MapPin },
  { id: 3, name: 'Details & Pricing', icon: DollarSign },
  { id: 4, name: 'Images', icon: ImageIcon },
];

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'plot', label: 'Plot' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cluster_home', label: 'Cluster Home' },
  { value: 'farm', label: 'Farm' },
  { value: 'shared_living', label: 'Shared Living' },
];

const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'rent_to_buy', label: 'Rent to Buy' },
  { value: 'auction', label: 'Auction' },
  { value: 'shared_living', label: 'Shared Living' },
];

const AMENITIES = [
  'Swimming Pool',
  'Gym',
  'Garden',
  'Parking',
  'Security',
  'Air Conditioning',
  'Balcony',
  'Terrace',
  'Fireplace',
  'Pet Friendly',
  'Furnished',
  'Elevator',
  'Storage',
];

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
];

export default function ListProperty() {
  const [currentStep, setCurrentStep] = useState(1);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [, setLocation] = useLocation();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      amenities: [],
      videoUrl: '',
      virtualTourUrl: '',
    },
  });

  const createPropertyMutation = trpc.properties.create.useMutation({
    onSuccess: data => {
      toast.success('Property listed successfully!');
      setLocation(`/property/${data.propertyId}`);
    },
    onError: error => {
      toast.error(error.message || 'Failed to create property');
    },
  });

  const nextStep = async () => {
    // Validate current step
    let fieldsToValidate: (keyof PropertyFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['title', 'description', 'propertyType', 'listingType'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['address', 'city', 'province'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['price', 'area'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    // Get uploaded image URLs
    const uploadedUrls = images.filter(img => img.uploaded && img.url).map(img => img.url!);

    if (uploadedUrls.length === 0) {
      toast.error('Please upload at least one image');
      setCurrentStep(4);
      return;
    }

    // Submit property with images
    createPropertyMutation.mutate({
      ...data,
      amenities: selectedAmenities,
      images: uploadedUrls,
      videoUrl: data.videoUrl || undefined,
      virtualTourUrl: data.virtualTourUrl || undefined,
    });
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity],
    );
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">List Your Property</h1>
            <p className="text-muted-foreground">
              Fill in the details to list your property on our platform
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {STEPS.map(step => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && 'bg-primary/20 text-primary',
                        !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className="text-xs text-center font-medium">{step.name}</span>
                  </div>
                );
              })}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
                  <CardDescription>
                    {currentStep === 1 && 'Provide basic information about your property'}
                    {currentStep === 2 && 'Where is your property located?'}
                    {currentStep === 3 && 'Add property details and pricing'}
                    {currentStep === 4 && 'Upload high-quality images of your property'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Basic Info */}
                  {currentStep === 1 && (
                    <>
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Title *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Beautiful 3 Bedroom House in Sandton"
                                {...field}
                              />
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
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your property, its features, and what makes it special..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="propertyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select property type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PROPERTY_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="listingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Listing Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select listing type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {LISTING_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Step 2: Location */}
                  {currentStep === 2 && (
                    <>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Johannesburg" {...field} />
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
                              <FormLabel>Province *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select province" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SA_PROVINCES.map(province => (
                                    <SelectItem key={province} value={province}>
                                      {province}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 2000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Step 3: Details & Pricing */}
                  {currentStep === 3 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (ZAR) *</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 2500000" {...field} />
                              </FormControl>
                              <FormDescription>
                                {form.watch('listingType') === 'rent'
                                  ? 'Monthly rental price'
                                  : 'Sale price'}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="area"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area (sqm) *</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 150" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="bedrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bedrooms</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 3" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bathrooms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bathrooms</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="yearBuilt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Year Built</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 2020" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="levies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Levies (ZAR)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 1500" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ratesAndTaxes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rates & Taxes (ZAR)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g., 800" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <FormLabel>Amenities</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                          {AMENITIES.map(amenity => (
                            <div key={amenity} className="flex items-center space-x-2">
                              <Checkbox
                                id={amenity}
                                checked={selectedAmenities.includes(amenity)}
                                onCheckedChange={() => toggleAmenity(amenity)}
                              />
                              <label
                                htmlFor={amenity}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {amenity}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="videoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Video URL (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://youtube.com/..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="virtualTourUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Virtual Tour URL (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Step 4: Images */}
                  {currentStep === 4 && (
                    <ImageUploader
                      images={images}
                      onImagesChange={setImages}
                      maxImages={20}
                      maxSizeMB={10}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-4">
                  <Button type="button" variant="ghost" onClick={() => setLocation('/')}>
                    Cancel
                  </Button>

                  {currentStep < STEPS.length ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={
                        createPropertyMutation.isPending ||
                        images.filter(img => img.uploaded).length === 0
                      }
                    >
                      {createPropertyMutation.isPending ? 'Creating...' : 'List Property'}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
