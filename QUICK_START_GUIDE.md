# Quick Start Guide: Implementing Property Listing

This guide shows you exactly how to implement the **Property Listing Creation** feature - the #1 priority from the roadmap.

## Step 1: Add API Endpoint (5 minutes)

### Update `server/routers.ts`

Add this to the `properties` router:

```typescript
properties: router({
  // ... existing endpoints ...
  
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(5).max(255),
      description: z.string().min(10),
      propertyType: z.enum(["apartment", "house", "villa", "plot", "commercial", "townhouse", "cluster_home", "farm", "shared_living"]),
      listingType: z.enum(["sale", "rent", "rent_to_buy", "auction", "shared_living"]),
      price: z.number().positive(),
      bedrooms: z.number().int().optional(),
      bathrooms: z.number().int().optional(),
      area: z.number().positive(),
      address: z.string().min(5),
      city: z.string().min(2),
      province: z.string().min(2),
      zipCode: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      amenities: z.array(z.string()).optional(),
      yearBuilt: z.number().int().optional(),
      levies: z.number().int().optional(),
      ratesAndTaxes: z.number().int().optional(),
      videoUrl: z.string().url().optional(),
      virtualTourUrl: z.string().url().optional(),
      images: z.array(z.string()).min(1, "At least one image is required"), // Array of image URLs
    }))
    .mutation(async ({ ctx, input }) => {
      const { images, ...propertyData } = input;
      
      // Create property
      const propertyId = await db.createProperty({
        ...propertyData,
        amenities: input.amenities ? JSON.stringify(input.amenities) : null,
        ownerId: ctx.user.id,
        status: "available",
        featured: 0,
        views: 0,
        transactionType: input.listingType === "rent" ? "rent" : "sale",
      });

      // Create property images
      for (let i = 0; i < images.length; i++) {
        await db.createPropertyImage({
          propertyId: Number(propertyId),
          imageUrl: images[i],
          isPrimary: i === 0 ? 1 : 0,
          displayOrder: i,
        });
      }

      return { success: true, propertyId: Number(propertyId) };
    }),
}),
```

### Add Image Upload Endpoint

Add this to a new `upload` router or to the system router:

```typescript
upload: router({
  image: protectedProcedure
    .input(z.object({
      // You'll receive base64 or file data from frontend
      // Adapt based on how you want to handle uploads
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation depends on your upload strategy
      // See Step 3 for details
    }),
}),
```

---

## Step 2: Add Database Helper (2 minutes)

You already have `createProperty` and `createPropertyImage` in `server/db.ts` - they're ready to use! ✅

If you need to get user's properties, add this:

```typescript
// In server/db.ts
export async function getUserProperties(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(properties)
    .where(eq(properties.ownerId, userId))
    .orderBy(desc(properties.createdAt));
}
```

---

## Step 3: Build the Frontend Form (2-3 hours)

### Create `client/src/pages/ListProperty.tsx`

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, ArrowRight, ArrowLeft, Check } from "lucide-react";

const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  propertyType: z.enum(["apartment", "house", "villa", "plot", "commercial", "townhouse", "cluster_home", "farm", "shared_living"]),
  listingType: z.enum(["sale", "rent", "rent_to_buy", "auction", "shared_living"]),
  price: z.number().positive(),
  bedrooms: z.number().int().optional(),
  bathrooms: z.number().int().optional(),
  area: z.number().positive(),
  address: z.string().min(5),
  city: z.string().min(2),
  province: z.string().min(2),
  zipCode: z.string().optional(),
  amenities: z.array(z.string()).optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const STEPS = ["Basic Info", "Details", "Images", "Review"];

