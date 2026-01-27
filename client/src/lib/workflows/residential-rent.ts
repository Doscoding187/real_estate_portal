import { WizardWorkflow, WizardStep } from '../types/wizard-workflows';

const residentialRentSteps: WizardStep[] = [
  {
    id: 'configuration',
    title: 'Configuration',
    componentKey: 'ConfigurationStep',
    required: true,
    description:
      'Set up rental pricing, unit mix, and basic configuration for your residential development.',
    validate: data => ({ valid: true }),
  },
  {
    id: 'identity_market',
    title: 'Identity & Market',
    componentKey: 'IdentityMarketStep',
    required: true,
    description: 'Define the brand identity and market positioning of your development.',
    validate: data => {
      const errors = [];

      if (!data.name || data.name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Development name is required' });
      }

      if (!data.status) {
        errors.push({ field: 'status', message: 'Development status is required' });
      }

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
      const errors = [];
      const loc = data.location || {};

      if (!loc.latitude || !loc.longitude) {
        errors.push({ field: 'location', message: 'Map location pin is required' });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'governance_finances',
    title: 'Governance & Finances',
    componentKey: 'GovernanceStep',
    required: false,
    description: 'Configure levies, rates, and HOA details.',
    validate: data => {
      const errors = [];
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
    title: 'Amenities & Features',
    componentKey: 'AmenitiesStep',
    required: false,
    description: 'Highlight the lifestyle amenities and key features.',
    validate: data => ({ valid: true }),
  },
  {
    id: 'marketing_summary',
    title: 'Marketing Summary',
    componentKey: 'MarketingStep',
    required: true,
    description: 'Create the marketing copy and key selling points.',
    validate: data => {
      const errors = [];
      const d = data as any;
      if (!d.description || d.description.length < 50) {
        errors.push({
          field: 'description',
          message: 'Description must be at least 50 characters',
        });
      }
      const points = d.keySellingPoints || d.highlights || [];
      if (points.length < 3) {
        errors.push({ field: 'highlights', message: 'At least 3 key selling points are required' });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'development_media',
    title: 'Media',
    componentKey: 'MediaStep',
    required: true,
    description: 'Upload high-quality images, documents, and videos.',
    validate: data => {
      const errors = [];
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
    title: 'Unit Types',
    componentKey: 'UnitTypesStep',
    required: true,
    description: 'Define the different unit configurations available.',
    validate: data => {
      const errors = [];
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
          if ((!Number.isFinite(rentFrom) || rentFrom <= 0) && (!Number.isFinite(rentTo) || rentTo <= 0)) {
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
    title: 'Review & Publish',
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
