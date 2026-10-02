/** Read-only policy reproduction. Run from the candidate repository root with pnpm exec tsx. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { isCommercialActivationAvailable, resolveCommercialActivationConfiguration } =
  await import(pathToFileURL(resolve('server/services/commercialActivationPolicy.ts')).href);

const disabled = { NODE_ENV: 'production', APP_ENV: 'production' };
const released = {
  ...disabled,
  PAID_MVP_ENABLED_PRODUCT_KEYS:
    'agent_launch_access,agency_launch_access,developer_launch_access',
  PAID_MVP_RELEASE_ID: 'audit-reproduction',
  PAID_MVP_APPROVAL_REF: 'audit-only-no-release',
  PAID_MVP_SALES_OPEN_UNTIL: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

console.log(JSON.stringify({
  scope: 'Pure function calls only; no process configuration changed, server started or database accessed.',
  disabledProductlessGate: isCommercialActivationAvailable(disabled),
  releasedProductlessGate: isCommercialActivationAvailable(released),
  releasedUnknownExactProduct: isCommercialActivationAvailable(released, 'unapproved_recurring_plan'),
  releasedMode: resolveCommercialActivationConfiguration(released).mode,
  releasedSalesPaused: resolveCommercialActivationConfiguration(released).salesPaused,
  meaning: 'Legacy callers omit productKey; their generic guard permits the paid release despite an exact unknown product being denied.',
}, null, 2));