export default function ListProperty() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    mode: "onChange",
  });

  const createProperty = trpc.properties.create.useMutation({
    onSuccess: (data) => {
      toast.success("Property listed successfully!");
      setLocation(`/properties/${data.propertyId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create property");
    },
  });

  const propertyType = watch("propertyType");
  const listingType = watch("listingType");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      // Convert files to base64 or upload to S3
      // This is a simplified version - you'll need to implement actual S3 upload
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        // TODO: Upload to S3 using your storage service
        // For now, creating a local URL (you'll need to replace this)
        const url = URL.createObjectURL(file);
        uploadedUrls.push(url);
      }
      
      setImages([...images, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    await createProperty.mutateAsync({
      ...data,
      amenities: data.amenities || [],
      images,
    });
  };

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">List Your Property</h1>
          <p className="text-muted-foreground">Fill in the details to create your listing</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={(currentStep + 1) * 25} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => (
              <span
                key={step}
                className={`text-sm ${index === currentStep ? "font-semibold" : "text-muted-foreground"}`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Step {currentStep + 1}: {STEPS[currentStep]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Info */}
              {currentStep === 0 && (
                <>
                  <div>
                    <Label htmlFor="title">Property Title *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="e.g., Luxury 3BHK Apartment in Prime Location"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      rows={5}
                      placeholder="Describe your property in detail..."
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="propertyType">Property Type *</Label>
                      <Select onValueChange={(val) => setValue("propertyType", val as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="plot">Plot</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.propertyType && (
                        <p className="text-sm text-destructive mt-1">{errors.propertyType.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="listingType">Listing Type *</Label>
                      <Select onValueChange={(val) => setValue("listingType", val as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sale or Rent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="rent_to_buy">Rent to Buy</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.listingType && (
                        <p className="text-sm text-destructive mt-1">{errors.listingType.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      {...register("price", { valueAsNumber: true })}
                      placeholder="Enter price"
                    />
                    {errors.price && (
                      <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Details */}
              {currentStep === 1 && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        {...register("bedrooms", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        {...register("bathrooms", { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="area">Area (sq ft) *</Label>
                      <Input
                        id="area"
                        type="number"
                        {...register("area", { valueAsNumber: true })}
                      />
                      {errors.area && (
                        <p className="text-sm text-destructive mt-1">{errors.area.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input id="address" {...register("address")} />
                    {errors.address && (
                      <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" {...register("city")} />
                      {errors.city && (
                        <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="province">Province *</Label>
                      <Input id="province" {...register("province")} />
                      {errors.province && (
                        <p className="text-sm text-destructive mt-1">{errors.province.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input id="zipCode" {...register("zipCode")} />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Images */}
              {currentStep === 2 && (
                <>
                  <div>
                    <Label>Upload Images *</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Upload at least one image (JPEG, PNG, max 5MB each)
                      </p>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mt-6">
                        {images.map((url, index) => (
                          <div key={index} className="relative">
                            <img src={url} alt={`Property ${index + 1}`} className="rounded-lg w-full h-32 object-cover" />
                            {index === 0 && (
                              <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setImages(images.filter((_, i) => i !== index))}
                              className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Review Your Listing</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Title:</strong> {watch("title")}</p>
                      <p><strong>Type:</strong> {watch("propertyType")} - {watch("listingType")}</p>
                      <p><strong>Price:</strong> R{watch("price")?.toLocaleString()}</p>
                      <p><strong>Location:</strong> {watch("address")}, {watch("city")}</p>
                      <p><strong>Images:</strong> {images.length} uploaded</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createProperty.isPending}>
                    {createProperty.isPending ? "Publishing..." : "Publish Listing"}
                    <Check className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
```

---

## Step 4: Add Image Upload to S3

You need to implement actual S3 upload. Here's how:

### Option A: Direct Upload from Frontend

Create an API endpoint that returns a presigned URL, then upload from frontend.

### Option B: Upload via Backend (Simpler)

Create `server/routers.ts` endpoint:

```typescript
upload: router({
  propertyImage: protectedProcedure
    .input(z.object({
      filename: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate unique filename
      const key = `properties/${ctx.user.id}/${Date.now()}-${input.filename}`;
      
      // Get presigned URL from S3 (if you have this)
      // Or upload via your storage service
      // Return the URL to frontend
      
      return { url: `https://your-s3-bucket.com/${key}` };
    }),
}),
```

---

## Step 5: Add Navigation Link (2 minutes)

### Update `client/src/components/EnhancedNavbar.tsx`

Add a "List Property" button:

```typescript
<Button onClick={() => setLocation("/list-property")}>
  List Property
</Button>
```

### Update `client/src/App.tsx`

Add the route:

```typescript
<Route path="/list-property" component={ListProperty} />
```

---

## Step 6: Test It!

1. Make sure you're logged in
2. Navigate to `/list-property`
3. Fill out the form
4. Upload images
5. Submit and verify the property appears in listings

---

## Troubleshooting

**Issue: Images not uploading**
- Check your S3 configuration in `server/storage.ts`
- Verify CORS settings on your S3 bucket
- Check file size limits

**Issue: Form validation errors**
- Check that all required fields are filled
- Verify Zod schema matches your database schema

**Issue: Property not appearing**
- Check database connection
- Verify `ownerId` is set correctly
- Check console for errors

---

## Next Steps

Once this works, move to:
1. **Property Dashboard** - Let users see their listings
2. **Edit/Delete Properties** - Allow property management
3. **Property Status** - Mark as sold/rented
4. **Analytics** - Show views and inquiries

Good luck! 🚀

