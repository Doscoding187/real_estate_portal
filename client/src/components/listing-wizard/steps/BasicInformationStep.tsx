// @ts-nocheck
import React from 'react';
import { Building2, Check, CircleHelp, Info, Wheat } from 'lucide-react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InlineError } from '@/components/ui/InlineError';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import type { ListingAction, PropertyType } from '@/../../shared/listing-types';
import {
  FARM_LAND_AREA_UNITS,
  getCorePropertyFieldDefinitions,
  normalizeFarmLandArea,
  readCorePropertyInformation,
} from '@/../../shared/core-property-information';
import { getPropertyTypeDefinition } from '@/../../shared/property-taxonomy';
import { listingActionToIntent } from '@/../../shared/listing-types';

const residentialTypes = ['apartment', 'house', 'townhouse', 'cluster_home'];

const directNumericInputClassName =
  'mt-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

const directNumericInputProps = (inputMode: 'numeric' | 'decimal') => ({
  inputMode,
  autoComplete: 'off',
  'data-numeric-entry': 'direct',
  onWheel: (event: React.WheelEvent<HTMLInputElement>) => event.currentTarget.blur(),
});

const NumberField = ({
  id,
  label,
  value,
  onChange,
  required = false,
  step = '1',
  min = '0',
  help,
  onBlur,
}: any) => (
  <div>
    <Label htmlFor={id} className="text-slate-700">
      {label} {required ? '*' : ''}
    </Label>
    <Input
      id={id}
      type="number"
      min={min}
      step={step}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      {...directNumericInputProps(step === '1' ? 'numeric' : 'decimal')}
      className={directNumericInputClassName}
      aria-required={required}
    />
    {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
  </div>
);

const CoreFactStatus = ({ id, label, value, onChange, help }: any) => (
  <div>
    <Label htmlFor={id} className="text-slate-700">
      {label}
    </Label>
    <Select value={value || 'unknown'} onValueChange={onChange}>
      <SelectTrigger id={id} className="mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="known">I know this</SelectItem>
        <SelectItem value="unknown">Not sure</SelectItem>
        <SelectItem value="not_applicable">Not applicable</SelectItem>
      </SelectContent>
    </Select>
    {help ? <p className="mt-1 text-xs text-slate-500">{help}</p> : null}
  </div>
);

const BasicInformationStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const action: ListingAction | undefined = store.action;
  const propertyType: PropertyType | undefined = store.propertyType;
  const title = store.title || '';
  const description = store.description || '';
  const descriptionCharactersUntilSubmission = Math.max(0, 100 - description.trim().length);
  const propertyDetails = store.propertyDetails || {};
  const basicInfo = store.basicInfo || {};
  const core = readCorePropertyInformation(propertyType, propertyDetails, basicInfo);
  const coreFieldDefinitions = getCorePropertyFieldDefinitions(propertyType, core);
  const definition = getPropertyTypeDefinition(propertyType);
  const [numericDrafts, setNumericDrafts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setNumericDrafts({});
  }, [action, propertyType]);

  const coreField = (field: string) =>
    coreFieldDefinitions.find(candidate => candidate.key === field);
  const isCoreFieldRequired = (field: string) => coreField(field)?.requirement === 'required';
  const isCoreFieldRequiredWhenVisible = (field: string) =>
    ['required', 'conditional'].includes(coreField(field)?.requirement || '');

  const validationContext = { action, propertyType, currentStep: 3 };
  const titleValidation = useFieldValidation({
    field: 'title',
    value: title,
    context: validationContext,
    trigger: 'blur',
  });
  const descriptionValidation = useFieldValidation({
    field: 'description',
    value: description,
    context: validationContext,
    trigger: 'blur',
  });

  const updateCore = (patch: Record<string, unknown>) => {
    store.updatePropertyDetail('corePropertyInformation', {
      ...core,
      ...patch,
    });
  };

  const updateNumeric = (field: string, rawValue: string) => {
    if (rawValue.trim() === '') {
      updateCore({ [field]: { status: 'unknown' } });
      return;
    }
    const value = Number(rawValue);
    updateCore({
      [field]:
        Number.isFinite(value) && value >= 0 ? { status: 'known', value } : { status: 'unknown' },
    });
  };

  const handleNumericChange = (field: string, rawValue: string) => {
    setNumericDrafts(current => ({ ...current, [field]: rawValue }));
    updateNumeric(field, rawValue);
  };

  const handleAreaChange = (field: string, rawValue: string) => {
    setNumericDrafts(current => ({ ...current, [field]: rawValue }));
    updateArea(field, rawValue);
  };

  const handleFarmAreaChange = (rawValue: string) => {
    setNumericDrafts(current => ({ ...current, farmLandArea: rawValue }));
    updateFarmAreaValue(rawValue);
  };

  const clearNumericDraft = (field: string) => {
    setNumericDrafts(current => {
      if (!Object.prototype.hasOwnProperty.call(current, field)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const draftValue = (field: string, fallback: unknown) =>
    Object.prototype.hasOwnProperty.call(numericDrafts, field) ? numericDrafts[field] : fallback;

  const numericValue = (field: string) => {
    const value = core[field];
    return draftValue(field, value?.status === 'known' ? value.value : '');
  };

  const areaValue = (field: string) => {
    const value = core[field];
    return draftValue(field, value?.status === 'known' ? value.valueM2 : '');
  };

  const updateArea = (field: string, rawValue: string) => {
    if (rawValue.trim() === '') {
      updateCore({ [field]: { status: 'unknown', unit: 'm2' } });
      return;
    }
    const value = Number(rawValue);
    updateCore({
      [field]:
        Number.isFinite(value) && value > 0
          ? { status: 'known', valueM2: value, unit: 'm2' }
          : { status: 'unknown', unit: 'm2' },
    });
  };

  const updateFloorStatus = (status: string) => {
    if (status === 'known') {
      const existing = core.floorLevel?.status === 'known' ? core.floorLevel.value : 0;
      updateCore({ floorLevel: { status: 'known', value: existing } });
    } else {
      updateCore({ floorLevel: { status } });
    }
  };

  const updateFarmAreaValue = (rawValue: string) => {
    const sourceUnit =
      core.farmLandArea?.status === 'known'
        ? core.farmLandArea.sourceUnit
        : core.farmLandArea?.sourceUnit || 'hectares';
    const area = normalizeFarmLandArea(rawValue, sourceUnit);
    updateCore({ farmLandArea: area || { status: 'unknown', sourceUnit } });
  };

  const updateFarmAreaUnit = (sourceUnit: string) => {
    const value = core.farmLandArea?.status === 'known' ? core.farmLandArea.value : undefined;
    updateCore({
      farmLandArea:
        value === undefined
          ? { status: 'unknown', sourceUnit }
          : normalizeFarmLandArea(value, sourceUnit),
    });
  };

  const updateFarmResidence = (value: string) => {
    updateCore({ residenceIncluded: value === 'yes' ? true : value === 'no' ? false : undefined });
  };

  const isResidential =
    residentialTypes.includes(propertyType) && Boolean(coreField('internalArea'));
  const isFarm = propertyType === 'farm';
  const hasResidence = isFarm && core.residenceIncluded === true;
  const farmArea = core.farmLandArea;
  const farmAreaUnit = farmArea?.sourceUnit || 'hectares';
  const intentLabel = listingActionToIntent(action) === 'rent' ? 'rental' : 'sale';

  return (
    <div className="py-6 space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Property Information</h3>
        </div>
        <p className="mb-5 text-sm text-slate-600">
          Tell us the core facts of this {intentLabel} property. These facts help prospects compare
          listings accurately.
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-700">
              Property Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={e => {
                store.setTitle(e.target.value);
                titleValidation.clearError();
              }}
              onBlur={titleValidation.onBlur}
              placeholder="Enter property title (minimum 10 characters)"
              className="mt-1"
              maxLength={255}
              aria-invalid={!!titleValidation.error}
            />
            <div className="flex items-center justify-between mt-1">
              <InlineError error={titleValidation.error} show={!!titleValidation.error} size="sm" />
              <p className="text-xs text-slate-500">{title.length}/255 characters</p>
            </div>
          </div>
          <div>
            <Label htmlFor="description" className="text-slate-700">
              Property Description *
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => {
                store.setDescription(e.target.value);
                descriptionValidation.clearError();
              }}
              onBlur={descriptionValidation.onBlur}
              placeholder="Describe the property (50 characters to continue; 100+ to submit)"
              className="mt-1 min-h-[120px]"
              maxLength={5000}
              aria-invalid={!!descriptionValidation.error}
            />
            <div className="flex items-center justify-between mt-1">
              <InlineError
                error={descriptionValidation.error}
                show={!!descriptionValidation.error}
                size="sm"
              />
              <p className="text-xs text-slate-500">{description.length}/5000 characters</p>
            </div>
            <p
              className={`mt-1 text-xs ${
                descriptionCharactersUntilSubmission === 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {descriptionCharactersUntilSubmission === 0
                ? 'Description length is ready for submission.'
                : description.trim().length >= 50
                  ? `${descriptionCharactersUntilSubmission} more characters are needed for submission.`
                  : 'You can continue at 50 characters; 100 characters are required for submission.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white/50 backdrop-blur-sm border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-100">
          <div className="p-2 bg-blue-100 rounded-lg">
            {isFarm ? (
              <Wheat className="w-5 h-5 text-blue-600" />
            ) : (
              <Building2 className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Core Property Information</h3>
            <p className="text-sm text-slate-600">
              {definition?.label || 'Property'} — the next questions are tailored to this type.
            </p>
          </div>
        </div>

        {isResidential && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
            <NumberField
              id="core-bedrooms"
              label="Bedrooms"
              required={isCoreFieldRequiredWhenVisible('bedrooms')}
              value={numericValue('bedrooms')}
              onChange={value => handleNumericChange('bedrooms', value)}
              onBlur={() => clearNumericDraft('bedrooms')}
              help="Enter 0 for a studio or leave blank only while you are still completing the form."
            />
            <NumberField
              id="core-bathrooms"
              label="Bathrooms"
              required={isCoreFieldRequiredWhenVisible('bathrooms')}
              step="0.5"
              value={numericValue('bathrooms')}
              onChange={value => handleNumericChange('bathrooms', value)}
              onBlur={() => clearNumericDraft('bathrooms')}
            />
            <NumberField
              id="core-internal-area"
              label={
                propertyType === 'apartment'
                  ? 'Internal / unit area (m²)'
                  : 'Internal / floor area (m²)'
              }
              required={isCoreFieldRequiredWhenVisible('internalArea')}
              step="0.01"
              min="0.01"
              value={areaValue('internalArea')}
              onChange={value => handleAreaChange('internalArea', value)}
              onBlur={() => clearNumericDraft('internalArea')}
              help="This is the usable building or dwelling area, not the land parcel."
            />
            {coreField('erfArea') && (
              <NumberField
                id="core-erf-area"
                label="Erf / stand area (m²)"
                required={isCoreFieldRequiredWhenVisible('erfArea')}
                step="0.01"
                min="0.01"
                value={areaValue('erfArea')}
                onChange={value => handleAreaChange('erfArea', value)}
                onBlur={() => clearNumericDraft('erfArea')}
                help="This is the land parcel area, not the house size or yard estimate."
              />
            )}
            <NumberField
              id="core-parking-bays"
              label="Parking bays (optional)"
              value={numericValue('parkingBays')}
              onChange={value => handleNumericChange('parkingBays', value)}
              onBlur={() => clearNumericDraft('parkingBays')}
              help="Leave blank if you are not sure. Enter 0 when you know there are none."
            />
            <NumberField
              id="core-garages"
              label="Garages (optional)"
              value={numericValue('garages')}
              onChange={value => handleNumericChange('garages', value)}
              onBlur={() => clearNumericDraft('garages')}
              help="Garages are counted separately from parking bays."
            />
            {coreField('floorLevel') && (
              <div>
                <CoreFactStatus
                  id="core-floor-level-status"
                  label="Floor / level"
                  value={core.floorLevel?.status}
                  onChange={updateFloorStatus}
                  help="Ground floor is a known value of 0; do not use 0 to mean unknown."
                />
                {core.floorLevel?.status === 'known' && (
                  <Input
                    id="core-floor-level"
                    type="number"
                    min="0"
                    step="1"
                    value={numericValue('floorLevel')}
                    onChange={e => handleNumericChange('floorLevel', e.target.value)}
                    onBlur={() => clearNumericDraft('floorLevel')}
                    {...directNumericInputProps('numeric')}
                    className={directNumericInputClassName.replace('mt-1', 'mt-2')}
                    aria-label="Known floor or level number"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {isFarm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
            <div>
              <Label htmlFor="core-farm-use" className="text-slate-700">
                Farm / smallholding use {isCoreFieldRequired('farmUse') ? '*' : ''}
              </Label>
              <Select
                value={core.farmUse || ''}
                onValueChange={value => updateCore({ farmUse: value })}
              >
                <SelectTrigger id="core-farm-use" className="mt-1">
                  <SelectValue placeholder="Select the primary use" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crop_farm">Crop farm</SelectItem>
                  <SelectItem value="livestock_farm">Livestock farm</SelectItem>
                  <SelectItem value="mixed_farm">Mixed farm</SelectItem>
                  <SelectItem value="game_farm">Game farm</SelectItem>
                  <SelectItem value="aquaculture">Aquaculture</SelectItem>
                  <SelectItem value="smallholding">Smallholding / lifestyle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="core-farm-land-area" className="text-slate-700">
                Total farm / land area {isCoreFieldRequired('farmLandArea') ? '*' : ''}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="core-farm-land-area"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draftValue(
                    'farmLandArea',
                    farmArea?.status === 'known' ? farmArea.value : '',
                  )}
                  onChange={e => handleFarmAreaChange(e.target.value)}
                  onBlur={() => clearNumericDraft('farmLandArea')}
                  {...directNumericInputProps('decimal')}
                  placeholder="Enter the total extent"
                  className={`flex-1 ${directNumericInputClassName.replace('mt-1', '')}`}
                />
                <Select value={farmAreaUnit} onValueChange={updateFarmAreaUnit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FARM_LAND_AREA_UNITS.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit === 'm2' ? 'm²' : unit === 'hectares' ? 'Hectares' : 'Acres'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                The source unit is retained and a normalized m² value is used for comparison.
              </p>
            </div>
            <div>
              <Label htmlFor="core-residence-included" className="text-slate-700">
                Is a residence included? {isCoreFieldRequired('residenceIncluded') ? '*' : ''}
              </Label>
              <Select
                value={
                  core.residenceIncluded === true
                    ? 'yes'
                    : core.residenceIncluded === false
                      ? 'no'
                      : ''
                }
                onValueChange={updateFarmResidence}
              >
                <SelectTrigger id="core-residence-included" className="mt-1">
                  <SelectValue placeholder="Select yes or no" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — a residence is included</SelectItem>
                  <SelectItem value="no">No — land and farm only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasResidence && (
              <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start gap-2 mb-4">
                  <CircleHelp className="mt-0.5 h-4 w-4 text-blue-600" />
                  <p className="text-sm text-slate-700">
                    Because a residence is included, add the minimum residential facts prospects
                    need to understand it.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumberField
                    id="core-farm-bedrooms"
                    label="Residence bedrooms"
                    required={isCoreFieldRequiredWhenVisible('bedrooms')}
                    value={numericValue('bedrooms')}
                    onChange={value => handleNumericChange('bedrooms', value)}
                    onBlur={() => clearNumericDraft('bedrooms')}
                  />
                  <NumberField
                    id="core-farm-bathrooms"
                    label="Residence bathrooms"
                    required={isCoreFieldRequiredWhenVisible('bathrooms')}
                    step="0.5"
                    value={numericValue('bathrooms')}
                    onChange={value => handleNumericChange('bathrooms', value)}
                    onBlur={() => clearNumericDraft('bathrooms')}
                  />
                  <NumberField
                    id="core-farm-internal-area"
                    label="Residence internal / floor area (m²)"
                    required={isCoreFieldRequiredWhenVisible('internalArea')}
                    step="0.01"
                    min="0.01"
                    value={areaValue('internalArea')}
                    onChange={value => handleAreaChange('internalArea', value)}
                    onBlur={() => clearNumericDraft('internalArea')}
                  />
                  <NumberField
                    id="core-farm-parking-bays"
                    label="Parking bays (optional)"
                    value={numericValue('parkingBays')}
                    onChange={value => handleNumericChange('parkingBays', value)}
                    onBlur={() => clearNumericDraft('parkingBays')}
                  />
                  <NumberField
                    id="core-farm-garages"
                    label="Garages (optional)"
                    value={numericValue('garages')}
                    onChange={value => handleNumericChange('garages', value)}
                    onBlur={() => clearNumericDraft('garages')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p>
            The values you enter here are stored as structured property facts. Title, tenure,
            development context, availability and marketing labels are collected elsewhere.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default BasicInformationStep;
