import type { ListingWizardWorkflow } from '@shared/listing-workflow-types';

export const listingRentWorkflow: ListingWizardWorkflow = {
  id: 'listing_rent',
  title: 'Rent Out Your Property',
  description: 'Create a listing to rent out your property',
  steps: [
    {
      id: 'action',
      title: 'Listing Action',
      description: 'What would you like to do with this property?',
      componentKey: 'ActionStep',
      required: true,
    },
    {
      id: 'property_type',
      title: 'Property Type',
      description: 'What type of property are you listing?',
      componentKey: 'PropertyTypeStep',
      required: true,
    },
    {
      id: 'basic_information',
      title: 'Property Details',
      description: 'Tell us about your property',
      componentKey: 'BasicInformationStep',
      required: true,
      validate: (data) => {
        const errors: { field: string; message: string }[] = [];
        if (!data.title || data.title.length < 10) {
          errors.push({ field: 'title', message: 'Title must be at least 10 characters' });
        }
        if (!data.description || data.description.length < 50) {
          errors.push({ field: 'description', message: 'Description must be at least 50 characters' });
        }
        return { valid: errors.length === 0, errors };
      },
    },
    {
      id: 'additional_information',
      title: 'Additional Information',
      description: 'Add more details to help your listing stand out',
      componentKey: 'AdditionalInformationStep',
      required: false,
    },
    {
      id: 'pricing',
      title: 'Rental Pricing',
      description: 'Set your monthly rental price and terms',
      componentKey: 'PricingStep',
      required: true,
      validate: (data) => {
        const errors: { field: string; message: string }[] = [];
        const pricing = data.pricing as any;
        if (!pricing?.monthlyRent || pricing.monthlyRent < 1000) {
          errors.push({ field: 'monthlyRent', message: 'Monthly rent must be at least R 1,000' });
        }
        if (!pricing?.deposit || pricing.deposit < 0) {
          errors.push({ field: 'deposit', message: 'Deposit amount is required' });
        }
        return { valid: errors.length === 0, errors };
      },
    },
    {
      id: 'location',
      title: 'Location',
      description: 'Where is the property located?',
      componentKey: 'LocationStep',
      required: true,
      validate: (data) => {
        const errors: { field: string; message: string }[] = [];
        const location = data.location as any;
        if (!location?.address) {
          errors.push({ field: 'address', message: 'Property address is required' });
        }
        if (!location?.latitude || !location?.longitude) {
          errors.push({ field: 'coordinates', message: 'Please pin the property on the map' });
        }
        return { valid: errors.length === 0, errors };
      },
    },
    {
      id: 'media_upload',
      title: 'Photos & Media',
      description: 'Upload photos and media for your listing',
      componentKey: 'MediaUploadStep',
      required: true,
      validate: (data) => {
        const errors: { field: string; message: string }[] = [];
        const media = data.media as any[];
        if (!media || media.length === 0) {
          errors.push({ field: 'media', message: 'Please upload at least one photo' });
        }
        return { valid: errors.length === 0, errors };
      },
    },
    {
      id: 'preview_publish',
      title: 'Review & Publish',
      description: 'Review your listing before publishing',
      componentKey: 'PreviewStep',
      required: true,
    },
  ],
};
