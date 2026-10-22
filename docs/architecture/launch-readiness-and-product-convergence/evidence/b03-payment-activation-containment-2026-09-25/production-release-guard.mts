import {
  initializeCommercialActivationPolicy,
  isCommercialActivationAvailable,
  requireCommercialActivation,
} from '../../../../../server/services/commercialActivationPolicy';

const enabledProductKeys =
  'agent_launch_access,agency_launch_access,developer_launch_access';
const generatedAt = new Date();
const salesOpenUntil = new Date(generatedAt.getTime() + 60 * 60 * 1000).toISOString();

Object.assign(process.env, {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  PAID_MVP_ENABLED_PRODUCT_KEYS: enabledProductKeys,
  PAID_MVP_RELEASE_ID: 'b03-containment-rc-1',
  PAID_MVP_APPROVAL_REF: 'b03-review-1',
  PAID_MVP_SALES_PAUSED: 'false',
  PAID_MVP_SALES_OPEN_UNTIL: salesOpenUntil,
});

const configuration = initializeCommercialActivationPolicy();
const exactProductChecks = configuration.enabledProductKeys.map(productKey => {
  requireCommercialActivation('Exact approved-product mutation', productKey);
  return { productKey, allowed: true };
});

let productlessMutation: { denied: boolean; code: string | null; message: string | null };
try {
  requireCommercialActivation('Persisted-product mutation');
  productlessMutation = { denied: false, code: null, message: null };
} catch (error) {
  const candidate = error as { code?: unknown; message?: unknown };
  productlessMutation = {
    denied: true,
    code: typeof candidate.code === 'string' ? candidate.code : null,
    message: typeof candidate.message === 'string' ? candidate.message : null,
  };
}

console.log(
  JSON.stringify(
    {
      evidence: 'synthetic-production-release-guard',
      generatedAt: generatedAt.toISOString(),
      runtime: { nodeEnv: process.env.NODE_ENV, appEnv: process.env.APP_ENV },
      release: {
        mode: configuration.mode,
        enabled: configuration.enabled,
        enabledProductKeys: configuration.enabledProductKeys,
        releaseId: configuration.releaseId,
        approvalRef: configuration.approvalRef,
        salesPaused: configuration.salesPaused,
        salesOpenUntil: configuration.salesOpenUntil,
      },
      genericReadOnlyAvailability: isCommercialActivationAvailable(),
      exactProductChecks,
      productlessMutation,
    },
    null,
    2,
  ),
);
