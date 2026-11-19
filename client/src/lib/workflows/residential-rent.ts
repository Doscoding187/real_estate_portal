import { WizardWorkflow, WizardStep, type FieldError } from '../types/wizard-workflows';
import { validateAboutStep } from '../wizardBasicsAbout';

// Same eight steps, in the same order, as the sale workflow.
const residentialRentSteps: WizardStep[] = [
  {
    id: 'configuration',
    title: 'Basics',
    componentKey: 'ConfigurationStep',
    required: true,
    description: 'The setting of the development: standalone, gated community or security estate.',
    validate: data => {
      const errors: FieldError[] = [];
      if (!(data as any).setting) errors.push({ field: 'setting', message: 'Choose the setting' });
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'identity_market',
    title: 'About',
    componentKey: 'IdentityMarketStep',
    required: true,
    description: 'Name, sales status, ownership and description: everything renters read first.',
    validate: data => {
      const errors: FieldError[] = validateAboutStep(data);
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'location',
    title: 'Location',
    componentKey: 'LocationStep',
    required: true,
    description: 'Pinpoint the exact location and address details.',
    validate: data => {
      const errors: FieldError[] = [];
      const loc = data.location || {};

      if (!loc.latitude || !loc.longitude) {
        errors.push({ field: 'location', message: 'Map location pin is required' });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'governance_finances',
    title: 'Monthly costs',
    componentKey: 'GovernanceStep',
    required: false,
    description: 'Configure levies, rates, and HOA details.',
    validate: data => {
      const errors: FieldError[] = [];
      if (data.hasGoverningBody) {
        if (!data.governanceType) {
          errors.push({ field: 'governanceType', message: 'Select a governing body type' });
        }
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'amenities_features',
    title: 'Amenities',
    componentKey: 'AmenitiesStep',
    required: false,
    description: 'Highlight the lifestyle amenities and key features.',
    validate: data => ({ valid: true }),
  },
  {
    id: 'development_media',
    title: 'Media',
    componentKey: 'MediaStep',
    required: true,
    description: 'Upload high-quality images, documents, and videos.',
    validate: data => {
      const errors: FieldError[] = [];
      const d = data as any;
      const media = d.media || {};
      const photos = media.photos || [];

      if (photos.length === 0) {
        errors.push({ field: 'media', message: 'At least one photo (Hero Image) is required' });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'unit_types',
    title: 'House types',
    componentKey: 'UnitTypesStep',
    required: true,
    description: 'Define the different unit configurations available.',
    validate: data => {
      const errors: FieldError[] = [];
      const units = data.unitTypes || [];

      if (units.length === 0) {
        errors.push({ field: 'unitTypes', message: 'At least one unit type is required' });
      } else {
        units.forEach((u: any, idx: number) => {
          const id = u.id || idx;
          const label = u.name || `Unit #${idx + 1}`;
          if (!u.name)
            errors.push({ field: `unitTypes.${id}.name`, message: `${label} is missing a name` });
          if (!u.bedrooms && u.bedrooms !== 0)
            errors.push({
              field: `unitTypes.${id}.bedrooms`,
              message: `${label} is missing bedrooms`,
            });
          if (!u.bathrooms && u.bathrooms !== 0)
            errors.push({
              field: `unitTypes.${id}.bathrooms`,
              message: `${label} is missing bathrooms`,
            });

          const rentFrom = Number(u.monthlyRentFrom ?? u.monthlyRent ?? 0);
          const rentTo = Number(u.monthlyRentTo ?? 0);
          if (
            (!Number.isFinite(rentFrom) || rentFrom <= 0) &&
            (!Number.isFinite(rentTo) || rentTo <= 0)
          ) {
            errors.push({
              field: `unitTypes.${id}.monthlyRentFrom`,
              message: `${label} is missing a monthly rent`,
            });
          }
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'review_publish',
    title: 'Review & publish',
    componentKey: 'ReviewStep',
    required: true,
    description: 'Review all details before publishing your listing.',
    validate: data => ({ valid: true }),
  },
];

export const residentialRentWorkflow: WizardWorkflow = {
  id: 'residential_rent',
  title: 'Residential Rent',
  steps: residentialRentSteps,
};
