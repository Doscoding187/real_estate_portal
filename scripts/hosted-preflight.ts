import { loadAppRuntimeEnv, resolveAppRuntimeEnv } from '../server/_core/runtimeBootstrap';
import { hostedRuntimeConfigurationIssues, resolveHostedBuildSha } from '../server/_core/hostedRuntimeConfiguration';
import { deployedTestConfigurationIssues } from '../server/_core/securityRuntimeConfiguration';
import {
  PAID_MVP_SALES_PAUSED_ENV,
  resolveCommercialActivationConfiguration,
} from '../server/services/commercialActivationPolicy';

loadAppRuntimeEnv();
const appEnv = resolveAppRuntimeEnv();
const issues = hostedRuntimeConfigurationIssues();
if (appEnv !== 'staging' && appEnv !== 'production') {
  issues.push('Hosted preflight requires APP_ENV=staging or APP_ENV=production.');
}
let commercial: ReturnType<typeof resolveCommercialActivationConfiguration> | null = null;
try {
  commercial = resolveCommercialActivationConfiguration(process.env, appEnv);
} catch {
  issues.push('Commercial activation configuration is invalid.');
}
if (commercial?.mode === 'paid_mvp_release' &&
    !commercial.salesOpenUntil && process.env[PAID_MVP_SALES_PAUSED_ENV] !== 'true') {
  issues.push('Paid sales require a founder-renewed UTC sales window or an explicit sales pause.');
}
if (commercial?.mode === 'paid_mvp_release' && commercial.salesOpenUntil &&
    Date.parse(commercial.salesOpenUntil) <= Date.now() &&
    process.env[PAID_MVP_SALES_PAUSED_ENV] !== 'true') {
  issues.push('The paid sales window has expired; renew it before opening new sales.');
}
console.log(JSON.stringify({
  appEnv,
  nodeEnv: process.env.NODE_ENV,
  buildSha: resolveHostedBuildSha() ?? 'missing',
  releaseId: commercial?.releaseId || null,
  commercialMode: commercial?.mode || 'invalid',
  activationEnabled: commercial?.enabled ?? false,
  originConfigured: Boolean(process.env.APP_URL && (process.env.API_URL || process.env.VITE_API_URL)),
  mediaAdapter: process.env.MEDIA_STORAGE_ADAPTER || 'missing',
  privateProofAdapter: process.env.BILLING_PROOF_STORAGE_ADAPTER || 'missing',
  redisConfigured: Boolean(process.env.REDIS_URL),
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  forbiddenTestSelectorsAbsent: deployedTestConfigurationIssues().length === 0,
  configurationOk: issues.length === 0,
  issues,
}));
if (issues.length) process.exitCode = 1;
