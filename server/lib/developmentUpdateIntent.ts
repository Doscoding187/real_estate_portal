import {
  CANONICAL_PARTIAL_UPDATE_MODE,
  CANONICAL_UPDATE_MODE_FIELD,
  isDevelopmentInventoryOwningStepId,
} from '../../shared/developmentPayloadOwnership';

export type DevelopmentUnitTypesUpdateMode =
  | 'none'
  | 'canonical_patch'
  | 'canonical_full_sync'
  | 'legacy_patch'
  | 'explicit_clear';

export type DevelopmentUpdateIntent = {
  unitTypesMode: DevelopmentUnitTypesUpdateMode;
  deleteMissingUnitTypes: boolean;
};

const hasOwn = (value: unknown, key: string) =>
  Boolean(value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key));

export function resolveDevelopmentUpdateIntent(input: unknown): DevelopmentUpdateIntent {
  const payload = input && typeof input === 'object' ? (input as Record<string, any>) : {};
  const stepUnitTypes = payload.stepData?.unit_types?.unitTypes;
  const currentStepId = typeof payload.currentStepId === 'string' ? payload.currentStepId : undefined;
  const isCanonicalPartialUpdate =
    payload[CANONICAL_UPDATE_MODE_FIELD] === CANONICAL_PARTIAL_UPDATE_MODE;

  if (Array.isArray(stepUnitTypes)) {
    const canonicalUnitTypesStepUpdate =
      isCanonicalPartialUpdate && currentStepId === 'unit_types';
    return {
      unitTypesMode:
        isCanonicalPartialUpdate && !canonicalUnitTypesStepUpdate
          ? 'canonical_patch'
          : 'canonical_full_sync',
      deleteMissingUnitTypes: !isCanonicalPartialUpdate || canonicalUnitTypesStepUpdate,
    };
  }

  const canUseLegacyRootUnitTypes =
    !currentStepId || isDevelopmentInventoryOwningStepId(currentStepId);

  if (canUseLegacyRootUnitTypes && hasOwn(payload, 'unitTypes') && Array.isArray(payload.unitTypes)) {
    return {
      unitTypesMode: payload.unitTypes.length === 0 ? 'explicit_clear' : 'legacy_patch',
      deleteMissingUnitTypes: payload.unitTypes.length === 0,
    };
  }

  return {
    unitTypesMode: 'none',
    deleteMissingUnitTypes: false,
  };
}
