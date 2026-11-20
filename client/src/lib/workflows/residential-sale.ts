import { WizardWorkflow, WizardStep, type FieldError } from '../types/wizard-workflows';
import { validateLocationStep, validateAmenitiesStep } from '../wizardLocationCostsAmenities';
import { validateAboutStep } from '../wizardBasicsAbout';
import { validateDevelopmentMedia } from '../wizardMedia';

// Eight steps, in this order: Basics, About, Location, Monthly costs,
// Amenities, Media, House types, Review & publish. The step ids are the same
// ones drafts and published developments already use, so nothing saved before
// is lost: only titles and screens changed.
const residentialSaleSteps: WizardStep[] = [
  {
    id: 'configuration',
    title: 'Basics',
    componentKey: 'ConfigurationStep',
    required: true,
    description: 'The setting of the development: standalone, gated community or security estate.',
    validate: data => {
      const errors: FieldError[] = [];
      const setting = (data as any).setting;
      if (!setting) errors.push({ field: 'setting', message: 'Choose the setting' });
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'identity_market',
    title: 'About',
    componentKey: 'IdentityMarketStep',
    required: true,
    description: 'Name, sales status, ownership and description: everything buyers read first.',
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
      // The server requires an address, not coordinates; the wizard agrees.
      const errors: FieldError[] = validateLocationStep(data.location);
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'governance_finances',
    title: 'Monthly costs',
    componentKey: 'GovernanceStep',
    required: false,
    description: 'Rates and taxes, and the levy if there is one.',
    validate: () => ({ valid: true }),
  },
  {
    id: 'amenities_features',
    title: 'Amenities',
    componentKey: 'AmenitiesStep',
    required: false,
    description: 'Tap what the development really has, then pick the highlights for the search card.',
    validate: data => {
      const errors: FieldError[] = validateAmenitiesStep(data);
      return { valid: errors.length === 0, errors };
    },
  },
  {
    id: 'development_media',
    title: 'Media',
    componentKey: 'MediaStep',
    required: true,
    description: 'Photos, video and documents about the development as a whole.',
    validate: data => {
      // A cover photo is required (matches the server's "persisted image" readiness).
      const errors: FieldError[] = validateDevelopmentMedia((data as any).media || {});
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
        // For sale validation: require name + bedrooms + bathrooms + basePrice
        const isForSale = ['for_sale', 'sale', 'auction'].includes(data.transactionType || '');
        if (isForSale) {
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
            if (!u.priceFrom || u.priceFrom <= 0)
              errors.push({
                field: `unitTypes.${id}.priceFrom`,
                message: `${label} is missing a base price`,
              });
          });
        }
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

export const residentialSaleWorkflow: WizardWorkflow = {
  id: 'residential_sale',
  title: 'Residential Sale',
  steps: residentialSaleSteps,
};
